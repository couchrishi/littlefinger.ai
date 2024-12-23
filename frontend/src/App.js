import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

//import React from "react";
import Header from "./components/Header";
import ChatBox from "./components/ChatBox";
import PrizePool from "./components/PrizePool";
import About from "./components/About";
import Playbook from "./components/Playbook";
import Stats from "./components/Stats";
import Faq from './components/Faq.js';
import Terms from './components/Terms.js';
import Legend from './components/Legend.js';
import CountdownTimer from "./components/CountdownTimer";
import Socials from "./components/Socials"; 
import Footer from "./components/Footer";


function App() {

  return (
    <Router>
      <div className="bg-gradient-to-b from-dark-bg via-dark-secondary to-black min-h-screen text-neon-green">
        <Header />
        <main className="container mx-auto p-1 flex flex-wrap items-start">
          <Routes>
            {/* Home Page ***/}
            <Route
              path="/"
              element={
                <div className="flex flex-wrap">
                  <div className="w-full md:w-1/4 p-4 flex flex-col justify-start">
                    <div className="text-neon-green text-5xl font-bold mt-[-80px] mb-8 text-center">
                      Littlefinger
                    </div>
                    <div className="gap-3 mb-0">
                    <About />
                    <Stats  />
                    <Socials /> {/* Add the CountdownTimer below countdown timer */}
                    </div>
                    <Footer/>
                  </div>
                  <div className="w-full md:w-1/2 p-4 flex flex-col justify-start ">
                    <ChatBox />
                  </div>
                  <div className="w-full md:w-1/4 p-4 flex flex-col justify-start gap-4">
                    <PrizePool />
                    <Playbook />
                    <CountdownTimer /> {/* Add the CountdownTimer below tldr */}

                  </div>
                </div>
              }
            />
            {/* About Page */}
            <Route path="/about" element={<Legend />} />
            {/* FAQ Page */}
            <Route path="/faq" element={<Faq />} />
            {/* Stats Page */}
            <Route path="/terms" element={<Terms />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
