import React, { useEffect, useState } from "react";
import { listenForStatsUpdates } from "../utils/firestoreUtils";

export default function PrizePool() {
  const [prizePool, setPrizePool] = useState(0); // Start with 0

  useEffect(() => {
    // Listen for real-time updates from Firestore for prizePool
    const unsubscribe = listenForStatsUpdates((data) => {
      if (data.currentPrizePool !== undefined) {
         // Ensure `prizePool` is a number
        const poolValue = parseFloat(data.currentPrizePool);
        setPrizePool(isNaN(poolValue) ? 0 : poolValue); // Default to 0 if invalid
        //setPrizePool(data.currentPrizePool);
      }
    });

    return () => unsubscribe(); // Cleanup the listener when the component unmounts
  }, []);

  return (
    <div className="bg-dark-bg p-6 rounded-lg shadow-lg mb-4 border border-neon-green">
      <h2 className="text-3xl font-semibold text-[#8247e5]">Prize Pool</h2>
      <p className="text-5xl font-bold text-red">
        {prizePool.toFixed(2)} POL
      </p>
      <p className="text-xs text-gray-400 mt-2">
        70% of query fees contribute to this pool. Make your moves wisely.
      </p>
    </div>
  );
}
