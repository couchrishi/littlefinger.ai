
const { updateGameLifecycleInfo } = require('../utils/firestoreUtils');

/**
 * 🔥 Handle the GameStarted event.
 * 
 * @param {string} network - The network (e.g., 'testnet' or 'mainnet')
 * @param {string} contractAddress - The contract address representing the game
 * @param {string} eventTimestamp - The timestamp of the event
 */
async function handleGameStarted(network, contractAddress, eventTimestamp) {
  try {
    console.log(`[handleGameStarted] 🎮 GameStarted event detected for network: ${network}`);
    console.log(`[handleGameStarted] 🕹️ Contract Address: ${contractAddress}`);
    console.log(`[handleGameStarted] 📅 Event Timestamp: ${eventTimestamp}`);
    
    // 🔥 Call the helper to update the Firestore lifecycle information
    const gameStatus = {
      status: "started",
      startedAt: eventTimestamp,
      idleSince: eventTimestamp
    };

    await updateGameLifecycleInfo(network, contractAddress, gameStatus);
    console.log(`[handleGameStarted] ✅ Updated lifecycle info for gameID: ${contractAddress} with status:`, gameStatus);
    
  } catch (error) {
    console.error(`[handleGameStarted] ❌ Error in handling GameStarted for network: ${network}`, error);
    throw error; // Bubble the error up for better error tracking
  }
}

/**
 * Update Firestore for GameEnded event
 */
// async function handleGameEnded(network, contractAddress, currentTimestamp) {
//   try {
//     const docRef = firestore.collection('Littlefinger-game-lifecycle').doc(network);
//     await docRef.set({
//       gameID: contractAddress,
//       gameStatus: {
//         status: 'ended',
//         endedAt: currentTimestamp
//       },
//       lastModifiedAt: new Date().toISOString()
//     }, { merge: true });
//     console.log('[game lifecycle✅ GameEnded Firestore update successful');
//   } catch (error) {
//     console.error('❌ Error updating Firestore for GameEnded:', error);
//   }
// }

// /**
//  * Update Firestore for PrizeTransferApproved event
//  */
// async function handlePrizeTransferApproved(network, contractAddress, recipient, amount) {
//   try {
//     const docRef = firestore.collection('Littlefinger-game-lifecycle').doc(network);
//     await docRef.set({
//       gameID: contractAddress,
//       gameStatus: {
//         status: 'ended',
//         endReason: 'won',
//         idleSince: new Date().toISOString()
//       },
//       gameWinners: {
//         winnerWalletAddress: recipient,
//         winningPrizeAmount: amount
//       },
//       lastModifiedAt: new Date().toISOString()
//     }, { merge: true });
//     console.log('[game lifecycle✅ PrizeTransferApproved Firestore update successful');
//   } catch (error) {
//     console.error('❌ Error updating Firestore for PrizeTransferApproved:', error);
//   }
// }

// /**
//  * Update Firestore for LastPlayerRewardAfterGameExhaustion event
//  */
// async function handleLastPlayerRewardAfterGameExhaustion(network, contractAddress, lastPlayer, lastPlayerReward) {
//   try {
//     const docRef = firestore.collection('Littlefinger-game-lifecycle').doc(network);
//     await docRef.set({
//       gameID: contractAddress,
//       gameStatus: {
//         status: 'ended',
//         endReason: 'exhausted',
//         idleSince: new Date().toISOString()
//       },
//       gameWinners: {
//         lastPlayerWalletAddress: lastPlayer,
//         lastPlayerReward: lastPlayerReward,
//         transactionStatus: ''
//       },
//       lastModifiedAt: new Date().toISOString()
//     }, { merge: true });
//     console.log('[game lifecycle✅ LastPlayerRewardAfterGameExhaustion Firestore update successful');
//   } catch (error) {
//     console.error('❌ Error updating Firestore for LastPlayerRewardAfterGameExhaustion:', error);
//   }
// }

// /**
//  * Update Firestore for RestOfThePlayersRewardAfterGameExhaustion event
//  */
// async function handleRestOfThePlayersRewardAfterGameExhaustion(network, contractAddress, remainingPool) {
//   try {
//     const docRef = firestore.collection('Littlefinger-game-lifecycle').doc(network);
//     await docRef.set({
//       gameID: contractAddress,
//       gameStatus: {
//         status: 'ended',
//         endReason: 'exhausted',
//         idleSince: new Date().toISOString()
//       },
//       gameWinners: {
//         totalRewardDistributed: remainingPool
//       },
//       lastModifiedAt: new Date().toISOString()
//     }, { merge: true });
//     console.log('[game lifecycle✅ RestOfThePlayersRewardAfterGameExhaustion Firestore update successful');
//   } catch (error) {
//     console.error('❌ Error updating Firestore for RestOfThePlayersRewardAfterGameExhaustion:', error);
//   }
// }

// /**
//  * Update Firestore for GameResetByOwner event
//  */
// async function handleGameResetByOwner(network, contractAddress, currentTimestamp) {
//   try {
//     const docRef = firestore.collection('Littlefinger-game-lifecycle').doc(network);
//     await docRef.set({
//       gameID: contractAddress,
//       gameStatus: {
//         status: 'started',
//         startedAt: currentTimestamp
//       },
//       lastModifiedAt: new Date().toISOString()
//     });
//     console.log('[game lifecycle✅ GameResetByOwner Firestore update successful');
//   } catch (error) {
//     console.error('❌ Error updating Firestore for GameResetByOwner:', error);
//   }
// }


module.exports = {
  handleGameStarted,
  //handleGameEnded,
  //handlePrizeTransferApproved,
  //handleLastPlayerRewardAfterGameExhaustion,
  //handleRestOfThePlayersRewardAfterGameExhaustion,
  //handleGameResetByOwner
};
