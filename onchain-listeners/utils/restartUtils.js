

function handleListenerRestart() {
    const RETRY_DELAY_MS = 10000; // Wait 10 seconds before restarting
    console.error(`🔄 Restarting listeners in ${RETRY_DELAY_MS / 1000} seconds...`);
    setTimeout(() => {
      console.log("♻️ Restarting contract event listeners...");
  
      const { startListeners } = require('../server'); // 👈 Lazy import to avoid circular dependency
      startListeners(); // Re-invoke the listener start function
    }, RETRY_DELAY_MS);
  }


module.exports = { handleListenerRestart };