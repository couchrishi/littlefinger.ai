const { listenForPlayerActionEvents } = require("./listeners/playerActionListeners");
//const { listenForNextQueryFeeEvent } = require("./listeners/nextQueryFeeListener");

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
