const isLocal = process.env.NODE_ENV === "development";

const config = {
  API_BASE_URL: isLocal
    ? "http://127.0.0.1:5001/saib-ai-playground/us-central1"
    : "https://us-central1-saib-ai-playground.cloudfunctions.net",
};

export default config;
