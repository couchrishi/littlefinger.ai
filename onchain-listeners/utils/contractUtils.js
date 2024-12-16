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
    waitForProviderReady } = require('./networkUtils.js');


// 🔥 Helper to initialize WebSocket provider
async function initializeWebSocketProvider(WSS_URL) {
  const webSocketProvider = new ethers.WebSocketProvider(WSS_URL);
  
  // Attach listeners for network and error changes
  webSocketProvider.on('network', handleNetworkChange);
  webSocketProvider.on('error', (error) => {
    handleWebSocketError(error);
    scheduleRestart(); // restart logic
  });
   
  // Wait for provider to be ready (modularized now)
  await waitForProviderReady(webSocketProvider);

  console.log('[contractUtils] ✅ WebSocket connected and ready!');
  return webSocketProvider;
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
        console.log(`[contractUtils] ✅ Removed all old listeners from the contract ${contract}`);
      } catch (error) {
        console.error('[contractUtils] ❌ Failed to remove listeners from contract:', error);
      }
    }
    if (newContractAddress && newAbi) {
      const newContract = new ethers.Contract(newContractAddress, newAbi, webSocketProvider);
      console.log(`[contractUtils] 🔄 Contract listeners restarted successfully for ${newContractAddress}`);

      if (!eventListeners || !Array.isArray(eventListeners)) {
        console.warn('[contractUtils] ⚠️ No event listeners provided.');
        return newContract;
      }
      
      // **************************************** PLAYER ACTION EVENTS **************************************** //
        // 🔥 Attach event listeners explicitly
      newContract.on("QueryFeePaid", async (player, feeAmount, queryID, blockNumber, timestamp, event) => {
        try {
          console.log("[Player Action Event] 🔥 QueryFeePaid Event Detected");
          await handleQueryFeePaid(network, newContractAddress, player, feeAmount, queryID, blockNumber, timestamp, event);
        } catch (error) {
          console.error(`[Player Action Event] ❌ Error in event handler for QueryFeePaid:`, error);
        }

        console.log(`[Player Action Event] ✅ Attached listener for QueryFeePaid`);

      });

      newContract.on("NextQueryFee", async (nextFee, currentCount, event) => {
        try {
          console.log(`[Player Action Event]🔥 NextQueryFee Event Detected"`);
          await handleNextQueryFee(network, newContractAddress, nextFee, currentCount, event);
        } catch (error) {
          console.error(`[Player Action Event]❌ Error in event handler for NextQueryFee:`, error);
        }
      });

      newContract.on("CurrentPrizePool", async (prizePool, event) => {
        try {
          console.log(`[Player Action Event] 🔥 CurrentPrizePool Event Detected`);
          await handleCurrentPrizePool(network, newContractAddress, prizePool, event);
        } catch (error) {
          console.error(`[Player Action Event] ❌ Error in event handler for CurrentPrizePool:`, error);
        }
      });

      newContract.on("TotalQueries", async (totalQueries, event) => {
        try {
          console.log(`[Player Action Event] 🔥 TotalQueries Event Detected`);
          await handleTotalQueries(network, newContractAddress, totalQueries, event);
        } catch (error) {
          console.error(`[Player Action Event] ❌ Error in event handler for TotalQueries:`, error);
        }
      });
      
      // **************************************** PLAYER ACTION EVENTS **************************************** //
  
      newContract.on("GameStarted", async (timestamp, event) => {
          try {
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
};