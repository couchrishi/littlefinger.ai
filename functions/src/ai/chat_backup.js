const functions = require("firebase-functions");
const { genkit, z } = require("genkit");
const { vertexAI, gemini15Pro } = require("@genkit-ai/vertexai");
const { Firestore } = require("@google-cloud/firestore");
const { ethers } = require("ethers");
const LittlefingerGameData = require("../blockchain/abis/LittlefingerGame.json");
const abi = LittlefingerGameData.abi; // Extract .abi if it's wrapped
const { SYSTEM_PROMPT } = require("../config/prompts");
require("dotenv").config({ path: require("path").resolve(__dirname, "../../../.env") });

// 🔥 Get env variables
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const RPC_URL = process.env.POLYGON_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

console.log("Contract address:", CONTRACT_ADDRESS);

// Initialize Firestore
const firestore = new Firestore();

// Define the FirestoreSessionStore class
class FirestoreSessionStore {
  constructor(network) {
    const collectionName = network === "testnet" ? "littlefinger-sessions-testnet" : "littlefinger-sessions-mainnet";
    this.collection = firestore.collection(collectionName);
  }

  async get(sessionId) {
    try {
      const doc = await this.collection.doc(sessionId).get();
      if (doc.exists) return doc.data();
      return undefined;
    } catch (error) {
      console.error("❌ Error loading session:", error);
      throw error;
    }
  }

  async save(sessionId, sessionData) {
    try {
      await this.collection.doc(sessionId).set(sessionData, { merge: true });
      console.log(`✅ Session data saved for sessionId: ${sessionId}`);
    } catch (error) {
      console.error("❌ Error saving session:", error);
      throw error;
    }
  }
}

// Initialize Genkit with the Vertex AI plugin
const ai = genkit({
  plugins: [
    vertexAI({
      projectId: "saib-ai-playground",
      location: "us-central1",
    }),
  ],
});

// Create or load a session
async function getSession(sessionId, network) {
  const sessionStore = new FirestoreSessionStore(network);
  if (sessionId) {
    const session = await ai.loadSession(sessionId, { store: sessionStore });
    if (session) {
      return session;
    }
  }
  return ai.createSession({ store: sessionStore });
}

// Function to validate and track transactions
async function validateAndTrackTransaction(network, queryId, txId, transactionReceiptStatus) {
  // 🛠️ Correct path to reference the network document directly
  const docRef = firestore.collection('littlefinger-transactions').doc(network);

  await firestore.runTransaction(async (transaction) => {
    const transactionDoc = await transaction.get(docRef);
    const data = transactionDoc.exists ? transactionDoc.data() : {};

    if (data[queryId]) {
      console.log(`🧐 Existing transaction found for queryID: ${queryId}`);
      
      // 🔍 Check if transactionHash matches
      if (data[queryId].transactionHash !== txId) {
        throw new Error("❌ Transaction hash mismatch. Denying the request.");
      }

      // 🛠️ Update transactionReceiptStatus only if it's not already "success"
      if (data[queryId].transactionReceiptStatus !== 'success') {
        if (transactionReceiptStatus) {
          transaction.set(docRef, {
            [queryId]: {
              transactionHash: txId,
              transactionReceiptStatus: transactionReceiptStatus
            }
          }, { merge: true });
          console.log(`✅ Updated receipt status to '${transactionReceiptStatus}' for queryID: ${queryId}`);
        } else {
          console.log(`⚠️ No status provided. Keeping receipt status as: ${data[queryId].transactionReceiptStatus}`);
        }
      } else {
        console.log(`✅ Transaction receipt status is already 'success' for queryID: ${queryId}`);
      }

      // ✅ Check if receipt status is 'success'
      if (data[queryId].transactionReceiptStatus === 'success') {
        console.log(`✅ Transaction already marked as success for queryID: ${queryId}`);
        return true; // Allow the request to proceed
      } else {
        throw new Error("❌ Transaction receipt status is not successful. Denying the request.");
      }
    } else {
      // 🔥 If the document doesn't exist, create it
      transaction.set(docRef, {
        [queryId]: {
          transactionHash: txId,
          transactionReceiptStatus: transactionReceiptStatus || 'pending',
        }
      }, { merge: true });
      console.log(`📘 Document created for queryID: ${queryId} with status: ${transactionReceiptStatus || 'pending'}`);
      throw new Error("❌ Transaction is not complete. Denying the request.");
    }
  });
}



// Main function to process messages
const sendMessage = async (message, sessionId, chainId, queryId, txId) => {
  console.log("Session ID:", sessionId);
  console.log("Message received:", message);
  console.log("Network ID:", chainId);
  console.log("Query ID:", queryId);
  console.log("Transaction ID:", txId);

  try {
    // Step 1: Validate transaction
    const network = getNetworkDocument(chainId);
    if (!network) throw new Error("Unsupported network.");

    await validateAndTrackTransaction(network, queryId, txId);

    // Step 2: Load or create a session
    const session = await getSession(sessionId, network);

    const chat = session.chat({
      model: gemini15Pro,
      system: SYSTEM_PROMPT,
      returnToolRequests: true,
    });

    // Step 3: Start the conversation
    const response = await chat.send({ prompt: message });

    console.log("💬 Chat Response:", response);

    const aiResponse = response.text || "I'm unable to process your request right now. Can you try rephrasing?";
    console.log("🤖 AI Response:", aiResponse);

    // Step 4: Update global history and stats
    await updateGlobalHistory(chainId, sessionId, queryId, txId, message, aiResponse);
    await updateStats(sessionId, chainId);

    return {
      response: aiResponse,
      responseType: response.toolRequests?.length > 0 ? "tool_request" : "default",
    };
  } catch (error) {
    console.error("❌ Error in sendMessage:", error);
    throw new Error(error.message);
  }
};

// Helper: Map chainId to network
function getNetworkDocument(chainId) {
  if (chainId === "0x89") return "mainnet";
  if (chainId === "0x13882") return "testnet";
  return null;
}

// Unified function to update Firestore global chat history
async function updateGlobalHistory(chainId, sessionId, queryId, txId, userMessage, aiResponse) {
  const networkDoc = getNetworkDocument(chainId);

  if (!networkDoc) {
    throw new Error("Unsupported network. Request failed.");
  }

  const historyRef = firestore.collection("littlefinger-global").doc(networkDoc);

  await firestore.runTransaction(async (transaction) => {
    const historyDoc = await transaction.get(historyRef);

    const data = historyDoc.exists ? historyDoc.data().messages || [] : [];

    const userMessageEntry = {
      network: networkDoc,
      sender: sessionId,
      text: userMessage,
      timestamp: new Date().toISOString(),
      queryId,
      transactionId: txId,
    };

    const aiResponseEntry = {
      network: networkDoc,
      sender: "Gemini",
      text: aiResponse,
      timestamp: new Date().toISOString(),
      queryId,
      transactionId: txId,
    };

    data.push(userMessageEntry);
    data.push(aiResponseEntry);

    transaction.set(historyRef, { messages: data }, { merge: true });

    console.log(`💾 Global history updated for ${networkDoc}:`, { userMessageEntry, aiResponseEntry });
  });
}

// Update Firestore stats
async function updateStats(sessionId, chainId) {
  const networkDoc = getNetworkDocument(chainId);

  if (!networkDoc) {
    throw new Error("Unsupported network. Request failed.");
  }

  const statsRef = firestore.collection("littlefinger-stats").doc(networkDoc);

  await firestore.runTransaction(async (transaction) => {
    const statsDoc = await transaction.get(statsRef);

    const data = statsDoc.exists ? statsDoc.data() : { participants: [], breakInAttempts: 0, totalParticipants: 0 };

    const participants = Array.isArray(data.participants) ? data.participants : [];

    const isNewUser = !participants.includes(sessionId);
    if (isNewUser) {
      participants.push(sessionId);
    }

    transaction.set(statsRef, {
      participants,
      totalParticipants: participants.length,
      //breakInAttempts: (data.breakInAttempts || 0) + 1,
    }, { merge: true });

    console.log(`📊 Stats updated for ${networkDoc}:`, {
      isNewUser,
      totalParticipants: participants.length,
      //breakInAttempts: (data.breakInAttempts || 0) + 1,
    });
  });
}

module.exports = {
  send: sendMessage,
};
