const { getSession, saveSession, getGlobalSession } = require('../utils/session');
const { accessSecret } = require('../utils/secrets');
const { getAccessToken } = require('./accessToken');
const { sendGeminiRequest, buildGeminiRequestBodyNative, buildGeminiRequestBodyOpenAI } = require('./geminiRequestBuilder');
const { handleResponseNative, handleResponseOpenAI, handleSafetyBlock } = require('./geminiResponseHandler');
const { pollTransactionStatus } = require('../utils/blockchainUtils.js');
const {
    getNetworkDocument,
    updateGlobalHistory,
    updateStats,
    isTransactionSuccess,
    updateQueryStatusAfterAIResponse,
    updateGameLifecycleInfo,
  } = require('../utils/firestoreUtils');

/**
 * Handles sending a message to the Vertex AI REST API for multi-turn chat.
 * 
 * @param {string} message - The user's input message.
 * @param {string} sessionId - The unique session ID for the user.
 * @param {string} network - The network ('mainnet' or 'testnet').
 * @returns {Object} - The response object containing the natural language response and response type.
 * const sendMessage = async (message, sessionId, chainId, queryId, txId, gameId) => {
  console.log('Session ID:', sessionId);
  console.log('Message received:', message);
  console.log('Network ID:', chainId);
  console.log('Query ID:', queryId);
  console.log('Transaction ID:', txId);
 */

async function sendMessage(message, sessionId, chainId, queryId, txId) {
  try {
    console.log(chainId);
    // 💠 1️⃣ Step 1 - Get session details of the user, secrets & network 
    const network = getNetworkDocument(chainId);
    //const session = await getSession(sessionId, network);
    const session = await getGlobalSession(network);
    const accessToken = await getAccessToken();
    const projectId = await accessSecret('GCP_PROJECT_ID');
    const location = await accessSecret('GCP_LOCATION');
    if (!network) {
        console.warn('❌ Unsupported Network');
        return { response: 'The network is either unsupported or undefined. Please connect to a supported network.', responseType: 'error' };
    }

    // 💠 2️⃣ Step 2 - Validate & Track transaction status 
    const isTransactionConfirmed = isTransactionSuccess(network, queryId, txId);
    if (!isTransactionConfirmed) {
        console.warn('❌ Transaction not confirmed yet. Polling transaction now.. ');
        console.log('📡 Polling transaction status for:', txId);
        const txStatus = await pollTransactionStatus(network, queryId, txId);
        if (txStatus.status !== 'success') {
            console.warn('❌ Transaction not confirmed after retries.');
            await updateQueryStatusAfterAIResponse(network, queryId, sessionId, 'failure');
            return { response: 'Transaction not confirmed. Please try again later.', responseType: 'error' };
        }
    } else {
        console.log("Transaction confirmed.")
    }

    // 💠 3️⃣ Step 3 - Prepare API Request Body for Vertex AI Gemini call and send the Vertex AI Gemini API request

    //console.log("Messages from firestore: ", session.messages);

    //Using Native Gemini API
//    const requestBodyNative = buildGeminiRequestBodyNative(message, session.messages);
//    const apiUrl = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/gemini-1.5-pro-001:generateContent`;
//    const responseData = await sendGeminiRequest(apiUrl, requestBodyNative, accessToken);
//    const { responseToSave, responseToSend } = await handleResponseNative(responseData, queryId, sessionId, txId, network, message);


    //Using OpenAI compatible API
   const requestBodyOpenAI = buildGeminiRequestBodyOpenAI(message, session.messages, sessionId)
   console.log("Request Body: ", requestBodyOpenAI);
   const apiUrl = `https://${location}-aiplatform.googleapis.com/v1beta1/projects/${projectId}/locations/${location}/endpoints/openapi/chat/completions`;
   const responseData = await sendGeminiRequest(apiUrl, requestBodyOpenAI, accessToken);
   if (
    typeof responseData.content === "string" &&
    responseData.content.startsWith("[")
    ) {
        console.log("Inside Safety block")
        const safetyResponse =  handleSafetyBlock(responseData, queryId, sessionId, txId, network, message);
        return safetyResponse
    }
   const { responseToSave, responseToSend } = await handleResponseOpenAI(responseData, queryId, sessionId, txId, network, message);
    
    // 💠 5️⃣ Step 4 - Save both user and Gemini messages in a single Firestore call
    const userMessageToSave = { message: message, role: 'user' };
    await saveSession(sessionId, network, [userMessageToSave, responseToSave]);
    return responseToSend;  // 🚀 Flat JSON response

  } catch (error) {
    console.error(`[sendMessage] ❌ Error occurred`, error);
    //return { response: 'An error occurred while processing your request.', responseType: 'error' };
    if (
        typeof responseData.content === "string" &&
        responseData.content.startsWith("[")
      ) {
        console.warn("⚠️ Potential safety filter triggered.");
        try {
          const parsedResponse = JSON.parse(responseData.content);
          if (
            Array.isArray(parsedResponse) &&
            parsedResponse.every(
              (item) => item.hasOwnProperty("text") && item.hasOwnProperty("type")
            )
          ) {
            responseType = "safety_filtered";
  
            // Log the safety-filtered event
            console.warn(
              `[SAFETY FILTER] Blocked message from sessionId: ${sessionId}, queryId: ${queryId}. Content: ${messageText}`
            );

            let messageText = "Littlefinger has detected something that trips our safety net. Please rephrase and try again."
            let explanation = "Response modified due to potential safety violation."
            // Update responseToSave and responseToSend for safety filter
            responseToSave = {
              message: messageText,
              role: 'model',
              responseType: responseType,
              explanation: explanation,
            };
  
            responseToSend = {
              response: messageText,
              responseType: responseType,
            };
  
            await updateGlobalHistory(
              network,
              sessionId,
              queryId,
              txId,
              message,
              responseToSave,
              explanation,
              false
            ); // Update Firestore
            await updateStats(sessionId, network);
  
            return { responseToSave, responseToSend };
          }
        } catch (error) {
          console.error("Error parsing potential safety-filtered response:", error);
          return { response: 'An error occurred while processing your request.', responseType: 'error' };
        }
  
      }
    
    return { response: 'An error occurred while processing your request.', responseType: 'error' };

  }
}

module.exports = { sendMessage };
