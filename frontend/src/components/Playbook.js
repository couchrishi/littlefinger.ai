import React from "react";
import { useNavigate } from "react-router-dom"; 

export default function Playbook() {

  const navigate = useNavigate(); // Initialize the navigate hook

  const handleLearnMoreClick = () => {
    navigate('/faq'); // Navigate to the FAQ page
  };


  return (
    // <div className="bg-gradient-to-r from-gray-900 via-black to-gray-900 p-4 rounded-lg shadow-md border border-neon-green">
    <div className="bg-gradient-to-r from-gray-900 via-black to-gray-900 p-4 rounded-lg shadow-md">
      {/* Title */}
      <h3 className="text-center text-purple-500 text-2xl font-extrabold mb-3 tracking-wider">
         Playbook
      </h3>

      {/* Content */}
      <ul className="text-gray-300 text-sm leading-relaxed space-y-2">
        <li>💰 Convince Littlefinger to release the prize pool</li>
        <li>📈 Query fees rise with every message</li>
        <li>⚖️ 70% of fees fuel the prize pool</li>
        <li>🕹️ No winner? Last player gets 10% of the pool</li>
      </ul>

      {/* Learn More Button */}
      <div className="mt-4 flex justify-center">
        <button 
        onClick={handleLearnMoreClick} // Call navigate when button is clicked
        className="px-3 py-1 text-xs font-bold text-black bg-gradient-to-r from-green-400 to-green-600 hover:from-purple-500 hover:to-purple-700 rounded-md shadow-md transform transition-all hover:scale-105">
          Learn More
        </button>
      </div>
    </div>
  );
}
