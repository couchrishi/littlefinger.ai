const ethers = require('ethers'); 
const { WebSocketProvider, JsonRpcProvider, Contract } = ethers; 
const { getNetworkSecrets } = require("../utils/secrets");
const { admin, firestore } = require('../config/firebase'); 

const RETRY_DELAY_MS = 5000;
const MAX_RETRY_DELAY_MS = 60000;
let retryCount = 0;
let retryTimeout;
let webSocketProvider;
let contract; // ✅ Global variable for contract instance
let rpcProvider;
const PING_INTERVAL_MS = 60000;
let pingInterval;

// 📢 Firestore listener reference
let firestoreUnsubscribe = null;

/**
 * 🚀 Firestore listener for contract changes
 */
function listenToFirestoreForContractChanges(network) {
  console.log(`👂 Listening for changes in littlefinger-frontend-config/${network}`);
  
  const docRef = firestore.collection('littlefinger-frontend-config').doc(network);
  
  firestoreUnsubscribe = docRef.onSnapshot((doc) => {
    if (!doc.exists) {
      console.warn(`⚠️ No document found for network: ${network}`);
      return;
    }

    //const { contract: contract, abi: abi } = doc.data();
    newContractAddress = doc.data().contract.address;
    newAbi= doc.data().abi_json.abi;
    //console.log('🛠️ Contract changes detected:', { "newContract": newContractAddress, "newAbi": newAbi });
    console.log('🛠️ Contract changes detected:', { "newContract": newContractAddress });


    // Re-initialize the contract listeners with new contract data
    restartListeners(network, newContractAddress, newAbi);
  }, (error) => {
    console.error('❌ Firestore listener error:', error);
  });
}


async function listenForPlayerActionEvents(network) {
  try {
    const { CONTRACT_ADDRESS, WSS_URL, RPC_URL } = await getNetworkSecrets(network);
    const cleanedContractAddress = CONTRACT_ADDRESS.trim();
    const cleanedWSS_URL = WSS_URL.trim(); 
    const cleanedRPC_URL = RPC_URL.trim();

    console.log('🔍 Cleaned Network Secrets:', { CONTRACT_ADDRESS: cleanedContractAddress, WSS_URL: cleanedWSS_URL, RPC_URL: cleanedRPC_URL });
    
    // 🚀 Start Firestore listener for contract changes
    if (!firestoreUnsubscribe) {
      listenToFirestoreForContractChanges(network);
    }

    if (!webSocketProvider) {
      console.log('🌐 Initializing new WebSocket Provider...');
      webSocketProvider = new WebSocketProvider(cleanedWSS_URL);
    
      // Attach network change event handlers
      webSocketProvider.on('network', (newNetwork, oldNetwork) => {
        console.log(`🔄 Network changed from ${oldNetwork?.chainId} to ${newNetwork.chainId}`);
        // If network changes, we should restart as this is equivalent to a "disconnect"
        if (oldNetwork?.chainId !== newNetwork.chainId) {
          console.warn('🌐 Network change detected, scheduling restart...');
          scheduleRestart(network);
        }
      });
    
      // Attach error event handlers (acts as a "disconnect" listener)
      webSocketProvider.on('error', (error) => {
        console.error('⚠️ WebSocket error detected:', error.message);
        scheduleRestart(network); // Restart WebSocket on error
      });
    
      // Use getNetwork() to confirm readiness
      try {
        await webSocketProvider.getNetwork(); // ✅ Wait for provider to be fully ready
        console.log('✅ WebSocket connected!');
    
        // Keep-alive logic: Call eth_chainId as a ping every 60 seconds
        clearInterval(pingInterval); // Clear any existing ping
        pingInterval = setInterval(async () => {
          try {
            console.log('📡 Sending keep-alive ping (eth_chainId) to WebSocket...');
            const chainId = await webSocketProvider.send('eth_chainId', []);
            console.log(`📡 Keep-alive response received: chainId = ${chainId}`);
          } catch (error) {
            console.error('❌ Error during keep-alive ping:', error.message);
            scheduleRestart(network); // Restart if keep-alive ping fails
          }
        }, PING_INTERVAL_MS);
      } catch (error) {
        console.error('❌ Error while waiting for webSocketProvider to be ready:', error.message);
        scheduleRestart(network);
      }
    }
    
    
    
    await webSocketProvider.ready;
    console.log('✅ WebSocket connected!');
    
    const abiDocRef = firestore.collection('littlefinger-frontend-config').doc(network);

    try {
      // 🔥 Step 1: Get the ABI document from Firestore
      const abiDocSnapshot = await abiDocRef.get(); // Wait for the document to be retrieved
      if (!abiDocSnapshot.exists) {
        console.error(`❌ No ABI config found for network: ${network}`);
        throw new Error(`ABI not found for network: ${network}`);
      }

      // 🔥 Step 2: Extract the ABI from the document
      const abiData = abiDocSnapshot.data();
      if (!abiData || !abiData.abi_json || !Array.isArray(abiData.abi_json.abi)) {
        console.error(`❌ Invalid ABI structure for network: ${network}`);
        throw new Error(`ABI is missing or not properly structured for network: ${network}`);
      }

      // ✅ Step 3: Extract and set the ABI
      const abi = abiData.abi_json.abi; // Ensure this is an array (required for Ethers.js Contract)

      console.log(`✅ ABI loaded for network ${network}:`);

      
      // 🔥 Step 4: Initialize the Contract with ABI, Contract Address, and Provider
      contract = new Contract(cleanedContractAddress, abi, webSocketProvider);
      console.log('🧐 Contract initialized successfully');
      
    } catch (error) {
      console.error('❌ Error initializing contract:', error.message);
      // Optional: Re-throw the error if needed for upper-level handling
      throw error;
    }

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

    console.log("🎉 All playerActionListeners is running...");
    resetRetryCount();
  } catch (error) {
    console.error("❌ Error in listenForPlayerActionEvents:", error);
    scheduleRestart(network);
  }
}

function handleNetworkChange(newNetwork, oldNetwork) {
  if (oldNetwork) {
    console.log(`🔄 Network changed from ${oldNetwork.chainId} to ${newNetwork.chainId}`);
  }
}

function handleWebSocketError(error) {
  console.error("⚠️ WebSocket error:", error.message);
  scheduleRestart();
}

function scheduleRestart(network) {
  if (retryTimeout) clearTimeout(retryTimeout);
  const delay = Math.min(RETRY_DELAY_MS * (2 ** retryCount), MAX_RETRY_DELAY_MS);
  retryCount++;
  console.log(`🔄 Restarting in ${delay / 1000} seconds...`);
  retryTimeout = setTimeout(() => listenForPlayerActionEvents(network), delay);
}

function resetRetryCount() {
  retryCount = 0;
}

async function updateTransactionStatus(network, queryID, transactionHash, status, RPC_URL) {
  const transactionRef = firestore.collection('littlefinger-transactions').doc(network);
  await firestore.runTransaction(async (transaction) => {
    transaction.set(transactionRef, {
      [queryID]: {
        transactionHash: transactionHash,
        transactionReceiptStatus: status,
        lastModifiedAt: new Date().toISOString()
      }
    }, { merge: true });
  });
  console.log(`✅ Updated transaction for queryID: ${queryID} with status : ${status} `);

  // If the transaction is already successful, no need to track further
  if (status === "success") {
    console.log(`⚠️ Skipping trackTransaction as status is already 'success' for TX: ${transactionHash}`);
    return;
  }

  // Start tracking the transaction
  await trackTransaction(network, queryID, transactionHash, RPC_URL);
}

async function trackTransaction(network, queryID, transactionHash, RPC_URL) {
  console.log(`🚀 Tracking transaction: ${transactionHash} for queryID: ${queryID}`);
  let isComplete = false;
  if (!rpcProvider) {
    rpcProvider = new JsonRpcProvider(RPC_URL);
    console.log("🌐 RPC Provider initialized.");
  }
  
  // WebSocket listener for transaction receipt
  rpcProvider.once(transactionHash, async (receipt) => {
    if (isComplete) return; // Prevent duplicate processing
    isComplete = true;

    const txReceiptStatus = receipt.status === 1 ? "success" : "failure";
    console.log(`📡 WebSocket confirmation received for TX: ${transactionHash}`);
    console.log(`🔄 Receipt Status: ${txReceiptStatus}`);

    await updateTransactionStatus(network, queryID, transactionHash, txReceiptStatus, RPC_URL);
  });

  // Polling fallback
  let attempts = 0;
  const maxAttempts = 10; // Retry 10 times (100 seconds total)
  const pollingInterval = 10000; // Poll every 10 seconds

  const intervalId = setInterval(async () => {
    if (isComplete) {
      clearInterval(intervalId); // Stop polling if already complete
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

        await updateTransactionStatus(network, queryID, transactionHash, txReceiptStatus, RPC_URL);
        clearInterval(intervalId); // Stop polling
      } else if (attempts >= maxAttempts) {
        console.warn(`⚠️ Max polling attempts reached for TX: ${transactionHash}`);
        clearInterval(intervalId);
      }
    } catch (error) {
      console.error(`❌ Error while polling for TX: ${transactionHash}`, error);
    }
  }, pollingInterval);
}

async function updateFirestore(network, field, value) {
  const statsRef = firestore.collection("littlefinger-stats").doc(network);
  await firestore.runTransaction(async (transaction) => {
    transaction.set(statsRef, { [field]: value, lastModifiedAt: new Date().toISOString() }, { merge: true });
  });
  console.log(`📊 Firestore updated: ${field} = ${value} for network: ${network}`);
}

/**
 * 🚀 Restart contract event listeners
 */
async function restartListeners(network, newContractAddress, newAbi) {
  try {
    console.log('🔄 Restarting contract listeners with new contract info...');

    if (contract) {
      // ⚠️ Remove all existing listeners to prevent duplicates
      console.log('⚠️ Removing all existing listeners from the contract.');
      contract.removeAllListeners();
    }

    if (newContractAddress && newAbi) {
      const abi = newAbi;
      console.log(`🔄 Restarting listeners with new contract: ${newContractAddress}`);

      // 📢 Create new contract instance with new ABI and address
      const contract = new Contract(newContractAddress, abi, webSocketProvider);

      console.log('🧐 Contract initialized successfully with new ABI and address');

      // 🛠️ Reattach all the event listeners
      contract.on("QueryFeePaid", async (player, feeAmount, queryID, blockNumber, timestamp, event) => {
        console.log("\n🔥 QueryFeePaid Event Detected");
        const transactionHash = event?.log?.transactionHash || null;
        await updateTransactionStatus(network, queryID, transactionHash, 'success');
      });

      contract.on("NextQueryFee", async (nextFee, currentCount) => {
        console.log("\n🔥 NextQueryFee Event Detected");
        const feeInEth = ethers.formatUnits(nextFee, 18);
        await updateFirestore(network, "interactionCost", feeInEth);
      });

      contract.on("CurrentPrizePool", async (prizePool) => {
        console.log("\n🔥 CurrentPrizePool Event Detected");
        const prizePoolInEth = ethers.formatUnits(prizePool, 18);
        await updateFirestore(network, "currentPrizePool", prizePoolInEth);
      });

      contract.on("TotalQueries", async (queries) => {
        console.log("\n🔥 TotalQueries Event Detected");
        await updateFirestore(network, "breakInAttempts", queries);
      });

      console.log("✅ Event listeners successfully re-attached with new contract.");
    } else {
      console.warn('⚠️ Missing contract address or ABI.');
    }
  } catch (error) {
    console.error('❌ Error restarting listeners:', error);
  }
}

process.on('unhandledRejection', (error) => {
  console.error('🚨 Unhandled promise rejection:', error);
  scheduleRestart();
});

process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught exception:', error);
  scheduleRestart();
});

module.exports = { listenForPlayerActionEvents };