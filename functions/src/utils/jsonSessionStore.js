const fs = require("fs").promises;
const path = require("path");
const { SessionStore } = require("genkit");

class JsonSessionStore {
  constructor(storageDir = "sessions") {
    this.storageDir = storageDir;
  }

  async get(sessionId) {
    try {
      const filePath = path.join(this.storageDir, `${sessionId}.json`);
      const data = await fs.readFile(filePath, { encoding: "utf8" });
      return JSON.parse(data);
    } catch (error) {
      return undefined; // If the file doesn't exist, return undefined
    }
  }

  async save(sessionId, sessionData) {
    try {
      const filePath = path.join(this.storageDir, `${sessionId}.json`);
      const data = JSON.stringify(sessionData, null, 2);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, data, { encoding: "utf8" });
    } catch (error) {
      console.error("Error saving session data:", error);
    }
  }
}

module.exports = JsonSessionStore;
