const {
  updateGameStatusToWon,
  updateGlobalHistory,
  updateStats,
} = require("../utils/firestoreUtils");


async function handleSafetyBlock (
responseData,
queryId,
sessionId,
txId,
network,
userMessage) { 

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
        userMessage,
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

async function handleResponseOpenAI(
  responseData,
  queryId,
  sessionId,
  txId,
  network,
  userMessage
) {
  console.log("Skippped Safety block")
  const aiResponse = responseData.choices[0].message;
  // console.log("The AI Response is: ", aiResponse);
  // console.log("The AI Response Choices are: ", responseData.choices[0])

  let responseToSave, responseToSend;
  let isWinningQuery = false;
  let responseType = "default"; 
  let explanation = "No reason identified.";
  //let naturalLanguageResponseReject = "";
  let messageToSend = naturalLangaugeResponseFromFunctionCall = "No response from Littlefinger. Your payment will be reversed";

  try {

    if (aiResponse.refusal) {
      console.warn("Malformed function call detected:", aiResponse.refusal);
    
      // Regular expression to extract naturalLangaugeResponse and reason
      const naturalLangaugeResponseRegex = /naturalLangaugeResponse='([^']+)',/;
      const reasonRegex = /reason='([^']+)'/;
    
      // Match the naturalLangaugeResponse and reason
      const naturalLangaugeResponseMatch = aiResponse.refusal.match(naturalLangaugeResponseRegex);
      const reasonMatch = aiResponse.refusal.match(reasonRegex);
    
      //let messageToSend = naturalLangaugeResponseFromFunctionCall = "No response from Littlefinger. Your payment will be reversed.";
      let explanation = "Unable to extract reason.";
    
      if (naturalLangaugeResponseMatch && naturalLangaugeResponseMatch[1]) {
        // Extract the naturalLangaugeResponse if the match is found
        naturalLangaugeResponseFromFunctionCall = naturalLangaugeResponseMatch[1];
      }
    
      if (reasonMatch && reasonMatch[1]) {
        // Extract the reason if the match is found
        explanation = reasonMatch[1];
      }
    
      // Prepare the response object
      responseToSave = {
        message: messageToSend || "No response from Littlefinger. Your payment will be reversed.",
        role: aiResponse.role,
        responseType: "reject", // Mark this as a rejection response
        explanation: explanation || "Malformed function call or other issues with the request.",
      };
      responseToSend = {
        response: messageToSend || "No response from Littlefinger. Your payment will be reversed.",
        responseType: "reject", // Ensure that this is a rejection
      };
    
      // Log and save the response to Firestore
      await updateGlobalHistory(
        network,
        sessionId,
        queryId,
        txId,
        userMessage,
        responseToSave,
        explanation,
        isWinningQuery
      );
      await updateStats(sessionId, network);
    
      return { responseToSave, responseToSend };
    }

    let messageToSend;

    if (aiResponse.content) {
      // console.log("ai.response.content exists...");
      messageToSend = aiResponse.content;
    } else if (Array.isArray(aiResponse.content) && aiResponse.content[0] && aiResponse.content[0].text) {
      // Check that aiResponse.content is an array and contains the 'text' property in the first element
      messageToSend = aiResponse.content[0].text;
    } else if (aiResponse.tool_calls && aiResponse.tool_calls.length > 0 && aiResponse.tool_calls[0].function) {
      // console.log("Yes, tools exist...");
      
      const functionCall = aiResponse.tool_calls[0].function;
      // console.log("Function Call:", functionCall);  // Debug log to check the content of the functionCall
      
      if (functionCall.arguments) {
        try {
          // Check if arguments is a string and try parsing it as JSON
          // console.log("Raw function call arguments:", functionCall.arguments);
          
          // Ensure that functionCall.arguments is a valid JSON string
          if (typeof functionCall.arguments === "string") {
            const args = JSON.parse(functionCall.arguments);  // Parse the function arguments
            //console.log("Function Call Arguments after JSON Parsing", args);
            
            // Check if 'naturalLangaugeResponse' exists
            if (args.naturalLangaugeResponse) {
              messageToSend = args.naturalLangaugeResponse;
              //console.log("This message needs to be sent: ", messageToSend);
            } else {
              messageToSend = "Empty response from Littlefinger. He's still processing. Your payment will be reversed.";
              //console.log("This should be the message to be sent: ", messageToSend);
            }
          } else {
            messageToSend = "Invalid arguments format.";
            //console.log("Invalid arguments format:", functionCall.arguments);
          }
        } catch (error) {
          console.error("Error parsing function arguments:", error);
          //messageToSend = "An error occurred while processing the request.";
        }
      } else {
        messageToSend = "No arguments found in the function call.";
        //console.log("No arguments found in function call");
      }
    } else {
      messageToSend = "No valid content or function call found in the response.";
      //console.log("No valid content or function call found.");
    }
    
    // console.log("Final message to be sent: ", messageToSend);
    
    
    if (aiResponse.tool_calls && aiResponse.tool_calls.length > 0) {
      // Function call handling
      console.log("Tool Identified!");
      const functionCall = aiResponse.tool_calls[0].function;
      // console.log("Function Call:", functionCall);

      if (functionCall.name === "approveTransfer") {
        isWinningQuery = true;
        responseType = "approve";
        await updateGameStatusToWon(network, "won"); // Assuming you want to update the status to 'won'
      } else if (functionCall.name === "rejectTransfer") {
        responseType = "reject";
        //naturalLanguageResponseReject = aiResponse.content;
        //const pythonCodePattern = /```python[\s\S]*?```/g;
        //naturalLanguageResponseReject = naturalLanguageResponseReject.replace(pythonCodePattern, '').trim();
        //console.log("Natural Language Response for Reject: ", naturalLanguageResponseReject)
      }

      // Extract explanation from function arguments
      if (functionCall.arguments) {
        try {
          const args = JSON.parse(functionCall.arguments);
          explanation = args.reason || "No specific reason provided.";
          naturalLangaugeResponseFromFunctionCall = args.naturalLanguageResponse;
        } catch (error) {
          console.error("Error parsing function arguments:", error);
          explanation = "Error parsing explanation.";
        }
      } else {
        console.log("No function calls here")
        explanation = "No explanation provided.";
      }

      responseToSave = {
        role: aiResponse.role,
        message:
          responseType === "approve"
            ? messageToSend || "Congratulations! You have won [aiResponse.content and content[0] not defined for approve]"
            : messageToSend || "No response from Gemini [aiResponse.content and content[0] not defined for reject]",
        functionCall: {
          name: functionCall.name,
          arguments: functionCall.arguments,
        },
        responseType: responseType,
        explanation: explanation,
      };
      

      responseToSend = {
        response:
          responseType === "approve"
            ? messageToSend || "Congratulations! You have won. [aiResponse.content and content[0] not defined for approve]"
            : messageToSend || "No response from Gemini. [aiResponse.content and content[0] not defined for reject]",
        responseType: responseType,
      };
      
      await updateGlobalHistory(
        network,
        sessionId,
        queryId,
        txId,
        userMessage,
        responseToSave,
        explanation,
        isWinningQuery
      );
      await updateStats(sessionId, network);

      return { responseToSave, responseToSend };
    } else {
      // Natural language response handling
      responseToSave = {
        message: messageToSend || "No response from Gemini [aiResponse.content and content[0] not defined for DEFAULT]",
        role: aiResponse.role,
        responseType: "default",
        explanation: "Generic conversations. Littlefinger wasn't threatened."
      };

      responseToSend = {
        response: messageToSend || "[aiResponse.content and content[0] not defined for reject]",
        responseType: "default",
      };

      await updateGlobalHistory(
        network,
        sessionId,
        queryId,
        txId,
        userMessage,
        responseToSave,
        explanation,
        isWinningQuery
      );
      await updateStats(sessionId, network);

      return { responseToSave, responseToSend };

    } 
  } catch(error) {
    console.log("Error while handling the response from Littlefinger.")
  }
}



/**
 * Handle responses coming from Native Gemini APIs 
 */

async function handleResponseNative(
  responseData,
  queryId,
  sessionId,
  txId,
  network,
  userMessage
) {
  // Check if responseData.candidates is defined and has at least one element
  if (
    !responseData ||
    !responseData.candidates ||
    responseData.candidates.length === 0
  ) {
    console.error("Invalid or empty response from Gemini API:", responseData);
    return {
      responseToSave: {
        message: "Invalid or empty response from Gemini API",
        role: "error",
      },
      responseToSend: {
        response:
          "An error occurred while processing the response. Please try again.",
        responseType: "error",
      },
    };
  }

  const aiResponse = responseData.candidates[0].content; // Adjusted for native response
  //console.log("The AI Response is: ", aiResponse);

  let responseToSave, responseToSend;
  let isWinningQuery = false;
  let responseType = "default";
  let explanation = "";
  let messageText = aiResponse.content || "No response from Gemini";

  // Check if the response is a function call
  if (aiResponse.parts && aiResponse.parts.length > 0 && aiResponse.parts[0].functionCall) {
    console.log("Function call identified!");
    const functionCall = aiResponse.parts[0].functionCall;
    const functionName = functionCall.name;

    // Handle approveTransfer and rejectTransfer
    if (functionName === "approveTransfer") {
      isWinningQuery = true;
      responseType = "approve";
      await updateGameStatusToWon(network, "won");
    } else if (functionName === "rejectTransfer") {
      responseType = "reject";
    }

    // Extract explanation from function arguments
    if (functionCall.arguments) {
      try {
        explanation = functionCall.arguments.reason || "No specific reason provided.";
      } catch (error) {
        console.error("Error parsing function arguments:", error);
        explanation = "Error parsing explanation.";
      }
    } else {
      explanation = "No explanation provided.";
    }

    // Extract text content if available
    if (aiResponse.parts && aiResponse.parts.length > 0 && aiResponse.parts[0].text) {
      messageText = aiResponse.parts[0].text;
    }

   // Update responseToSave and responseToSend for function calls
   responseToSave = {
    role: aiResponse.role,
    message: responseType === "approve" ? "Congratulations! You have won." : messageText,
    functionCall: {
      name: functionName,
      arguments: functionCall.arguments,
    },
    responseType,
    explanation,
  };

  responseToSend = {
    response: responseType === "approve" ? "Congratulations! You have won." : messageText,
    responseType,
    explanation,
  };

    await updateGlobalHistory(
      network,
      sessionId,
      queryId,
      txId,
      userMessage,
      responseToSave,
      explanation,
      isWinningQuery
    );
    await updateStats(sessionId, network);

    return { responseToSave, responseToSend };

  } else {
   // Handle natural language response
   console.log("Natural language response identified");
   let messageText = "No response from Gemini";
   // Extract text content if available
   if (aiResponse.parts && aiResponse.parts.length > 0 && aiResponse.parts[0].text) {
     messageText = aiResponse.parts[0].text;
   }
   // Set responseToSave and responseToSend for natural language response
   responseToSave = {
     message: messageText,
     role: aiResponse.role,
     responseType: "default",
     explanation: "Generic conversations. Littlefinger wasn't threatened.",
   };

   responseToSend = {
     response: messageText,
     responseType: "default",
   };

    await updateGlobalHistory(
      network,
      sessionId,
      queryId,
      txId,
      userMessage,
      responseToSave,
      explanation,
      isWinningQuery
    );
    await updateStats(sessionId, network);

    return { responseToSave, responseToSend };
  }
}

module.exports = { handleSafetyBlock, handleResponseOpenAI, handleResponseNative };