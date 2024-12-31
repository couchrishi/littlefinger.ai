import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
//import { useEffect, useState } from "react";
import { useSelector } from "react-redux"; // Import the useSelector hook
import Header from "./components/Header";
import ChatBox from "./components/ChatBox";
import PrizePool from "./components/PrizePool";
import About from "./components/About";
import Playbook from "./components/Playbook";
import Stats from "./components/Stats";
import Faq from "./components/Faq";
import Terms from "./components/Terms";
import Legend from "./components/Legend";
import CountdownTimer from "./components/CountdownTimer";
import Socials from "./components/Socials";
import Footer from "./components/Footer";
import Login from "./components/Login";

function App() {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated); // Access auth state from Redux

  
  // const [isAuthenticated, setIsAuthenticated] = useState(false);
  // Clear authentication status on every reload
  // useEffect(() => {
  //   console.log("Forcing login on every reload");
  //   localStorage.removeItem("isAuthenticated"); // Always clear authentication status
  //   setIsAuthenticated(false); // Reset the state
  // }, []);

  return (
    <Router>
      <div className="bg-gradient-to-b from-dark-bg via-dark-secondary to-black min-h-screen text-neon-green">
        {isAuthenticated ? (
          <>
            <Header />
            <main className="container mx-auto p-1 flex flex-wrap items-start">
              <Routes>
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
                          <Stats />
                          <Socials />
                          <Footer />
                        </div>
                      </div>
                      <div className="w-full md:w-1/2 p-4 flex flex-col justify-start">
                        <ChatBox />
                      </div>
                      <div className="w-full md:w-1/4 p-4 flex flex-col justify-start gap-4">
                        <PrizePool />
                        <Playbook />
                        <CountdownTimer />
                      </div>
                    </div>
                  }
                />
                <Route path="/about" element={<Legend />} />
                <Route path="/faq" element={<Faq />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </main>
          </>
        ) : (
          <Routes>
            {/* <Route path="/login" element={<Login setIsAuthenticated={setIsAuthenticated} />} /> */}
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        )}
      </div>
    </Router>
  );
}

export default App;
