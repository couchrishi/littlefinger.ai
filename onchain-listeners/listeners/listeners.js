
const ethers = require('ethers');
const { getNetworkSecrets } = require("../utils/secrets");
const { initializeWebSocketProvider, getContractInfo, restartContractListeners, listenForContractChanges } = require('../utils/contractUtils');
const { 
  handleQueryFeePaid, 
  handleNextQueryFee, 
  handleCurrentPrizePool, 
  handleTotalQueries 
} = require('../handlers/playerActionHandlers');

const eventListeners = [
  { event: 'QueryFeePaid', handler: handleQueryFeePaid },
  { event: 'NextQueryFee', handler: handleNextQueryFee },
  { event: 'CurrentPrizePool', handler: handleCurrentPrizePool },
  { event: 'TotalQueries', handler: handleTotalQueries },
];

let webSocketProvider;
let contract; // ✅ Global variable for contract instance
let firestoreListenerSet = false; // 🔥 Firestore listener set tracker

async function listenForGameContractEvents(network) {
  try {
    // ✅ Check if the contract is already running
    
    if (contract && contract instanceof ethers.Contract) {
      console.warn(' ⚠️ Contract is already running. Skipping re-initialization.');
      return;
    }

    // 🔥 Get secrets for the contract
    const { CONTRACT_ADDRESS, WSS_URL, RPC_URL } = await getNetworkSecrets(network);
    if (!CONTRACT_ADDRESS || !WSS_URL || !RPC_URL) {
      throw new Error('❌ Missing contract secrets.');
    }
    
    const cleanedContractAddress = CONTRACT_ADDRESS.trim();
    const cleanedWSS_URL = WSS_URL.trim(); 
    const cleanedRPC_URL = RPC_URL.trim();

    console.log('🔍 Cleaned Network Secrets:', { CONTRACT_ADDRESS: cleanedContractAddress, WSS_URL: cleanedWSS_URL, RPC_URL: cleanedRPC_URL });
    
    // 🚀 Initialize WebSocket Provider
    if (!webSocketProvider || !webSocketProvider._websocket || webSocketProvider._websocket.readyState !== 1) {
      console.warn(`[provider] 🚨 WebSocket provider is not live. Reinitializing...`);
      webSocketProvider = await initializeWebSocketProvider(cleanedWSS_URL);
    }
    webSocketProvider = await initializeWebSocketProvider(cleanedWSS_URL);

    // 🚀 🔥 Get Contract Info (Address + ABI) from Firestore
    const { contractAddress, abi } = await getContractInfo(network);

    // Check if contract address or ABI is missing OR if the cleanedContractAddress doesn't match
    if (!contractAddress || !abi || cleanedContractAddress.toLowerCase() !== contractAddress.toLowerCase()) {
      throw new Error(`❌ Contract address mismatch or missing data. 
        📛 Cleaned Address: ${cleanedContractAddress} 
        📛 Firestore Address: ${contractAddress} 
        🚫 Missing ABI: ${!abi ? 'Yes' : 'No'}`);
    }
 
    console.log(' 🔍 Contract Address:', contractAddress);
    console.log('🔍 ABI length:', abi.length);

    // 🔥 Attach Listeners **for the first time**
    const newContract = await restartContractListeners(contract, contractAddress, abi, webSocketProvider, network, eventListeners);
    if (newContract instanceof ethers.Contract) {
      contract = newContract;
      console.log('Thew new contract has been assigned to contract now: ', contract);

    } else {
      console.error('[listener] 🚨 restartContractListeners failed to return a valid ethers.Contract');
    }

    console.log(`📡 Initial contract listeners attached for address: ${contractAddress}`);

    // 🚀 Attach Firestore listener to react to contract changes
    if (!firestoreListenerSet) {
       listenForContractChanges(network, async (newContractAddress, newAbi) => {
        // 🛑 Check if the contract address is the same as the current contract
        const cleanedFirestoreAddress = newContractAddress.trim().toLowerCase();
        const currentAddress = contract?.address?.toLowerCase();
        
        if (cleanedFirestoreAddress === currentAddress) {
          console.log(' 🔄 No change in contract address. Skipping restart.');
          return;
        }

        console.log(' 🔄 Firestore change detected. Restarting contract listeners.');

        if (!webSocketProvider || !webSocketProvider._websocket || webSocketProvider._websocket.readyState !== 1) {
          console.warn(`[provider] 🚨 WebSocket provider is not live. Reinitializing...`);
          webSocketProvider = await initializeWebSocketProvider(cleanedWSS_URL);
        }
        
        contract = await restartContractListeners(contract, newContractAddress, newAbi, webSocketProvider, network, eventListeners);
      });

      firestoreListenerSet = true; // 🔥 Set the flag to avoid multiple Firestore listeners
    }
   
  } catch (error) {
    console.error("❌ Error in listenForGameContractEvents:", error);
    throw error; // Bubble the error up to contractUtils.js
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

module.exports = { listenForGameContractEvents, eventListeners };
