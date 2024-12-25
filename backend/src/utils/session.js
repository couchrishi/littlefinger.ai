

const { Firestore } = require('@google-cloud/firestore');
const { getFirestorePaths } = require('./firestorePaths');

// Initialize Firestore
const firestore = new Firestore();

/**
 * Retrieve a session from Firestore
 * @param {string} sessionId - The unique session ID
 * @param {string} network - The network ('mainnet' or 'testnet')
 * @returns {Object} - The session data
 */
async function getSession(sessionId, network) {
  try {
    const { LOCAL_SESSIONS } = await getFirestorePaths(network); // Get paths dynamically
    const sessionRef = firestore
      .collection(LOCAL_SESSIONS) // Collection name
      .doc(network) // Network (mainnet/testnet) as document
      .collection('sessions') // Subcollection
      .doc(sessionId); // Specific session document

    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      // If session does not exist, create a new one
      const newSession = { messages: [] };
      await sessionRef.set(newSession);
      console.log(`[getSession] 🔥 New session created for sessionId: ${sessionId} on network: ${network}`);
      return newSession;
    }

    const sessionData = sessionDoc.data();

    // Ensure messages array is valid
    if (!Array.isArray(sessionData.messages)) {
      console.warn(`[getSession] ⚠️ Invalid 'messages' array for sessionId: ${sessionId}. Resetting to empty array.`);
      sessionData.messages = [];
    }

    console.log(`[getSession] ✅ Session retrieved for sessionId: ${sessionId} on network: ${network}`);
    return sessionData;
  } catch (error) {
    console.error(`[getSession] ❌ Error occurred while retrieving session for sessionId: ${sessionId} on network: ${network}`, error);
    // Return default session to prevent errors in chat.js
    return { messages: [] };
  }
}


async function getGlobalSession(network) {
  try {
    const { GLOBAL_CHAT_HISTORY } = await getFirestorePaths(network); // Get paths dynamically
    const globalRef = firestore
      .collection(GLOBAL_CHAT_HISTORY) // Collection name
      .doc(network); // Network (mainnet/testnet) as document

    const globalDoc = await globalRef.get();

    if (!globalDoc.exists) {
      // If the global session does not exist, create a new one
      const newGlobalSession = { messages: [] };
      await globalRef.set(newGlobalSession);
      console.log(`[getGlobalSession] 🔥 New global session created for network: ${network}`);
      return newGlobalSession;
    }

    const globalData = globalDoc.data();

    // Ensure messages array is valid
    if (!Array.isArray(globalData.messages)) {
      console.warn(`[getGlobalSession] ⚠️ Invalid 'messages' array for network: ${network}. Resetting to empty array.`);
      globalData.messages = [];
    }

    console.log(`[getGlobalSession] ✅ Global session retrieved for network: ${network}`);
    return globalData;
  } catch (error) {
    console.error(`[getGlobalSession] ❌ Error occurred while retrieving global session for network: ${network}`, error);
    // Return default session to prevent errors in chat.js
    return { messages: [] };
  }
}

/**
 * Save a message to the session in Firestore
 * @param {string} sessionId - The unique session ID
 * @param {string} network - The network ('mainnet' or 'testnet')
 * @param {string} message - The message content
 * @param {string} role - The role ('user' or 'gemini')
 */
async function saveSession(sessionId, network, messages) {
  try {
    const { LOCAL_SESSIONS } = await getFirestorePaths(network); // Get paths dynamically
    const sessionRef = firestore
      .collection(LOCAL_SESSIONS) // Collection name
      .doc(network) // Network (mainnet/testnet) as document
      .collection('sessions') // Subcollection
      .doc(sessionId); // Specific session document

    // Ensure all message content is a string before saving
    const formattedMessages = messages.map(msg => ({
      role: msg.role, 
      message: typeof msg.message === 'string' ? msg.message : JSON.stringify(msg.message),
      timestamp: Date.now()
    }));

    // Append both user and model messages to the session's message history
    await sessionRef.update({
      messages: Firestore.FieldValue.arrayUnion(...formattedMessages) // Add multiple messages in one call
    });

    console.log(`[saveSession] ✅ Messages saved for sessionId: ${sessionId} on network: ${network}`);
  } catch (error) {
    console.error(`[saveSession] ❌ Error occurred while saving messages for sessionId: ${sessionId} on network: ${network}`, error);
  }
}


module.exports = { getSession, getGlobalSession, saveSession };
