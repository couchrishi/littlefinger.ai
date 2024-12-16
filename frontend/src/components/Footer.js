import React from "react";
import Gemini_Logo from "../assets/images/gemini.png";

const Footer = () => {
  return (

    // <div className="mt-auto flex flex-col justify-center items-center bg-gradient-to-r from-gray-900 via-black to-gray-900 p-4 rounded-lg shadow-md">
    <div className="mt-auto flex flex-col justify-center items-center text-neon-green text-sm p-2">

      {/* Google Gemini Section */}
      <div className="flex items-center mb-0">
        <p className="text-neon-green text-xs mr-2 z-10">
          Powered by 
        </p>
        <img
          src={Gemini_Logo}
          alt="Google Gemini Logo"
          className="inline-block max-w-[80px] max-h-[100px] object-contain -ml-0 z-0" // Image size only

          //className="w-[100px] h-[60px] object-contain" // Adjust size as needed
        />
      </div>

      {/* All Rights Reserved Section
      <div className="text-xs text-gray-400 mt-2">
        © {new Date().getFullYear()} All rights reserved.
      </div> */}
    </div>
  );
};

export default Footer;
