const ethers = require('ethers'); 
const { WebSocketProvider, JsonRpcProvider, Contract } = ethers; 
const { getNetworkSecrets } = require("../utils/secrets");
const { admin, firestore } = require('../config/firebase'); 

const RETRY_DELAY_MS = 5000;
let retryTimeout; // For managing retries
let webSocketProvider; // Global instance for WebSocket Provider
let rpcProvider; // Global instance for RPC Provider

async function listenForPlayerActionEvents(network) {
  try {
    const { CONTRACT_ADDRESS, WSS_URL, RPC_URL } = await getNetworkSecrets(network);
    const cleanedContractAddress = CONTRACT_ADDRESS.replace(/^['"]|['"]$/g, '').trim();
    const cleanedWSS_URL = WSS_URL.replace(/^['"]|['"]$/g, '').trim(); 
    const cleanedRPC_URL = RPC_URL.replace(/^['"]|['"]$/g, '').trim();

    console.log('🔍 Cleaned Network Secrets:', { CONTRACT_ADDRESS: cleanedContractAddress, WSS_URL: cleanedWSS_URL, RPC_URL: cleanedRPC_URL });

    // ✅ Check if the WebSocketProvider is already initialized, if so, reuse it
    if (!webSocketProvider) {
      webSocketProvider = new WebSocketProvider(cleanedWSS_URL);
      console.log('🌐 New WebSocket Provider created and connected.');
    } else {
      console.log('🌐 Reusing existing WebSocket Provider.');
    }

    // const provider = new WebSocketProvider(cleanedWSS_URL);
    // if (!provider) throw new Error('❌ Provider is undefined! Check WSS URL.');

    await webSocketProvider.ready;
    console.log('✅ Websocket Provider connected successfully!');

    if (!webSocketProvider.websocket) {
      throw new Error('❌ provider.websocket is undefined after provider.ready!');
    }

    webSocketProvider.websocket.addEventListener("open", () => {
      console.log('✅ WebSocket connected!');
    });

    webSocketProvider.websocket.addEventListener("close", (event) => {
      console.error(`❌ WebSocket closed. Code: ${event.code}. Reconnecting in ${RETRY_DELAY_MS}ms...`);
      if (retryTimeout) clearTimeout(retryTimeout);
      retryTimeout = setTimeout(() => listenForPlayerActionEvents(network), RETRY_DELAY_MS);
    });

    webSocketProvider.websocket.addEventListener("error", (error) => {
      console.error("⚠️ WebSocket error:", error.message);
      if (retryTimeout) clearTimeout(retryTimeout);
      retryTimeout = setTimeout(() => listenForPlayerActionEvents(network), RETRY_DELAY_MS);
    });

    const abi = require("../abis/LittlefingerGame.json")?.abi;
    if (!abi) throw new Error('❌ ABI is undefined or not found');

    const contract = new Contract(cleanedContractAddress, abi, webSocketProvider);
    if (!contract) throw new Error('❌ Contract instance is undefined.');
    console.log('🧐 Contract initialized successfully');

    /**
     * 🔥 Handle QueryFeePaid Event
     */
    contract.on("QueryFeePaid", async function (player, feeAmount, queryID, blockNumber, timestamp, event) {
      try {
        console.log("\n🔥 QueryFeePaid Event Detected");
    
        const transactionHash = event?.log?.transactionHash || null;
        const transactionReceiptStatus = event?.receipt?.status === 1 ? 'success' : 'failure';
    
        console.log("🕹️ Player Address:", player);
        console.log("🧾 Query ID:", queryID);
        console.log("🔗 Transaction Hash:", transactionHash || "❌ No Transaction Hash");
        console.log("🧾 Transaction Receipt Status:", transactionReceiptStatus);
    
        if (!transactionHash) {
          console.warn(`⚠️ Transaction hash is missing for QueryID: ${queryID}`);
        }
        
        console.log("inside listener RPC:", cleanedRPC_URL)
        // ✅ Update Firestore under littlefinger-transactions/{network}/{queryID}
        await updateTransactionStatus(network, queryID, transactionHash, transactionReceiptStatus, cleanedRPC_URL);
    
      } catch (error) {
        console.error("❌ Error processing QueryFeePaid:", error);
      }
    });

    /**
     * 🔥 Handle NextQueryFee Event
     */
    contract.on("NextQueryFee", async (nextFee, currentCount) => {
      try {
        console.log("\n🔥 NextQueryFee Event Detected");

        const feeInEth = ethers.formatUnits(nextFee, 18);
        const feeAsNumber = parseFloat(feeInEth);
        const countAsNumber = parseInt(currentCount.toString(), 10);

        console.log("📈 Next Query Fee (in ETH):", feeAsNumber);
        console.log("🧮 Current Count:", countAsNumber);

        await updateFirestore(network, "interactionCost", feeAsNumber);
      } catch (error) {
        console.error("❌ Error processing NextQueryFee:", error);
      }
    });

    /**
     * 🔥 Handle CurrentPrizePool Event
     */
    contract.on("CurrentPrizePool", async (prizePool) => {
      try {
        console.log("\n🔥 CurrentPrizePool Event Detected");

        const prizePoolInEth = ethers.formatUnits(prizePool, 18);
        const prizePoolAsNumber = parseFloat(prizePoolInEth);

        console.log("🏦 Current Prize Pool (in ETH):", prizePoolAsNumber);

        await updateFirestore(network, "currentPrizePool", prizePoolAsNumber);
      } catch (error) {
        console.error("❌ Error processing CurrentPrizePool:", error);
      }
    });

    /**
     * 🔥 Handle TotalQueries Event
     */
    contract.on("TotalQueries", async (queries) => {
      try {
        console.log("\n🔥 TotalQueries Event Detected");

        const breakinAttempts = queries;

        console.log("🏦 Total Break-in Attempts:", breakinAttempts);

        await updateFirestore(network, "breakInAttempts", breakinAttempts);
      } catch (error) {
        console.error("❌ Error processing TotalQueries event:", error);
      }
    });

    console.log("🎉 PlayerActionListeners is running...");
  } catch (error) {
    console.error("❌ Error in listenForPlayerActionEvents:", error);
    console.log(`🔄 Retrying in ${RETRY_DELAY_MS} ms...`);
    return setTimeout(() => listenForPlayerActionEvents(network), RETRY_DELAY_MS);
  }
}



/**
 * 🔥 Update Firestore for transaction status
 */
async function updateTransactionStatus(network, queryID, transactionHash, transactionReceiptStatus, RPC_URL) {
  const transactionRef = firestore.collection('littlefinger-transactions').doc(network);

  await firestore.runTransaction(async (transaction) => {
    const transactionDoc = await transaction.get(transactionRef);
    const data = transactionDoc.exists ? transactionDoc.data() : {};

    if (data[queryID]) {
      console.log(`🧐 Existing transaction found for queryID: ${queryID}`);
      
      if (data[queryID] && data[queryID].transactionHash !== transactionHash) {
        throw new Error(`❌ Transaction hash mismatch for queryID: ${queryID}`);
      }
      
      if (data[queryID].transactionReceiptStatus !== 'success') {
        transaction.set(transactionRef, {
          [queryID]: {
            transactionHash: transactionHash,
            transactionReceiptStatus: transactionReceiptStatus,
            lastModifiedAt: new Date().toISOString() // 🔥 Add lastModifiedAt field with current timestamp
          }
        }, { merge: true });
        console.log(`✅ Updated receipt status to '${transactionReceiptStatus}' for queryID: ${queryID}`);
      } else {
        console.log(`⚠️ Skipped update since receipt status is already 'success' for queryID: ${queryID}`);
      }
    } else {
      console.log(`📘 No existing entry for queryID: ${queryID}. Creating one...`);
      transaction.set(transactionRef, {
        [queryID]: {
          transactionHash: transactionHash,
          transactionReceiptStatus: transactionReceiptStatus || 'pending',
          lastModifiedAt: new Date().toISOString() // 🔥 Add lastModifiedAt field with current timestamp
        }
      }, { merge: true });
      console.log(`✅ Document created for queryID: ${queryID}`);
    }

  });
  // 🚀 Check if the transaction is already successful. If yes, skip tracking.
  if (transactionReceiptStatus === 'success') {
    console.log(`⚠️ Skipping trackTransaction as receipt status is already 'success' for TX: ${transactionHash}`);
    return; // 🚀 Skip tracking
  }

  // 🚀 Call Hybrid Tracker for Transaction Status
  await trackTransaction(network, queryID, transactionHash, RPC_URL);

}

/**
 * 🚀 Hybrid tracker for transaction receipt confirmation (WebSocket + Polling Fallback)
 */
async function trackTransaction(network, queryID, transactionHash, RPC_URL) {
  console.log("🚀 Starting to track transaction:", transactionHash);

   // ✅ Check if the RPC provider is already initialized, if so, reuse it
   if (!rpcProvider) {
      rpcProvider = new JsonRpcProvider(RPC_URL);
      console.log('🌐 New RPC Provider created and connected.');
    } else {
      console.log('🌐 Reusing existing RPC Provider.');
    }

  // console.log("RPC provider: ", RPC_URL);
  // const provider = new JsonRpcProvider('https://polygon-amoy.g.alchemy.com/v2/fG1gsMTmErBfg0k4JLZ_PyDvsBVUu3Fe');
  let isComplete = false;

  console.log(`🚀 Tracking transaction: ${transactionHash} for queryID: ${queryID}`);

  // 🔥 WebSocket Listener
  rpcProvider.once(transactionHash, async (receipt) => {
    if (isComplete) return; // Prevent re-execution if already complete
    isComplete = true; // 🛑 Stop further tracking

    const txReceiptStatus = receipt.status === 1 ? "success" : "failure";
    console.log(`📡 WebSocket confirmation received for TX: ${transactionHash}`);
    console.log(`🔄 Receipt Status: ${txReceiptStatus}`);

    try {
      await updateTransactionStatus(network, queryID, transactionHash, txReceiptStatus);
      console.log(`✅ Firestore updated via WebSocket for TX: ${transactionHash}`);
    } catch (error) {
      console.error(`❌ Failed to update Firestore via WebSocket for TX: ${transactionHash}`, error);
    }
  });

  // 🔥 Polling Fallback
  let attempts = 0;
  const maxAttempts = 10; // Retry 10 times (10 * pollingInterval = 100 seconds)
  const pollingInterval = 10000; // Poll every 10 seconds

  const intervalId = setInterval(async () => {
    if (isComplete) {
      clearInterval(intervalId); // ✅ Stop polling if WebSocket succeeds
      return;
    }

    try {
      attempts++;
      console.log(`🕒 Polling attempt #${attempts} for TX: ${transactionHash}`);
      const receipt = await rpcProvider.getTransactionReceipt(transactionHash);

      if (receipt) {
        isComplete = true;
        const txReceiptStatus = receipt.status === 1 ? "success" : "failure";
        console.log(`📋 Polling confirmation received for TX: ${transactionHash}`);
        console.log(`🔄 Receipt Status: ${txReceiptStatus}`);

        try {
          await updateTransactionStatus(network, queryID, transactionHash, txReceiptStatus);
          console.log(`✅ Firestore updated via Polling for TX: ${transactionHash}`);
        } catch (error) {
          console.error(`❌ Failed to update Firestore via Polling for TX: ${transactionHash}`, error);
        }
        clearInterval(intervalId); // 🛑 Stop further polling
      } else if (attempts >= maxAttempts) {
        console.warn(`⚠️ Max polling attempts reached for TX: ${transactionHash}`);
        clearInterval(intervalId);
      }
    } catch (error) {
      console.error(`❌ Error while polling for receipt of TX: ${transactionHash}`, error);
    }
  }, pollingInterval);
}

async function updateFirestore(network, field, value) {
  const statsRef = firestore.collection("littlefinger-stats").doc(network);
  await firestore.runTransaction(async (transaction) => {
    transaction.set(
      statsRef,
      { [field]: value,
        lastModifiedAt: new Date().toISOString() // 🔥 Add lastModifiedAt field with current timestamp
       }, 
      { merge: true }
    );
  });

  console.log(`📊 Firestore updated: ${field} = ${value} for network: ${network}`);
}


process.on('unhandledRejection', (error) => {
  console.error('🚨 Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught exception:', error);
});

module.exports = { listenForPlayerActionEvents };
