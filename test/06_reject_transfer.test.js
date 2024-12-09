const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Reject Transfer", function () {
  it("Should reject prize transfer and retain prize pool", async function () {
    const [treasury, user] = await ethers.getSigners();
    const LittlefingerGame = await ethers.getContractFactory("LittlefingerGame");
    const contract = await LittlefingerGame.deploy(treasury.address);
    await contract.deployed();

    await contract.addPrizePool(ethers.utils.parseEther("10.0"));

    await expect(
      contract.connect(treasury).rejectTransfer(user.address, ethers.utils.parseEther("5.0"))
    ).to.be.revertedWith("Transfer rejected");
  });
});
