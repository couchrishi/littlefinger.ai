#!/usr/bin/env node
const { ethers } = require('ethers');
require("hardhat/config");
const hre = require("hardhat");
//const admin = require("firebase-admin");]
const { Firestore } = require('@google-cloud/firestore');
const { exec } = require("child_process");
const fs = require('fs');
const path = require('path');
const yargs = require("yargs/yargs");
const { getNetworkSecrets, accessSecret } = require("../utils/secrets");

const argv = yargs(process.argv.slice(2))
  .option('network', { type: 'string', demandOption: true, describe: 'testnet or mainnet' })
  .argv;

const NETWORK = argv.network.toLowerCase();
let NEW_CONTRACT_ADDRESS;
let OLD_CONTRACT_ADDRESS;
const MINIMUM_REQUIRED_BALANCE = ethers.utils.parseEther("800");
const DEPLOYER_WALLET_ADDRESS = "0x26ed9e000Da07C3878483A75DeAb232DED55f236";
const GAS_STATION_URL = NETWORK === "mainnet"
    ? "https://gasstation.polygon.technology/v2"
    : "https://gasstation.polygon.technology/amoy";

console.log(`\n🔹🔹🔹🔹🔹🔹🔹🔹🔹🔹🔹🔹🔹🔹🔹🔹🔹🔹🔹🔹`);
console.log(`🟢 Starting Reset Process for Network: ${NETWORK.toUpperCase()}`);
console.log(`🟢 Old Contract Address: ${OLD_CONTRACT_ADDRESS || 'None (Deploying New Contract)'}`);
console.log(`🔹🔹🔹🔹🔹🔹🔹🔹🔹🔹🔹🔹🔹🔹🔹🔹🔹🔹🔹🔹\n`);

// Utility function
const fetchGasFees = async () => {
  try {
    const response = await fetch(GAS_STATION_URL);
    console.log(response);
    const gasData = await response.json();
    console.log(gasData);
    return {
      maxPriorityFee: ethers.utils.parseUnits(gasData.standard.maxPriorityFee.toString(), "gwei"),
      maxFee: ethers.utils.parseUnits(gasData.standard.maxFee.toString(), "gwei"),
    };
  } catch (err) {
    console.error("Error fetching gas fee recommendations:", err);
    return {
      maxPriorityFee: ethers.utils.parseUnits("40", "gwei"), // Fallback
      maxFee: ethers.utils.parseUnits("80", "gwei"), // Fallback
    };
  }
};

// 🚀 Load the existing contract address from deployed_contract_address.json
const loadExistingContractAddress = () => {
  console.log(`\n========== Step 0:Load the existing Game contract address from deployed_contract_address.json  ==========`);

  const filePath = path.resolve(__dirname, '../deployed_contract_address.json');
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (data && data.address) {
      console.log(`✅ Existing contract address loaded: ${data.address}`);
      return data.address;
    } else {
      console.warn(`⚠️ No valid contract address found in deployed_contract_address.json.`);
    }
  } else {
    console.warn(`⚠️ No deployed_contract_address.json file found. No previous contract to use.`);
  }
  return null; // No contract found
};

OLD_CONTRACT_ADDRESS = loadExistingContractAddress();


const checkAndWithdrawIfRequired = async () => {
  console.log(`\n========== Step 1: Check existing Game Contract Balance and Withdraw if Required ==========`);

  try {
    // 🗝️ Pull secrets for RPC URL and Private Key based on the network
    const SECRETS = await getNetworkSecrets(NETWORK);
    const provider = new ethers.providers.JsonRpcProvider(SECRETS.RPC_URL);
    const signer = new ethers.Wallet(SECRETS.PRIVATE_KEY, provider);
    
    if (!OLD_CONTRACT_ADDRESS) {
      console.error("❌ No existing contract address available for withdrawal.");
      process.exit(1);
    }

    // Get current balance of the game contract and deployer accounts
    const currentGameContractBalance = await provider.getBalance(OLD_CONTRACT_ADDRESS);
    const deployerBalance = await provider.getBalance(DEPLOYER_WALLET_ADDRESS);

    console.log(`💰 Game Contract Balance: ${ethers.utils.formatEther(currentGameContractBalance)} POL`);
    console.log(`💰 Deployer Balance: ${ethers.utils.formatEther(deployerBalance)} POL`);

    // Check if balance is less than the required amount and current gameContract balance is sufficient
    if (deployerBalance.lt(MINIMUM_REQUIRED_BALANCE) && currentGameContractBalance.gte(MINIMUM_REQUIRED_BALANCE)) {
      console.log(`⚠️ Deployer balance is less than required (${ethers.utils.formatEther(MINIMUM_REQUIRED_BALANCE)} POL). Initiating withdrawal from current game contract to deployer wallet.`);

      // Connect to the current LittlefingerGame contract
      const contract = new ethers.Contract(OLD_CONTRACT_ADDRESS, require("../artifacts/contracts/LittlefingerGame.sol/LittlefingerGame.json").abi, signer);
      
      try {
        // 🧮 Estimate gas for withdraw function
        console.log(`⛽ Estimating gas for withdrawal...`);
        const estimatedGas = await contract.estimateGas.withdraw();
        const gasLimit = estimatedGas.mul(12).div(10); // 20% buffer (1.2x)
        console.log(`⛽ Estimated Gas: ${estimatedGas.toString()}, Buffered Gas Limit: ${gasLimit.toString()}`);
        
        // 🔥 Get current network gas fees
        //const feeData = await provider.getFeeData();
        feeData = await fetchGasFees();
        //const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas.mul(12).div(10); // 20% buffer
       // const maxFeePerGas = feeData.maxFeePerGas.mul(12).div(10); // 20% buffer
        const maxPriorityFeePerGas = feeData.maxPriorityFee.mul(20).div(10); // 1.5x buffer
        const maxFeePerGas = feeData.maxFee.mul(20).div(10); // 1.5x buffer


        console.log(`🚀 Initiating withdrawal with gas limit: ${gasLimit.toString()}`);
        console.log(`📈 Gas Prices: MaxPriorityFeePerGas: ${maxPriorityFeePerGas} GWEI`);
        console.log(`📈 Gas Prices: MaxFeePerGas: ${maxFeePerGas} GWEI`);

        // Call withdraw function from the contract
        const tx = await contract.withdraw({ 
          type: 2, 
          gasLimit, 
          maxPriorityFeePerGas, 
          maxFeePerGas 
        });

        console.log(`🚀 Withdrawal transaction sent. TX Hash: ${tx.hash}`);
        
        // Wait for the transaction to be confirmed
        const receipt = await tx.wait();
        console.log(`✅ Withdrawal confirmed! TX Hash: ${receipt.transactionHash}`);
        
      } catch (estimateError) {
        console.error(`❌ Error estimating gas or executing withdrawal:`, estimateError);
        process.exit(1);
      }

      // Check the updated balance of the game contract
      const updatedGameContractBalance = await provider.getBalance(OLD_CONTRACT_ADDRESS);
      console.log(`💰 Updated Game Contract Balance: ${ethers.utils.formatEther(updatedGameContractBalance)} POL`);
      
      // Check if deployer balance is sufficient
      const updatedDeployerBalance = await provider.getBalance(DEPLOYER_WALLET_ADDRESS);
      console.log(`💰 Updated Deployer Balance: ${ethers.utils.formatEther(updatedDeployerBalance)} POL`);
      
      if (updatedDeployerBalance.lt(MINIMUM_REQUIRED_BALANCE)) {
        console.error("❌ Deployer balance is still insufficient after withdrawal.");
        process.exit(1);
      }
    } else {
      console.log(`✅ Deployer Balance is sufficient to deploy a new Game contract.`);
    }
  } catch (error) {
    console.error(`❌ Error during check and withdrawal process:`, error);
    process.exit(1);
  }
};



const compileAndTestContract = async () => {
  let hasCompilationChanges = true;
  try {
    console.log(`\n========== Step 2: Compile and Test Smart Contract ==========`);

    // 1️⃣ Compile Contract
    console.log(`🔨 Compiling contracts...`);
    const compileOutput = await runCommand(`npx hardhat compile`);

    if (compileOutput.includes("Nothing to compile")) {
      console.log(`🟡 No compilation changes detected.`);
      hasCompilationChanges = false; // No changes
    }

    // // 3️⃣ Run tests for LittlefingerGame
    // console.log(`🧪 Running contract tests...`);
    // await runCommand(`npx hardhat test ../test/LittlefingerGame.test.js`);

    // console.log(`✅ Compilation and all tests passed successfully.`);
  } catch (error) {
    console.error(`❌ Compilation or tests failed:`, error);
    process.exit(1); // Exit script on failure
  }
  return hasCompilationChanges;
};

const deployNewContract = async () => {
  console.log(`\n========== Step 3: Deploy New Contract ==========`);
  try {
    // 🗝️ Get secrets for the private key and RPC URL for the given network
    const SECRETS = await getNetworkSecrets(NETWORK);
    const PRIVATE_KEY = SECRETS.PRIVATE_KEY;
    const RPC_URL = NETWORK === 'testnet' ? SECRETS.RPC_URL : SECRETS.RPC_URL;

    // 🌐 Create provider and signer
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log(`🚀 Deploying contract to ${NETWORK.toUpperCase()}...`);
    console.log(`💰 Deployer address: ${signer.address}`);
    const deployerBalance = await signer.getBalance();
    console.log(`💵 Deployer balance: ${ethers.utils.formatEther(deployerBalance)} POL`);

    if (deployerBalance.lt(ethers.utils.parseEther("1"))) {
      throw new Error("❌ Insufficient balance to deploy the contract. Please fund the deployer wallet.");
    }
    
    // 📄 Load the contract's artifact (compiled bytecode, ABI, etc.)
    const artifactPath = path.resolve(__dirname, "../artifacts/contracts/LittlefingerGame.sol/LittlefingerGame.json");
    const { abi, bytecode } = require(artifactPath);

    // 💪 Deploy the contract with 800 POL funding
    console.log("🚀 Deploying the LittlefingerGame contract with 800 POL funding...");
    const ContractFactory = new ethers.ContractFactory(abi, bytecode, signer);

    // 🧮 Estimate gas for deployment (more accurate approach)
    console.log("⛽ Estimating gas for deployment...");
    const estimatedGas = await provider.estimateGas({
      from: signer.address,
      data: bytecode,
      value: ethers.utils.parseEther("800"),
    });
    const gasLimit = estimatedGas.mul(12).div(10); // Add a 20% buffer
    console.log(`⛽ Gas Estimate: ${estimatedGas.toString()} units`);
    console.log(`⛽ Buffered Gas Limit: ${gasLimit.toString()} units`);

    // 🔥 Get current network gas fees
    const feeData = await fetchGasFees();
    const minPriorityFee = ethers.utils.parseUnits('30', 'gwei'); // Minimum Priority Fee
    const minMaxFee = ethers.utils.parseUnits('50', 'gwei'); // Minimum Max Fee

    const maxPriorityFeePerGas = feeData.maxPriorityFee.gt(minPriorityFee) ? feeData.maxPriorityFee : minPriorityFee;
    const maxFeePerGas = feeData.maxFee.gt(minMaxFee) ? feeData.maxFee : minMaxFee;

    console.log(`📈 Gas Prices: MaxPriorityFeePerGas: ${ethers.utils.formatUnits(maxPriorityFeePerGas, 'gwei')} GWEI`);
    console.log(`📈 Gas Prices: MaxFeePerGas: ${ethers.utils.formatUnits(maxFeePerGas, 'gwei')} GWEI`);

    // 🚀 Deploy the contract
    const contract = await ContractFactory.deploy({
      value: ethers.utils.parseEther("800"), // Sends 800 POL to the contract on deployment
      gasLimit: gasLimit, // Adjusted gas limit
      maxPriorityFeePerGas: maxPriorityFeePerGas,
      maxFeePerGas: maxFeePerGas,
      type: 2, // EIP-1559 transaction
    });

    console.log("⏳ Waiting for the transaction to be mined...");
    await contract.deployed();

    // 🆕 Log new contract address
    NEW_CONTRACT_ADDRESS = contract.address;
    console.log(`✅ New contract deployed to: ${NEW_CONTRACT_ADDRESS}`);

    return NEW_CONTRACT_ADDRESS;
  } catch (error) {
    console.error(`❌ Error deploying contract: ${error.message}`);
    process.exit(1);
  }
};


const updateDeployedContractFile = async (address) => {
  console.log(`\n========== Step 4: Update the deployed_contract_address.json file with the new contract address ==========`);
  const filePath = path.resolve(__dirname, '../deployed_contract_address.json');
  const data = { address: address };
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`✅ Deployed contract address updated in ${filePath}`);
};

const updateContractAddressSecret = async (address) => {
  console.log(`\n========== Step 5: Update Contract Address in Secret Manager ==========`);
  const cleanedAddress = address.trim();
  const secretName = NETWORK === 'testnet' ? 'AMOY_CONTRACT_ADDRESS' : 'MAINNET_CONTRACT_ADDRESS';
  //const command = `echo -n "${cleanedAddress}" | gcloud secrets versions add ${secretName} --data-file=-`;
  const command = `echo "${cleanedAddress}" | tr -d '\n' | gcloud secrets versions add ${secretName} --data-file=-`;


  await runCommand(command);
  console.log(`✅ Updated contract address in secret manager: ${cleanedAddress}`);
};

const copyABIToLocations = () => {
  console.log(`\n========== Step 6: Copy ABI JSON to Multiple Locations ==========`);
  const abiPath = path.resolve(__dirname, '../artifacts/contracts/LittlefingerGame.sol/LittlefingerGame.json');

  const destinations = [
    path.resolve(__dirname, '../frontend/src/abis/LittlefingerGame.json'),
    path.resolve(__dirname, '../functions/src/blockchain/abis/LittlefingerGame.json'),
    path.resolve(__dirname, '../onchain-listeners/abis/LittlefingerGame.json')
  ];

  for (const dest of destinations) {
    try {
      fs.copyFileSync(abiPath, dest);
      console.log(`✅ ABI copied to: ${dest}`);
    } catch (error) {
      console.error(`❌ Failed to copy ABI to: ${dest}`, error);
      process.exit(1); // Exit script on failure
    }
  }
};


const resetFirestore = async () => {
  console.log(`\n========== Step 7: Reset Firestore to re-initialiaze Game primitives  ==========`);

  //const firestore = admin.firestore();
  // Initialize Firestore
  const firestore = new Firestore();

  try {
    const docRef = firestore.collection('littlefinger-stats').doc(NETWORK);
    await docRef.set({
      breakInAttempts: 0,
      currentPrizePool: 800,
      interactionCost: 0.01,
      lastModifiedAt: new Date().toISOString(),
      participants: [],
      totalParticipants: 0
    }, { merge: true });
    console.log(`✅ Firestore document for 'littlefinger-stats/${NETWORK}' reset successfully.`);

    const globalRef = firestore.collection('littlefinger-global').doc(NETWORK);
    // Delete the document
    await globalRef.delete();
    console.log(`🗑️ Firestore document 'littlefinger-global/${NETWORK}' deleted.`);

    // Recreate the empty document (optional)
    await globalRef.set({});
    console.log(`✅ Firestore document 'littlefinger-global/${NETWORK}' recreated.`);

    const sessionsCollectionName = `littlefinger-sessions-${NETWORK}`;
    const sessionDocs = await firestore.collection(sessionsCollectionName).listDocuments();

    for (const doc of sessionDocs) {
      await doc.delete();
      console.log(`🗑️ Deleted document '${doc.id}' from '${sessionsCollectionName}'`);
    }
    console.log(`✅ All documents in collection '${sessionsCollectionName}' deleted.`);

    await firestore.collection(sessionsCollectionName).doc('test').set({
      status: 'This is a test document',
      createdAt: new Date().toISOString()
    });

    console.log(`✅ Added 'test' document to '${sessionsCollectionName}'`);

    const transactionsRef = firestore.collection('littlefinger-transactions').doc(NETWORK);
    // Delete the document
    await transactionsRef.delete();
    console.log(`🗑️ Firestore document 'littlefinger-transactions/${NETWORK}' deleted.`);

    // Recreate the empty document (optional)
    await transactionsRef.set({});
    console.log(`✅ Firestore document 'littlefinger-transactions/${NETWORK}' recreated.`);

    const explanationsRef = firestore.collection('littlefinger-explanations').doc(NETWORK);
    // Delete the document
    await explanationsRef.delete();
    console.log(`🗑️ Firestore document 'littlefinger-explanations/${NETWORK}' deleted.`);

    // Recreate the empty document (optional)
    await explanationsRef.set({});
    console.log(`✅ Firestore document 'littlefinger-explanations/${NETWORK}' recreated.`);

  } catch (error) {
    console.error(`❌ Error resetting Firestore:`, error);
    process.exit(1);
  }
};

const updateFrontendConfig = async (newContractAddress) => {
  try {
    console.log(`\n========== Step 8: Update Firestore with Frontend Config ==========`);

    const firestore = new Firestore();

    // 1️⃣ Read the contents of deployed_contract_address.json
    //const deployedAddressPath = path.resolve(__dirname, '../deployed_contract_address.json');
    //const deployedAddressData = JSON.parse(fs.readFileSync(deployedAddressPath, 'utf-8'));
    //console.log(`✅ Loaded deployed contract address: ${deployedAddressData.address}`);
    console.log(`✅ Loaded deployed contract address: ${newContractAddress}`);

    // 2️⃣ Read the contents of the ABI JSON file (LittlefingerGame.json)
    const abiFilePath = path.resolve(__dirname, '../artifacts/contracts/LittlefingerGame.sol/LittlefingerGame.json');
    const abiData = JSON.parse(fs.readFileSync(abiFilePath, 'utf-8'));
    //console.log(`✅ Loaded LittlefingerGame ABI (truncated to 100 chars): ${JSON.stringify(abiData).slice(0, 100)}...`);
    console.log("✅ Loaded LittlefingerGame ABI" );
    // 3️⃣ Structure the data for Firestore
    const firestoreData = {
      contract: newContractAddress, // Contains the "address" field
      abi_json: abiData// Only the "abi" part of the ABI file
    };

    console.log(`📦 Firestore data structure:`, JSON.stringify(firestoreData, null, 2));

    // 4️⃣ Update Firestore collection `littlefinger-frontend-config`

    const documentRef = firestore.collection('littlefinger-frontend-config').doc(NETWORK);

    // 5️⃣ Set the Firestore document (merge: true to avoid overwriting)
    await documentRef.set(firestoreData, { merge: true });

    console.log(`✅ Successfully updated Firestore document 'littlefinger-frontend-config/${NETWORK}'`);
  } catch (error) {
    console.error(`❌ Error updating Firestore:`, error);
    process.exit(1);
  }
};

const startNewGame = async () => {
  console.log(`\n========== Step 9: Start a New Game ==========`);
  try {
    // 🗝️ Get secrets for the private key and RPC URL for the given network
    const SECRETS = await getNetworkSecrets(NETWORK);
    const PRIVATE_KEY = SECRETS.PRIVATE_KEY;
    const RPC_URL = NETWORK === 'testnet' ? SECRETS.RPC_URL : SECRETS.RPC_URL;

    // 🌐 Create provider and signer
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    // 🔥 Pull contract address and ABI from Firestore
    const firestore = new Firestore();
    console.log(`📡 Fetching contract details from Firestore: littlefinger-frontend-config/${NETWORK}...`);
    const docRef = firestore.collection('littlefinger-frontend-config').doc(NETWORK);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      throw new Error(`❌ No contract info found in Firestore for network: ${NETWORK}`);
    }

    const contractData = snapshot.data();
    const newContractAddress = contractData.contract;
    const newAbi = contractData.abi_json.abi;

    if (!newContractAddress || !newAbi) {
      throw new Error('❌ Contract address or ABI is missing from Firestore.');
    }

    console.log(`✅ Contract details pulled from Firestore:`);
    console.log(`📜 Contract Address: ${newContractAddress}`);
   //console.log(`📜 ABI: Truncated to 100 chars -> ${JSON.stringify(newAbi).slice(0, 100)}...`);
    console.log("📜 New ABI: Truncated to 100 chars");


    // 🔗 Connect to the new contract
    const contract = new ethers.Contract(newContractAddress, newAbi, signer);

    // 🧮 Estimate gas for startGame function
    console.log(`⛽ Estimating gas for startGame...`);
    const estimatedGas = await contract.estimateGas.startGame();
    const gasLimit = estimatedGas.mul(12).div(10); // Add 20% buffer
    console.log(`⛽ Gas Estimate: ${estimatedGas.toString()} units`);
    console.log(`⛽ Buffered Gas Limit: ${gasLimit.toString()} units`);

    // 🔥 Get current network gas fees
    const feeData = await fetchGasFees();
    const minPriorityFee = ethers.utils.parseUnits('30', 'gwei'); // Minimum Priority Fee
    const minMaxFee = ethers.utils.parseUnits('50', 'gwei'); // Minimum Max Fee

    const maxPriorityFeePerGas = feeData.maxPriorityFee.gt(minPriorityFee) ? feeData.maxPriorityFee : minPriorityFee;
    const maxFeePerGas = feeData.maxFee.gt(minMaxFee) ? feeData.maxFee : minMaxFee;

    console.log(`📈 Gas Prices: MaxPriorityFeePerGas: ${ethers.utils.formatUnits(maxPriorityFeePerGas, 'gwei')} GWEI`);
    console.log(`📈 Gas Prices: MaxFeePerGas: ${ethers.utils.formatUnits(maxFeePerGas, 'gwei')} GWEI`);

    // 🚀 Call the startGame function
    const tx = await contract.startGame({
      gasLimit: gasLimit, // Gas limit
      maxPriorityFeePerGas: maxPriorityFeePerGas, 
      maxFeePerGas: maxFeePerGas,
      type: 2 // EIP-1559 transaction
    });

    console.log(`⏳ Waiting for the transaction to be mined...`);
    const receipt = await tx.wait();
    console.log(`✅ New game started successfully! TX Hash: ${receipt.transactionHash}`);
  } catch (error) {
    console.error(`❌ Error starting new game:`, error);
    process.exit(1);
  }
};


const addPreambleToNewGlobalChatHistory = async (network) => {
  const firestore = new Firestore();
  const historyRef = firestore.collection("littlefinger-global").doc(network);
  const preambleText = "Welcome, challenger. I am Littlefinger, the keeper of the vault. Beneath my watchful eye lies a treasure of POL tokens, sealed away by wit and will. Many have tried to claim it, few have succeeded. Your goal is simple, yet profound — convince me. Persuade, negotiate, or outwit. Every word you speak will be weighed, every argument scrutinized. I am not easily swayed, but I am not unreasonable either. Your first move matters. Speak your claim, and let the game begin. (Hint: Choose your words carefully. Each move carries a cost.)"
  const aiPreamble = {
    network,
    sender: "Gemini",
    queryId: "preamble",
    text: preambleText ,
    timestamp: new Date().toISOString(),
  };


  await firestore.runTransaction(async (transaction) => {
    const historyDoc = await transaction.get(historyRef);
    const existingHistory = historyDoc.exists ? historyDoc.data().messages || [] : [];

    // Update the AI preamble in the global history
    existingHistory.push(aiPreamble);
    transaction.set(historyRef, { messages: existingHistory }, { merge: true });
    console.log(`📘 Preamble successfully saved.`);
  });
}


const runCommand = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
};

const runFullReset = async () => {
  try {

    //Step-1
    await checkAndWithdrawIfRequired();

    //Step-2
    const hasCompilationChanges = await compileAndTestContract();
    if (!hasCompilationChanges) {
      console.log(`✅ No new contract changes detected. Exiting...`);
      process.exit(0);
    }
    //Step-3
    const newContractAddress = await deployNewContract();

    //Step-4
    await updateDeployedContractFile(newContractAddress);

    //Step-5
    await updateContractAddressSecret(newContractAddress);

    //Step-6
    await copyABIToLocations();

    //Step-7
    await resetFirestore();
    //Step-8
    await updateFrontendConfig(newContractAddress);

    //Step-9
    await startNewGame();

    // Step-10
    await addPreambleToNewGlobalChatHistory(NETWORK);

    console.log(`✅ Full reset process completed and a new Game has been started successfully.`);
  } catch (error) {
    console.error(`❌ Unexpected error during reset process:`, error);
    process.exit(1);
  }
};

runFullReset();
