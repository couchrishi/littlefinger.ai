import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux"; // Import the useDispatch hook
import { login } from "../redux/slices/authSlice"; // Import the login action

import config from "../config";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const dispatch = useDispatch(); // Initialize the dispatch function

  const handleLogin = async (e) => {
    e.preventDefault(); // Prevent form reload
    try {
      const response = await fetch(`${config.API_BASE_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (data.success) {
        console.log("Login successful");
        dispatch(login()); // Dispatch the login action to update Redux state
        navigate("/", { replace: true }); // Redirect to home page
      } else {
        console.log("Login failed");
        setError(data.message || "Invalid credentials");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-b from-dark-bg via-dark-secondary to-black">
      <div className="text-center">
        {/* Logo */}
        <img
          src="/logo512.png"
          alt="Game Logo"
          className="w-24 h-24 mx-auto mb-6"
        />

        {/* Form */}
        <form
          onSubmit={handleLogin}
          className="bg-dark-secondary p-8 rounded shadow-md text-neon-green"
        >
          <h1 className="text-3xl font-bold mb-4">Enter</h1>
          {error && <p className="text-red-500 mb-4">{error}</p>}
          <div className="mb-4">
            <label className="block text-sm mb-2"></label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-2 bg-black border border-neon-green rounded"
              placeholder="Username"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm mb-2"></label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 bg-black border border-neon-green rounded"
              placeholder="Password"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 bg-neon-green text-dark-secondary rounded font-bold"
          >
            Access the Realm
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
