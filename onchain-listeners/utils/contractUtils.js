const ethers = require('ethers');
const { firestore } = require('../config/firebase');
const { listenToFirestoreDocumentChanges, getContractInfoFromFirestore } = require('./firestoreUtils');
const {
  handleQueryFeePaid,
  handleNextQueryFee,
  handleCurrentPrizePool,
  handleTotalQueries } = require('../handlers/playerActionHandlers')

  const {
    handleGameStarted,
    handleGameEnded,
    handlePrizeTransferApproved,
    LastPlayerRewardAfterGameExhaustion,
    RestOfThePlayersRewardAfterGameExhaustion,
    GameResetByOwner } = require('../handlers/gameLifecycleHandlers')


const { 
    handleNetworkChange, 
    handleWebSocketError,
    scheduleRestart,
    waitForProviderReady,
    startPing,
    stopPing } = require('./networkUtils.js');

// Global state tracking
let lastEventTimestamp = Date.now();
let healthCheckInterval = null;
let reconnectionAttempt = 0;
let restartScheduled = false;
let pingInterval = null;

// Constants
const PING_INTERVAL_MS = 25000; // 25 seconds
const MAX_EVENT_SILENCE = 5 * 60 * 1000; // 5 minutes
const HEALTH_CHECK_INTERVAL = 30 * 1000; // 30 seconds
const RETRY_DELAY_MS = 5000; // 5 seconds
const MAX_RETRY_DELAY_MS = 60000; // 1 minute
const WEBSOCKET_READY_TIMEOUT = 30000; // 30 seconds
const MAX_RECONNECTION_ATTEMPTS = 10;

async function initializeWebSocketProvider(WSS_URL) {
  console.log("[provider] Starting WebSocket provider initialization");
  
  if (!WSS_URL) {
    throw new Error("WSS_URL is required");
  }

  try {
    const provider = new ethers.WebSocketProvider(WSS_URL);
    
    // Simple connection test
    await provider.getNetwork();
    
    // Enhanced error handling
    provider.on('error', (error) => {
      console.error('[provider] WebSocket error:', error);
      handleWebSocketError(error);
      scheduleReconnection(provider, WSS_URL);
    });

    startEnhancedPing(provider);
    console.log('[provider] ✅ WebSocket provider initialized successfully');
    return provider;
  } catch (error) {
    console.error('[provider] ❌ Error initializing WebSocket provider:', error);
    throw error;
  }
}

function startEnhancedPing(provider) {
  if (pingInterval) {
    clearInterval(pingInterval);
  }
  
  pingInterval = setInterval(async () => {
    if (!provider._websocket || provider._websocket.readyState !== 1) {
      console.log('[provider] WebSocket not ready, skipping ping');
      return;
    }

    try {
      const blockNumber = await provider.getBlockNumber();
      console.log('[provider] 🏓 Ping successful, current block:', blockNumber);
      reconnectionAttempt = 0;
    } catch (error) {
      console.error('[provider] ❌ Ping failed:', error);
      if (!restartScheduled) {
        scheduleReconnection(provider, provider._websocket?.url);
      }
    }
  }, PING_INTERVAL_MS);
}

function scheduleReconnection(provider, url) {
  if (restartScheduled) return;
  
  restartScheduled = true;
  reconnectionAttempt++;

  if (reconnectionAttempt > MAX_RECONNECTION_ATTEMPTS) {
    console.error('[provider] Maximum reconnection attempts reached. Stopping reconnection attempts.');
    return;
  }
  
  const delay = Math.min(
    RETRY_DELAY_MS * Math.pow(1.5, reconnectionAttempt),
    MAX_RETRY_DELAY_MS
  );

  console.log(`[provider] 🔄 Scheduling reconnection attempt ${reconnectionAttempt} in ${delay/1000}s`);
  
  setTimeout(async () => {
    try {
      if (provider) {
        await provider.destroy();
      }
      if (pingInterval) clearInterval(pingInterval);
      if (healthCheckInterval) clearInterval(healthCheckInterval);
      
      const gameContractEvents = require('../listeners/listeners').listenForGameContractEvents;
      if (typeof gameContractEvents === 'function') {
        await gameContractEvents('testnet');
      }
    } catch (error) {
      console.error('[provider] Reconnection failed:', error);
    } finally {
      restartScheduled = false;
    }
  }, delay);
}

// Call this whenever an event is received
function updateLastEventTimestamp() {
  lastEventTimestamp = Date.now();
  console.log('[provider] Event timestamp updated:', new Date(lastEventTimestamp).toISOString());
}
/**
 * 🔥 Fetch the contract address and ABI from Firestore.
 * 
 * @param {string} network - The network (e.g., 'testnet' or 'mainnet')
 * @returns {Promise<{ contractAddress: string, abi: Array }>} - Returns the contract address and ABI
 */
async function getContractInfo(network) {
  try {
    console.log(`[contractUtils] 🔍 Fetching contract ABI for network: ${network}`);
    const { contractAddress, abi } = await getContractInfoFromFirestore(network);
    
    if (!contractAddress || !abi) {
      throw new Error(`[contractUtils] ❌ Missing contract address or ABI for network: ${network}`);
    }

    console.log(`[contractUtils] ✅ Successfully retrieved contract info for network: ${network}`);
    return { contractAddress, abi };
  } catch (error) {
    console.error(`[contractUtils] ❌ Error fetching contract ABI for network: ${network}`, error);
    throw error; // Bubble the error up
  }
}


// 🔥 Helper to restart contract listeners
async function restartContractListeners(contract, newContractAddress, newAbi, webSocketProvider, network, eventListeners) {

    if (contract) {
      try {
        contract.removeAllListeners();
        stopPing();
        console.log(`[contractUtils] ✅ Removed all old listeners from the contract ${contract}`);
      } catch (error) {
        console.error('[contractUtils] ❌ Failed to remove listeners from contract:', error);
      }
    }
    if (newContractAddress && newAbi) {

      const newContract = new ethers.Contract(newContractAddress, newAbi, webSocketProvider);
      console.log(`[contractUtils] 🔄 Contract listeners restarted successfully for ${newContractAddress}`);
      startPing(webSocketProvider);

      if (!eventListeners || !Array.isArray(eventListeners)) {
        console.warn('[contractUtils] ⚠️ No event listeners provided.');
        return newContract;
      }
      
      // **************************************** PLAYER ACTION EVENTS **************************************** //
        // 🔥 Attach event listeners explicitly
      newContract.on("QueryFeePaid", async (player, feeAmount, queryID, blockNumber, timestamp, event) => {
        try {
          updateLastEventTimestamp();
          console.log("[Player Action Event] 🔥 QueryFeePaid Event Detected");
          await handleQueryFeePaid(network, newContractAddress, player, feeAmount, queryID, blockNumber, timestamp, event);
        } catch (error) {
          console.error(`[Player Action Event] ❌ Error in event handler for QueryFeePaid:`, error);
        }

        console.log(`[Player Action Event] ✅ Attached listener for QueryFeePaid`);

      });

      newContract.on("NextQueryFee", async (nextFee, currentCount, event) => {
        try {
          updateLastEventTimestamp();
          console.log(`[Player Action Event]🔥 NextQueryFee Event Detected"`);
          await handleNextQueryFee(network, newContractAddress, nextFee, currentCount, event);
        } catch (error) {
          console.error(`[Player Action Event]❌ Error in event handler for NextQueryFee:`, error);
        }
      });

      newContract.on("CurrentPrizePool", async (prizePool, event) => {
        try {
          updateLastEventTimestamp();
          console.log(`[Player Action Event] 🔥 CurrentPrizePool Event Detected`);
          await handleCurrentPrizePool(network, newContractAddress, prizePool, event);
        } catch (error) {
          console.error(`[Player Action Event] ❌ Error in event handler for CurrentPrizePool:`, error);
        }
      });

      newContract.on("TotalQueries", async (totalQueries, event) => {
        try {
          updateLastEventTimestamp();
          console.log(`[Player Action Event] 🔥 TotalQueries Event Detected`);
          await handleTotalQueries(network, newContractAddress, totalQueries, event);
        } catch (error) {
          console.error(`[Player Action Event] ❌ Error in event handler for TotalQueries:`, error);
        }
      });
      
      // **************************************** PLAYER ACTION EVENTS **************************************** //
  
      newContract.on("GameStarted", async (timestamp, event) => {
          try {
            updateLastEventTimestamp();
            console.log("[Game Lifecycle]🔥 GameStarted Event Detected", { timestamp });
            await handleGameStarted(network, newContractAddress, timestamp, event);
          } catch (error) {
            console.error("❌ Error processing GameStarted event:", error);
          }
        });
      
      return newContract;

    } else {
      console.warn('[contractUtils] ⚠️ Missing contract address or ABI.');
      return null;
    }
  }

// 🔥 Helper to listen for Firestore changes for contract updates
function listenForContractChanges(network, callback) {
    console.log(`[contractUtils] 👂 Listening for Firestore contract changes for network: ${network}`);
  
    const unsubscribe = listenToFirestoreDocumentChanges(network, (data) => {
      const newContractAddress = data?.contract;
      const newAbi = data?.abi_json?.abi;
  
      if (!newContractAddress || !newAbi) {
        console.warn(`[contractUtils] ⚠️ Missing contract address or ABI in CONFIG document for network: ${network}`);
        return;
      }
  
      callback(newContractAddress, newAbi);
    });
    return unsubscribe;
  }

module.exports = {
  getContractInfo,
  initializeWebSocketProvider,
  restartContractListeners,
  listenForContractChanges,
  updateLastEventTimestamp,
};