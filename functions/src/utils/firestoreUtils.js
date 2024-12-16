const { Firestore } = require('@google-cloud/firestore');

// Initialize Firestore
const firestore = new Firestore();

/**
 * Get Firestore network document based on chainId
 */
function getNetworkDocument(chainId) {
  if (chainId === "0x89") return "mainnet";
  if (chainId === "0x13882") return "testnet";
  return null;
}

/**
 * Update global chat history in Firestore
 */

const updateGlobalHistory = async (network, sessionId, queryId, txId, userMessage, clonedExtractedJson, isWinningQuery) => {
  console.log("Inside firestore logic: ", )
  const historyRef = firestore.collection("littlefinger-global").doc(network);
  const explanationsRef = firestore.collection('littlefinger-explanations').doc(network);

  const userMessageEntry = {
    network,
    sender: sessionId,
    text: userMessage,
    timestamp: new Date().toISOString(),
    queryId,
    transactionId: txId,
    isWinningQuery: isWinningQuery
  };

  const aiResponseEntry = {
    network,
    sender: "Gemini",
    text: clonedExtractedJson?.nlr|| 'No response provided by Gemini.',
    timestamp: new Date().toISOString(),
    queryId,
    transactionId: txId,
    responseType: clonedExtractedJson?.fcr?.action === 'approve' ? 'won' : 'default' // 🟡 Add responseType logic
  };

  const explanationData = {
    queryText: userMessage,
    action: clonedExtractedJson?.fcr?.action || 'unknown',
    explanation: clonedExtractedJson?.fcr?.explanation || 'No explanation provided',
  };

  await firestore.runTransaction(async (transaction) => {
    const historyDoc = await transaction.get(historyRef);
    const existingHistory = historyDoc.exists ? historyDoc.data().messages || [] : [];

    // Update the user message and AI response in the global history
    existingHistory.push(userMessageEntry);
    existingHistory.push(aiResponseEntry);
    transaction.set(historyRef, { messages: existingHistory }, { merge: true });

    // Update the explanations collection with the query information
    transaction.set(explanationsRef, { [queryId]: explanationData }, { merge: true });

    console.log(`📘 Explanation and history for queryID: ${queryId} successfully saved.`);
  });
}

async function updateGameLifecycleInfo(network, gameID, gameStatus) {
  try {
    console.log(`[updateGameLifecycleInfo] 🔥 Updating lifecycle info for network: ${network}, gameID: ${gameID}`);

    // 🔥 Firestore path: /littlefinger-game-lifecycle/{network}/games/{gameID}
    const lifecyclePath = `littlefinger-game-lifecycle/${network}/games/${gameID}`;
    const lifecycleRef = firestore.doc(lifecyclePath);

    // 🔥 Use a transaction to update the game document
    await firestore.runTransaction(async (transaction) => {
      const docSnapshot = await transaction.get(lifecycleRef);
      const existingData = docSnapshot.exists ? docSnapshot.data() : {};

      if (existingData) {
        console.log(`⚠️ Existing data found for gameID: ${gameID} at path: ${lifecyclePath}`);
      } else {
        console.log(` 📄 No existing document found for gameID: ${gameID} at path: ${lifecyclePath}`);
      }

      // 🔥 Prepare the new game lifecycle data
      const newData = {
        gameID: gameID,
        gameStatus: {
          status: gameStatus.status,
          startedAt: Timestamp.fromMillis(Number(gameStatus.startedAt) * 1000),
          idleSince: Timestamp.fromMillis(Number(gameStatus.idleSince) * 1000),
        }
      };

      // 🔥 Set the new game status for the gameID document
      transaction.set(lifecycleRef, newData, { merge: true });
      console.log(` ✅ Updated lifecycle info for gameID: ${gameID} at path: ${lifecyclePath}`);
    });

  } catch (error) {
    console.error(` ❌ Error updating game lifecycle info for network: ${network}, gameID: ${gameID}`, error);
    throw error; // Re-throw the error for better error handling
  }
}













// async function updateGlobalHistory(network, sessionId, queryId, txId, userMessage, aiResponse, toolRequests) {
//   const historyRef = firestore.collection("littlefinger-global").doc(network);
//   const explanationsRef = firestore.collection('littlefinger-explanations').doc(network);

//   const toolInput = toolRequests.length > 0 ? toolRequests[0].toolRequest.input : {};

//   const userMessageEntry = {
//     network,
//     sender: sessionId,
//     text: userMessage,
//     timestamp: new Date().toISOString(),
//     queryId,
//     transactionId: txId,
//   };

//   const aiResponseEntry = {
//     network,
//     sender: "Gemini",
//     text: aiResponse,
//     timestamp: new Date().toISOString(),
//     queryId,
//     transactionId: txId,
//   };

//   const explanationData = {
//     queryID: queryId,
//     queryText: userMessage,
//     toolSelected: toolRequests.length > 0 ? toolRequests[0].toolName : 'No Tool Selected',
//     explanation: toolInput.explanation || 'No explanation provided',
//   };

//   await firestore.runTransaction(async (transaction) => {
//     const historyDoc = await transaction.get(historyRef);
//     const existingHistory = historyDoc.exists ? historyDoc.data().messages || [] : [];
//     existingHistory.push(userMessageEntry);
//     existingHistory.push(aiResponseEntry);
//     transaction.set(historyRef, { messages: existingHistory }, { merge: true });

//     transaction.set(explanationsRef, { [queryId]: explanationData }, { merge: true });

//     console.log(`📘 Explanation and history for queryID: ${queryId} successfully saved.`);
//   });
// }

/**
 * Update Firestore stats
 */
async function updateStats(sessionId, chainId) {
  const networkDoc = getNetworkDocument(chainId);
  const statsRef = firestore.collection("littlefinger-stats").doc(networkDoc);

  await firestore.runTransaction(async (transaction) => {
    const statsDoc = await transaction.get(statsRef);
    const data = statsDoc.exists ? statsDoc.data() : { participants: [] };

    if (!data.participants.includes(sessionId)) {
      transaction.set(statsRef, { participants: [...data.participants, sessionId] }, { merge: true });
    }
  });
}

/**
 * Validate and track transactions in Firestore
 */
async function validateAndTrackTransaction(network, queryId, txId, transactionReceiptStatus) {
  const docRef = firestore.collection('littlefinger-transactions').doc(network);

  await firestore.runTransaction(async (transaction) => {
    const transactionDoc = await transaction.get(docRef);
    const data = transactionDoc.exists ? transactionDoc.data() : {};

    if (data[queryId]) {
      if (data[queryId].transactionHash !== txId) {
        throw new Error("❌ Transaction hash mismatch. Denying the request.");
      }

      if (data[queryId].transactionReceiptStatus !== 'success') {
        if (transactionReceiptStatus) {
          transaction.set(docRef, {
            [queryId]: {
              transactionHash: txId,
              transactionReceiptStatus: transactionReceiptStatus,
              lastModifiedAt: new Date().toISOString()
            }
          }, { merge: true });
        }
      } else {
        console.log(`✅ Transaction receipt status is already 'success' for queryID: ${queryId}`);
      }

      if (data[queryId].transactionReceiptStatus === 'success') {
        return true;
      } else {
        throw new Error("❌ Transaction receipt status is not successful. Denying the request.");
      }
    } else {
      transaction.set(docRef, {
        [queryId]: {
          transactionHash: txId,
          transactionReceiptStatus: transactionReceiptStatus || 'pending',
          lastModifiedAt: new Date().toISOString()
        }
      }, { merge: true });
      throw new Error("❌ Transaction is not complete. Denying the request.");
    }
  });
}

/**
 * Update Firestore for AI response status and user wallet address
 * 
 * @param {string} network - The network to use ('testnet' or 'mainnet')
 * @param {string} queryId - The unique query ID to update in Firestore
 * @param {string} userWalletAddress - The wallet address or session ID of the user
 * @param {string} aiResponseStatus - The status of the AI response (success or failure)
 */
async function updateQueryStatusAfterAIResponse(network, queryId, userWalletAddress, aiResponseStatus) {
  const docRef = firestore.collection('littlefinger-transactions').doc(network);

  try {
    await firestore.runTransaction(async (transaction) => {
      const transactionDoc = await transaction.get(docRef);
      const data = transactionDoc.exists ? transactionDoc.data() : {};

      if (!data[queryId]) {
        console.log(`📘 No existing entry for queryID: ${queryId}. Creating one...`);
        transaction.set(docRef, {
          [queryId]: {
            userWalletAddress: userWalletAddress || 'unknown',
            aiResponseStatus: aiResponseStatus || 'failure',
            lastModifiedAt: new Date().toISOString()
          }
        }, { merge: true });
        console.log(`✅ Document created for queryID: ${queryId} with userWalletAddress: ${userWalletAddress} and aiResponseStatus: ${aiResponseStatus}`);
      } else {
        console.log(`🧐 Existing transaction found for queryID: ${queryId}`);
        transaction.set(docRef, {
          [queryId]: {
            userWalletAddress: userWalletAddress || data[queryId].userWalletAddress || 'unknown',
            aiResponseStatus: aiResponseStatus || data[queryId].aiResponseStatus || 'failure',
            lastModifiedAt: new Date().toISOString()
          }
        }, { merge: true });
        console.log(`✅ Updated userWalletAddress to '${userWalletAddress}' and aiResponseStatus to '${aiResponseStatus}' for queryID: ${queryId}`);
      }
    });
  } catch (error) {
    console.error(`❌ Error updating AI response status for queryID: ${queryId}`, error);
  }
}


module.exports = {
  getNetworkDocument,
  updateGlobalHistory,
  updateStats,
  validateAndTrackTransaction,
  updateQueryStatusAfterAIResponse,
  updateGameLifecycleInfo,
};
