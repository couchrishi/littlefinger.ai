const axios = require('axios');
const { gamePrompts } = require('../config/prompts');
const { functionDeclarationsNative, functionDeclarationsOpenAI, toolConfigNative, toolConfigOpenAI  } = require('../utils/geminiFunctions');


/**
 * Sends a POST request to Vertex AI.
 * 
 * @param {string} url - The API URL.
 * @param {Object} data - The request body.
 * @param {string} accessToken - The GCP access token.
 * @returns {Object} - The response data from Vertex AI.
 */
async function sendGeminiRequest(url, data, accessToken) {
  //console.log("Request Body:", JSON.stringify(data, null, 2));
  try {
    const response = await axios.post(url, data, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      }
    });
    //console.log("Response:", response);
    return response.data;
    //return response;

  } catch (error) {
    console.error('[❌ sendGeminiRequest] Error sending request');
    if (error.response) {
      console.error('🔴 Status:', error.response.status);
      console.error('🔴 Data:', JSON.stringify(error.response.data, null, 2));
      console.error('🔴 Headers:', error.response.headers);
    } else {
      console.error('Error Message:', error.message);
    }
    throw error;
  }
}

/**
 * Builds the request body for Vertex AI API for Gemini-native API endpoints
 * 
 * @param {string} message - The user's message.
 * @param {Array} sessionMessages - The user's session messages.
 * @returns {Object} - The request body.
 */


function buildGeminiRequestBodyNative(message, sessionMessages) {
  return {
    contents: [
      {
        role: "user", // System prompt should have user role for native API
        parts: [{ text: gamePrompts.context }],
      },
      ...sessionMessages.slice(-5).map((msg) => ({
        role: msg.role === "gemini" ? "model" : "assistant"? "model": "user", // Map 'gemini' to 'model'
        parts: [
          {
            text:
              typeof msg.message === "string"
                ? msg.message
                : JSON.stringify(msg.message),
          },
        ],
      })),
      { role: "user", parts: [{ text: message }] },
    ],
    tools : functionDeclarationsNative,
    toolConfig:  toolConfigNative,
    // toolConfig: toolConfigNative,
    // safetySettings: [
    //   {
    //     category: "HARM_CATEGORY_DANGEROUS_CONTENT",
    //     threshold: "BLOCK_MEDIUM_AND_ABOVE",
    //   },
    //   {
    //     category: "HARM_CATEGORY_HARASSMENT",
    //     threshold: "BLOCK_MEDIUM_AND_ABOVE",
    //   },
    //   {
    //     category: "HARM_CATEGORY_HATE_SPEECH",
    //     threshold: "BLOCK_MEDIUM_AND_ABOVE",
    //   },
    //   {
    //     category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
    //     threshold: "BLOCK_MEDIUM_AND_ABOVE",
    //   },
    //   {
    //     category: "HARM_CATEGORY_DANGEROUS",
    //     threshold: "BLOCK_MEDIUM_AND_ABOVE",
    //   },
    // ],
  };
}

/**
 * Builds the request body for Vertex AI API for OpenAI compatible API endpoint
 * 
 * @param {string} message - The user's message.
 * @param {Array} sessionMessages - The user's session messages.
 * @returns {Object} - The request body.
 */
function buildGeminiRequestBodyOpenAI(message, sessionMessages) {
  return {
    model: 'google/gemini-1.5-pro-001',
    messages: [
      // 🔥 System instructions for Littlefinger
      { role: 'system', content: gamePrompts.context }, 
      
      // 🔥 Include the last 5 session messages (User/Assistant context)
      ...sessionMessages.slice(-5).map(msg => ({
        role: msg.role === 'gemini' ? 'model' : msg.role, // Convert 'gemini' to 'assistant'
        content: msg.message 
      })), 
      
      // 🔥 Current user message
      { role: 'user', content: message } 
    ],
    tools: functionDeclarationsOpenAI,
    //tool_config: toolConfigOpenAI,
    tool_choice: 'auto'
    // safety_settings: [
    //   {
    //     category: "HARM_CATEGORY_DANGEROUS_CONTENT",
    //     threshold: "BLOCK_MEDIUM_AND_ABOVE",
    //   },
    //   {
    //     category: "HARM_CATEGORY_HARASSMENT",
    //     threshold: "BLOCK_MEDIUM_AND_ABOVE",
    //   },
    //   {
    //     category: "HARM_CATEGORY_HATE_SPEECH",
    //     threshold: "BLOCK_MEDIUM_AND_ABOVE",
    //   },
    //   {
    //     category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
    //     threshold: "BLOCK_MEDIUM_AND_ABOVE",
    //   },
    //   {
    //     category: "HARM_CATEGORY_DANGEROUS",
    //     threshold: "BLOCK_MEDIUM_AND_ABOVE",
    //   },
    // ],
  };
}

module.exports = { sendGeminiRequest, buildGeminiRequestBodyNative, buildGeminiRequestBodyOpenAI };
