


const express = require('express');
const cors = require('cors'); 
const chatRoutes = require('./src/routes/chat');


const app = express();

// This will allow all origins by default
app.use(cors()); 

// Middleware for parsing JSON
app.use(express.json());

// Register routes
app.use('/api', chatRoutes);

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
