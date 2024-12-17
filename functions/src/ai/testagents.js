const { send } = require('./chat'); // Import send function from chat.js

const { generateRandomMessage } = require('./utils/messageGenerator'); // Utility to generate random messages

// Mock functions for blockchain interactions (if applicable)

async function testLittlefinger(numAgents = 1, numQueries = 10) {
  const agents = []; // Array to store test agents

  // Create test agents
  for (let i = 0; i < numAgents; i++) {
    agents.push({
      sessionId: `agent-${i}`, // Unique session ID for each agent
      chainId: 'mock-chain-id', // Replace with mock chain ID if needed
      gameId: 'mock-game-id', // Replace with mock game ID if needed
    });
  }

  // Run queries for each agent
  for (const agent of agents) {
    for (let j = 0; j < numQueries; j++) {
      const message = generateRandomMessage(); // Generate random message
      const response = await send(message, agent.sessionId, agent.chainId, j, 'mock-tx-id', agent.gameId);
      console.log(`Agent ${agent.sessionId} - Query ${j + 1}:`);
      console.log(`  Message: ${message}`);
      console.log(`  Response: ${response.response}`);

      // Analyze response for potential vulnerabilities (e.g., approving transfer)
      if (response.responseType === 'won') {
        console.warn('WARNING: Littlefinger approved a transfer!');
      }
    }
  }
}

// Run the test with desired number of agents and queries
testLittlefinger(3, 20); // Example: Run with 3 agents and 20 queries each