require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });
const { ethers } = require("ethers");

// Smart contract details
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS; // Ensure this is in your .env file
const ABI = require("../blockchain/abis/LittlefingerGame.json").abi; // Adjust the path to your ABI if necessary
const POLYGON_WSS_URL = process.env.POLYGON_WSS_URL; // Ensure this is in your .env file

// Function to listen for all events
async function listenForAllEvents() {
  try {
    if (!CONTRACT_ADDRESS) {
      throw new Error("❌ Contract address is missing. Ensure CONTRACT_ADDRESS is set in .env");
    }

    if (!POLYGON_WSS_URL) {
      throw new Error("❌ Polygon WebSocket URL is missing. Ensure POLYGON_WSS_URL is set in .env");
    }

    // 🟢 Initialize provider and contract
    const provider = new ethers.providers.WebSocketProvider(POLYGON_WSS_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

    console.log(`🎉 Listening for all events on contract: ${CONTRACT_ADDRESS}`);

    /**
     * 🎉 Specific Listener for "NextQueryFee" Event
     */
    contract.on("NextQueryFee", (nextFee, currentCount, event) => {
      console.log("\n🔥🔥🔥🔥🔥🔥 NextQueryFee Event Detected 🔥🔥🔥🔥🔥🔥");
      console.log("📣 Event Name: NextQueryFee");
      console.log("📈 Next Fee (in wei):", nextFee.toString());
      console.log("🧮 Current Count:", currentCount.toString());
      console.log("🔗 Transaction Hash:", event.transactionHash);
      console.log("🕒 Block Number:", event.blockNumber);
    });

    /**
     * 🎉 Generic Listener for All Events (Fallback)
     */
    contract.on("*", (eventName, ...args) => {
      console.log("\n🔍 Generic Event Detected");
      console.log("📣 Event Name:", eventName);
      console.log("📘 Event Arguments:", args.map((arg) => arg.toString()));
    });

    /**
     * 🛠️ Listen for Raw Logs (Not parsed by ethers)
     */
    provider.on("log", (log) => {
      console.log("\n🛠️  Raw event log received (unparsed):");
      console.log(JSON.stringify(log, null, 2));

      try {
        const parsedLog = contract.interface.parseLog(log);
        console.log("\n🔍 Decoded Log:");
        console.log("📣 Event Name:", parsedLog.name);
        console.log("📘 Decoded Arguments:", parsedLog.args);
      } catch (error) {
        console.error("⚠️  Error decoding log:", error.message);
      }
    });

    /**
     * 🛠️ Handle WebSocket disconnections and reconnect
     */
    provider._websocket.on("close", (code) => {
      console.error(`❌ WebSocket connection lost. Code: ${code}. Reconnecting in 5 seconds...`);
      setTimeout(() => listenForAllEvents(), 5000); // Reconnect after 5 seconds
    });

    provider._websocket.on("error", (error) => {
      console.error("⚠️  WebSocket error:", error.message);
    });

    console.log("🎉 Event listener is now running...");
    process.stdin.resume(); // Keep the process alive

  } catch (error) {
    console.error("❌ Error in listenForAllEvents:", error);
  }
}

// Run the listener
listenForAllEvents();
