const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Gas Efficiency", function () {
  it("Should calculate gas costs for key operations", async function () {
    const [treasury, user] = await ethers.getSigners();
    const LittlefingerGame = await ethers.getContractFactory("LittlefingerGame");
    const contract = await LittlefingerGame.deploy(treasury.address);
    await contract.deployed();

    const tx = await contract.connect(user).sendQuery("Gas efficiency query", {
      value: ethers.utils.parseEther("1.0"),
    });
    const receipt = await tx.wait();
    console.log(`Gas used: ${receipt.gasUsed.toString()}`);
  });
});
