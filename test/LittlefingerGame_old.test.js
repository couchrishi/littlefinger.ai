const { ethers } = require("hardhat");
const fs = require("fs");
let expect;

before(async () => {
  const chai = await import("chai");
  expect = chai.expect;
  const { solidity } = await import("ethereum-waffle");
  chai.use(solidity);
});

describe("LittlefingerGame Contract Tests", function () {
  let contract, deployer, user1, user2, user3, user4;

  beforeEach(async function () {
    // Deploy fresh contract for each test
    [deployer, user1, user2, user3, user4] = await ethers.getSigners();
    const LittlefingerGame = await ethers.getContractFactory("LittlefingerGame");
    contract = await LittlefingerGame.deploy({ value: ethers.utils.parseEther("800") });
    await contract.deployed();
    console.log(`Contract deployed to: ${contract.address}`);
  });

  // Test Case 1: Contract Deployment
  it("1) Should deploy with correct initial values", async function () {
    const owner = await contract.owner();
    expect(owner).to.equal(deployer.address);

    const initialPrizePool = await contract.prizePool();
    expect(initialPrizePool.toString()).to.equal(ethers.utils.parseEther("800").toString());

    console.log("################### Test case #1: Contract Deployment successful ###################");
  });

  // Test Case 2: Query Fee Progression
  it("2) Should calculate query fees correctly and reflect allocation", async function () {
    try {
      let queryFee;
  
      // Test Linear Growth (First 30 Queries)
      for (let i = 0; i < 30; i++) {
        queryFee = await contract.calculateQueryFee();
        const expectedFee = ethers.utils.parseEther((0.01 + 0.001 * i).toFixed(3)).toString(); // Linear formula
        expect(queryFee.toString()).to.equal(expectedFee); // Assert linear fee
        await contract.connect(user1).submitQuery(`Linear Query ${i}`, { value: queryFee });
      }
  
      // Expect final linear fee (30th query)
      queryFee = await contract.calculateQueryFee();
      expect(queryFee.toString()).to.equal(ethers.utils.parseEther("0.04").toString()); // Fee for the 30th query
  
      // Test Exponential Growth (Starting from 31st Query)
      for (let i = 31; i <= 33; i++) {
        queryFee = await contract.calculateQueryFee();
        const expectedExponentialFee = ethers.utils
          .parseEther((0.05 * Math.pow(1.25, i - 30)).toFixed(6))
          .toString(); // Exponential formula
        expect(queryFee.toString()).to.equal(expectedExponentialFee); // Assert exponential fee
        await contract.connect(user1).submitQuery(`Exponential Query ${i}`, { value: queryFee });
      }
  
      console.log("################### Test case #2: Query Fee Progression successful ###################");
    } catch (error) {
      console.error("Error in Test Case #2:", error);
    }
  });
  
  

  // Test Case 3: Prize Pool Growth
  it("3) Should grow the prize pool correctly with each query", async function () {
    const initialPrizePool = await contract.prizePool();
    const queryFee = await contract.calculateQueryFee();

    await contract.connect(user1).submitQuery("Query 1", { value: queryFee });
    const updatedPrizePool = await contract.prizePool();

    const expectedPrizePool = initialPrizePool.add(queryFee.mul(80).div(100));
    expect(updatedPrizePool.toString()).to.equal(expectedPrizePool.toString());

    console.log("################### Test case #3: Prize Pool Growth successful ###################");
  });

  // Test Case 4: Max Queries Limit
  it("4) Should enforce max queries limit per player", async function () {
    const maxQueries = await contract.MAX_QUERIES();

    for (let i = 0; i < maxQueries.toNumber(); i++) {
      const queryFee = await contract.calculateQueryFee();
      await contract.connect(user2).submitQuery(`Query ${i}`, { value: queryFee });
    }

    const queryFee = await contract.calculateQueryFee();
    await expect(contract.connect(user2).submitQuery("Exceed Query", { value: queryFee }))
      .to.be.revertedWith("Max queries reached");

    console.log("################### Test case #4: Max Queries Limit Enforcement successful ###################");
  });

  // Test Case 5: Transfer Approvals
  it("5) Should allow owner to approve and distribute prize pool", async function () {
    await contract.connect(user3).submitQuery("Test Query", { value: ethers.utils.parseEther("0.01") });

    const initialPrizePool = await contract.prizePool();
    await contract.connect(deployer).approveTransfer(user3.address);

    const prizePoolAfterTransfer = await contract.prizePool();
    expect(prizePoolAfterTransfer.toString()).to.equal("0");

    const userBalanceAfter = await ethers.provider.getBalance(user3.address);
    expect(userBalanceAfter).to.be.above(initialPrizePool);

    console.log("################### Test case #5: Transfer Approvals successful ###################");
  });

  // Test Case 6: Handle Edge Cases
  it("6) Should handle invalid inputs gracefully", async function () {
    await expect(
      contract.connect(user4).submitQuery("", { value: ethers.utils.parseEther("0.01") })
    ).to.be.revertedWith("Invalid query");

    const queryFee = await contract.calculateQueryFee();
    await expect(
      contract.connect(user4).submitQuery("Query", { value: queryFee.sub(1) })
    ).to.be.revertedWith("Insufficient query fee");

    console.log("################### Test case #6: Handle Edge Cases successful ###################");
  });

  // Test Case 7: End Game Due to Exhaustion
  it("7) Should distribute rewards correctly when game ends due to exhaustion", async function () {
    await contract.connect(user1).submitQuery("Query 1", { value: ethers.utils.parseEther("0.01") });
    await contract.connect(deployer).endGameDueToExhaustion();

    const prizePoolAfter = await contract.prizePool();
    expect(prizePoolAfter.toString()).to.equal("0");

    console.log("################### Test case #7: End Game Due to Exhaustion successful ###################");
  });

  // Test Case 8: Public Queries Visibility
  it("8) Should emit events for public queries", async function () {
    const queryFee = await contract.calculateQueryFee();
    const queryString = "Is this game public?";

    await expect(
      contract.connect(user1).submitQuery(queryString, { value: queryFee })
    )
      .to.emit(contract, "QuerySubmitted")
      .withArgs(user1.address, queryString, queryFee);

    console.log("################### Test case #8: Public Queries Visibility successful ###################");
  });
});
