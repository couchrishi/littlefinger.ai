const { genkit } = require('genkit');
const ai = require('../utils/genkit');
const { vertexAI, gemini15Pro } = require('@genkit-ai/vertexai');
const FirestoreSessionStore = require('../utils/firestoreSession');
const {
  getNetworkDocument,
  updateGlobalHistory,
  updateStats,
  validateAndTrackTransaction,
} = require('../utils/firestoreUtils');
const approveTransfer = require('../tools/approveTransfer');
const rejectTransfer = require('../tools/rejectTransfer');
const { SYSTEM_PROMPT } = require('../config/prompts');

// Check if the model supports tool calling
console.log('🔍 Model Info:', gemini15Pro.info);
console.log('🛠️ Supports Tool Calling:', gemini15Pro.info.supports.tools);


async function getSession(sessionId, network) {
  const sessionStore = new FirestoreSessionStore(network);
  if (sessionId) {
    const session = await ai.loadSession(sessionId, { store: sessionStore });
    if (session) return session;
  }
  return ai.createSession({ store: sessionStore });
}

const sendMessage = async (message, sessionId, chainId, queryId, txId) => {
  console.log('Session ID:', sessionId);
  console.log('Message received:', message);
  console.log('Network ID:', chainId);
  console.log('Query ID:', queryId);
  console.log('Transaction ID:', txId);

  try {
    // Step 1: Validate transaction
    const network = getNetworkDocument(chainId);
    if (!network) throw new Error('Unsupported network.');

    await validateAndTrackTransaction(network, queryId, txId);

    // Step 2: Load or create a session
   const session = await getSession(sessionId, network);

    const chat = session.chat({
      model: gemini15Pro,
      system: SYSTEM_PROMPT,
      tools: [approveTransfer, rejectTransfer], // Tools for LLM
      config: {
        functionCallingConfig: {
          mode: "ANY"
        }
      }
 
    });

    // Step 3: Send message to LLM
    const response = await chat.send({
      prompt: message,
      tools: [approveTransfer, rejectTransfer], // Explicitly list the tools
      config: {
        functionCallingConfig: {
          mode: "ANY"
        }
      },
      context: { sessionId, queryID: queryId, queryText: message, networkID: network },
    });

    // Extract AI response and tool reasoning
    const aiResponse = response.text || 'Unable to process your request right now.';
    const toolRequests = response.toolRequests || [];

    console.log('🤖 AI Response:', aiResponse);
    if (toolRequests.length > 0) {
      console.log('🛠️ Tool Invocations:', toolRequests);
    }

    // Step 4: Update Firestore
    await updateGlobalHistory(network, sessionId, queryId, txId, message, aiResponse, toolRequests);
    await updateStats(sessionId, chainId);

    return {
      response: aiResponse,
      responseType: toolRequests.length > 0 ? 'tool_request' : 'default',
    };
  } catch (error) {
    console.error('❌ Error in sendMessage:', error);

    try {
      // Update query status as failure if the process fails
      const network = getNetworkDocument(chainId);
      if (network) {
        await updateQueryStatusAfterAIResponse(network, queryId, sessionId, 'failure');
      }
    } catch (updateError) {
      console.error('❌ Failed to update query status after error:', updateError);
    }

    throw new Error(error.message);
  }
};

module.exports = {
  send: sendMessage,
};
