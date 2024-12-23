


const express = require('express');
const chatRoutes = require('./src/routes/chat');

const app = express();

// Middleware for parsing JSON
app.use(express.json());

// Register routes
app.use('/api', chatRoutes);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
