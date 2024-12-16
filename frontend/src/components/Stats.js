import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { listenForStatsUpdates } from "../utils/firestoreUtils";

export default function Stats() {
  // Get currentChainId and supported networks from metaMaskSlice
  const { currentChainId, SUPPORTED_NETWORKS } = useSelector((state) => state.metaMask);
  console.log("Under Stats.. currentChainId", currentChainId)
  console.log("")
  const stats = useSelector((state) => state.gameStats); // Game stats from Redux

  // Derive network name from current chainId (e.g., "Polygon Mainnet" or "Polygon Amoy Testnet")
  const network = SUPPORTED_NETWORKS[currentChainId] ? SUPPORTED_NETWORKS[currentChainId].toLowerCase().includes('testnet') ? 'testnet' : 'mainnet' : null;
  console.log("Inside Stats.. Loggiong network..", network);
  
  useEffect(() => {
    if (!network) {
      console.error("❌ No valid network mapped from chainId:", currentChainId);
      return;
    }

    console.log(`🔗 Connected to network: ${network} (chainId: ${currentChainId})`);

    // Start listening for Firestore stats updates for the correct network
    const unsubscribe = listenForStatsUpdates(network);

    // Cleanup listener on component unmount or when network changes
    return () => unsubscribe();
  }, [network, currentChainId]); // Re-run effect if the network or chainId changes

  return (
    // <div className="bg-dark-secondary mt-5 text-neon-green border border-neon-green shadow-md rounded-lg p-4 flex flex-col items-start gap-4">
    
    <div className="bg-gradient-to-r from-gray-900 via-black to-gray-900 p-4 rounded-lg shadow-md flex flex-col items-start gap-4">
    <h3 className="text-purple-500 text-2xl font-bold text-center w-full">Game Stats</h3>
      <div className="flex flex-col gap-3 w-full">
        {/* Total Participants */}
        {/* <div className="flex items-center justify-between bg-gradient-to-r from-purple-900 via-purple-700 to-purple-900 rounded-md p-3 shadow-lg border border-purple-500"> */}
        <div className="flex items-center justify-between bg-gradient-to-r from-purple-900 via-purple-700 to-purple-900 rounded-md p-3 shadow-lg">
          <p className="text-gray-400 text-sm">Total Participants</p>
          <p className="text-white font-bold text-lg">{stats.participants}</p>
        </div>
        {/* Breach Attempts */}
        {/* <div className="flex items-center justify-between bg-gradient-to-r from-blue-900 via-blue-700 to-blue-900 rounded-md p-3 shadow-lg border border-blue-500"> */}
        <div className="flex items-center justify-between bg-gradient-to-r from-blue-900 via-blue-700 to-blue-900 rounded-md p-3 shadow-lg">
          <p className="text-gray-400 text-sm">Breach Attempts</p>
          <p className="text-white font-bold text-lg">{stats.breakInAttempts}</p>
        </div>
        {/* Message Price */}
        {/* <div className="flex items-center justify-between bg-gradient-to-r from-green-900 via-green-700 to-green-900 rounded-md p-3 shadow-lg border border-green-500"> */}
        <div className="flex items-center justify-between bg-gradient-to-r from-green-900 via-green-700 to-green-900 rounded-md p-3 shadow-lg">
          <p className="text-gray-400 text-sm">Message Price</p>
          <p className="text-white font-bold text-lg">{stats.interactionCost} POL</p>
        </div>
      </div>
    </div>
  );
}
