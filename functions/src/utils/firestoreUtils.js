const { Firestore } = require("@google-cloud/firestore");

class FirestoreSessionStore {
  constructor(collectionName = "genkitSessions") {
    this.sessionsRef = new Firestore().collection(collectionName);
  }

  // Retrieve a session from Firestore
  async get(sessionId) {
    try {
      const sessionDoc = await this.sessionsRef.doc(sessionId).get();
      if (!sessionDoc.exists) {
        console.log(`⚠️ No session found for ${sessionId}`);
        return undefined;
      }
      console.log(`📤 Loaded session ${sessionId} from Firestore.`);
      return sessionDoc.data();
    } catch (error) {
      console.error("❌ Error retrieving session from Firestore:", error);
      return undefined;
    }
  }

  // Save a session to Firestore
  async save(sessionId, sessionData) {
    try {
      await this.sessionsRef.doc(sessionId).set(sessionData);
      console.log(`💾 Session ${sessionId} saved to Firestore.`);
    } catch (error) {
      console.error("❌ Error saving session to Firestore:", error);
    }
  }
}

module.exports = FirestoreSessionStore;
