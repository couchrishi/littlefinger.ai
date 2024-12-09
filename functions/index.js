const functions = require("firebase-functions");
const cors = require('cors')({ origin: true }); 
const chat = require("./src/ai/chat");

exports.chatWithAI = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    // Handle OPTIONS requests
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.set('Access-Control-Allow-Origin', '*'); 
      res.set('Access-Control-Max-Age', '3600'); 
      res.status(204).send(''); // End the OPTIONS request immediately
      return; 
    }

    // Handle non-POST requests
    if (req.method !== "POST") {
      return res.status(405).send("Method not allowed");
    }

    // Validate the request body
    const { message, sessionId, chainId, queryId, txId } = req.body;

    if (!message) {
      res.set('Access-Control-Allow-Origin', '*');
      return res.status(400).send({ error: "Message is required" });
    }

    try {
      const response = await chat.send(message, sessionId, chainId, queryId, txId);
      
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      res.status(200).send({
        response: response.response,
        responseType: response.responseType,
        sessionId,
      });
    } catch (error) {
      console.error("Error in chatWithAI function:", error);
      
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      res.status(500).send({
        error: 'Failed to generate response',
        details: error.message,
      });
    }
  });
});
