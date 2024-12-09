const admin = require("firebase-admin");

// Use application default credentials for Google Cloud Run or local development
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault() // No need for serviceAccountKey.json
  });
}

const firestore = admin.firestore();

module.exports = { admin, firestore };
