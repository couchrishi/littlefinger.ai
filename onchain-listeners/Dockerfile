# Use an official Node.js runtime as a parent image
FROM node:18

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose port 8080 (used by your app)
EXPOSE 8080

# Command to run your server (can be configured via ENTRYPOINT if needed)
CMD ["node", "server.js", "testnet"]
