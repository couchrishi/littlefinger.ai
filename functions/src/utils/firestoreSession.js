


const { Firestore } = require('@google-cloud/firestore');

// Initialize Firestore
const firestore = new Firestore();

/**
 * FirestoreSessionStore class for session persistence in Genkit
 */
class FirestoreSessionStore {
  /**
   * @param {string} network - Network type (e.g., 'testnet' or 'mainnet')
   */
  constructor(network) {
    const collectionName = 'littlefinger-local';
    this.collection = firestore.collection(collectionName).doc(network);
    console.log("Sessionstore initialized.. The collection name is: ", collectionName, " and document name is: ", network);
  }

  /**
   * Get session data from Firestore
   * @param {string} sessionId - Session ID
   * @returns {object | undefined} - Session data or undefined if not found
   */
  async get(sessionId) {
    try {
      const doc = await this.collection.collection('sessions').doc(sessionId).get();
      if (doc.exists) {
        console.log("The user already has an existing session. Loading it now.. ");
        console.log(`✅ Session data loaded for sessionId: ${sessionId}`);
        return doc.data();
      }
      return undefined;
    } catch (error) {
      console.error(`❌ Error loading session for sessionId: ${sessionId}`, error);
      throw error;
    }
  }

  /**
   * Save session data to Firestore
   * @param {string} sessionId - Session ID
   * @param {object} sessionData - Data to store in the session
   */
  async save(sessionId, sessionData) {
    try {
      console.log("Saving chat history for local session.. ");
      await this.collection.collection('sessions').doc(sessionId).set(sessionData, { merge: true });
      console.log(`✅ Session data saved for sessionId: ${sessionId}`);
    } catch (error) {
      console.error(`❌ Error saving session for sessionId: ${sessionId}`, error);
      throw error;
    }
  }
}

module.exports = FirestoreSessionStore;

// const { Firestore } = require('@google-cloud/firestore');

// // Initialize Firestore
// const firestore = new Firestore();

// /**
//  * FirestoreSessionStore class for session persistence in Genkit
//  */
// class FirestoreSessionStore {
//   /**
//    * @param {string} network - Network type (e.g., 'testnet' or 'mainnet')
//    */
//   constructor(network) {
//     const collectionName =
//       network === 'testnet'
//         ? 'littlefinger-sessions-testnet'
//         : 'littlefinger-sessions-mainnet';
//     this.collection = firestore.collection(collectionName);
//     console.log("Sessionstore initialized.. The collection name is: ", collectionName)
//   }

//   /**
//    * Get session data from Firestore
//    * @param {string} sessionId - Session ID
//    * @returns {object | undefined} - Session data or undefined if not found
//    */
//   async get(sessionId) {
//     try {
//       const doc = await this.collection.doc(sessionId).get();
//       if (doc.exists) {
//         console.log("The user already has an existing session. Loading it now.. ");
//         console.log(`✅ Session data loaded for sessionId: ${sessionId}`);
//         return doc.data();
//       }
//       return undefined;
//     } catch (error) {
//       console.error(`❌ Error loading session for sessionId: ${sessionId}`, error);
//       throw error;
//     }
//   }

//   /**
//    * Save session data to Firestore
//    * @param {string} sessionId - Session ID
//    * @param {object} sessionData - Data to store in the session
//    */
//   async save(sessionId, sessionData) {
//     try {
//       console.log("This is a new user.. Saving a new session now..");
//       await this.collection.doc(sessionId).set(sessionData, { merge: true });
//       console.log(`✅ Session data saved for sessionId: ${sessionId}`);
//     } catch (error) {
//       console.error(`❌ Error saving session for sessionId: ${sessionId}`, error);
//       throw error;
//     }
//   }
// }

// module.exports = FirestoreSessionStore;
