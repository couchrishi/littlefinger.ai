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
async function updateGlobalHistory(network, sessionId, queryId, txId, userMessage, aiResponse, toolRequests) {
  const historyRef = firestore.collection("littlefinger-global").doc(network);
  const explanationsRef = firestore.collection('littlefinger-explanations').doc(network);

  const toolInput = toolRequests.length > 0 ? toolRequests[0].toolRequest.input : {};

  const userMessageEntry = {
    network,
    sender: sessionId,
    text: userMessage,
    timestamp: new Date().toISOString(),
    queryId,
    transactionId: txId,
  };

  const aiResponseEntry = {
    network,
    sender: "Gemini",
    text: aiResponse,
    timestamp: new Date().toISOString(),
    queryId,
    transactionId: txId,
  };

  const explanationData = {
    queryID: queryId,
    queryText: userMessage,
    toolSelected: toolRequests.length > 0 ? toolRequests[0].toolName : 'No Tool Selected',
    explanation: toolInput.explanation || 'No explanation provided',
  };

  await firestore.runTransaction(async (transaction) => {
    const historyDoc = await transaction.get(historyRef);
    const existingHistory = historyDoc.exists ? historyDoc.data().messages || [] : [];
    existingHistory.push(userMessageEntry);
    existingHistory.push(aiResponseEntry);
    transaction.set(historyRef, { messages: existingHistory }, { merge: true });

    transaction.set(explanationsRef, { [queryId]: explanationData }, { merge: true });

    console.log(`📘 Explanation and history for queryID: ${queryId} successfully saved.`);
  });
}

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
  updateQueryStatusAfterAIResponse
};
