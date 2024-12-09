#!/usr/bin/env node
const { ethers } = require('ethers');
const hre = require("hardhat");
const admin = require("firebase-admin");
const { exec } = require("child_process");
const yargs = require("yargs/yargs");
const { getNetworkSecrets, accessSecret } = require("../utils/secrets");

const argv = yargs(process.argv.slice(2))
  .option('network', { type: 'string', demandOption: true, describe: 'testnet or mainnet' })
  .option('old_contract', { type: 'string', demandOption: true, describe: 'Address of the current contract to withdraw funds from' })
  .argv;

const NETWORK = argv.network.toLowerCase();
const OLD_CONTRACT_ADDRESS = argv.old_contract;
let FIRESTORE_CREDENTIALS;
let RPC_URL;
let PRIVATE_KEY;
let NEW_CONTRACT_ADDRESS;

console.log(`\n🔹🔹🔹🔹🔹🔹🔹🔹🔹🔹🔹🔹🔹🔹🔹🔹🔹🔹🔹🔹`);
console.log(`🟢 Starting Reset Process for Network: ${NETWORK.toUpperCase()}`);
console.log(`🟢 Old Contract Address to Replace: ${OLD_CONTRACT_ADDRESS}`);
console.log(`🔹🔹🔹🔹🔹🔹🔹🔹🔹🔹🔹🔹🔹🔹🔹🔹🔹🔹🔹🔹\n`);

// ** Step-1: Check Contract Address in Secret Manager **
const checkExistingContract = async () => {
  console.log(`\n========== Step 1: Check Existing Contract Address in Secret Manager ==========`);
  const secretName = NETWORK === 'testnet' ? 'AMOY_CONTRACT_ADDRESS' : 'MAINNET_CONTRACT_ADDRESS';
  const currentContractAddress = await accessSecret(secretName);
  
  if (currentContractAddress !== OLD_CONTRACT_ADDRESS) {
    console.log(`✅ Contract address in Secret Manager is already up-to-date: ${currentContractAddress}`);
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const contractBalance = await provider.send('eth_getBalance', [currentContractAddress, 'latest']);
    if (ethers.utils.formatEther(contractBalance) >= 800) {
      console.log(`✅ New contract has sufficient funds. Exiting process.`);
      process.exit(0);
    }
  }
};

// ** Step-2: Check Deployer Balance **
const checkDeployerBalance = async () => {
  console.log(`\n========== Step 2: Check Deployer Balance ==========`);
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);
  const balance = await provider.getBalance(signer.address);
  console.log(`🔹 Deployer balance: ${ethers.utils.formatEther(balance)} ETH`);
  if (ethers.utils.formatEther(balance) >= 800) {
    console.log(`✅ Deployer already has enough funds. Skipping fund transfer.`);
    return true;
  }
  return false;
};

// ** Step-3: Withdraw Funds from Old Contract **
// ** Withdraw Funds from Old Contract **
const withdrawFundsFromOldContract = async () => {
    try {
      console.log(`[${new Date().toISOString()}] Withdrawing funds from the old contract: ${OLD_CONTRACT_ADDRESS}`);
  
      // ** Setup Provider and Signer **
      const provider = new ethers.providers.JsonRpcProvider(RPC_URL, {
        name: 'polygon-amoy',
        chainId: 80002
      });
      const signer = new ethers.Wallet(PRIVATE_KEY, provider);
      const abi = require("../artifacts/contracts/LittlefingerGame.sol/LittlefingerGame.json").abi;
      const contract = new ethers.Contract(OLD_CONTRACT_ADDRESS, abi, signer);
  
      // ** Fetch Dynamic Gas Fees (EIP-1559) **
      console.log(`[${new Date().toISOString()}] 🔍 Fetching dynamic gas fees...`);
      const feeData = await provider.getFeeData();
  
      // ** Force Override to Avoid Underpriced Errors **
      let maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || ethers.utils.parseUnits("30", "gwei");
      let maxFeePerGas = feeData.maxFeePerGas || ethers.utils.parseUnits("50", "gwei");
  
      // ** Force Safe Minimums for Polygon Amoy **
      const MIN_PRIORITY_FEE = ethers.utils.parseUnits("30", "gwei"); // Minimum of 30 GWEI
      const MIN_MAX_FEE = ethers.utils.parseUnits("50", "gwei"); // Ensure max fee is always safe
  
      // ** Use the larger of the two values (dynamic or forced minimums) **
      maxPriorityFeePerGas = maxPriorityFeePerGas.lt(MIN_PRIORITY_FEE) ? MIN_PRIORITY_FEE : maxPriorityFeePerGas;
      maxFeePerGas = maxFeePerGas.lt(MIN_MAX_FEE) ? MIN_MAX_FEE : maxFeePerGas;
  
      const gasLimit = 150000; // Safe default gas limit for contract interactions
  
      console.log(`[${new Date().toISOString()}] 🟢 Gas Fees:`);
      console.log(`    🔹 Max Priority Fee: ${ethers.utils.formatUnits(maxPriorityFeePerGas, "gwei")} GWEI`);
      console.log(`    🔹 Max Fee: ${ethers.utils.formatUnits(maxFeePerGas, "gwei")} GWEI`);
      console.log(`    🔹 Gas Limit: ${gasLimit}`);
  
      // ** Send the Transaction **
      const tx = await contract.approveTransfer(signer.address, {
        maxPriorityFeePerGas, // Priority fee (EIP-1559)
        maxFeePerGas,         // Max fee (EIP-1559)
        gasLimit              // Gas limit for the transaction
      });
  
      console.log(`[${new Date().toISOString()}] 🚀 Transaction sent. Waiting for confirmation...`);
      const receipt = await tx.wait();
      console.log(`[${new Date().toISOString()}] ✅ Transaction confirmed! Hash: ${receipt.transactionHash}`);
  
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error during fund withdrawal:`, error);
    }
  };
  

// ** Step-4: Deploy New Contract **
const deployNewContract = async () => {
  console.log(`\n========== Step 4: Deploy New Contract ==========`);
  return new Promise((resolve, reject) => {
    const deployNetwork = NETWORK === 'testnet' ? 'polygonAmoy' : 'mainnet';
    exec(`npx hardhat run scripts/deploy.js --network ${deployNetwork}`, (error, stdout) => {
      if (error) {
        console.error(`❌ Error deploying contract: ${error.message}`);
        reject(error);
        return;
      }
      const match = stdout.match(/Contract deployed to: (0x[a-fA-F0-9]{40})/);
      if (match) {
        NEW_CONTRACT_ADDRESS = match[1];
        console.log(`✅ New contract address: ${NEW_CONTRACT_ADDRESS}`);
        resolve(NEW_CONTRACT_ADDRESS);
      } else {
        reject(new Error('Could not extract contract address from Hardhat output'));
      }
    });
  });
};

// ** Step-5: Update Secret Manager with New Contract Address **
const updateContractAddressSecret = async (address) => {
    console.log("Now updating the Secret with the new contract address");
  
    // ** Clean the address: remove newlines, spaces, and invalid characters **
    address = address.trim();
  
    // ** Validate if it is a proper Ethereum address before proceeding **
    if (!ethers.utils.isAddress(address)) {
      console.error(`❌ Invalid Ethereum address detected: ${address}`);
      throw new Error(`Invalid Ethereum address: ${address}`);
    }
  
    const secretName = NETWORK === 'testnet' ? 'AMOY_CONTRACT_ADDRESS' : 'MAINNET_CONTRACT_ADDRESS';
    const command = `echo -n "${address}" | gcloud secrets versions add ${secretName} --data-file=-`;
  
    console.log(`🟢 Running command: ${command}`); // Log the actual command so you know what's being run
    exec(command, (error) => {
      if (error) {
        console.error(`❌ Error updating contract address:`, error);
      } else {
        console.log(`✅ CONTRACT_ADDRESS updated successfully in Secret Manager`);
      }
    });
  };
  

// ** Full Reset Process **
const runFullReset = async () => {
  try {
    console.log(`\n========== Step 0: Load Network Secrets ==========`);
    const networkSecrets = await getNetworkSecrets(NETWORK);
    RPC_URL = networkSecrets.RPC_URL;
    PRIVATE_KEY = networkSecrets.PRIVATE_KEY;

    console.log(`✅ RPC URL: ${RPC_URL}`);
    console.log(`✅ Private Key Loaded.`);

    await checkExistingContract();

    const hasSufficientBalance = await checkDeployerBalance();
    if (!hasSufficientBalance) {
      console.log(`💰 Insufficient funds to bootstrap Littlefinger Game.`);
      await withdrawFundsFromOldContract();
    }

    const newContractAddress = await deployNewContract();
    await updateContractAddressSecret(newContractAddress);
    console.log(`✅ Reset process completed successfully.`);
  } catch (error) {
    console.error(`❌ Unexpected error during reset process:`, error);
  }
};

// ** Run the Full Reset Script **
runFullReset();
