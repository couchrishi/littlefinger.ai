const isLocal = process.env.NODE_ENV === "development";

const config = {
  API_BASE_URL: isLocal
    ? "http://127.0.0.1:3001/api/"
    : "https://littlefinger-backend-isolated-288406675721.us-central1.run.app/api/",
    
};
export default config;

