const { ethers } = require('ethers');
const { accessSecret } = require('../utils/secrets');
const LittlefingerGameData = require('./abis/LittlefingerGame.json');
const abi = LittlefingerGameData.abi; // Extract .abi from the JSON file

/**
 * Transfers funds from the LittlefingerGame contract to a recipient.
 * 
 * @param {string} recipient - The address to send the funds to.
 * @param {string} network - The blockchain network to use (testnet/mainnet).
 * @returns {object} - Returns an object containing the status and transaction hash.
 */
async function transferFunds(recipient, network = 'testnet') {
  console.log(`💸 Initiating transfer of funds to recipient: ${recipient} on network: ${network}`);

  if (!ethers.utils.isAddress(recipient)) {
    throw new Error(`❌ Invalid recipient address: ${recipient}`);
  }

  try {
    // 🔥 Step 1: Load secrets from GCP Secret Manager
    const secrets = await accessSecret('AMOY_CONTRACT_ADDRESS');
    const CONTRACT_ADDRESS = secrets.CONTRACT_ADDRESS;
    const PRIVATE_KEY = secrets.PRIVATE_KEY;
    const RPC_URL = secrets.RPC_URL;

    console.log(`🔐 Secrets loaded for ${network}. Contract Address: ${CONTRACT_ADDRESS}`);

    // 🔥 Step 2: Connect to the blockchain
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

    // 🔥 Step 3: Call the approveTransfer function on the contract
    console.log(`🚀 Calling approveTransfer for recipient: ${recipient}`);
    const tx = await contract.approveTransfer(recipient);
    console.log(`📜 Transaction hash: ${tx.hash}`);

    // 🔥 Step 4: Wait for transaction confirmation
    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed. Block Number: ${receipt.blockNumber}, Gas Used: ${receipt.gasUsed}`);

    return {
      status: 'success',
      txHash: receipt.transactionHash
    };
  } catch (error) {
    console.error(`❌ Error during transfer to recipient: ${recipient}`, error);
    return {
      status: 'failure',
      error: error.message
    };
  }
}

module.exports = { transferFunds };
