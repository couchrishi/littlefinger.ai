const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Fallback and Edge Cases", function () {
  it("Should handle unexpected inputs gracefully", async function () {
    const [treasury, user] = await ethers.getSigners();
    const LittlefingerGame = await ethers.getContractFactory("LittlefingerGame");
    const contract = await LittlefingerGame.deploy(treasury.address);
    await contract.deployed();

    await expect(contract.connect(user).sendQuery("", { value: ethers.utils.parseEther("1.0") }))
      .to.be.revertedWith("Invalid query");
  });
});
