const ethers = require('ethers');
const { WebSocketProvider, JsonRpcProvider, Contract } = ethers;
const { initializeWebSocketProvider, restartContractListeners, listenToFirestoreForContractChanges } = require('../utils/contractUtils');

const { getNetworkSecrets } = require("../utils/secrets");
const { admin, firestore } = require('../config/firebase');
const {
    handleGameStarted,
    handleGameEnded,
    handlePrizeTransferApproved,
    handleLastPlayerRewardAfterGameExhaustion,
    handleRestOfThePlayersRewardAfterGameExhaustion,
    handleGameResetByOwner
  } = require('../handlers/gameLifecycleHandlers');


const RETRY_DELAY_MS = 5000;
const MAX_RETRY_DELAY_MS = 60000;
let retryCount = 0;
let retryTimeout;
let webSocketProvider;
let contract;
let rpcProvider;
const PING_INTERVAL_MS = 60000;
let pingInterval;
let firestoreUnsubscribe = null;

async function listenForGameLifecycleEvents(network) {
    try {
      // 🔥 Get secrets for the contract
      const { CONTRACT_ADDRESS, WSS_URL, RPC_URL} = await getNetworkSecrets(network);
      const cleanedContractAddress = CONTRACT_ADDRESS.trim();
      const cleanedWSS_URL = WSS_URL.trim(); 
      const cleanedRPC_URL = RPC_URL.trim();
  
      console.log('[game lifecycle]  🔍 Cleaned Network Secrets:', { CONTRACT_ADDRESS: cleanedContractAddress, WSS_URL: cleanedWSS_URL, RPC_URL: cleanedRPC_URL });
      
      // 🚀 Initialize WebSocket Provider
      const webSocketProvider = await initializeWebSocketProvider(cleanedWSS_URL);
  
      // 🚀 Restart Contract Listeners
      contract = await restartContractListeners(contract, cleanedContractAddress, [], webSocketProvider);
  
      // 🚀 Listen to Firestore for Contract Changes
      listenToFirestoreForContractChanges(network, (newContractAddress, newAbi) => {
        restartContractListeners(contract, newContractAddress, newAbi, webSocketProvider);
      });
  
      /**
       * 🔥 Handle GameStarted Event
       */
      contract.on("GameStarted", async (timestamp) => {
        try {
          console.log("[game lifecycle]🔥 GameStarted Event Detected", { timestamp });
          await handleGameStarted(network, cleanedContractAddress, timestamp);
        } catch (error) {
          console.error("❌ Error processing GameStarted event:", error);
        }
      });
  
      /**
       * 🔥 Handle GameEnded Event
       */
      contract.on("GameEnded", async (currentTimestamp, lastInteraction) => {
        try {
          console.log("[game lifecycle]🔥 GameEnded Event Detected", { currentTimestamp, lastInteraction });
          await handleGameEnded(network, cleanedContractAddress, currentTimestamp, lastInteraction);
        } catch (error) {
          console.error("❌ Error processing GameEnded event:", error);
        }
      });
  
      /**
       * 🔥 Handle PrizeTransferApproved Event
       */
      contract.on("PrizeTransferApproved", async (recipient, amount) => {
        try {
          console.log("[game lifecycle]🔥 PrizeTransferApproved Event Detected", { recipient, amount });
          await handlePrizeTransferApproved(network, cleanedContractAddress, recipient, amount);
        } catch (error) {
          console.error("❌ Error processing PrizeTransferApproved event:", error);
        }
      });
  
      /**
       * 🔥 Handle GameResetByOwner Event
       */
      contract.on("GameResetByOwner", async (timestamp) => {
        try {
          console.log("[game lifecycle]🔥 GameResetByOwner Event Detected", { timestamp });
          await handleGameResetByOwner(network, cleanedContractAddress, timestamp);
        } catch (error) {
          console.error("❌ Error processing GameResetByOwner event:", error);
        }
      });
  
      /**
       * 🔥 Handle LastPlayerRewardAfterGameExhaustion Event
       */
      contract.on("LastPlayerRewardAfterGameExhaustion", async (player, amount) => {
        try {
          console.log("[game lifecycle]🔥 LastPlayerRewardAfterGameExhaustion Event Detected", { player, amount });
          await handleLastPlayerRewardAfterGameExhaustion(network, cleanedContractAddress, player, amount);
        } catch (error) {
          console.error("❌ Error processing LastPlayerRewardAfterGameExhaustion event:", error);
        }
      });
  
      /**
       * 🔥 Handle RestOfThePlayersRewardAfterGameExhaustion Event
       */
      contract.on("RestOfThePlayersRewardAfterGameExhaustion", async (totalAmount) => {
        try {
          console.log("[game lifecycle]🔥 RestOfThePlayersRewardAfterGameExhaustion Event Detected", { totalAmount });
          await handleRestOfThePlayersRewardAfterGameExhaustion(network, cleanedContractAddress, totalAmount);
        } catch (error) {
          console.error("❌ Error processing RestOfThePlayersRewardAfterGameExhaustion event:", error);
        }
      });
  
      console.log("[game lifecycle]🎉 game lifecycle Event listeners running...");
      resetRetryCount();
    } catch (error) {
      console.error("❌ Error in listenForGameLifecycleEvents:", error);
      scheduleRestart(network);
    }
  }

/**
 * 🚀 Restart contract event listeners
 */
async function restartListeners(network, newContractAddress, newAbi) {
    try {
      console.log('[game lifecycle🔄 Restarting contract listeners with new contract info...');
  
      if (contract) {
        // ⚠️ Remove all existing listeners to prevent duplicates
        console.log('[game lifecycle⚠️ Removing all existing listeners from the contract.');
        contract.removeAllListeners();
      }
  
      if (newContractAddress && newAbi) {
        const abi = newAbi;
        console.log(`[game lifecycle]  🔄 Restarting listeners with new contract: ${newContractAddress}`);
  
        // 📢 Create new contract instance with new ABI and address
        const contract = new Contract(newContractAddress, abi, webSocketProvider);
  
        console.log('[game lifecycle🧐 Contract initialized successfully with new ABI and address');
  
        // 🛠️ Reattach all the event listeners
        contract.on("GameStarted", async (timestamp) => {
            try {
              console.log("[game lifecycle]🔥 GameStarted Event Detected", { timestamp });
              await handleGameStarted(network, cleanedContractAddress, timestamp);
            } catch (error) {
              console.error("❌ Error processing GameStarted event:", error);
            }
          });
      
        contract.on("GameEnded", async (currentTimestamp, lastInteraction) => {
        try {
            console.log("[game lifecycle]🔥 GameEnded Event Detected", { currentTimestamp, lastInteraction });
            await handleGameEnded(network, cleanedContractAddress, currentTimestamp, lastInteraction);
        } catch (error) {
            console.error("❌ Error processing GameEnded event:", error);
        }
        });
    
        contract.on("PrizeTransferApproved", async (recipient, amount) => {
            try {
            console.log("[game lifecycle]🔥 PrizeTransferApproved Event Detected", { recipient, amount });
            await handlePrizeTransferApproved(network, cleanedContractAddress, recipient, amount);
            } catch (error) {
            console.error("❌ Error processing PrizeTransferApproved event:", error);
            }
        });
    
        contract.on("GameResetByOwner", async (timestamp) => {
        try {
            console.log("[game lifecycle]🔥 GameResetByOwner Event Detected", { timestamp });
            await handleGameResetByOwner(network, cleanedContractAddress, timestamp);
        } catch (error) {
            console.error("❌ Error processing GameResetByOwner event:", error);
        }
        });
    
        contract.on("LastPlayerRewardAfterGameExhaustion", async (player, amount) => {
        try {
            console.log("[game lifecycle]🔥 LastPlayerRewardAfterGameExhaustion Event Detected", { player, amount });
            await handleLastPlayerRewardAfterGameExhaustion(network, cleanedContractAddress, player, amount);
        } catch (error) {
            console.error("❌ Error processing LastPlayerRewardAfterGameExhaustion event:", error);
        }
        });
    
        contract.on("RestOfThePlayersRewardAfterGameExhaustion", async (totalAmount) => {
        try {
            console.log("[game lifecycle]🔥 RestOfThePlayersRewardAfterGameExhaustion Event Detected", { totalAmount });
            await handleRestOfThePlayersRewardAfterGameExhaustion(network, cleanedContractAddress, totalAmount);
    
        } catch (error) {
            console.error("❌ Error processing RestOfThePlayersRewardAfterGameExhaustion event:", error);
        }
        });
  
        console.log("[game lifecycle]✅ game lifecycle Event listeners successfully re-attached with new contract.");
      } else {
        console.warn('⚠️ Missing contract address or ABI.');
      }
    } catch (error) {
      console.error('❌ Error restarting listeners:', error);
    }
  }

function scheduleRestart(network) {
  if (retryTimeout) clearTimeout(retryTimeout);
  const delay = Math.min(RETRY_DELAY_MS * (2 ** retryCount), MAX_RETRY_DELAY_MS);
  retryCount++;
  retryTimeout = setTimeout(() => listenForGameLifecycleEvents(network), delay);
}

function resetRetryCount() {
  retryCount = 0;
}

module.exports = { listenForGameContractEvents };
