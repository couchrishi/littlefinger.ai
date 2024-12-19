const functions = require("firebase-functions");
const cors = require('cors'); 
const chat = require("./src/ai/chat");

const corsMiddleware = cors({ 
  origin: true, 
  methods: ['GET', 'POST', 'OPTIONS'], 
  allowedHeaders: ['Content-Type', 'Authorization']
});

exports.chatWithAI = functions.https.onRequest((req, res) => {
  corsMiddleware(req, res, async () => {
    try {
      // Handle OPTIONS preflight request
      if (req.method === 'OPTIONS') {
        console.log('OPTIONS preflight request');
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.set('Access-Control-Max-Age', '3600'); // Cache preflight for 1 hour
        return res.status(204).send(''); // End preflight request early
      }

      // Handle Non-POST Requests
      if (req.method !== "POST") {
        console.log(`Invalid method: ${req.method}`);
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        return res.status(405).send("Method not allowed");
      }

      // Validate Request Body
      const { message, sessionId, chainId, queryId, txId, gameId } = req.body;

      if (!message) {
        console.log('Invalid request: Missing message');
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        return res.status(400).send({ error: "Message is required" });
      }

      // Handle Actual POST Request
      console.log('POST request received, calling chat.send()');
      const response = await chat.send(message, sessionId, chainId, queryId, txId, gameId);

      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      return res.status(200).send({
        response: response.response,
        responseType: response.responseType,
        sessionId,
      });

    } catch (error) {
      console.error("Error in chatWithAI function:", error);
      
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      return res.status(500).send({
        error: 'Failed to generate response',
        details: error.message,
      });
    }
  });
});
