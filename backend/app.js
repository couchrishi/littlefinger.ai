const express = require('express');
const cors = require('cors'); 
const chatRoutes = require('./src/routes/chat');
const authRoutes = require('./src/routes/auth'); // Import the new auth route

const app = express();

// Middleware for parsing JSON
app.use(express.json());

// This will allow all origins by default
app.use(cors());

// ** Health check endpoint for Cloud Run
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Register routes
app.use('/api', chatRoutes); // Existing chat routes
app.use('/api', authRoutes); // New auth route

// Start the server on port 8080
const PORT = 8080;
//const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}).on('error', (err) => {
  console.error('Error starting the server:', err);
});
