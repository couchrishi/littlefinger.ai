// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract LittlefingerGame {
    // State Variables *********
    address public owner;
    address public lastPlayer;
    uint256 public totalUniquePlayers=0;
    uint256 public globalQueryCount = 0;
    uint256 public MAX_QUERIES = 5000;
    uint256 public IDLE_TIME_LIMIT = 7 days;
    uint256 public MAX_QUERY_FEE = 1 ether;

    address[] public players;
    mapping(address => uint256) public playerQueryCount;
    mapping(address => uint256) public playerTotalFee;

    uint256 public lastInteraction;
    bool public gameEnded = false;

    // Events
    event QueryFeePaid(address indexed player, uint256 feeAmount, string queryID, uint256 blockNumber, uint256 timestamp);
    event NextQueryFee(uint256 nextFee, uint256 currentCount);
    event PrizeTransferApproved(address indexed winner, uint256 amount);
    event LastPlayerRewardAfterGameExhaustion(address indexed player, uint256 amount);
    event RestOfThePlayersRewardAfterGameExhaustion(uint256 totalAmount);
    event CurrentPrizePool(uint256 prizePool);
    event TotalQueries(uint256 globalQueryCount);
    event GameStarted(uint256 timestamp);
    event GameIdleSince(uint256 lastInteraction);
    event GameEnded(uint256 currentTimestamp, uint256 lastInteraction);
    event GameResetByOwner(uint256 timestamp);
    event Withdrawal(address indexed owner, uint256 amount);
    event MaxQueriesUpdated(uint256 newMaxQueries);
    event IdleTimeLimitUpdated(uint256 newIdleTimeLimit);
    event MaxQueryFeeUpdated(uint256 newMaxQueryFee);
    event TotalParticipants(uint256 totalUniquePlayers);


    // Custom Errors
    error GameExhausted();
    error Unauthorized();
    error InvalidQuery();
    error InsufficientQueryFee(uint256 requiredFee, uint256 sentFee);
    error MaxQueriesReached(uint256 maxQueries);
    error InvalidRecipient();

    // Modifiers
    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier checkIdleTime() {
        if (block.timestamp > lastInteraction + IDLE_TIME_LIMIT) revert GameExhausted();
        _;
    }

    // Contract Constructor
    constructor() payable {
        owner = msg.sender;
        require(msg.value > 0, "Initial funding required");
        lastInteraction = block.timestamp;
        lastPlayer = owner;
        gameEnded = false;
    }

    // **Submit Query**
    function submitQuery(string memory query, string memory queryID) external payable checkIdleTime {
        if (gameEnded) revert GameExhausted();
        if (msg.sender == owner) revert Unauthorized();
        if (prizePool() == 0) revert GameExhausted();
        if (bytes(query).length == 0) revert InvalidQuery();
        if (playerQueryCount[msg.sender] >= MAX_QUERIES) revert MaxQueriesReached(MAX_QUERIES);
        
        uint256 currentFee = calculateQueryFee();
        if (msg.value < currentFee) revert InsufficientQueryFee(currentFee, msg.value);

        uint256 prizeAmount = (msg.value * 80) / 100;
        uint256 ownerAmount = msg.value - prizeAmount;

        (bool success, ) = payable(owner).call{value: ownerAmount}("");
        require(success, "Owner transfer failed");

        if (playerQueryCount[msg.sender] == 0) {
            players.push(msg.sender);
            totalUniquePlayers ++; // Increment the totalUniquePlayers count
        }

        playerQueryCount[msg.sender]++;
        playerTotalFee[msg.sender] += currentFee;
        lastPlayer = msg.sender;
        globalQueryCount++;
        lastInteraction = block.timestamp;

        emit QueryFeePaid(msg.sender, msg.value, queryID, block.number, block.timestamp);
        emit NextQueryFee(calculateNextQueryFee(), globalQueryCount);
        emit CurrentPrizePool(prizePool());
        emit GameIdleSince(lastInteraction);
        emit TotalQueries(globalQueryCount);
        emit TotalParticipants(totalUniquePlayers);
    }

    // *****End Game*******
    function endGameDueToExhaustion() external onlyOwner {
        require(!gameEnded, "Game has already ended");

        if (prizePool() == 0) revert GameExhausted();
        if (lastPlayer == address(0)) revert InvalidRecipient();

        uint256 totalPrizePool = prizePool();
        uint256 lastPlayerReward = (totalPrizePool * 10) / 100;

        (bool success, ) = payable(lastPlayer).call{value: lastPlayerReward}("");
        require(success, "Transfer to last player failed");

        emit LastPlayerRewardAfterGameExhaustion(lastPlayer, lastPlayerReward);

        uint256 remainingPool = totalPrizePool - lastPlayerReward;

        if (globalQueryCount > 0) {
            for (uint256 i = 0; i < players.length; i++) {
                address player = players[i];
                uint256 playerReward = (remainingPool * playerQueryCount[player]) / globalQueryCount;
                if (playerReward > 0) {
                    (success, ) = payable(player).call{value: playerReward}("");
                    require(success, "Player reward transfer failed");
                }
            }
        }

        emit RestOfThePlayersRewardAfterGameExhaustion(remainingPool);

        gameEnded = true;
        emit GameEnded(block.timestamp, lastInteraction);
        emit CurrentPrizePool(prizePool());
    }

    // **Calculate Query Fee (Updated)**
    function calculateQueryFee() public view returns (uint256) {
        if (globalQueryCount <= 30) {
            return 0.005 ether + (0.001 ether * globalQueryCount);
        } else {
            uint256 lastLinearFee = 0.005 ether + (0.001 ether * 30);
            uint256 exponent = globalQueryCount - 30;
            uint256 exponentialGrowth = safeExp(125, exponent) / safeExp(100, exponent);
            uint256 fee = lastLinearFee * exponentialGrowth;
            return fee > MAX_QUERY_FEE ? MAX_QUERY_FEE : fee;
        }
    }

    function safeExp(uint256 base, uint256 exp) internal pure returns (uint256) {
        uint256 result = 1;
        for (uint256 i = 0; i < exp; i++) {
            result *= base;
            if (result > type(uint256).max / base) return type(uint256).max; // Prevent overflow
        }
        return result;
    }

    // **Calculate Next Query Fee (Updated)****
    function calculateNextQueryFee() public view returns (uint256) {
        if (globalQueryCount <= 30) {
            return 0.005 ether + (0.001 ether * (globalQueryCount + 1));
        } else {
            uint256 lastLinearFee = 0.005 ether + (0.001 ether * 30);
            uint256 exponent = globalQueryCount + 1 - 30;
            uint256 exponentialGrowth = safeExp(125, exponent) / safeExp(100, exponent);
            uint256 nextFee = lastLinearFee * exponentialGrowth;
            return nextFee > MAX_QUERY_FEE ? MAX_QUERY_FEE : nextFee;
        }
    }

    // ***** Approve Transfer Function for prize money *******
    function approveTransfer(address recipient) external onlyOwner {
        if (prizePool() == 0) revert GameExhausted();
        if (recipient == address(0)) revert InvalidRecipient();

        uint256 transferAmount = prizePool();

        (bool success, ) = payable(recipient).call{value: transferAmount}("");
        require(success, "Transfer to recipient failed");

        emit PrizeTransferApproved(recipient, transferAmount);
    }

    // **Withdraw Function******
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds available for withdrawal");
        (bool success, ) = payable(owner).call{value: balance}("");
        require(success, "Withdrawal failed");
        emit Withdrawal(owner, balance);
        emit CurrentPrizePool(address(this).balance);
    }

    // Reset Game Logic
    function resetGame() external payable onlyOwner {
        if (msg.value > 0) {
            emit CurrentPrizePool(address(this).balance);
        }

        for (uint256 i = 0; i < players.length; i++) {
            address player = players[i];
            delete playerQueryCount[player];
            delete playerTotalFee[player];
        }

        delete players;
        gameEnded = false;
        globalQueryCount = 0;
        lastPlayer = owner;
        lastInteraction = block.timestamp;

        emit GameResetByOwner(lastInteraction);
        emit GameStarted(lastInteraction);
        emit GameIdleSince(lastInteraction);
        emit CurrentPrizePool(address(this).balance);
    }

    // Setters for Game Config
    function setMaxQueries(uint256 newMaxQueries) external onlyOwner {
        require(newMaxQueries > 0, "MAX_QUERIES must be greater than 0");
        MAX_QUERIES = newMaxQueries;
        emit MaxQueriesUpdated(newMaxQueries);
    }

    function setIdleTimeLimit(uint256 newIdleTimeLimit) external onlyOwner {
        require(newIdleTimeLimit > 0, "IDLE_TIME_LIMIT must be greater than 0");
        IDLE_TIME_LIMIT = newIdleTimeLimit;
        emit IdleTimeLimitUpdated(newIdleTimeLimit);
    }

    function setMaxQueryFee(uint256 newMaxQueryFee) external onlyOwner {
        require(newMaxQueryFee > 0, "MAX_QUERY_FEE must be greater than 0");
        MAX_QUERY_FEE = newMaxQueryFee;
        emit MaxQueryFeeUpdated(newMaxQueryFee);
    }

    function prizePool() public view returns (uint256) {
        return address(this).balance;
    }

    function getAllPlayers() public view returns (address[] memory) {
        return players;
    }

    fallback() external payable {
        revert("Fallback function is not implemented");
    }

    receive() external payable {}
}
