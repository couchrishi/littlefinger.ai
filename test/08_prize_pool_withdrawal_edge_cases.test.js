const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Prize Pool Withdrawal Edge Cases", function () {
  it("Should prevent withdrawals under invalid conditions", async function () {
    const [treasury, user] = await ethers.getSigners();
    const LittlefingerGame = await ethers.getContractFactory("LittlefingerGame");
    const contract = await LittlefingerGame.deploy(treasury.address);
    await contract.deployed();

    await expect(
      contract.connect(user).withdrawPrize(ethers.utils.parseEther("5.0"))
    ).to.be.revertedWith("Invalid withdrawal conditions");
  });
});
