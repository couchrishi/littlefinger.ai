import { doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";
import db from "../config/firebaseConfig";

/**
 * Listen for real-time stats updates from Firestore
 * @param {function} callback - Function to execute when stats are updated
 * @returns {function} Unsubscribe function to stop listening
 */
export const listenForStatsUpdates = (callback) => {
  try {
    const statsDoc = doc(db, "littlefinger-stats", "testnet"); // Update Firestore path if needed
    const unsubscribe = onSnapshot(statsDoc, (snapshot) => {
      if (snapshot.exists()) {
        console.log("Stats updated:", snapshot.data());
        callback(snapshot.data());
      } else {
        console.log("Stats document does not exist.");
      }
    });
    return unsubscribe;
  } catch (err) {
    console.error("Error listening for stats updates:", err);
    throw err;
  }
};
/**
 * Listen for real-time global chat updates from Firestore
 * @param {string} networkKey - "mainnet" or "testnet"
 * @param {function} callback - Function to execute when chat data updates
 * @returns {function} Unsubscribe function to stop listening
 */
export const listenForGlobalChat = (networkKey, callback) => {
  try {
    const globalChatRef = doc(db, "littlefinger-global", networkKey);
    const unsubscribe = onSnapshot(globalChatRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const globalData = docSnapshot.data();
        callback(globalData.messages || []);
      } else {
        console.log("No global chat context found.");
        callback([]); // Return an empty array if no document exists
      }
    });
    return unsubscribe;
  } catch (error) {
    console.error("Error listening for global chat updates:", error);
    throw error;
  }
};

/**
 * 🔥 Fetch application config from Firestore
 * @param {string} networkKey - "mainnet" or "testnet"
 * @returns {Promise<Object>} - Resolves with the Firestore document data or null if not found
 */
export const fetchAppConfig = async (networkKey) => {
  try {
    const configRef = doc(db, "littlefinger-frontend-config", networkKey); // Reference the Firestore document
    const docSnapshot = await getDoc(configRef); // Wait for the document to be retrieved
    if (docSnapshot.exists()) {
      console.log(`✅ Config for network ${networkKey}:`, docSnapshot.data());
      return docSnapshot.data(); // Return the Firestore document's data
    } else {
      console.error(`❌ No config found for network: ${networkKey}`);
      return null; // Return null if document does not exist
    }
  } catch (error) {
    console.error(`❌ Error fetching Firestore config:`, error);
    throw error; // Propagate the error so it can be caught by the calling function
  }
};
