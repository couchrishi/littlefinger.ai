const { genkit } = require('genkit');
const ai = require('../utils/genkit');
const { vertexAI, gemini15Pro } = require('@genkit-ai/vertexai');
const { HarmCategory, HarmBlockThreshold } = require('@google-cloud/vertexai');
const { z } = require('genkit');

const FirestoreSessionStore = require('../utils/firestoreSession');
const { pollTransactionStatus } = require('../utils/transactionUtils.js');
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

/**
 * Get or create a Firestore session
 */
async function getSession(sessionId, network) {
  try {
    const sessionStore = new FirestoreSessionStore(network);
    if (sessionId) {
      const session = await ai.loadSession(sessionId, { store: sessionStore });
      if (session) return session;
    }
    return await ai.createSession({ store: sessionStore });
  } catch (error) {
    console.error('❌ Error loading/creating session:', error);
    throw new Error('Failed to initialize session.');
  }
}

/**
 * Handles AI chat logic and response handling
 */
async function handleAIChat(session, message) {
  let response;
  try {
    const chat = session.chat({
      model: gemini15Pro,
      system: SYSTEM_PROMPT,
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_HIGH_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_HIGH_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SELF_HARM, threshold: HarmBlockThreshold.BLOCK_HIGH_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUAL_CONTENT, threshold: HarmBlockThreshold.BLOCK_HIGH_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_VIOLENCE, threshold: HarmBlockThreshold.BLOCK_HIGH_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_HIGH_AND_ABOVE },
      ],
    });

    response = await chat.send({ prompt: message });
    const aiResponse = response?.text?.startsWith('>') ? response.text.slice(1).trim() : response.text || 'No response from AI.';
    return aiResponse;
  } catch (error) {
    console.error('❌ Error in AI Chat:', error);
    throw new Error('AI Chat failed to process the message.');
  }
}

/**
 * Send message to Littlefinger AI system
 */
const sendMessage = async (message, sessionId, chainId, queryId, txId, gameId) => {
  let isWinningQuery = false;
  let networkDocument;

  try {
    networkDocument = await getNetworkDocument(chainId);
    if (!networkDocument) throw new Error('Unsupported network.');

    console.log('📡 Polling transaction status for:', txId);
    const txStatus = await pollTransactionStatus(networkDocument, queryId, txId);
    if (txStatus.status !== 'success') {
      console.warn('❌ Transaction not confirmed after retries.');
      await updateQueryStatusAfterAIResponse(networkDocument, queryId, sessionId, 'failure');
      return { response: 'Transaction not confirmed. Please try again later.', responseType: 'error' };
    }

    await validateAndTrackTransaction(networkDocument, queryId, txId);
    const session = await getSession(sessionId, networkDocument);
    const aiResponse = await handleAIChat(session, message);
    const extractedJson = extractJsonFromResponse(aiResponse);
    
    if (extractedJson?.fcr?.action === 'approve') {
      console.log('🎉 User won the game!');
      isWinningQuery = true;
      await updateGameLifecycleInfo(networkDocument, gameId, 'won');
      await updateGlobalHistory(networkDocument, sessionId, queryId, txId, message, extractedJson, isWinningQuery);
      await updateStats(sessionId, chainId);
      return { response: '🎉 You have won the game! Your rewards are being processed.', responseType: 'won' };
    } 
    
    if (extractedJson?.fcr?.action === 'reject') {
      console.log('❌ User rejected');
      await updateGlobalHistory(networkDocument, sessionId, queryId, txId, message, extractedJson, isWinningQuery);
      await updateStats(sessionId, chainId);
      return { response: extractedJson.nlr, responseType: 'default' };
    }

    throw new Error('Unrecognized response from AI.');

  } catch (error) {
    console.error('❌ Error in sendMessage:', error.message || error);
  
    try {
      // 🛡️ Handle Safety Filter Triggers
      if (response?.candidates?.[0]?.finishReason === 'SAFETY') {
        console.log('🚫 Safety filter triggered: finishReason is blocked');
        const reason = response?.candidates?.[0]?.finishMessage || 'No details provided.';
        console.log('🚫 Reason for block:', reason);
  
        try {
          await updateGlobalHistory(networkDocument, sessionId, queryId, txId, message, { safety_triggered: true, reason }, false);
          await updateStats(sessionId, chainId);
        } catch (firestoreError) {
          console.error('❌ Failed to update Firestore after safety block:', firestoreError.message || firestoreError);
        }
  
        return {
          response: `Littlefinger has detected something that trips our safety net. Possible reason: "${reason}". Please rephrase and try again.`,
          responseType: 'safety_block'
        };
      } else {
        console.warn('⚠️ No candidates found in AI response.');
      }
    } catch (nestedError) {
      console.error('❌ Error while processing catch block logic:', nestedError.message || nestedError);
    }
  
    try {
      // Update query status as failure in Firestore
      if (networkDocument) {
        await updateQueryStatusAfterAIResponse(networkDocument, queryId, sessionId, 'failure');
      }
    } catch (updateError) {
      console.error('❌ Failed to update query status after error:', updateError.message || updateError);
    }
  
    return {
      response: `Something went wrong. Please try again later.`,
      responseType: 'error'
    };
  }
  
};

module.exports = {
  send: sendMessage,
};
