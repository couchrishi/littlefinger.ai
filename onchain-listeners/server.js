const { listenForPlayerActionEvents } = require("./listeners/playerActionListeners");
const express = require('express');
const app = express();
//const { listenForNextQueryFeeEvent } = require("./listeners/nextQueryFeeListener");

const PORT = process.env.PORT || 8080; // Port required by Cloud Run
const network = process.argv[2] || "testnet";

if (!["testnet", "mainnet"].includes(network)) {
  console.error("❌ Invalid network. Use 'testnet' or 'mainnet'.");
  process.exit(1);
}

(async function startListeners() {
  try {
    console.log(`🎉 Starting all contract event listeners on ${network.toUpperCase()} network...`);

    // Pass network context to listeners
    await Promise.all([
      listenForPlayerActionEvents(network),
      //listenForNextQueryFeeEvent(network)
    ]);

    console.log("✅ All listeners are now running.");
  } catch (error) {
    console.error("❌ Failed to start listeners:", error);
    process.exit(1);
  }
})();

// 🚀 Dummy HTTP server to keep the container alive
app.get('/', (req, res) => {
  res.send('🎉 On-chain listeners are running!');
});

app.listen(PORT, () => {
  console.log(`🚀 Dummy HTTP server is listening on port ${PORT}`);
});