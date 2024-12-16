# Use Node.js to build the app
FROM node:16-alpine AS build

# Create app directory in the container
WORKDIR /usr/src/app

# Copy the package.json and package-lock.json files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the app's source code
COPY . .

# Build the React app for production
RUN npm run build

# Use a lightweight Nginx image to serve the app
FROM nginx:alpine

# Copy the built files from the build stage
COPY --from=build /usr/src/app/build /usr/share/nginx/html

# Expose the port that Cloud Run will use
EXPOSE 8080

# Run Nginx to serve the app
CMD ["nginx", "-g", "daemon off;"]
