# Dockerfile

# Use Node.js 18 as the base image
FROM node:18

# Set the working directory
WORKDIR /app

# Copy only the necessary files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the source code
COPY . .

# Expose the port Cloud Run listens on
EXPOSE 8080

# Start the server
CMD ["npm", "start"]
