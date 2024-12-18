const ethers = require('ethers');

// 🔧 Declare necessary global variables
let restartScheduled = false;
let retryCount = 0;
let retryTimeout = null;
let pingInterval = null; // To keep track of the ping interval
let reconnectionAttempt = 0;

const RETRY_DELAY_MS = 5000;
const MAX_RETRY_DELAY_MS = 60000;
const MAX_RETRY_ATTEMPTS = 10; // 🚀 New: Limit to avoid infinite exponential backoff
const PING_INTERVAL_MS = 25000; // Ping every 25 seconds
const MAX_RECONNECTION_ATTEMPTS = 10;


async function initializeWebSocketProvider(WSS_URL) {
  console.log("[provider] 🚀 Starting WebSocket provider initialization");

  if (!WSS_URL) {
    throw new Error("❌ WSS_URL is required");
  }

  try {
    const provider = new ethers.WebSocketProvider(WSS_URL);
    console.log('[provider] 🌐 Initializing WebSocket provider...');

    await provider.getNetwork(); // Ensure provider is ready

    if (provider.websocket) {
      const websocket = provider.websocket;

      // 🔥 Set up connection monitoring
      websocket.onopen = () => {
        console.log('[provider] ✅ WebSocket connection established');
      };

      websocket.onclose = (event) => {
        console.warn(`[provider] 🔌 WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason}`);
        cleanUpProvider(provider); // 🔥 Reuse cleanUpProvider
        scheduleReconnection(provider, WSS_URL); // 🔥 Reuse scheduleReconnection
      };

      websocket.onerror = (error) => {
        console.error('[provider] 🚨 WebSocket error:', error);
        handleWebSocketError(error); // 🔥 Log the error
        scheduleReconnection(provider, WSS_URL); // 🔥 Reuse scheduleReconnection
      };

      // 🔥 Start pinging the WebSocket connection
      startEnhancedPing(provider); // Reuse existing ping logic

      // Log initial connection state
      console.log('[provider] 🔌 WebSocket initial state:', {
        readyState: websocket.readyState,
        url: websocket.url
      });

    } else {
      throw new Error('❌ WebSocket connection not available on provider');
    }

    console.log('[provider] ✅ WebSocket provider initialized successfully');
    return provider;

  } catch (error) {
    console.error('[provider] ❌ Error initializing WebSocket provider:', error);
    throw error; // Bubble up the error
  }
}


/**
 * 🔥 Starts ping process to check if the connection is still alive.
 * Uses provider.getBlockNumber() as a heartbeat to ensure WebSocket is live.
 */
function startEnhancedPing(provider) {
  if (pingInterval) {
    clearInterval(pingInterval);
  }

  pingInterval = setInterval(async () => {
    if (!provider.websocket || provider.websocket.readyState !== 1) {
      console.log('[provider] 🚫 WebSocket not ready, skipping ping');
      return;
    }

    try {
      const blockNumber = await provider.getBlockNumber();
      console.log('[provider] 🏓 Ping successful, current block:', blockNumber);
      reconnectionAttempt = 0; // Reset the reconnection attempt counter on success
    } catch (error) {
      console.error('[provider] ❌ Ping failed:', error);
      if (!restartScheduled) {
        scheduleReconnection(provider, provider.websocket?.url);
      }
    }
  }, PING_INTERVAL_MS);
}

/**
 * 🔥 Stops the ping process and clears the ping interval.
 */
function stopPing() {
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
    console.log('[networkUtils] 🔄 Stopped WebSocket ping.');
  }
}

/**
 * 🔥 Schedules a reconnection attempt with exponential backoff logic.
 * Destroys the provider, clears intervals, and restarts listeners.
 */
function scheduleReconnection(provider, url) {
  if (restartScheduled) return;

  restartScheduled = true;
  reconnectionAttempt++;

  if (reconnectionAttempt > MAX_RECONNECTION_ATTEMPTS) {
    console.error('[provider] ❌ Maximum reconnection attempts reached. Stopping reconnection attempts.');
    return;
  }

  const delay = Math.min(
    RETRY_DELAY_MS * Math.pow(1.5, reconnectionAttempt),
    MAX_RETRY_DELAY_MS
  );

  console.log(`[provider] 🔄 Scheduling reconnection attempt ${reconnectionAttempt} in ${(delay / 1000).toFixed(1)}s`);

  setTimeout(async () => {
    try {
      if (provider) {
        console.log('[provider] 🔥 Destroying provider for cleanup before reconnecting...');
        await provider.destroy(); // Destroy provider (Ethers v6)
      }

      if (pingInterval) clearInterval(pingInterval);
      if (healthCheckInterval) clearInterval(healthCheckInterval);

      const { listenForGameContractEvents } = require('../listeners/listeners');
      if (typeof listenForGameContractEvents === 'function') {
        console.log('[provider] 🚀 Restarting listeners...');
        await listenForGameContractEvents('testnet');
      }
    } catch (error) {
      console.error('[provider] ❌ Reconnection failed:', error);
    } finally {
      restartScheduled = false;
    }
  }, delay);
}

/**
 * 🔥 Cleans up the provider by destroying the WebSocket provider and clearing intervals.
 */
async function cleanUpProvider(provider) {
  try {
    console.log('[provider] 🔥 Cleaning up provider...');
    if (provider) {
      await provider.destroy(); // v6 destroy method
    }
    if (pingInterval) clearInterval(pingInterval); // Clear any pings
    console.log('[provider] ✅ Provider and ping cleaned up successfully');
  } catch (error) {
    console.error('[provider] ❌ Failed to clean up provider:', error);
  }
}

/**
 * 🔥 Handles network changes (like when you switch from testnet to mainnet)
 */
function handleNetworkChange(newNetwork, oldNetwork) {
  if (oldNetwork) {
    console.log(`[networkUtils] 🔄 Network changed from ${oldNetwork.chainId} to ${newNetwork.chainId}`);
  }
}

/**
 * 🔥 Handles errors from the WebSocket
 */
function handleWebSocketError(error) {
  console.error('[networkUtils] ⚠️ WebSocket error:', error.message);
}

module.exports = {
  initializeWebSocketProvider,
  startEnhancedPing,
  stopPing,
  scheduleReconnection,
  cleanUpProvider,
  handleNetworkChange,
  handleWebSocketError
};
