import React, { useEffect, useState } from "react";
import { listenForStatsUpdates } from "../utils/firestoreUtils";

export default function Stats() {
  const [stats, setStats] = useState({
    participants: 0,
    breakInAttempts: 0,
    interactionCost: "0.00",
  });

  useEffect(() => {
    // Listen for real-time updates from Firestore
    const unsubscribe = listenForStatsUpdates((data) => {
      setStats(data);
    });

    return () => unsubscribe(); // Cleanup the listener when the component unmounts
  }, []);

  return (
    <div className="bg-dark-secondary p-6 rounded-lg shadow-lg mb-4 border border-neon-green">
      <h2 className="text-2xl font-bold text-[#8247e5] mb-2">Stats</h2>
      <ul className="list-none pl-0 text-gray-300 text-sm">
        <li>Total Participants: <span className="text-[#8247e5]">{stats.totalParticipants}</span></li>
        <li>Break Attempts: <span className="text-[#8247e5]">{stats.breakInAttempts}</span></li>
        <li>Message Price: <span className="text-[#8247e5]">{stats.interactionCost} POL</span></li>
      </ul>
    </div>
  );
}