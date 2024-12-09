const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Public Queries Visibility", function () {
  it("Should emit events for public queries", async function () {
    const [treasury, user] = await ethers.getSigners();
    const LittlefingerGame = await ethers.getContractFactory("LittlefingerGame");
    const contract = await LittlefingerGame.deploy(treasury.address);
    await contract.deployed();

    const queryFee = ethers.utils.parseEther("1.0");
    await expect(contract.connect(user).sendQuery("Visible query", { value: queryFee }))
      .to.emit(contract, "QuerySubmitted")
      .withArgs(user.address, "Visible query");
  });
});
