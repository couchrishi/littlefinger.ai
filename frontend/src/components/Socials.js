import React from 'react';
import { FaTwitter, FaGithub, FaTelegram } from 'react-icons/fa'; // Import the required icons

const Socials = () => {
  return (
    // <div className="bg-dark-secondary border border-neon-green shadow-md rounded-lg p-4 mt-6 flex justify-around items-center">
    <div className="bg-gradient-to-r from-gray-900 via-black to-gray-900 p-4 rounded-lg shadow-md mt-4 flex justify-around items-center mb-4">
      {/* X (Twitter) */}
      <a
        href="https://x.com/couchrishi"
        target="_blank"
        rel="noopener noreferrer"
        className="text-neon-green hover:text-purple-500 text-3xl"
      >
        <FaTwitter />
      </a>

      {/* GitHub */}
      <a
        href="https://github.com/couchrishi/littlefinger.ai"
        target="_blank"
        rel="noopener noreferrer"
        className="text-neon-green hover:text-purple-500 text-3xl"
      >
        <FaGithub />
      </a>

      {/* Telegram */}
      <a
        href="https://t.me/saib4"
        target="_blank"
        rel="noopener noreferrer"
        className="text-neon-green hover:text-purple-500 text-3xl"
      >
        <FaTelegram />
      </a>

    </div>
  );
};

export default Socials;
