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
    top_p: 0.85, // Expands the range of token sampling
    top_k: 50, // Allows more diverse outputs
    temperature: 0.8,
    context,
    system: systemPrompt,
  });
}

module.exports = { getChatInstance };
