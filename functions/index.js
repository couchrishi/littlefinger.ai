const functions = require("firebase-functions");
const cors = require('cors'); 
let chat;

try {
  chat = require('./src/ai/chat');
} catch (error) {
  console.error('Failed to import chat module:', error);
}

const corsMiddleware = cors({
  origin: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
});

exports.chatWithAI = functions.https.onRequest((req, res) => {
  corsMiddleware(req, res, async () => {
    try {
      // Health check for GET requests
      if (req.method === 'GET') {
        res.status(200).send('Health check OK');
        return;
      }

      // Handle OPTIONS preflight request
      if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
      }

      // Handle Non-POST Requests
      if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
      }

      // Validate Request Body
      const { message } = req.body;
      if (!message) {
        res.status(400).send({ error: 'Message is required' });
        return;
      }

      const response = await chat.send(message);
      res.status(200).send({ response });

    } catch (error) {
      console.error('Error in chatWithAI function:', error);
      res.status(500).send({ error: 'Internal Server Error', details: error.message });
    }
  });
});
