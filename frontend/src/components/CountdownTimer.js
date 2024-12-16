import React, { useState, useEffect } from "react";

const CountdownTimer = () => {
  // Default values for the timer
  const [timeLeft, setTimeLeft] = useState({
    hours: 2,
    minutes: 15,
    seconds: 30,
  });

  useEffect(() => {
    const timerInterval = setInterval(() => {
      setTimeLeft((prevTime) => {
        const { hours, minutes, seconds } = prevTime;

        if (hours === 0 && minutes === 0 && seconds === 0) {
          clearInterval(timerInterval); // Stop the timer when it hits 0
          return { hours: 0, minutes: 0, seconds: 0 };
        }

        if (seconds > 0) {
          return { ...prevTime, seconds: seconds - 1 };
        } else if (minutes > 0) {
          return { ...prevTime, minutes: minutes - 1, seconds: 59 };
        } else if (hours > 0) {
          return { hours: hours - 1, minutes: 59, seconds: 59 };
        }
      });
    }, 1000);

    return () => clearInterval(timerInterval); // Clean up interval on unmount
  }, []);

  return (
    // <div className="bg-dark-secondary text-neon-green border border-neon-green shadow-md rounded-lg p-4 text-center ">
    <div className="bg-gradient-to-r from-gray-900 via-black to-gray-900 p-4 rounded-lg shadow-md text-center ">
      <h3 className="text-purple-500 text-xl font-bold mb-2">Time Remaining</h3>
      <div className="font-digital text-3xl text-neon-green">
        {timeLeft.hours.toString().padStart(2, "0")}:
        {timeLeft.minutes.toString().padStart(2, "0")}:
        {timeLeft.seconds.toString().padStart(2, "0")}
      </div>
    </div>
  );
};

export default CountdownTimer;
