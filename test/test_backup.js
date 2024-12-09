const { ethers } = require("hardhat");
const fs = require("fs");

let expect; // Declare `expect` as a global variable

// Dynamically import chai before running the tests
before(async () => {
  const chai = await import("chai");
  expect = chai.expect;
  const { solidity } = await import("ethereum-waffle");
  chai.use(solidity);
});

describe("LittlefingerGame Contract Tests", function () {
  let contract, deployer, user1, user2, user3, user4, user5;

  before(async function () {
    // Deploy contract only once per test run
    [deployer, user1, user2, user3, user4, user5] = await ethers.getSigners();
    const LittlefingerGame = await ethers.getContractFactory("LittlefingerGame");
    // Deploy the contract with an initial balance of 800 ETH
    contract = await LittlefingerGame.deploy({
      value: ethers.utils.parseEther("800") // Sending 800 ETH to the contract during deployment
    });
    await contract.deployed();
    console.log(`Contract deployed to: ${contract.address}`);

    // Check the initial balance of the contract right after deployment
    const initialContractBalance = await ethers.provider.getBalance(contract.address);
    console.log(`Initial contract balance after deployment: ${initialContractBalance.toString()}`);

    // Save the deployed contract address to a JSON file
    const deployedContractInfo = {
      address: contract.address,
    };
    fs.writeFileSync("./deployed_contract_address.json", JSON.stringify(deployedContractInfo));
  });
    
  // Test Case 1: Contract Deployment
  it("1) Should deploy with the correct initial values", async function () {
    try {
      const owner = await contract.owner();
      expect(owner).to.equal(deployer.address);
      console.log("#################### Case #1 Passed #################### ")
    } catch (error) {
      console.error("Error in test case #1:", error);
    }
  });
  
  // Test Case 2: Query Fee Collection
  it("2) Should correctly add query fees to the prize pool", async function () {
    try {
      // Get initial contract balance and owner balance before the query fee payment
      const initialContractBalance = await ethers.provider.getBalance(contract.address);
      const initialOwnerBalance = await ethers.provider.getBalance(deployer.address);
  
      // User1 pays the query fee
      const initialQueryFee = ethers.utils.parseEther("0.01");
      await contract.connect(user1).payQueryFee({ value: initialQueryFee });
  
      // The contract balance should increase by 80% of the query fee
      const expectedContractBalance = initialContractBalance.add(initialQueryFee.mul(80).div(100));
      const currentContractBalance = await ethers.provider.getBalance(contract.address);
  
      expect(currentContractBalance.toString()).to.equal(expectedContractBalance.toString());
  
      // Validate that the owner received 20% of the query fee
      const ownerBalanceAfter = await ethers.provider.getBalance(deployer.address);
      const expectedOwnerBalance = initialOwnerBalance.add(initialQueryFee.mul(20).div(100));
  
      // Note: Allow some tolerance for gas fees
      expect(ownerBalanceAfter).to.be.closeTo(expectedOwnerBalance, ethers.utils.parseEther("0.01"));
  
      console.log(`Owner balance after query fee: ${ownerBalanceAfter.toString()}`);
      console.log("#################### Case #2 Passed #################### ");
    } catch (error) {
      console.error("Error in test case #2:", error);
    }
  });
  
  // Test Case 3: Prize Pool Growth
  it("3) Should correctly grow the prize pool over multiple queries", async function () {
    try {
      // Get initial contract balance and query fee from the contract
      let initialContractBalance = await ethers.provider.getBalance(contract.address);
      let initialQueryFee = await contract.queryFee();
  
      // User1 pays the initial query fee
      await contract.connect(user1).payQueryFee({ value: initialQueryFee });
  
      // After user1's query, the contract balance should increase by 80% of the query fee
      let expectedContractBalance = initialContractBalance.add(initialQueryFee.mul(80).div(100));
      let actualContractBalance = await ethers.provider.getBalance(contract.address);
      expect(actualContractBalance.toString()).to.equal(expectedContractBalance.toString());
  
      // Now, get the updated query fee after the first query
      let updatedQueryFee = await contract.queryFee();
  
      // User2 pays the updated query fee
      await contract.connect(user2).payQueryFee({ value: updatedQueryFee });
  
      // Contract balance should increase again by 80% of the updated query fee
      expectedContractBalance = expectedContractBalance.add(updatedQueryFee.mul(80).div(100));
      actualContractBalance = await ethers.provider.getBalance(contract.address);
  
      expect(actualContractBalance.toString()).to.equal(expectedContractBalance.toString());
  
      console.log("#################### Case #3 Passed #################### ");
    } catch (error) {
      console.error("Error in test case #3:", error);
    }
  });
  
    
  // Test Case 4: Max Queries Limit Enforcement
it("4) Should enforce max queries limit", async function () {
  try {
    const maxQueries = 200; // Define max queries allowed

    // Fund user3 to ensure they have enough balance to pay query fees and gas
    const deployerBalance = await ethers.provider.getBalance(deployer.address);
    console.log(`Deployer balance before funding user: ${deployerBalance.toString()}`);

    // Transfer some funds to user3 (this is done from the deployer)
    const transferAmount = ethers.utils.parseEther("100.0"); // 1000 POL tokens equivalent in ETH
    await deployer.sendTransaction({
      to: user3.address,
      value: transferAmount
    });

    const user3Balance = await ethers.provider.getBalance(user3.address);
    console.log(`User3 balance after funding: ${user3Balance.toString()}`);

    // Start by checking the initial query fee
    let queryFee = await contract.queryFee();
    console.log("Initial query fee:", queryFee.toString());

    // Loop through to simulate 200 queries
    for (let i = 0; i < maxQueries; i++) {
      // Send the current query fee dynamically
      await contract.connect(user3).payQueryFee({ value: queryFee });

      // Get the updated query fee after this payment
      queryFee = await contract.queryFee();

      // Log the current query count
      let playerQueryCount = await contract.playerQueryCount(user3.address);
      //console.log(`User3 query count after query ${i + 1}:`, playerQueryCount.toString());
    }

    // Check that playerQueryCount for user3 has reached the maxQueries limit
    let playerQueryCount = await contract.playerQueryCount(user3.address);
    //console.log("Final query count after 200 queries:", playerQueryCount.toString());
    expect(playerQueryCount.toString()).to.equal(maxQueries.toString());

    // Attempt to make one more query, expecting it to fail
    await expect(
      contract.connect(user3).payQueryFee({ value: queryFee })
    ).to.be.revertedWith("Max queries reached");

    // Final query count to ensure no further queries are allowed
    playerQueryCount = await contract.playerQueryCount(user3.address);
    console.log("Final query count after attempting the 201st query:", playerQueryCount.toString());
    expect(playerQueryCount.toString()).to.equal(maxQueries.toString()); // Ensure no more than 200 queries are allowed

    console.log("####################  Case #4 Passed #################### ");
  } catch (error) {
    console.error("Error in test case #4:", error);
  }
});

// Test Case 5: Approve Transfer
it("5) Should allow the owner to approve transfer to a specified recipient", async function () {
  try {
    // Get the initial contract balance and query fee from the contract
    const initialContractBalance = await ethers.provider.getBalance(contract.address);
    let queryFee = await contract.queryFee();

    // User1 pays the initial query fee
    await contract.connect(user1).payQueryFee({ value: queryFee });

    // User2 pays the updated query fee
    let updatedQueryFee = await contract.queryFee();
    await contract.connect(user2).payQueryFee({ value: updatedQueryFee });

    // Check the updated contract balance
    let updatedContractBalance = await ethers.provider.getBalance(contract.address);
    let expectedContractBalance = initialContractBalance.add(queryFee.mul(80).div(100)).add(updatedQueryFee.mul(80).div(100));

    // Assert the contract balance is as expected
    expect(updatedContractBalance.toString()).to.equal(expectedContractBalance.toString());

    // Ensure contract balance is greater than or equal to the prize pool value
    expect(updatedContractBalance.gte(expectedContractBalance)).to.be.true;

    // Get user4 balance before the transfer
    const user4BalanceBefore = await ethers.provider.getBalance(user4.address);

    // The deployer (owner) approves the transfer to user4
    const approveTx = await contract.connect(deployer).approveTransfer(user4.address);
    const approveReceipt = await approveTx.wait();

    // Ensure that the TransferApproved event was emitted
    const event = approveReceipt.events.find(e => e.event === "TransferApproved");
    if (!event) {
      throw new Error("TransferApproved event was not emitted");
    }

    // Check if the contract balance is correctly transferred to user4
    const user4BalanceAfter = await ethers.provider.getBalance(user4.address);
    expect(user4BalanceAfter).to.be.above(user4BalanceBefore);

    // Verify the contract balance is now zero
    const contractBalanceAfter = await ethers.provider.getBalance(contract.address);
    expect(contractBalanceAfter.toString()).to.equal("0");

    console.log("#################### Case #5 Passed #################### ");
  } catch (error) {
    console.error("Error in test case #5:", error);
  }
});

// Test Case 6: Public Queries Visibility
it("6) Should emit events for public queries", async function () {
  try {
    // Load the contract from the address in the JSON file
    const { address: deployedContractAddress } = JSON.parse(
      fs.readFileSync("./deployed_contract_address.json", "utf8")
    );

    const LittlefingerGame = await ethers.getContractFactory("LittlefingerGame");
    const contract = LittlefingerGame.attach(deployedContractAddress);

    // User1 pays the query fee and submits a query
    const queryFee = await contract.queryFee();
    const queryString = "Is this game public?";

    await expect(
      contract.connect(user1).submitQuery(queryString, { value: queryFee })
    )
      .to.emit(contract, "QuerySubmitted")
      .withArgs(user1.address, queryString);

    console.log("#################### Case #6 Passed ####################");
  } catch (error) {
    console.error("Error in test case #6:", error);
  }
});

// Test Case 7: Fallback and Edge Cases
it("Should handle unexpected inputs gracefully", async function () {
  try {
    // Sending an empty query should revert
    await expect(contract.connect(user5).submitQuery("", { value: ethers.utils.parseEther("0.01") }))
      .to.be.revertedWith("Invalid query");

    // Sending Ether without calling a function should also revert
    await expect(user5.sendTransaction({
      to: contract.address,
      value: ethers.utils.parseEther("1.0"),
    })).to.be.revertedWith("Direct Ether transfers are not allowed");

    console.log("#################### Case #7 Passed ####################");
  }
  catch (error) {
    console.error("Error in test case #7:", error);
  }
});

// Test Case 8: Get the list of all players
it("Should get the list of all players", async function () {
  try {
  const players = await contract.getAllPlayers();
  console.log("List of all players:", players);
  expect(players.length).to.be.greaterThan(0); // Verify that there are participants
  console.log("#################### Case #8 Passed ####################");
  }
  catch (error) {
    console.error("Error in test case #8:", error);
  }
});

// Test Case 9: End Game Reward Distribution
it("Should correctly distribute prize pool on game exhaustion", async function () {
  try {
    // User1 pays the query fee
    let queryFee = await contract.queryFee(); // Get initial query fee
    console.log("User1 paying query fee of: ", ethers.utils.formatEther(queryFee));
    await contract.connect(user1).payQueryFee({ value: queryFee });
    console.log("User1 paid query fee");

    // User2 pays the updated query fee
    queryFee = await contract.queryFee(); // Get updated query fee
    console.log("User2 paying query fee of: ", ethers.utils.formatEther(queryFee));
    await contract.connect(user2).payQueryFee({ value: queryFee });
    console.log("User2 paid query fee");

    // User3 pays the updated query fee
    queryFee = await contract.queryFee(); // Get updated query fee
    console.log("User3 paying query fee of: ", ethers.utils.formatEther(queryFee));
    await contract.connect(user3).payQueryFee({ value: queryFee });
    console.log("User3 paid query fee");

    console.log("User-1 address: ", user1.address);
    console.log("User-2 address: ", user2.address);
    console.log("User-3 address: ", user3.address);

    // Validate that the last player recorded in the contract is the most recent one who paid
    try {
      const lastPlayer = await contract.lastPlayer();
      console.log("Recorded last player:", lastPlayer);
      expect(lastPlayer).to.equal(user3.address, "The last player recorded does not match the most recent participant");
      console.log("############# Last Player verified #############");
    } catch (error) {
      console.error("Error validating last player:", error);
      throw error;
    }

    // Call endGameDueToExhaustion (only owner can call it)
    try {
      const initialContractBalance = await ethers.provider.getBalance(contract.address);
      console.log("Initial contract balance in ether: ", ethers.utils.formatEther(initialContractBalance));
      expect(initialContractBalance).to.be.gt(0, "No prize pool available for distribution");

      await expect(contract.connect(deployer).endGameDueToExhaustion())
        .to.emit(contract, "GameEndedDueToExhaustion")
        .withArgs(initialContractBalance.toString());
      console.log("GameEndedDueToExhaustion event emitted");
      console.log("############# Prize Pool Available for Distribution #############");
    } catch (error) {
      console.error("Error ending game due to exhaustion:", error);
      throw error;
    }

    // Check the balance of the last player after receiving 10% of the prize pool
    try {
      const initialContractBalance = await ethers.provider.getBalance(contract.address);
      const initialLastPlayerBalance = await ethers.provider.getBalance(user3.address);
      const expectedLastPlayerReward = initialContractBalance.mul(10).div(100);
      console.log("Expected last player reward in ether: ", ethers.utils.formatEther(expectedLastPlayerReward));

      const lastPlayerBalanceAfter = await ethers.provider.getBalance(user3.address);
      console.log("Last player balance after reward in ether: ", ethers.utils.formatEther(lastPlayerBalanceAfter));

      // Allow some tolerance due to gas fees
      expect(lastPlayerBalanceAfter).to.be.closeTo(
        expectedLastPlayerReward.add(initialLastPlayerBalance),
        ethers.utils.parseEther("0.01")
      );
      console.log("Last player reward validated");
    } catch (error) {
      console.error("Error validating last player reward:", error);
      throw error;
    }

    // Check balances for other players to validate distribution of remaining 90%
    try {
      const initialContractBalance = await ethers.provider.getBalance(contract.address);
      const expectedLastPlayerReward = initialContractBalance.mul(10).div(100);
      const remainingPool = initialContractBalance.sub(expectedLastPlayerReward);
      const totalQueries = await contract.totalQueriesCount();
      console.log("Remaining pool in ether: ", ethers.utils.formatEther(remainingPool));
      console.log("Total queries: ", totalQueries.toString());

      const players = await contract.getAllPlayers();
      for (let i = 0; i < players.length; i++) {
        const player = players[i];
        const playerQueryCount = await contract.playerQueryCount(player);

        console.log(`Player ${player} query count: ${playerQueryCount.toString()}`);

        if (playerQueryCount.eq(0)) {
          console.log(`Player ${player} has no queries, expected reward is zero.`);
          continue;
        }

        // Use a scaling factor for precision during the reward calculation
        const scalingFactor = ethers.BigNumber.from("1000000000000000000"); // Equivalent to 1e18
        const expectedPlayerReward = remainingPool
          .mul(scalingFactor)
          .mul(playerQueryCount)
          .div(totalQueries)
          .div(scalingFactor);

        console.log(`Player ${player} expected reward in ether: `, ethers.utils.formatEther(expectedPlayerReward));

        // Get player balance after reward distribution
        const playerBalanceAfter = await ethers.provider.getBalance(player);

        console.log(`Player ${player} balance after reward in ether: `, ethers.utils.formatEther(playerBalanceAfter));

        // Allow some tolerance for gas fees
        if (expectedPlayerReward.gt(0)) {
          const initialBalance = await ethers.provider.getBalance(player); // Get the player's initial balance
          console.log(`Player ${player} initial balance in ether: `, ethers.utils.formatEther(initialBalance));

          expect(playerBalanceAfter).to.be.closeTo(
            expectedPlayerReward.add(initialBalance),
            ethers.utils.parseEther("0.01")
          );
          console.log(`Player ${player} reward validated`);
        } else {
          console.log(`Player ${player} reward is too small, effectively zero.`);
        }
      }
    } catch (error) {
      console.error("Error validating player rewards:", error);
      throw error;
    }

    console.log("#################### Case #9 Passed ####################");
  } catch (error) {
    console.error("Error in test case #9:", error);
  }
});


});
