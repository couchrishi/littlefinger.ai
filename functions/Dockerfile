# Base image with Node.js 18
FROM node:18

# Set the working directory
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy the source code
COPY . .

# Expose port 8080 (Cloud Functions default)
EXPOSE 8080

# Start the function framework
CMD ["npx", "firebase-functions-framework", "--target", "chatWithAI"]
