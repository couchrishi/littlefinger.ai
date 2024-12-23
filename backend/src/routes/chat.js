const express = require('express');
const router = express.Router();
const { sendMessage } = require('../services/sendMessage'); // Import the sendMessage logic

router.post('/sendMessage', async (req, res) => {
  try {
    const { message, sessionId, chainId, queryId, txId } = req.body;
    if (!message || !sessionId || !chainId || !txId) {
      return res.status(400).json({ error: 'Missing required fields: message, sessionId, chainId, txId' });
    }

    const response = await sendMessage(message, sessionId, chainId, queryId, txId);
    
    if (typeof response !== 'object' || !('response' in response)) {
      console.error('❌ Invalid response format from sendMessage:', response);
      return res.status(500).json({ error: 'Invalid response from sendMessage' });
    }
    console.log('✅ Sending the following response to Chainlit:', JSON.stringify(response, null, 2));
    res.setHeader('Content-Type', 'application/json'); // <-- Explicitly set Content-Type to ensure JSON format
    res.json(response); // 🚀 Make sure response is always JSON

  } catch (error) {
    console.error(`❌ Error in /sendMessage:`, error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
