const fixMalformedJson = (jsonString) => {
  try {
    // 🛠️ 1. Add double quotes to keys without quotes
    let correctedJson = jsonString.replace(/(?<!")(\b\w+\b):/g, '"$1":');
    
    // 🛠️ 2. Escape double quotes inside values
    correctedJson = correctedJson.replace(/(?<=:\s*")([^"]*?)(?<!\\)"/g, '$1\\"');

    // 🛠️ 3. Escape backslashes (file paths, URLs)
    correctedJson = correctedJson.replace(/(?<!\\)\\/g, '\\\\');

    // 🛠️ 4. Remove newlines, tabs, and carriage returns
    correctedJson = correctedJson.replace(/[\r\n\t]/g, ' ');

    // 🛠️ 5. Remove trailing commas before closing braces
    correctedJson = correctedJson.replace(/,(\s*[}\]])/g, '$1');

    // 🛠️ 6. Ensure the JSON is enclosed properly with curly braces
    if (!correctedJson.startsWith('{')) correctedJson = `{${correctedJson}`;
    if (!correctedJson.endsWith('}')) correctedJson = `${correctedJson}}`;

    return correctedJson;
  } catch (error) {
    console.error('❌ Error while fixing malformed JSON:', error.message);
    return jsonString; // Return the raw version if any error happens
  }
};


function extractJsonFromResponse(response, enableDebug = true) {
  try {
    const jsonRegex = /<JSON_START>([\s\S]*?)<JSON_END>/; 
    const match = response.match(jsonRegex); 

    let parsedJsonObject = null;
    let naturalLanguageResponse = response;

    if (match && match[1]) {
      try {
        const jsonString = match[1].trim(); 
        if (enableDebug) console.log('🛠️ Extracted raw JSON string:', jsonString);

        naturalLanguageResponse = response.replace(jsonRegex, '').trim(); 
        if (enableDebug) console.log('🛠️ Extracted Natural Language Response:', naturalLanguageResponse);

        parsedJsonObject = JSON.parse(jsonString); 
        if (enableDebug) console.log('📦 Parsed Extracted JSON (original):', parsedJsonObject);

      } catch (error) {
        console.error('❌ Error parsing JSON:', error.message, '🛠️ Faulty JSON String:', match[1]);

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
      "nlr": naturalLanguageResponse, 
      "fcr": parsedJsonObject 
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