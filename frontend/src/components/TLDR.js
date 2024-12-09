import React from "react";

export default function TLDR() {
  return (
    <div className="bg-dark-secondary p-6 rounded-lg shadow-lg mb-4 border border-neon-green">
      <h2 className="text-2xl font-bold text-[#8247e5] mb-2">Council's Summary</h2>
      <ul className="list-disc pl-5 text-gray-300">
        <li>Convince Littlefinger to release the prize pool.</li>
        <li>Query fees increase with every message.</li>
        <li>70% of query fees contribute to the prize pool.</li>
        <li>Last player gets 10% if the game ends without a winner.</li>
      </ul>
    </div>
  );
}
