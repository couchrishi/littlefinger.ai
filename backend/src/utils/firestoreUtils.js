

const { Firestore } = require('@google-cloud/firestore');
const { FieldValue, Timestamp } = require('@google-cloud/firestore');
const { getFirestorePaths } = require('./firestorePaths');
const { accessSecret, getNetworkSecrets } = require('./secrets.js');
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
 * Update Firestore stats
 */
async function updateStats(sessionId, network) {
    const paths = await getFirestorePaths(network);
    const statsCollectionsPath = paths.STATS; 
    const statsRef = firestore.collection(statsCollectionsPath).doc(network);
  
    await firestore.runTransaction(async (transaction) => {
      const statsDoc = await transaction.get(statsRef);
      const data = statsDoc.exists ? statsDoc.data() : { participants: [] };
  
      if (!data.participants.includes(sessionId)) {
        transaction.set(statsRef, { participants: [...data.participants, sessionId] }, { merge: true });
      }
    });
  }
  

/**
 * Update global chat history in Firestore
 */

const updateGlobalHistory = async (network, sessionId, queryId, txId, userMessage, aiResponse, explanation, isWinningQuery) => {

    const paths = await getFirestorePaths(network);
    const historyCollectionsPath = paths.GLOBAL_CHAT_HISTORY; 
    const historyRef = firestore.collection(historyCollectionsPath).doc(network);

    const explanationsCollectionsPath = paths.EXPLANATIONS;
    const explanationsRef = firestore.collection(explanationsCollectionsPath).doc(network);

    const userMessageEntry = {
      network,
      sender: sessionId,
      text: userMessage || "Unable to retrieve user message",
      timestamp: new Date().toISOString(),
      queryId,
      transactionId: txId,
      isWinningQuery: isWinningQuery
    };
  
    const aiResponseEntry = {
      network,
      sender: aiResponse.role,
      text: aiResponse.message || 'No response provided by Gemini.',
      timestamp: new Date().toISOString(),
      queryId,
      transactionId: txId,
      responseType: aiResponse.responseType === 'approve' ? 'won' : 'safety_block'? 'safety_block': 'default' // 🟡 Add responseType logic
    };
  
    const explanationData = {
      user: sessionId,
      queryText: userMessage || "Unable to retrieve user message",
      action: aiResponse.responseType || 'unknown',
      explanation: explanation || 'No explanation provided',
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


async function updateGameStatusToWon(network) {
    try {

      const secrets = await getNetworkSecrets(network);
      const gameID = secrets.CONTRACT_ADDRESS;
      console.log("GAMEID", gameID)

      console.log(
        `[updateGameLifecycleInfo] 🔥 Updating lifecycle info for network: ${network}, gameID: ${gameID}`
      );
      
      const paths = await getFirestorePaths(network);
      const collectionsPath = paths.GAME_LIFECYCLE; 
      const lifecyclePath = `${collectionsPath}/${network}/games/${gameID}`;
      const lifecycleRef = firestore.doc(lifecyclePath);

  
      // 🔥 Use a transaction to update the game document
      return await firestore.runTransaction(async (transaction) => {
        const docSnapshot = await transaction.get(lifecycleRef);
  
        if (!docSnapshot.exists) {
          // Return a soft error message if the document does not exist
          console.warn(
            `[updateGameLifecycleInfo] ⚠️ No existing document found for gameID: ${gameID} at path: ${lifecyclePath}`
          );
          return {
            status: 'error',
            message: `No existing document found for gameID: ${gameID}`,
          };
        }
  
        console.log(
          `⚠️ Existing data found for gameID: ${gameID} at path: ${lifecyclePath}`
        );
        
        //const currentTimestampMillis = Date.now();

        // 🔥 Prepare the new game lifecycle data
        const newData = {
          gameID: gameID,
          gameStatus: {
            status: "won",
            //idleSince: Timestamp.fromMillis(currentTimestampMillis),
            //idleSince: currentTimestampMillis,
          },
        };
  
        // 🔥 Set the new game status for the gameID document
        transaction.set(lifecycleRef, newData, { merge: true });
        console.log(
          ` ✅ Updated lifecycle info for gameID: ${gameID} at path: ${lifecyclePath}`
        );
  
        return { status: 'success' };
      });
    } catch (error) {
      console.error(
        ` ❌ Error updating game lifecycle info for network: ${network}, gameID: ${gameID}`,
        error
      );
      return { status: 'error' };
    }
  }
  

/**
 * 🔥 Fetch the contract address and ABI from Firestore.
 * 
 * @param {string} network - The network (e.g., 'testnet' or 'mainnet')
 * @returns {Promise<{ contractAddress: string, abi: Array }>} - Returns the contract address and ABI
 */
// async function getContractInfoFromFirestore(network) {
//     try {
//       console.log(` 🔍 Fetching contract info for network: ${network}`);
      
//       // 🔥 Get the Firestore paths for the given network
//       const paths = await getFirestorePaths(network);
//       const collectionPath = paths.FRONTEND_CONFIG; 
  
//       if (!collectionPath) {
//         throw new Error(`[firestoreUtils] ❌ Missing collection path for FRONTEND_CONFIG for network: ${network}`);
//       }
  
//       console.log(`[firestoreUtils] 🔍 Looking for document at path: ${collectionPath}/${network}`);
  
//       const docRef = firestore.collection(collectionPath).doc(network);
//       const docSnapshot = await docRef.get();
  
//       if (!docSnapshot.exists) {
//         throw new Error(`[firestoreUtils] ⚠️ Firestore document not found at path: ${collectionPath}/${network}`);
//       }
  
//       const docData = docSnapshot.data();
  
//       const contractAddress = docData?.contract;
//       const abi = docData?.abi_json?.abi;
  
//       if (!contractAddress || !abi) {
//         throw new Error(`[firestoreUtils] ⚠️ Missing contract address or ABI in Firestore document for network: ${network}`);
//       }
  
//       console.log(`[firestoreUtils] ✅ Successfully retrieved contract info for network: ${network}`);
//       return { contractAddress, abi };
//     } catch (error) {
//       console.error(`[firestoreUtils] ❌ Error fetching contract info for network: ${network}`, error);
//       throw error; // Bubble the error up
//     }
//   }

//   async function getPrizePoolFromFireStore(network) {
//     try {
//       console.log(` 🔍 Fetching prize pool amount for network: ${network}`);
      
//       // 🔥 Get the Firestore paths for the given network
//       const paths = await getFirestorePaths(network);
//       const collectionPath = paths.STATS; 
  
//       if (!collectionPath) {
//         throw new Error(`[firestoreUtils] ❌ Missing collection path for STATS for network: ${network}`);
//       }
  
//       console.log(`[firestoreUtils] 🔍 Looking for document at path: ${collectionPath}/${network}`);
  
//       const docRef = firestore.collection(collectionPath).doc(network);
//       const docSnapshot = await docRef.get();
  
//       if (!docSnapshot.exists) {
//         throw new Error(`[firestoreUtils] ⚠️ Firestore document not found at path: ${collectionPath}/${network}`);
//       }
  
//       const docData = docSnapshot.data();
//       const prizePool = docData?.currentPrizePool;
  
//       if (!prizePool) {
//         throw new Error(`[firestoreUtils] ⚠️ Missing Prize pool in Firestore document for network: ${network}`);
//       }
  
//       console.log(`[firestoreUtils] ✅ Successfully retrieved prize pool amount for network: ${network}`);
//       return prizePool;
//     } catch (error) {
//       console.error(`[firestoreUtils] ❌ Error fetching contract info for network: ${network}`, error);
//       throw error; // Bubble the error up
//     }
//   }

/**
 * Validate and track transactions in Firestore
 */
async function isTransactionSuccess(network, queryId, txId) {

    const paths = await getFirestorePaths(network);
    const collectionsPath = paths.TRANSACTIONS; 
    const docRef = firestore.collection(collectionsPath).doc(network);
  
    try {
      const transactionDoc = await docRef.get();
      const data = transactionDoc.exists ? transactionDoc.data() : {};
  
      if (data[queryId]) {
        if (data[queryId].transactionHash !== txId) {
          console.error(
            `❌ Transaction hash mismatch for queryID: ${queryId}. Expected: ${txId}, Found: ${data[queryId].transactionHash}`
          );
          return false; // Return false for hash mismatch
        }
  
        if (data[queryId].transactionReceiptStatus === "success") {
          console.log(
            `✅ Transaction found and status is 'success' for queryID: ${queryId}`
          );
          return true; // Return true if status is 'success'
        } else {
          console.log(
            `❌ Transaction found but status is not 'success' for queryID: ${queryId}. Status: ${data[queryId].transactionReceiptStatus}`
          );
          return false; // Return false if status is not 'success'
        }
      } else {
        console.log(`❌ Transaction not found for queryID: ${queryId}`);
        return false; // Return false if transaction not found
      }
    } catch (error) {
      console.error(
        `❌ Error in checkTransactionStatus for queryID: ${queryId}`,
        error
      );
      return false; // Return false on error
    }
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
    isTransactionSuccess,
    updateQueryStatusAfterAIResponse,
    updateGameStatusToWon,
  };
  