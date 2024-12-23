const { ChatModel } = require('@google-cloud/vertexai');
const { accessSecret } = require('./secrets');

// Load secrets dynamically
async function initializeVertexModel(network) {
  const projectId = await accessSecret('GCP_PROJECT_ID');
  const location = await accessSecret('GCP_LOCATION');

  const chatModel = new ChatModel({
    projectId: projectId,
    location: location, // Change based on your location
  });

  return chatModel;
}

// Create a chat instance
async function getChatInstance(systemPrompt, context = '') {
  const currentNetwork = await accessSecret('CURRENT_NETWORK');
  const chatModel = await initializeVertexModel(currentNetwork); // Use 'mainnet' for production
  return chatModel.startChat({
    model: 'models/gemini-1-5-pro',
    temperature: 0.7,
    context,
    system: systemPrompt,
  });
}

module.exports = { getChatInstance };
