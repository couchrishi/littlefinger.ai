const { ethers } = require("hardhat");

let expect;

before(async () => {
  const chai = await import("chai"); // Dynamically import chai
  expect = chai.expect;
  const { solidity } = await import("ethereum-waffle"); // Dynamically import waffle
  chai.use(solidity);
});

describe("LittlefingerGame Contract Tests", function () {
  let contract, deployer, user1, user2, user3;

  beforeEach(async function () {
    // Deploy a fresh contract before each test
    [deployer, user1, user2, user3] = await ethers.getSigners();
    const LittlefingerGame = await ethers.getContractFactory("LittlefingerGame");
    contract = await LittlefingerGame.deploy({ value: ethers.utils.parseEther("10") });
    await contract.deployed();
    console.log(`Contract deployed to: ${contract.address}`);
  });

  // Test 1: Contract Deployment
  it("Should deploy with correct initial values", async function () {
    const owner = await contract.owner();
    expect(owner).to.equal(deployer.address);

    const initialPrizePool = await contract.prizePool();
    expect(initialPrizePool.toString()).to.equal(ethers.utils.parseEther("10").toString());

    console.log("Contract deployed with correct initial values.");
  });

  // Test 2: Query Fee and Event Emission
  it("Should correctly calculate and allocate query fees, and emit QueryFeePaid", async function () {
    const queryFee = await contract.calculateQueryFee();
    const tx = await contract.connect(user1).submitQuery("Test Query", "QID-1", { value: queryFee });
    const receipt = await tx.wait();
    const event = receipt.events.find(e => e.event === "QueryFeePaid");

    expect(event).to.exist;
    expect(event.args.player).to.equal(user1.address);
    expect(event.args.feeAmount.toString()).to.equal(queryFee.toString());
    expect(event.args.queryID).to.equal("QID-1");
    console.log("QueryFeePaid event emitted correctly.");
  });

  // Test 3: Prize Pool Growth and Event Emission
  it("Should grow prize pool correctly and emit NextQueryFee", async function () {
    const initialPrizePool = await contract.prizePool();
    const queryFee = await contract.calculateQueryFee();

    const tx = await contract.connect(user2).submitQuery("Test Query 2", "QID-2", { value: queryFee });
    const receipt = await tx.wait();
    const event = receipt.events.find(e => e.event === "NextQueryFee");

    const updatedPrizePool = await contract.prizePool();
    const expectedPrizePool = initialPrizePool.add(queryFee.mul(80).div(100));

    expect(updatedPrizePool.toString()).to.equal(expectedPrizePool.toString());
    expect(event).to.exist;
    console.log("Prize pool updated and NextQueryFee event emitted correctly.");
  });

  // Test 4: End Game Due to Exhaustion
  it("Should emit correct events when game ends due to exhaustion", async function () {
    const initialPrizePool = await contract.prizePool();

    const query1Fee = await contract.calculateQueryFee();
    await contract.connect(user1).submitQuery("Query 1", "QID-1", { value: query1Fee });

    const query2Fee = await contract.calculateQueryFee();
    await contract.connect(user2).submitQuery("Query 2", "QID-2", { value: query2Fee });

    const query3Fee = await contract.calculateQueryFee();
    await contract.connect(user3).submitQuery("Query 3", "QID-3", { value: query3Fee });

    const expectedPrizePool = initialPrizePool
      .add(query1Fee.mul(80).div(100))
      .add(query2Fee.mul(80).div(100))
      .add(query3Fee.mul(80).div(100));

    const tx = await contract.connect(deployer).endGameDueToExhaustion();
    const receipt = await tx.wait();

    const event1 = receipt.events.find(e => e.event === "PrizeToBeDistributedDueToGameExhaustion");
    const event2 = receipt.events.find(e => e.event === "PrizePoolBalanceAfterGameExhaustion");

    expect(event1).to.exist;
    expect(event1.args.totalPrizePoolBeforeDistribution.toString()).to.equal(
      expectedPrizePool.toString()
    );
    expect(event2).to.exist;
    expect(event2.args.remainingPrizePool.toString()).to.equal("0");

    console.log("Game ended due to exhaustion, events emitted correctly.");
  });

  // Test 5: Invalid Query
  it("Should handle invalid query inputs gracefully", async function () {
    await expect(
      contract.connect(user1).submitQuery("", "QID-Invalid", { value: ethers.utils.parseEther("0.01") })
    ).to.be.revertedWith("InvalidQuery");
    console.log("InvalidQuery error handled correctly.");
  });

  // Test 6: Insufficient Query Fee
  it("Should revert if query fee is insufficient", async function () {
    const queryFee = await contract.calculateQueryFee();

    await expect(
      contract.connect(user1).submitQuery("Test Query", "QID-LowFee", { value: queryFee.sub(1) })
    ).to.be.revertedWith("InsufficientQueryFee");

    console.log("InsufficientQueryFee error handled correctly.");
  });

  // Test 7: Max Queries Per Player
  it("Should enforce max queries limit per player", async function () {
    const maxQueries = await contract.MAX_QUERIES();
    for (let i = 0; i < maxQueries; i++) {
      const queryFee = await contract.calculateQueryFee();
      await contract.connect(user2).submitQuery(`Query ${i}`, `QID-${i}`, { value: queryFee });
    }

    const queryFee = await contract.calculateQueryFee();
    await expect(
      contract.connect(user2).submitQuery("Exceed Query", "QID-Max", { value: queryFee })
    ).to.be.revertedWith("MaxQueriesReached");

    console.log("MaxQueriesReached error handled correctly.");
  });

  // Test 8: Unauthorized Access
  it("Should revert with Unauthorized for non-owner actions", async function () {
    await expect(contract.connect(user1).approveTransfer(user1.address)).to.be.revertedWith("Unauthorized");
    console.log("Unauthorized error handled correctly.");
  });

  // Test 9: Invalid Recipient
  it("Should revert with InvalidRecipient when recipient is invalid", async function () {
    await expect(contract.connect(deployer).approveTransfer(ethers.constants.AddressZero)).to.be.revertedWith("InvalidRecipient");
    console.log("InvalidRecipient error handled correctly.");
  });

  // Test 10: Idle Time Exceeded
  it("Should revert with GameExhausted after exceeding idle time", async function () {
    await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]); // Simulate exceeding idle time (1 week)
    await ethers.provider.send("evm_mine");

    await expect(
      contract.connect(user1).submitQuery("Test Query", "QID-IdleTime", { value: ethers.utils.parseEther("0.01") })
    ).to.be.revertedWith("GameExhausted");
    console.log("GameExhausted error due to idle time handled correctly.");
  });

  // Test 11: Withdraw Function
  it("Should allow the owner to withdraw funds", async function () {
    const initialContractBalance = await ethers.provider.getBalance(contract.address);
    const initialOwnerBalance = await ethers.provider.getBalance(deployer.address);

    const tx = await contract.connect(deployer).withdraw();
    const receipt = await tx.wait();
    const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);

    const finalContractBalance = await ethers.provider.getBalance(contract.address);
    const finalOwnerBalance = await ethers.provider.getBalance(deployer.address);

    expect(finalContractBalance).to.equal(0);
    expect(finalOwnerBalance).to.equal(initialOwnerBalance.add(initialContractBalance).sub(gasUsed));

    console.log("Withdrawal successful, owner balance updated correctly.");
  });
});
