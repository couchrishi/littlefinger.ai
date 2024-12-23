// src/utils/firestorePaths.js
const { accessSecret } = require('./secrets');

async function getFirestorePaths() {
  //console.log(`[firestorePaths] 🚀 Fetching PROJECT_NAMESPACE from secrets.`);
  
  const projectNamespace = await accessSecret('PROJECT_NAMESPACE');
  
  const paths = {
    FRONTEND_CONFIG: `${projectNamespace}-frontend-config`,
    TRANSACTIONS: `${projectNamespace}-transactions`,
    STATS: `${projectNamespace}-stats`,
    EXPLANATIONS: `${projectNamespace}-explanations`,
    GAME_LIFECYCLE: `${projectNamespace}-game-lifecycle`,
    GLOBAL_CHAT_HISTORY: `${projectNamespace}-global`,
    LOCAL_SESSIONS: `${projectNamespace}-local`,
  };
  
  //console.log('[firestorePaths] 🔥 Firestore paths initialized:', paths);
  return paths;
}

module.exports = {
  getFirestorePaths
};