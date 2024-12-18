   sudo apt update
   sudo apt install nodejs npm
   sudo npm install -g pm2
   pm2 start server.js --name onchain-listeners -- testnet