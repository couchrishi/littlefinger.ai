const ethers = require('ethers');

// 🔧 Declare necessary global variables
let restartScheduled = false;
let retryCount = 0;
let retryTimeout = null;
let pingInterval = null; // To keep track of the ping interval
let reconnectionAttempt = 0;
let healthCheckInterval = null;


const RETRY_DELAY_MS = 5000;
const MAX_RETRY_DELAY_MS = 60000;
const MAX_RETRY_ATTEMPTS = 10; // 🚀 New: Limit to avoid infinite exponential backoff
const PING_INTERVAL_MS = 25000; // Ping every 25 seconds
const MAX_RECONNECTION_ATTEMPTS = 10;

let provider = null;


async function initializeWebSocketProvider(WSS_URL, network) {
  console.log("[provider] 🚀 Starting WebSocket provider initialization");

  if (!WSS_URL) {
    throw new Error("❌ WSS_URL is required");
  }

  try {
    provider = new ethers.WebSocketProvider(WSS_URL);
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
        scheduleReconnection(provider, network); // 🔥 Reuse scheduleReconnection
      };

      websocket.onerror = (error) => {
        console.error('[provider] 🚨 WebSocket error:', error);
        handleWebSocketError(error); // 🔥 Log the error
        scheduleReconnection(provider, network); // 🔥 Reuse scheduleReconnection
      };

      // 🔥 Start pinging the WebSocket connection
      startEnhancedPing(provider, network); // Reuse existing ping logic

      // Log initial connection state
      console.log('[provider] 🔌 WebSocket initial state:', {
        readyState: websocket.readyState,
        url: websocket.url
      });

    // 🚨 Add this in server.js or listener.js
    // setTimeout(() => {
    //   console.warn('🔥 Manually triggering scheduleReconnection for testing...');
    //   scheduleReconnection(provider, network); // 🚀 Trigger reconnection manually
    // }, 30000); // Trigger after 20 seconds
    // Simulate 1006 WebSocket error
    // setTimeout(() => {
    //   if (provider?.websocket) {
    //     console.warn('🔥 Manually triggering WebSocket termination for 1006 simulation...');
    //     provider.websocket.terminate(); // 🚀 Use terminate() to force an abrupt disconnect
    //   }
    // }, 30000); // Close after 15 seconds
    

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
function startEnhancedPing(provider, network) {
  if (pingInterval) {
    clearInterval(pingInterval);
  }

  pingInterval = setInterval(async () => {
    if (!provider || !provider.websocket || provider.websocket.readyState !== 1) {
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
        scheduleReconnection(provider, network);
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
async function scheduleReconnection(provider, network) {
  if (restartScheduled) {
    console.warn('[provider] ⚠️ Reconnection already scheduled. Skipping new attempt.');
    return;
  }

  restartScheduled = true;
  reconnectionAttempt++;

  if (reconnectionAttempt > MAX_RECONNECTION_ATTEMPTS) {
    console.error('[provider] ❌ Maximum reconnection attempts reached. Stopping reconnection attempts.');
    restartScheduled = false; // Allow future attempts
    return;
  }

  // const delay = Math.min(
  //   RETRY_DELAY_MS * Math.pow(1.5, reconnectionAttempt),
  //   MAX_RETRY_DELAY_MS
  // );

  const delay = RETRY_DELAY_MS; // No backoff, always use 5 seconds


  console.log(`[provider] 🔄 Scheduling reconnection attempt ${reconnectionAttempt} in ${(delay / 1000).toFixed(2)} seconds`);

  setTimeout(async () => {
    try {
      console.log('[provider] 🔥 Starting reconnection process...');

      // 🚀 Step 1: Clear ping and health check intervals
      if (pingInterval) clearInterval(pingInterval);
      if (healthCheckInterval) clearInterval(healthCheckInterval);
      console.log('[provider] ✅ Cleared all intervals (ping, health check, etc.)');

      // 🚀 Step 2: Properly clean up current provider
      //await cleanUpProvider(provider); // Ensures destroy() is awaited

      if (provider) {
        console.log('[provider] 🔥 Destroying existing provider...');
        await Promise.race([
          provider.destroy(), 
          new Promise((resolve) => setTimeout(resolve, 5000)) 
        ]);
        console.log('[provider] ✅ Provider destroyed successfully.');
        provider = null; 
      }

      // 🚀 Step 2: Destroy provider
      if (provider) {
        console.log('[provider] 🔥 Destroying existing provider...');
        await Promise.race([
          provider.destroy(), 
          new Promise((resolve) => setTimeout(resolve, 5000)) 
        ]);
        console.log('[provider] ✅ Provider destroyed successfully.');
        provider = null; 
      }


      // 🚀 Step 3: Restart listeners
      const gameContractEvents = require('../listeners/listeners').listenForGameContractEvents;
      if (typeof gameContractEvents === 'function') {
        console.log('[provider] 🚀 Restarting listeners...');
        await gameContractEvents(network); // Restart listeners for the given network
      }

    } catch (error) {
      console.error('[provider] ❌ Reconnection failed:', error);
    } finally {
      restartScheduled = false; // Allow future reconnection attempts
      console.log('[provider] 🔄 Reconnection process completed.');
    }
  }, delay);
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

// async function cleanUpProvider(provider) {
//   try {
//     console.log('[provider] 🔥 Cleaning up provider...');

//     // 🔥 Step 1: Clear WebSocket event listeners
//     if (provider?.websocket) {
//       provider.websocket.onopen = null;
//       provider.websocket.onclose = null;
//       provider.websocket.onerror = null;
//       provider.websocket.close(); // 🚀 Force close the WebSocket
//       console.log('[provider] ❌ Cleared all event listeners on WebSocket and force-closed it.');
//     }

//     // 🔥 Step 2: Properly destroy the provider
//     if (provider) {
//       try {
//         await provider.destroy(); // ✅ Wait for destroy to complete
//         console.log('[provider] ✅ Provider destroyed successfully.');
//       } catch (error) {
//         console.error('[provider] ❌ Error while destroying provider:', error);
//       }
//     }
//   } catch (error) {
//     console.error('[provider] ❌ Failed to clean up provider:', error);
//   } finally {
//     provider = null; // Explicitly clear the reference
//     console.log('[provider] ✅ Provider reference cleared from memory.');
//   }
// }





module.exports = {
  initializeWebSocketProvider,
  startEnhancedPing,
  stopPing,
  scheduleReconnection,
  handleNetworkChange,
  handleWebSocketError
};
