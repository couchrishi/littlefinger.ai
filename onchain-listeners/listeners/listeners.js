
const ethers = require('ethers');
const { getNetworkSecrets } = require("../utils/secrets");
const { getContractInfo, restartContractListeners, listenForContractChanges } = require('../utils/contractUtils');
const { initializeWebSocketProvider } = require('../utils/networkUtils');

const { 
  handleQueryFeePaid, 
  handleNextQueryFee, 
  handleCurrentPrizePool, 
  handleTotalQueries 
} = require('../handlers/playerActionHandlers');

let webSocketProvider;
let contract; // ✅ Global variable for contract instance
let firestoreListenerSet = false; // 🔥 Firestore listener set tracker

async function listenForGameContractEvents(network) {
  try {
    // 🛑 If we already have a contract, don't re-initialize everything
    if (contract && contract instanceof ethers.Contract) {
      console.warn(' ⚠️ Contract is already running. Skipping re-initialization.');
      return;
    }

    console.log(`[listener] 🔥 Starting contract listeners for network: ${network}`);

    // 🔥 Step 1: Get secrets and initialize the WebSocket provider
     const { CONTRACT_ADDRESS, WSS_URL, RPC_URL } = await getNetworkSecrets(network);
     if (!CONTRACT_ADDRESS || !WSS_URL || !RPC_URL) {
       throw new Error('❌ Missing contract secrets.');
     }
     webSocketProvider = await initializeWebSocketProvider(WSS_URL); // Only one provider is initialized

    // 🔥 Step 2: Get contract info from Firestore
    const { contractAddress, abi } = await getContractInfo(network);

    // Step 3: Check if contract address or ABI is missing OR if the cleanedContractAddress doesn't match
    if (!contractAddress || !abi || CONTRACT_ADDRESS.toLowerCase() !== contractAddress.toLowerCase()) {
      throw new Error(`❌ Contract address mismatch or missing data. 
        📛 GCP Secrets Contract Address: ${CONTRACT_ADDRESS} 
        📛 Firestore Contract Address: ${contractAddress} 
        🚫 Missing ABI: ${!abi ? 'Yes' : 'No'}`);
    }

    // 🔥 Step 4: Attach listeners to the contract
    contract = await restartContractListeners(contract, contractAddress, abi, webSocketProvider, network);

    // 🔥 Step 4: Attach Firestore listener for contract changes
    if (!firestoreListenerSet) {
      listenForContractChanges(network, async (newContractAddress, newAbi) => {
        // 🛑 Check if the contract address is the same as the current one
        if (newContractAddress.toLowerCase() === contract?.address?.toLowerCase()) {
          console.log(' 🔄 No change in contract address. Skipping restart.');
          return;
        }

        console.log(' 🔄 Firestore change detected. New contract detected. Restarting contract listeners.');
        contract = await restartContractListeners(contract, newContractAddress, newAbi, webSocketProvider, network);
      });

      firestoreListenerSet = true; // Make sure we don't add multiple Firestore listeners
    }

    console.log('[listener] ✅ Contract listeners successfully attached on startup.');
  } catch (error) {
    console.error("❌ Error in listenForGameContractEvents:", error);
    throw error; // Bubble the error up for debugging
  }
}


process.on('unhandledRejection', (error) => {
  console.error('🚨 Unhandled promise rejection:', error);
  throw error; // Bubble the error up to contractUtils.js
});

process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught exception:', error);
  throw error; // Bubble the error up to contractUtils.js
});

module.exports = { listenForGameContractEvents };