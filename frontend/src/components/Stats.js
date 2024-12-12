import React, { useEffect, useState } from "react";
import { listenForStatsUpdates } from "../utils/firestoreUtils";

export default function Stats() {
  const [stats, setStats] = useState({
    participants: 0,
    breakInAttempts: 0,
    interactionCost: "0.00" ,
  });

  useEffect(() => {
    // Listen for real-time updates from Firestore
    const unsubscribe = listenForStatsUpdates((data) => {

      // Ensure data is in the expected format
      const sanitizedStats = {
        participants: parseInt(data.participants.length || 0, 10), // Default to 0 if missing or invalid
        breakInAttempts: parseInt(data.breakInAttempts || 0, 10), // Default to 0 if missing or invalid
        interactionCost: parseFloat(data.interactionCost || 0).toFixed(2), // Default to "0.00" if missing or invalid
      };
      setStats(sanitizedStats);

    });

    return () => unsubscribe(); // Cleanup the listener when the component unmounts
  }, []);

  return (
    <div className="bg-dark-secondary p-6 rounded-lg shadow-lg mb-4 border border-neon-green">
      <h2 className="text-2xl font-bold text-[#8247e5] mb-2">Stats</h2>
      <ul className="list-none pl-0 text-gray-300 text-sm">
        <li>Total Participants: <span className="text-[#8247e5]">{stats.participants}</span></li>
        <li>Break Attempts: <span className="text-[#8247e5]">{stats.breakInAttempts}</span></li>
        <li>Message Price: <span className="text-[#8247e5]">{stats.interactionCost} POL</span></li>
      </ul>
    </div>
  );
}