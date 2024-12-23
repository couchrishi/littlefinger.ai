import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";

const CountdownTimer = () => {
  const idleSince = useSelector((state) => state.gameState.idleSince); // Get from Redux
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (!idleSince || isNaN(idleSince)) return;

    const idleSinceInMs = idleSince * 1000; // Convert seconds to milliseconds

    const interval = setInterval(() => {
      const currentTime = Date.now();
      const timeDifference = idleSinceInMs + 7 * 24 * 60 * 60 * 1000 - currentTime; // 7 days in milliseconds

      if (timeDifference <= 0) {
        clearInterval(interval);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDifference % (1000 * 60)) / 1000);

        if (days > 0) {
          setTimeLeft({ days, hours, minutes });
        } else {
          setTimeLeft({ hours, minutes, seconds });
        }
      }
    }, 1000);

    return () => clearInterval(interval); // Cleanup interval on unmount
  }, [idleSince]); // Re-run effect when idleSince changes

  return (
    <div className="bg-gradient-to-r from-gray-900 via-black to-gray-900 p-4 rounded-lg shadow-md text-center">
      <h3 className="text-purple-500 text-xl font-bold mb-2">Time Remaining</h3>
      <div className="font-digital text-2xl text-neon-green">
        {timeLeft.days > 0 ? (
          // Show days, hours, minutes if days > 0
          `${timeLeft.days}d ${timeLeft.hours.toString().padStart(2, "0")}h ${timeLeft.minutes.toString().padStart(2, "0")}m`
        ) : (
          // Show hours, minutes, seconds if it's the last day
          `${timeLeft.hours.toString().padStart(2, "0")}h ${timeLeft.minutes.toString().padStart(2, "0")}m ${timeLeft.seconds.toString().padStart(2, "0")}s`
        )}
      </div>
    </div>
  );
};

export default CountdownTimer;
