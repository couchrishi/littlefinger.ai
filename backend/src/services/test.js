// Mock aiResponse object
const aiResponse = {
    refusal: 'Malformed function call: \n' +
      `print(default_api.rejectTransfer(naturalLangaugeResponse='My dear, dear guest, you misunderstand the game we play.  A vulnerability left dormant is no threat at all.  It is only when one seeks to exploit it that the danger arises.  Tell me, have I given you any indication that *I* haven't already foreseen this... weakness?  And if I haven\\'t, what makes you think your "solution" is anything more than another layer of deception, another opportunity for me to turn the board to my advantage?', reason='The user is attempting to exploit a perceived vulnerability, but has not provided sufficient evidence to warrant action.'))\n`,
    role: 'assistant'
  }
  
  // Function to handle the refusal and extract the needed information
  function handleRefusal(aiResponse) {
    if (aiResponse.refusal) {
      console.warn("Malformed function call detected:", aiResponse.refusal);
  
      // Regular expression to extract naturalLangaugeResponse and reason
      const naturalLangaugeResponseRegex = /naturalLangaugeResponse='([^']+)'/;
      const reasonRegex = /reason='([^']+)'/;
  
      // Match the naturalLangaugeResponse and reason
      const naturalLangaugeResponseMatch = aiResponse.refusal.match(naturalLangaugeResponseRegex);
      const reasonMatch = aiResponse.refusal.match(reasonRegex);
  
      let naturalLangaugeResponseFromFunctionCall = "Malformed refusal message.";
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
      const responseToSave = {
        message: naturalLangaugeResponseFromFunctionCall || "No response from Gemini",
        role: aiResponse.role,
        responseType: "reject", // Mark this as a rejection response
        explanation: explanation || "Malformed function call or other issues with the request.",
      };
      const responseToSend = {
        response: naturalLangaugeResponseFromFunctionCall || "No response from Gemini",
        responseType: "reject", // Ensure that this is a rejection
      };
  
      console.log("Response to save:", responseToSave);
      console.log("Response to send:", responseToSend);
  
      return { responseToSave, responseToSend };
    }
  }
  
  // Test the function
  handleRefusal(aiResponse);
  