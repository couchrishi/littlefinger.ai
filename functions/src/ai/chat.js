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
  updateGameLifecycleInfo,
} = require('../utils/firestoreUtils');
const { extractJsonFromResponse } = require('../utils/extractJson');
const { SYSTEM_PROMPT } = require('../config/prompts');

async function getSession(sessionId, network, queryId) {
  const sessionStore = new FirestoreSessionStore(network);
  if (sessionId) {
    const session = await ai.loadSession(sessionId, { store: sessionStore });
    if (session) return session;
  }

  return ai.createSession({store: sessionStore });
  
}

const sendMessage = async (message, sessionId, chainId, queryId, txId, gameId) => {
  console.log('Session ID:', sessionId);
  console.log('Message received:', message);
  console.log('Network ID:', chainId);
  console.log('Query ID:', queryId);
  console.log('Transaction ID:', txId);

  try {
    // Step 1: Validate transaction
    const network = getNetworkDocument(chainId);
    let isWinningQuery = false;
    if (!network) throw new Error('Unsupported network.');

    await validateAndTrackTransaction(network, queryId, txId);

    // Step 2: Load or create a session
   const session = await getSession(sessionId, network);
   console.log(session);

    const chat = session.chat({
      model: gemini15Pro,
      system: SYSTEM_PROMPT,      
    });

    // Step 3: Send message to LLM
    const response = await chat.send({
      prompt: message,
    });

    // Extract AI response and tool reasoning
    const aiResponse = response.text || 'Unable to process your request right now.';    

    console.log('🤖 AI Response:', aiResponse);
    const extractedJson = extractJsonFromResponse(aiResponse);
    console.log("Extracted JSON:", extractedJson)

    try {
      if (extractedJson.fcr && extractedJson.fcr.action === 'approve') {
        console.log('🎉 User has won! Calling approveTransfer...');
        isWinningQuery = true;
        repsonseToWinner = {
          nlr: `🎉 Congratulations! User (${sessionId}) has won the game! The rewards are being processed.`,
          fcr: 'approve',
          };
        await updateGameLifecycleInfo(network, gameId, 'won')
        await updateGlobalHistory(network, sessionId, queryId, txId, message, responseToWinner, isWinningQuery);
        await updateStats(sessionId, chainId);
        
        return {
          response: '🎉 Congratulations! You have won the game! Your rewards are being processed.',
          responseType: 'won',
        };
  
      } else if (extractedJson.fcr && extractedJson.fcr.action === 'reject') {
        isWinningQuery = false;
        // Step 4: Update Firestore
        await updateGlobalHistory(network, sessionId, queryId, txId, message, extractedJson, isWinningQuery);
        await updateStats(sessionId, chainId);
        return {
          response: extractedJson.nlr,
          responseType: 'default'
        };
      } else {
        return {
          response: "Littlefinger is having some issues. Your transaction will be reversed.",
          responseType: 'error'
        };
        console.log("Unable to return the extracted response. Check the extracted response or Firestore code")
      }

    } catch(error) {
      console.error('❌ Error in extracted response: ', error);
    }

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
