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
  console.log("The AI Response is: ", aiResponse);

  let responseToSave, responseToSend;
  let isWinningQuery = false;
  let responseType = "default"; 
  let explanation = "";

  try {
    if (aiResponse.tool_calls && aiResponse.tool_calls.length > 0) {
      // Function call handling
      console.log("Tool Identified!");
      const functionCall = aiResponse.tool_calls[0].function;
      console.log("Function Call:", functionCall);

      if (functionCall.name === "approveTransfer") {
        isWinningQuery = true;
        responseType = "approve";
        await updateGameStatusToWon(network, "won"); // Assuming you want to update the status to 'won'
      } else if (functionCall.name === "rejectTransfer") {
        responseType = "reject";
        naturalLanguageResponseReject = aiResponse.content;
        const pythonCodePattern = /```python[\s\S]*?```/g;
        naturalLanguageResponseReject = naturalLanguageResponseReject.replace(pythonCodePattern, '').trim();
      }

      // Extract explanation from function arguments
      if (functionCall.arguments) {
        try {
          const args = JSON.parse(functionCall.arguments);
          explanation = args.reason || "No specific reason provided.";
        } catch (error) {
          console.error("Error parsing function arguments:", error);
          explanation = "Error parsing explanation.";
        }
      } else {
        explanation = "No explanation provided.";
      }

      responseToSave = {
        role: aiResponse.role,
        message:
          responseType === "approve"
            ? "Congratulations! You have won."
            : aiResponse.content || "No response from Gemini",
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
            ? "Congratulations! You have won."
            : naturalLanguageResponseReject || "No response from Gemini",
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
        message: aiResponse.content || "No response from Gemini",
        role: aiResponse.role,
        responseType: "default",
        explanation: "Generic conversations. Littlefinger wasn't threatened."
      };

      responseToSend = {
        response: aiResponse.content,
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
  console.log("The AI Response is: ", aiResponse);

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