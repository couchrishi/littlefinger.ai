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

  async function restartContractListeners(contract, contractAddress, abi, provider, network) {
    try {
      if (contract) {
        await cleanUpContractListeners(contract);
        console.log('[listener] 🔄 Removed old listeners for previous contract');
      }
  
      const newContract = new ethers.Contract(contractAddress, abi, provider);
      await attachContractListeners(newContract, network, contractAddress);
  
      console.log('[listener] ✅ Successfully restarted listeners for contract:', contractAddress);
      return newContract; 
    } catch (error) {
      console.error('[listener] ❌ Error restarting contract listeners:', error);
      throw error;
    }
  }

  async function cleanUpContractListeners(contract) {
    try {
      if (!contract) return;
      contract.removeAllListeners();
      console.log('[listener] ✅ Removed all contract listeners for:', contract.address);
    } catch (error) {
      console.error('[listener] ❌ Error while removing contract listeners:', error);
    }
  }

  async function attachContractListeners(contract, network, contractAddress) {
    try {
      console.log('[listener] 🎉 Attaching contract event listeners for:', contract.address);

      // **************************************** PLAYER ACTION EVENTS **************************************** //
  
      // Attach event listeners for each player action event
      contract.on("QueryFeePaid", async (player, feeAmount, queryID, blockNumber, timestamp, event) => {
        try {
          console.log("[Player Action Event] 🔥 QueryFeePaid Event Detected");
          await handleQueryFeePaid(network, contractAddress, player, feeAmount, queryID, blockNumber, timestamp, event);
        } catch (error) {
          console.error(`[Player Action Event] ❌ Error in event handler for QueryFeePaid:`, error);
        }
      });
  
      contract.on("NextQueryFee", async (nextFee, currentCount, event) => {
        try {
          console.log("[Player Action Event] 🔥 NextQueryFee Event Detected");
          await handleNextQueryFee(network, contractAddress, nextFee, currentCount, event);
        } catch (error) {
          console.error(`[Player Action Event] ❌ Error in event handler for NextQueryFee:`, error);
        }
      });
  
      contract.on("CurrentPrizePool", async (prizePool, event) => {
        try {
          console.log(`[Player Action Event] 🔥 CurrentPrizePool Event Detected`);
          await handleCurrentPrizePool(network, contractAddress, prizePool, event);
        } catch (error) {
          console.error(`[Player Action Event] ❌ Error in event handler for CurrentPrizePool:`, error);
        }
      });
  
      contract.on("TotalQueries", async (totalQueries, event) => {
        try {
          console.log(`[Player Action Event] 🔥 TotalQueries Event Detected`);
          await handleTotalQueries(network, contractAddress, totalQueries, event);
        } catch (error) {
          console.error(`[Player Action Event] ❌ Error in event handler for TotalQueries:`, error);
        }
      });
      
      // **************************************** PLAYER ACTION EVENTS **************************************** //
  
      contract.on("GameStarted", async (timestamp, event) => {
          try {
            console.log("[Game Lifecycle]🔥 GameStarted Event Detected", { timestamp });
            await handleGameStarted(network, newContractAddress, timestamp, event);
          } catch (error) {
            console.error("❌ Error processing GameStarted event:", error);
          }
        });
  
      console.log(`[listener] ✅ Contract listeners attached successfully`);
  
    } catch (error) {
      console.error('[listener] ❌ Error attaching contract listeners:', error);
      throw error;
    }
  }
  
  

module.exports = {
  getContractInfo,
  attachContractListeners,
  listenForContractChanges,
  restartContractListeners,
};