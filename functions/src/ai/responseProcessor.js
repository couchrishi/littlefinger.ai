function processGeminiResponse(response) {
  if (!response || !response.custom?.candidates) {
    console.error('❌ No candidates returned from Vertex AI');
    return { aiResponse: 'Unable to process your request right now.', toolRequests: [] };
  }

  const fullTextResponse = response.custom.candidates[0]?.message?.content?.reduce((acc, part) => {
    if (part.text) {
      return acc + part.text;
    }
    return acc;
  }, "") || 'Unable to process your request right now.';

  const normalizedResponse = fullTextResponse.replace(/\n/g, ' ').replace(/\s+/g, ' ');

  const jsonStart = normalizedResponse.indexOf("<JSON_START>");
  const jsonEnd = normalizedResponse.indexOf("</JSON_END>");

  if (jsonStart !== -1 && jsonEnd !== -1) {
    try {
      const jsonString = fullTextResponse.substring(jsonStart + "<JSON_START>".length, jsonEnd).trim();
      const backendDecision = JSON.parse(jsonString);

      // Extract AI Response Correctly:
      const aiResponse = fullTextResponse.substring(0, jsonStart).trim();

      return { aiResponse, toolRequests: [backendDecision] };
    } catch (jsonError) {
      console.error("Error parsing JSON:", jsonError, "Faulty JSON String:", fullTextResponse.substring(jsonStart + "<JSON_START>".length, jsonEnd));
      return { aiResponse: fullTextResponse.trim(), toolRequests: [] };
    }
  } else {
    console.log("JSON delimiters not found. Full Response:", fullTextResponse);
    return { aiResponse: fullTextResponse.trim(), toolRequests: [] };
  }
}

module.exports = {
  processGeminiResponse,
};