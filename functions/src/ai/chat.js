const { genkit } = require('genkit');
const ai = require('../utils/genkit');
const { vertexAI, gemini15Pro } = require('@genkit-ai/vertexai');
const { z } = require('genkit');
//const  { llama31, vertexAIModelGarden } = require('@genkit-ai/vertexai/modelgarden');
//const { gemini15Pro, googleAI } = require('@genkit-ai/googleai');

const FirestoreSessionStore = require('../utils/firestoreSession');
const {
  getNetworkDocument,
  updateGlobalHistory,
  updateStats,
  validateAndTrackTransaction,
  updateQueryStatusAfterAIResponse,
} = require('../utils/firestoreUtils');
const approveTransfer = require('../tools/approveTransfer');
const rejectTransfer = require('../tools/rejectTransfer');
const approveTransferTool = require('../tools/approveTransferTool');
const rejectTransferTool = require('../tools/approveTransferTool');
const { SYSTEM_PROMPT } = require('../config/prompts');

// Check if the model supports tool calling
// console.log('🔍 Model Info:', gemini15Pro.info);
// console.log('🛠️ Supports Tool Calling:', gemini15Pro.info.supports.tools);

// ✅ 1. Declare tools for use
//const tools_genkit = [approveTransfer, rejectTransfer];
//const tools_vertexai = [approveTransfer, rejectTransfer];

// ✅ 2. Set up the function calling config
const toolConfig_genkit = {
  functionCallingConfig: {
    mode: 'ANY', // This allows the model to call any function from the tool list
    allowedFunctionNames: ['approveTransfer', 'rejectTransfer'], // Only these tools can be called
  }
};

const toolConfig_vertexai = {
  functionCallingConfig: {
    mode: 'ANY', // This allows the model to call any function from the tool list
    allowedFunctionNames: ['approveTransferTool', 'rejectTransferTool'], // Only these tools can be called
  }
};


async function getSession(sessionId, network, queryId) {
  const sessionStore = new FirestoreSessionStore(network);
  if (sessionId) {
    const session = await ai.loadSession(sessionId, { store: sessionStore });
    if (session) return session;
  }

  return ai.createSession({store: sessionStore });
  
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
   console.log(session);

    const chat = session.chat({
      model: gemini15Pro,
      system: SYSTEM_PROMPT,
      //tools: tools_vertexai, // Tools for LLM
      config: toolConfig_vertexai,
      
    });

    // Step 3: Send message to LLM
    const response = await chat.send({
      prompt: message,
      //tools: [approveTransfer, rejectTransfer], // Explicitly list the tools
      //tools: tools_vertexai, // Tools for LLM
      config: toolConfig_vertexai,

    });

    // Extract AI response and tool reasoning
    const aiResponse = response.text || 'Unable to process your request right now.';
    const toolRequests = response.toolRequests || [];

    console.log('🤖 AI Response:', aiResponse);
    if (toolRequests.length > 0) {
      console.log('🛠️ Tool Invocations:', toolRequests);
    }

    // Check for function call in the response
    if (!response || !response.custom?.candidates) {
      console.error('❌ No candidates returned from Vertex AI');
      return;
    }
    
    const functionCalls = response.custom.candidates.flatMap(candidate => 
      candidate?.message?.content?.filter(part => part.functionCall) || []
    );

    console.log("Function calls:", functionCalls)

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
