
require("dotenv").config();
const path = require('path');
//require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-gas-reporter");
require("solidity-coverage");

//console.log(`🔍 PRIVATE_KEY:`, process.env.PRIVATE_KEY ? "Loaded ✅" : "Not Loaded ❌");
//console.log(`🔍 RPC_URL:`, process.env.RPC_URL ? "Loaded ✅" : "Not Loaded ❌");


module.exports = {
  solidity: "0.8.18",
  networks: {
    polygonAmoy: {
      url: "https://rpc-amoy.polygon.technology/",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },

    gasReporter: {
      enabled: true,
      currency: "USD",
    },
};
