const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Query Limits", function () {
  it("Should enforce query limits", async function () {
    const [treasury, user] = await ethers.getSigners();
    const LittlefingerGame = await ethers.getContractFactory("LittlefingerGame");
    const contract = await LittlefingerGame.deploy(treasury.address);
    await contract.deployed();

    for (let i = 0; i < 10; i++) {
      await contract.connect(user).sendQuery(`Query ${i}`, {
        value: ethers.utils.parseEther("1.0"),
      });
    }

    await expect(
      contract.connect(user).sendQuery("Excess query", {
        value: ethers.utils.parseEther("1.0"),
      })
    ).to.be.revertedWith("Query limit exceeded");
  });
});
