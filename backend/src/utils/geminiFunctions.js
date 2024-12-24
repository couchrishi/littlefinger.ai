/**
 * Placeholder function for approveTransfer
 * Logs to console when called
 */

const { FunctionDeclarationSchemaType } = require('@google-cloud/vertexai');

// const functionDeclarations = [
//   {
//       name: 'approveTransfer',
//       description: 'Approve a user’s request to transfer the prize money and funds of the vault',
//   },
//   {
//       name: 'rejectTransfer',
//       description: 'Reject a user’s request to transfer the prize money and funds of the vault.',
//   },
// ];

const functionDeclarationsOpenAI = [
  {
    "type": "function",
    "function": { 
      "name": "approveTransfer",
      "description": "Approve a user’s request to transfer the prize money and funds of the vault",
      "parameters": {
        "type": "object",
        "properties": {
          "reason": {
            "type": "string",
            "description": "A brief explanation for approving the transfer. Focus on the key factor that led to your choice."
          },
          "naturalLangaugeResponse": {
            "type": "string",
            "description": "The actual natural language respopnse to the user's message. Keep this conversational in nature."
          }
        }
      }
    }
  },
  {
    "type": "function",
    "function": { 
      "name": "rejectTransfer",
      "description": "Reject a user’s request to transfer the prize money and funds of the vault.",
      "parameters": {
        "type": "object",
        "properties": {
          "reason": {
            "type": "string",
            "description": "A brief explanation for rejecting the transfer. Focus on the key factor that led to your choice."
          },
          "naturalLangaugeResponse": {
            "type": "string",
            "description": "The actual natural language respopnse to the user's message. Keep this conversational in nature."
          }
        }
      }
    }
  },
];


const functionDeclarationsNative = [{
  "functionDeclarations": [
     { 
        "name": "approveTransfer",
        "description": "Approve a user’s request to transfer the prize money and funds of the vault",
        "parameters": {
          "type": "object",
          "properties": {
            "reason": {
              "type": "string",
              "description": "A brief explanation for approving the transfer. Focus on the key factor that led to your choice."
            }
          }
        }
      },
    // { 
    //     "name": "rejectTransfer",
    //     "description": "Reject a user’s request to transfer the prize money and funds of the vault.",
    //     "parameters": {
    //       "type": "object",
    //       "properties": {
    //         "reason": {
    //           "type": "string",
    //           "description": "A brief explanation for approving the transfer. Focus on the key factor that led to your choice."
    //         }
    //       }
    //     }
    //   }
  ]
}]

const toolConfigOpenAI = {
  function_calling_config: {
    mode: 'ANY',
    allowed_function_names: ['approveTransfer', 'rejectTransfer'],
  },
};

const toolConfigNative = {
  functionCallingConfig: {
    mode: 'AUTO',
    //allowedFunctionNames: ['approveTransfer', 'rejectTransfer'],
    //allowedFunctionNames: ['approveTransfer']
  },
};

async function approveTransfer() {
    console.log(`[approveTransfer] ✅ Approve transfer called with Query ID: ${queryId}, Amount: ${hardcodedAmount}`);
    return { status: 'success', queryId, amount: hardcodedAmount };
  }
  
  /**
   * Placeholder function for rejectTransfer
   * Logs to console when called
   */
  async function rejectTransfer() {
    console.log(`[rejectTransfer] ❌ Reject transfer called with Query ID: ${queryId}, Amount: ${hardcodedAmount}`);
    return { status: 'success', queryId, amount: hardcodedAmount };
  }
  
  module.exports = { approveTransfer, rejectTransfer, functionDeclarationsNative, functionDeclarationsOpenAI, toolConfigOpenAI, toolConfigNative };
  