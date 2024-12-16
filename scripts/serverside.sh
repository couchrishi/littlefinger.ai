#!/bin/bash

# Configuration
PROJECT_DIR="$HOME/littlefinger.ai/onchain-listeners"  # Update this if the path is different
BRANCH="main"  # Change this to your default branch if it's different
PM2_APP_NAME="onchain-listeners"
NETWORK="testnet"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔄 Starting update for Onchain Listeners...${NC}"

# Step 1: Navigate to project directory
if [ -d "$PROJECT_DIR" ]; then
  cd "$PROJECT_DIR"
  echo -e "${GREEN}📁 Changed directory to $PROJECT_DIR${NC}"
else
  echo -e "${RED}❌ Project directory not found: $PROJECT_DIR${NC}"
  exit 1
fi

# Step 2: Pull latest changes from GitHub
echo -e "${GREEN}📡 Pulling latest changes from GitHub...${NC}"
git fetch origin $BRANCH
git reset --hard origin/$BRANCH

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Successfully pulled latest changes from GitHub${NC}"
else
  echo -e "${RED}❌ Failed to pull changes from GitHub${NC}"
  exit 1
fi

# Step 3: Install Node.js dependencies
echo -e "${GREEN}📦 Installing dependencies...${NC}"
npm install

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Dependencies installed successfully${NC}"
else
  echo -e "${RED}❌ Failed to install dependencies. Check your package.json or network connection${NC}"
  exit 1
fi

# Step 4: Stop existing pm2 instance (if running)
echo -e "${GREEN}🛑 Stopping existing pm2 instance for $PM2_APP_NAME...${NC}"
pm2 delete $PM2_APP_NAME || echo -e "${RED}⚠️ No existing pm2 instance found for $PM2_APP_NAME. Continuing...${NC}"

# Step 5: Start a new pm2 process
echo -e "${GREEN}🚀 Starting pm2 for onchain-listeners on $NETWORK...${NC}"
pm2 start server.js --name "$PM2_APP_NAME" -- $NETWORK

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ pm2 process started successfully with name $PM2_APP_NAME${NC}"
else
  echo -e "${RED}❌ Failed to start pm2 process for $PM2_APP_NAME${NC}"
  exit 1
fi

# Step 6: Save pm2 process list to persist on system reboot
echo -e "${GREEN}💾 Saving pm2 process list...${NC}"
pm2 save

echo -e "${GREEN}🎉 Update complete! Onchain Listeners are running on PM2 as '$PM2_APP_NAME'.${NC}"
