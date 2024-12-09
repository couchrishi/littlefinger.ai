const { ethers } = require("hardhat");
const fs = require("fs");

let expect; // Declare expect as a global variable

// Dynamically import chai before running the tests
before(async () => {
  const chai = await import("chai");
  expect = chai.expect;
});

describe("Contract Deployment", function () {
  it("Should deploy with the correct initial values", async function () {
    const LittlefingerGame = await ethers.getContractFactory("LittlefingerGame");
    const contract = await LittlefingerGame.deploy();
    await contract.deployed();

    const owner = await contract.owner();
    const [deployer] = await ethers.getSigners();

    expect(owner).to.equal(deployer.address); // Check if the deployer is the owner

    // Save the contract address
    fs.writeFileSync(
      "./deployed_contract_address.json",
      JSON.stringify({ address: contract.address })
    );
  });
});
