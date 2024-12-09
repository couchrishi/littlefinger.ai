const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Prize Pool Growth", function () {
  it("Should increase prize pool dynamically with query fees", async function () {
    const [treasury, user] = await ethers.getSigners();
    const LittlefingerGame = await ethers.getContractFactory("LittlefingerGame");
    const contract = await LittlefingerGame.deploy(treasury.address);
    await contract.deployed();

    const queryFee = ethers.utils.parseEther("2.0");
    await contract.connect(user).sendQuery("Another query", { value: queryFee });

    const prizePool = await contract.prizePool();
    expect(prizePool).to.equal(queryFee.div(2));
  });
});
