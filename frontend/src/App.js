import React, { useState } from "react";
//import React from "react";
import Header from "./components/Header";
import ChatBox from "./components/ChatBox";
import PrizePool from "./components/PrizePool";
import About from "./components/About";
import TLDR from "./components/TLDR";
import Stats from "./components/Stats";

function App() {
  const [prizePool, setPrizePool] = useState(0);
  
  return (
    <div className="bg-gradient-to-b from-dark-bg via-dark-secondary to-black min-h-screen text-neon-green">
      <Header />
      <main className="container mx-auto p-1 flex flex-wrap items-start">
        <div className="w-full md:w-1/4 p-4 flex flex-col justify-start">
          <div className="text-neon-green text-5xl font-bold mt-[-80px] mb-8 text-center">
            Littlefinger
          </div>
          <About />
          <Stats />
        </div>
        <div className="w-full md:w-1/2 p-4 flex flex-col justify-start">
            <PrizePool amount={prizePool} /> 
            <ChatBox />
        </div>
        <div className="w-full md:w-1/4 p-4 flex flex-col justify-start">
          <TLDR />
        </div>
      </main>
    </div>
  );
}

export default App;
