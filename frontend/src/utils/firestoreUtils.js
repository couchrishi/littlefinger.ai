import { doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";
import db from "../config/firebaseConfig";
import { setStats } from "../redux/slices/gameStatsSlice";
import store from "../redux/store"; // Import the Redux store


/**
 * 🔥 Helper function to safely convert Firestore Timestamp to ISO string
 * @param {object} timestamp - Firestore Timestamp object
 * @returns {string | null} ISO date string or null if timestamp is invalid
 */
const convertTimestampToISO = (timestamp) => {
  try {
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toISOString();
    }
  } catch (error) {
    console.error("❌ Error converting timestamp to ISO:", error);
  }
  return null;
};

/**
 * 🔥 Listen for real-time stats updates from Firestore
 * @param {string} network - The network to listen for (e.g., 'testnet', 'mainnet')
 * @returns {function} Unsubscribe function to stop listening
 */
export const listenForStatsUpdates = (network) => {
  if (!network) {
    throw new Error("Network parameter is required for listenForStatsUpdates.");
  }

  try {
    // Reference the stats document based on the passed network
    const statsDoc = doc(db, "littlefinger-stats", network);

    // Subscribe to Firestore document updates
    const unsubscribe = onSnapshot(statsDoc, (snapshot) => {
      try {
        if (snapshot.exists()) {
          const data = snapshot.data() || {};
          console.log(`📊 Stats updated for ${network}:`, data);

          // Dispatch sanitized stats directly to Redux
          const sanitizedStats = {
            prizePool: parseFloat(data.currentPrizePool || 0).toFixed(2),
            prizePoolInUsd: parseFloat(data.currentPrizePoolUsd || 0).toFixed(2),
            participants: parseInt(data.participants?.length || 0, 10),
            breakInAttempts: parseInt(data.breakInAttempts || 0, 10),
            interactionCost: parseFloat(data.interactionCost || 0).toFixed(3),
          };

          store.dispatch(setStats(sanitizedStats));
        } else {
          console.warn(`⚠️ Stats document does not exist for ${network}.`);
        }
      } catch (error) {
        console.error(`❌ Error processing stats update for ${network}:`, error);
      }
    });

    return unsubscribe;
  } catch (error) {
    console.error(`❌ Error setting up listener for ${network}:`, error);
    return () => {}; // Return a no-op unsubscribe function
  }
};


/**
 * 🔥 Listen for real-time global chat updates from Firestore
 * @param {string} networkKey - "mainnet" or "testnet"
 * @param {function} callback - Function to execute when chat data updates
 * @returns {function} Unsubscribe function to stop listening
 */
export const listenForGlobalChat = (networkKey, callback) => {
  try {
    const globalChatRef = doc(db, "littlefinger-global", networkKey);
    const unsubscribe = onSnapshot(globalChatRef, (docSnapshot) => {
      try {
        if (docSnapshot.exists()) {
          const globalData = docSnapshot.data() || {};
          callback(globalData.messages || []);
          console.log("💬 Global Chat updated:", globalData.messages || []);
        } else {
          console.warn("⚠️ No global chat context found.");
          callback([]);
        }
      } catch (error) {
        console.error("❌ Error processing global chat update:", error);
      }
    });
    return unsubscribe;
  } catch (error) {
    console.error("❌ Error setting up listener for global chat updates:", error);
    return () => {};
  }
};

/**
 * 🔥 Fetch application config from Firestore
 * @param {string} networkKey - "mainnet" or "testnet"
 * @returns {Promise<Object>} - Resolves with the Firestore document data or null if not found
 */
export const fetchAppConfig = async (networkKey) => {
  try {
    //const configRef = doc(db, "littlefinger-frontend-config", networkKey);
    const configRef = doc(db, "littlefinger-frontend-config", 'testnet');
    const docSnapshot = await getDoc(configRef);
    if (docSnapshot.exists()) {
      const configData = docSnapshot.data() || {};
      console.log(`✅ Config for network ${networkKey}:`, configData);
      return configData;
    } else {
      console.warn(`⚠️ No config found for network: ${networkKey}`);
      return null;
    }
  } catch (error) {
    console.error("❌ Error fetching Firestore config:", error);
    return null;
  }
};

/**
 * 🔥 Listen for changes to the "gameStatus" in the Firestore document.
 * 
 * Firestore path: 
 * /littlefinger-game-lifecycle/{network}/games/{contractAddress}
 * 
 * @param {string} network - The network key (e.g., 'mainnet' or 'testnet').
 * @param {string} contractAddress - The contract address used as part of the document path.
 * @param {function} callback - Callback function to receive the gameStatus updates.
 * @returns {function} Unsubscribe function to stop listening to changes.
 */
export const listenForGameState = (network, contractAddress, callback) => {

  if (!network || !contractAddress) {
    console.error("❌ Network and contractAddress are required to listen for game state.");
    return () => {};
  }

  const docRef = doc(db, 'littlefinger-game-lifecycle', 'testnet', 'games', contractAddress);

  const unsubscribe = onSnapshot(docRef, (doc) => {
    try {
      if (doc.exists()) {
        const data = doc.data() || {};
        if (data && data.gameStatus) {
          const serializableGameStatus = {
            ...data.gameStatus,
            startedAt: convertTimestampToISO(data.gameStatus?.startedAt) || 'N/A',
            idleSince: convertTimestampToISO(data.gameStatus?.idleSince) || 'N/A',
          };
          console.log(`🎮 Game status updated for network: ${network}, contract: ${contractAddress}`, serializableGameStatus);
          callback(serializableGameStatus);
        } else {
          console.warn(`⚠️ No "gameStatus" field found in document for network: ${network} and contract: ${contractAddress}`);
        }
      } else {
        console.warn(`⚠️ Document for network: ${network} and contract: ${contractAddress} does not exist.`);
      }
    } catch (error) {
      console.error("❌ Error processing game state update:", error);
    }
  }, (error) => {
    console.error(`❌ Firestore onSnapshot error for network: ${network}, contract: ${contractAddress}`, error);
  });

  return unsubscribe;
};
