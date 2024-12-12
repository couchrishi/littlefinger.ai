const { genkit } = require('genkit');
const { vertexAI, gemini15Pro } = require('@genkit-ai/vertexai');
//const  { llama31, vertexAIModelGarden } = require('@genkit-ai/vertexai/modelgarden');
//const { gemini15Pro, googleAI } = require('@genkit-ai/googleai');


// Initialize Genkit
const ai = genkit({
  plugins: [
    vertexAI({
      projectId: 'saib-ai-playground',
      location: 'us-central1',
    }),
  ],
});



// const ai = genkit({
//   plugins: [
//     vertexAIModelGarden({
//       location: 'us-central1',
//       models: [llama31],
//     }),
//   ],
// });

// const ai = genkit({
//   plugins: [googleAI()],
//   model: gemini15Pro, // set default model
// });

module.exports = ai;
