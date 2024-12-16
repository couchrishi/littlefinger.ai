const { listenForGameContractEvents } = require("./listeners/listeners");
const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080; // Port required by Cloud Run
const network = process.argv[2] || "testnet";

app.get('/', (req, res) => res.send('🎉 On-chain listeners are running!'));
app.get('/healthz', (req, res) => res.status(200).send('OK'));

if (!["testnet", "mainnet"].includes(network)) {
  console.error("❌ Invalid network. Use 'testnet' or 'mainnet'.");
  process.exit(1);
}

(async function startListeners() {
  try {
    console.log(`🎉 Starting all contract event listeners on ${network.toUpperCase()} network...`);

    // Start Player Action Event Listeners
    await listenForGameContractEvents(network);
    //await listenForGameLifecycleEvents(network);

    console.log("✅ All listeners are now running.");
  } catch (error) {
    console.error("❌ Failed to start listeners:", error);
    handleListenerRestart();
  }
})();

app.listen(PORT, () => {
  console.log(`🚀 Dummy HTTP server is listening on port ${PORT}`);
});


/**
 * Handle automatic restarts in case of listener failure.
 */
function handleListenerRestart() {
  const RETRY_DELAY_MS = 10000; // Wait 10 seconds before restarting
  console.error(`🔄 Restarting listeners in ${RETRY_DELAY_MS / 1000} seconds...`);
  setTimeout(() => {
    console.log("♻️ Restarting contract event listeners...");
    startListeners(); // Re-invoke the listener start function
  }, RETRY_DELAY_MS);
}

// Handle Uncaught Exceptions & Rejections
process.on('unhandledRejection', (error) => {
  console.error('🚨 Unhandled promise rejection:', error);
  handleListenerRestart();
});

process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught exception:', error);
  handleListenerRestart();
});

