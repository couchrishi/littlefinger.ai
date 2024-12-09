const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Approve Transfer", function () {
  it("Should allow valid prize transfer approval", async function () {
    const [treasury, user] = await ethers.getSigners();
    const LittlefingerGame = await ethers.getContractFactory("LittlefingerGame");
    const contract = await LittlefingerGame.deploy(treasury.address);
    await contract.deployed();

    await contract.addPrizePool(ethers.utils.parseEther("10.0"));

    await contract.connect(treasury).approveTransfer(user.address, ethers.utils.parseEther("5.0"));
    expect(await contract.prizePool()).to.equal(ethers.utils.parseEther("5.0"));
  });
});
