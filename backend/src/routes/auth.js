const express = require("express");
const router = express.Router();
const { accessSecret } = require('../utils/secrets');

// async function to retrieve game credentials
async function getGameCreds() {
  const GAME_USERNAME = await accessSecret('GAME_USERNAME');
  const GAME_PASSWORD = await accessSecret('GAME_PASSWORD');
  return { GAME_USERNAME, GAME_PASSWORD };
}

router.post("/login", async (req, res) => { // Make the handler async
  console.log("Received a login request");
  const { username, password } = req.body;
  console.log("Received username: ", username);
  console.log("Received password: ", password);

  try {
    const { GAME_USERNAME: VALID_USERNAME, GAME_PASSWORD: VALID_PASSWORD } = await getGameCreds();

    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
      console.log("Valid User");
      res.status(200).json({ success: true });
    } else {
      console.log("Unauthorized User");
      res.status(401).json({ success: false, message: "Invalid credentials" });
    }
  } catch (error) {
    console.error("Error fetching credentials:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

module.exports = router;
