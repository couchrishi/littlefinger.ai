const fixMalformedJson = (jsonString) => {
  try {
    // 🔥 Add double quotes to all keys that don't have them (e.g., explanation: becomes "explanation":)
    const correctedJson = jsonString.replace(/(?<!")(\b\w+\b):/g, '"$1":');
    return correctedJson;
  } catch (error) {
    console.error('❌ Error while fixing malformed JSON:', error.message);
    return jsonString; // Return the raw version if any error happens
  }
};

function extractJsonFromResponse(response, enableDebug = true) {
  try {
    const jsonRegex = /<JSON_START>([\s\S]*?)<JSON_END>/; // Captures everything between <JSON_START> and <JSON_END>
    const match = response.match(jsonRegex); // Use regex to find the JSON content

    let parsedJsonObject = null;
    let naturalLanguageResponse = response;

    if (match && match[1]) {
      try {
        const jsonString = match[1].trim(); // Extract and trim JSON string
        if (enableDebug) console.log('🛠️ Extracted raw JSON string:', jsonString);

        // **Extract the Natural Language Response (NLR) by removing the JSON part**
        naturalLanguageResponse = response.replace(jsonRegex, '').trim(); 
        if (enableDebug) console.log('🛠️ Extracted Natural Language Response:', naturalLanguageResponse);

        // 🔥 Attempt to parse the JSON part
        parsedJsonObject = JSON.parse(jsonString);
        if (enableDebug) console.log('📦 Parsed Extracted JSON (original):', parsedJsonObject);

      } catch (error) {
        console.error('❌ Error parsing JSON:', error.message, '🛠️ Faulty JSON String:', match[1]);

        // 🔥 Fix malformed JSON using regex and try parsing again
        try {
          const fixedJsonString = fixMalformedJson(match[1].trim());
          if (enableDebug) console.log('🛠️ Fixed JSON string after cleanup:', fixedJsonString);

          parsedJsonObject = JSON.parse(fixedJsonString);
          if (enableDebug) console.log('📦 Parsed Extracted JSON (after fix):', parsedJsonObject);
        } catch (finalError) {
          console.error('❌ Final JSON parsing failed:', finalError.message);
          parsedJsonObject = {
            error: 'Error parsing JSON',
            reason: finalError.message,
            faultyJson: match[1].trim()
          };
        }
      }
    } else {
      if (enableDebug) console.log('❌ No JSON found in response.');
    }

    return {
      "nlr": naturalLanguageResponse, // The text response from Gemini (natural language)
      "fcr": parsedJsonObject // The parsed JSON object (action/explanation)
    };

  } catch (error) {
    console.error('❌ Unexpected Error:', error.message);
    return {
      error: 'Unexpected error occurred',
      reason: error.message
    };
  }
}

module.exports = { extractJsonFromResponse };
