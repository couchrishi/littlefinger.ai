const { utils } = require('ethers');

console.log("QueryFeePaid:", utils.id('QueryFeePaid(address,uint256,uint256,uint256,uint256)'));
console.log("NextQueryFee:", utils.id('NextQueryFee(uint256,uint256)'));
console.log("CurrentPrizePool:", utils.id('CurrentPrizePool(uint256)'));
console.log("TotalQueries:", utils.id('TotalQueries(uint256)'));
console.log("GameStarted:", utils.id('GameStarted(uint256)'));
