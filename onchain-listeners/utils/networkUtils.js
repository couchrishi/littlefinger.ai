const ethers = require('ethers');

// 🔧 Declare necessary global variables
let restartScheduled = false;
let retryCount = 0;
let retryTimeout = null;
let pingInterval = null; // To keep track of the ping interval

const RETRY_DELAY_MS = 5000;
const MAX_RETRY_DELAY_MS = 60000;
const MAX_RETRY_ATTEMPTS = 10; // 🚀 New: Limit to avoid infinite exponential backoff
const PING_INTERVAL_MS = 25000; // Ping every 25 seconds


/**
 * Starts the ping to keep the WebSocket connection alive
 * 
 * @param {Object} provider - The WebSocket provider object.
 */
function startPing(provider) {
  if (pingInterval) {
      console.warn('[networkUtils] ⚠️ Ping already active. Skipping startPing...');
      return;
  }
  
  console.log('[networkUtils] 🚀 Starting ping to keep WebSocket alive every 25 seconds...');
  pingInterval = setInterval(async () => {
      try {
          console.log('[networkUtils] 🔄 Pinging WebSocket provider to keep connection alive...');
          await provider.getBlockNumber(); // Simple request to keep connection alive
          console.log('[networkUtils] ✅ Ping successful');
      } catch (error) {
          console.error('[networkUtils] ❌ Ping failed. Triggering restart.', error.message);
          scheduleRestart();
      }
  }, PING_INTERVAL_MS);
}

/**
 * Stops the ping process to clean up resources
 */
function stopPing() {
  if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
      console.log('[networkUtils] 🔄 Stopped WebSocket ping.');
  }
}

/**
 * Handles network change events
 */
function handleNetworkChange(newNetwork, oldNetwork) {
    if (oldNetwork) {
      console.log(`[networkUtils] 🔄 Network changed from ${oldNetwork.chainId} to ${newNetwork.chainId}`);
    }
}

/**
 * Handles WebSocket errors
 */
function handleWebSocketError(error) {
    console.error("[networkUtils] ⚠️ WebSocket error:", error.message);
}

/**
 * Waits for the WebSocket provider to be ready.
 * Retries a few times with exponential backoff before throwing an error.
 * 
 * @param {Object} provider - The WebSocket provider object.
 * @param {number} retries - Maximum number of retries.
 * @param {number} delay - Initial delay for the exponential backoff.
 */
async function waitForProviderReady(provider, retries = 3, delay = 2000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`[networkUtils] 🔄 Attempting to get network (attempt ${attempt}/${retries})...`);
        await provider.getNetwork(); // Wait for provider to be ready
        console.log(`[networkUtils] ✅ WebSocket provider is ready on attempt ${attempt}`);
        return; // Success, exit the loop
      } catch (error) {
        console.error(`[networkUtils] ❌ Failed to get network on attempt ${attempt}:`, error.message);
        
        if (attempt < retries) {
          const backoffDelay = delay * (2 ** attempt);
          console.log(`[networkUtils] ⏳ Backing off for ${backoffDelay}ms before retrying...`);
          await new Promise(res => setTimeout(res, backoffDelay)); // Exponential backoff
        } else {
          console.error('[networkUtils] ❌ All attempts to get network failed. Exiting...');
          throw error; // Throw error after max retries
        }
      }
    }
}

/**
 * Schedules a restart of the listener process with exponential backoff.
 * 
 * @param {string} network - The network to be restarted (e.g., 'testnet' or 'mainnet').
 */
function scheduleRestart(network) {
    if (restartScheduled) {
      console.warn('[networkUtils] ⚠️ Restart already scheduled. Skipping...');
      return;
    }
    restartScheduled = true;

    if (retryTimeout) clearTimeout(retryTimeout);
    
    // Calculate delay with backoff logic and limit to MAX_RETRY_DELAY_MS
    const delay = Math.min(RETRY_DELAY_MS * (2 ** retryCount), MAX_RETRY_DELAY_MS);
    
    // Increment the retry count, but prevent it from exceeding MAX_RETRY_ATTEMPTS
    retryCount = Math.min(retryCount + 1, MAX_RETRY_ATTEMPTS);
    
    console.log(`[networkUtils] 🔄 Restarting in ${delay / 1000} seconds...`);
    
    retryTimeout = setTimeout(() => {
      try {
        console.log('[networkUtils] 🚀 Restarting the game contract listeners...');
        
        // Reset before calling to avoid multiple calls in case of an error
        restartScheduled = false;

        // Ensure this function is properly imported in your main file
        if (typeof listenForGameContractEvents === 'function') {
          listenForGameContractEvents(network);
        } else {
          console.error('[networkUtils] ❌ listenForGameContractEvents is not defined.');
        }

      } catch (error) {
        console.error('[networkUtils] ❌ Error during restart:', error);
        restartScheduled = false; // Allow another restart to be scheduled
      }
    }, delay);
}

/**
 * Resets the retry count for backoff logic.
 */
function resetRetryCount() {
    console.log('[networkUtils] 🔄 Resetting retry count to 0');
    retryCount = 0;
}

module.exports = {
    handleNetworkChange,
    handleWebSocketError,
    waitForProviderReady,
    scheduleRestart,
    resetRetryCount,
    startPing,
    stopPing,
};