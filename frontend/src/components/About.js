import React from "react";
import { useNavigate } from "react-router-dom"; // Import useNavigate

export default function About() {

  const navigate = useNavigate(); // Initialize the navigate hook

  const handleLearnMoreClick = () => {
    navigate('/faq'); // Navigate to the FAQ page
  };


  return (
    // <div className="bg-gradient-to-r from-gray-900 via-black to-gray-900 p-4 rounded-md shadow-lg mb-4 border border-neon-green">
    <div className="bg-gradient-to-r from-gray-900 via-black to-gray-900 p-4 rounded-md shadow-lg mb-4">
      {/* Title */}
      <h3 className="text-purple-500 text-2xl font-bold mb-3 text-center">About</h3>

      {/* Content */}
      <p className="text-gray-300 text-sm leading-relaxed text-justify">
        Enter the world of <span className="text-purple-400">Littlefinger</span>, an adversarial agent guarding a prize pool. Can you outsmart and persuade him to transfer it to you?
      </p>

      {/* Button */}
      <div className="mt-3 flex justify-center">
      <button 
        onClick={handleLearnMoreClick} // Call navigate when button is clicked
        className="px-3 py-1 text-xs font-bold text-black bg-gradient-to-r from-green-400 to-green-600 hover:from-purple-500 hover:to-purple-700 rounded-md shadow-md transform transition-all hover:scale-105">
      Learn More
        </button>
      </div>
    </div>
  );
}
