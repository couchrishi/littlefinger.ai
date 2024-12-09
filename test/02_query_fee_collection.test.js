const { ethers } = require("hardhat");
const fs = require("fs");

let expect;

// Dynamically import chai before running the tests
before(async () => {
  const chai = await import("chai");
  expect = chai.expect;
});

describe("Query Fee Collection", function () {
  let contract;

  before(async function () {
    // Read the contract address from the JSON file
    const { address } = JSON.parse(fs.readFileSync("./deployed_contract_address.json", "utf8"));

    // Attach to the deployed contract
    const LittlefingerGame = await ethers.getContractFactory("LittlefingerGame");
    contract = await LittlefingerGame.attach(address);
  });

  it("Should correctly add query fees to the prize pool", async function () {
    const [treasury, user] = await ethers.getSigners();

    // Define the query fee (1 POL in this case)
    const queryFee = ethers.utils.parseEther("1.0");

    // User pays the query fee
    await contract.connect(user).payQueryFee({ value: queryFee });

    // Validate that the prize pool increases by 50% of the query fee
    const prizePool = await contract.prizePool();
    expect(prizePool).to.equal(queryFee.div(2)); // 50% of query fee
  });
});
