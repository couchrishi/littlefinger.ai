const fixMalformedJson = (jsonString) => {
  try {
    let correctedJson = jsonString
      .replace(/(?:^|,|\{|\s)(\w+):/g, '"$1":') // Add double quotes to keys without quotes
      .replace(/(?<!\\)"/g, '\\"') // Escape double quotes inside values
      .replace(/\\(?![\\"])/g, '\\\\') // Escape backslashes
      .replace(/[\r\n\t]/g, ' ') // Remove newlines, tabs, and carriage returns
      .replace(/,(?=\s*[}\]])/g, '') // Remove trailing commas
      .trim();

    if (!/^\s*{/.test(correctedJson)) correctedJson = `{${correctedJson}`;
    if (!/}\s*$/.test(correctedJson)) correctedJson = `${correctedJson}}`;

    return correctedJson;
  } catch (error) {
    console.error('❌ Error while fixing malformed JSON:', error.message);
    return jsonString;
  }
};

function extractJsonFromResponse(response, enableDebug = true) {
  try {
    const jsonRegex = /(?:<JSON_START>|{JSON_START}|<<JSON>>)([\s\S]*?)(?:<JSON_END>|{JSON_END}|<<\/JSON>>)/; 
    const match = response.match(jsonRegex); 

    let parsedJsonObject = null;
    let naturalLanguageResponse = response;

    if (match && match[1]) {
      try {
        const jsonString = match[1].trim(); 
        if (enableDebug) console.log('🛠️ Extracted raw JSON string:', jsonString);

        naturalLanguageResponse = response.replace(jsonRegex, '').trim(); 
        if (enableDebug) console.log('🛠️ Extracted Natural Language Response:', naturalLanguageResponse);

        const fixedJsonString = fixMalformedJson(jsonString);
        if (enableDebug) console.log('🛠️ Fixed JSON string after cleanup:', fixedJsonString);

        parsedJsonObject = JSON.parse(fixedJsonString); 
        if (enableDebug) console.log('📦 Parsed Extracted JSON (after fix):', parsedJsonObject);
      } catch (error) {
        console.error('❌ Final JSON parsing failed:', error.message);
        parsedJsonObject = {
          error: 'Error parsing JSON',
          reason: error.message,
          faultyJson: match[1].trim()
        };
      }
    } else {
      if (enableDebug) console.log('❌ No JSON found in response.');
    }

    return {
      nlr: naturalLanguageResponse, 
      fcr: parsedJsonObject 
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