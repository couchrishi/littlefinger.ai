const { ethers } = require("hardhat");

let expect;

before(async () => {
  const chai = await import("chai");
  expect = chai.expect;
  const { solidity } = await import("ethereum-waffle");
  chai.use(solidity);
});

describe("LittlefingerGame Contract Tests", function () {
  let contract, deployer, user1, user2, user3;

  beforeEach(async function () {
    [deployer, user1, user2, user3] = await ethers.getSigners();
    const LittlefingerGame = await ethers.getContractFactory("LittlefingerGame");
    contract = await LittlefingerGame.deploy({ value: ethers.utils.parseEther("10") });
    await contract.deployed();
  });

  it("Should deploy with correct initial values", async function () {
    const owner = await contract.owner();
    expect(owner).to.equal(deployer.address);
    const initialPrizePool = await contract.prizePool();
    expect(initialPrizePool.toString()).to.equal(ethers.utils.parseEther("10").toString());
  });

  it("Should submit a query, calculate fee, and emit events", async function () {
    const queryFee = await contract.calculateQueryFee();
    const tx = await contract.connect(user1).submitQuery("Test Query", "QID-1", { value: queryFee });
    const receipt = await tx.wait();

    expect(receipt.events).to.have.lengthOf.at.least(4);

    const queryFeeEvent = receipt.events.find(e => e.event === "QueryFeePaid");
    expect(queryFeeEvent).to.exist;
    expect(queryFeeEvent.args.player).to.equal(user1.address);
    expect(queryFeeEvent.args.feeAmount).to.equal(queryFee);
    expect(queryFeeEvent.args.queryID).to.equal("QID-1");

    const nextQueryFeeEvent = receipt.events.find(e => e.event === "NextQueryFee");
    expect(nextQueryFeeEvent).to.exist;

    const currentPrizePoolEvent = receipt.events.find(e => e.event === "CurrentPrizePool");
    expect(currentPrizePoolEvent).to.exist;

    const gameIdleSinceEvent = receipt.events.find(e => e.event === "GameIdleSince");
    expect(gameIdleSinceEvent).to.exist;
  });

  it("Should increase the prize pool correctly", async function () {
    const initialPrizePool = await contract.prizePool();
    const queryFee = await contract.calculateQueryFee();
    await contract.connect(user2).submitQuery("Test Query 2", "QID-2", { value: queryFee });
    const updatedPrizePool = await contract.prizePool();
    const expectedPrizePool = initialPrizePool.add(queryFee.mul(80).div(100));
    expect(updatedPrizePool.toString()).to.equal(expectedPrizePool.toString());
  });

  it("Should end the game due to exhaustion and emit relevant events", async function () {
    await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine");
    await expect(contract.connect(deployer).endGameDueToExhaustion())
      .to.emit(contract, "GameEnded")
      .to.emit(contract, "RestOfThePlayersRewardAfterGameExhaustion");
  });

  it("Should reset the game and emit all reset events", async function () {
    await expect(contract.connect(deployer).resetGame({ value: ethers.utils.parseEther("1") }))
      .to.emit(contract, "GameResetByOwner")
      .to.emit(contract, "GameStarted")
      .to.emit(contract, "GameIdleSince")
      .to.emit(contract, "CurrentPrizePool");
  });

  it("Should revert on an invalid query", async function () {
    await expect(
      contract.connect(user1).submitQuery("", "QID-Invalid", { value: ethers.utils.parseEther("0.01") })
    ).to.be.revertedWith("InvalidQuery");
  });

  it("Should revert if query fee is insufficient", async function () {
    const queryFee = await contract.calculateQueryFee();
    await expect(
      contract.connect(user1).submitQuery("Test Query", "QID-LowFee", { value: queryFee.sub(1) })
    ).to.be.revertedWith("InsufficientQueryFee");
  });

  it("Should allow the owner to withdraw funds and emit event", async function () {
    const balance = await ethers.provider.getBalance(contract.address);
    await expect(contract.connect(deployer).withdraw())
      .to.emit(contract, "Withdrawal")
      .withArgs(deployer.address, balance);
    const finalBalance = await ethers.provider.getBalance(contract.address);
    expect(finalBalance).to.equal(0);
  });

  it("Should approve prize transfer and emit relevant event", async function () {
    const prizePoolBefore = await contract.prizePool();
    await expect(contract.connect(deployer).approveTransfer(user1.address))
      .to.emit(contract, "PrizeTransferApproved")
      .withArgs(user1.address, prizePoolBefore);
    const prizePoolAfter = await contract.prizePool();
    expect(prizePoolAfter).to.equal(0);
  });

  it("Should update MAX_QUERIES, IDLE_TIME_LIMIT, and MAX_QUERY_FEE", async function () {
    await expect(contract.setMaxQueries(10000))
      .to.emit(contract, "MaxQueriesUpdated")
      .withArgs(10000);

    await expect(contract.setIdleTimeLimit(14 * 24 * 60 * 60))
      .to.emit(contract, "IdleTimeLimitUpdated")
      .withArgs(14 * 24 * 60 * 60);

    await expect(contract.setMaxQueryFee(ethers.utils.parseEther("2")))
      .to.emit(contract, "MaxQueryFeeUpdated")
      .withArgs(ethers.utils.parseEther("2"));

    expect(await contract.MAX_QUERIES()).to.equal(10000);
    expect(await contract.IDLE_TIME_LIMIT()).to.equal(14 * 24 * 60 * 60);
    expect(await contract.MAX_QUERY_FEE()).to.equal(ethers.utils.parseEther("2"));
  });

  it("Should revert with GameExhausted if no interaction for 7 days", async function () {
    await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine");
    await expect(
      contract.connect(user1).submitQuery("Test Query", "QID-IdleTime", { value: ethers.utils.parseEther("0.01") })
    ).to.be.revertedWith("GameExhausted");
  });

  it("Should correctly calculate the next query fee", async function () {
    const nextFee = await contract.calculateNextQueryFee();
    const currentFee = await contract.calculateQueryFee();
    expect(nextFee).to.be.gte(currentFee);
  });

  it("Should revert on fallback call", async function () {
    await expect(
      deployer.sendTransaction({ to: contract.address, data: "0x12345678", value: ethers.utils.parseEther("1") })
    ).to.be.revertedWith("Fallback function is not implemented");
  });

  it("Should revert if approveTransfer is called with zero address", async function () {
    await expect(contract.connect(deployer).approveTransfer(ethers.constants.AddressZero))
      .to.be.revertedWith("InvalidRecipient");
  });

  it("Should emit GameEnded and RestOfThePlayersRewardAfterGameExhaustion", async function () {
    await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine");
    await expect(contract.connect(deployer).endGameDueToExhaustion())
      .to.emit(contract, "GameEnded")
      .to.emit(contract, "RestOfThePlayersRewardAfterGameExhaustion");
  });
});
