const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contract with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy the contract with initial funding
  const LittlefingerGame = await hre.ethers.getContractFactory("LittlefingerGame");
  const contract = await LittlefingerGame.deploy({
    value: hre.ethers.utils.parseEther("800"), // 800 POL for initial funding
  });

  await contract.deployed();
  console.log("Contract deployed to:", contract.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });