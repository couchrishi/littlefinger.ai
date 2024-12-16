const { updateTransactionStatus, updateStats } = require('../utils/firestoreUtils');
const ethers = require('ethers');
const { getNetworkSecrets } = require("../utils/secrets");


/**
 * 🔥 Handle QueryFeePaid Event
 */

async function handleQueryFeePaid(network, contractAddress, player, feeAmount, queryID, blockNumber, timestamp, event) {
  try {

    console.log(" \n🔥 QueryFeePaid Event Detected");

    const transactionHash = event?.log?.transactionHash || null;
    const transactionReceiptStatus = event?.receipt?.status === 1 ? 'success' : 'failure';

    console.log(" 🕹️ Player Address:", player);
    console.log(" 🧾 Query ID:", queryID);
    console.log(" 🔗 Transaction Hash:", transactionHash || "❌ No Transaction Hash");
    console.log(" 🧾 Transaction Receipt Status:", transactionReceiptStatus);

    if (!transactionHash) {
      console.warn(`⚠️ Transaction hash is missing for QueryID: ${queryID}`);
    }

    console.log(" Updating Firestore under littlefinger-transactions/{network}/{queryID}");
    
    // ✅ Update Firestore under littlefinger-transactions/{network}/{queryID}
    await updateTransactionStatus(network, queryID, transactionHash, transactionReceiptStatus);
  } catch (error) {
    console.error("❌ Error processing QueryFeePaid event:", error);
  }
}

/**
 * 🔥 Handle NextQueryFee Event
 */
async function handleNextQueryFee(network, contractAddress, nextFee, currentCount) {
  try {
    console.log(" \n🔥 NextQueryFee Event Detected");

    const feeInEth = ethers.formatUnits(nextFee, 18);
    const feeAsNumber = parseFloat(feeInEth);
    const countAsNumber = parseInt(currentCount.toString(), 10);

    console.log(" 📈 Next Query Fee (in ETH):", feeAsNumber);
    console.log(" 🧮 Current Count:", countAsNumber);

    await updateStats(network, "interactionCost", feeAsNumber);
  } catch (error) {
    console.error("❌ Error processing NextQueryFee event:", error);
  }
}

/**
 * 🔥 Handle CurrentPrizePool Event
 */
async function handleCurrentPrizePool(network, contractAddress, prizePool) {
  try {
    console.log(" \n🔥 CurrentPrizePool Event Detected");

    const prizePoolInEth = ethers.formatUnits(prizePool, 18);
    const prizePoolAsNumber = parseFloat(prizePoolInEth);

    console.log(" 🏦 Current Prize Pool (in ETH):", prizePoolAsNumber);

    await updateStats(network, "currentPrizePool", prizePoolAsNumber);

    const usdRate = await getPolToUsdRate(network);
    if (!usdRate) {
      console.warn('⚠️ Could not fetch USD rate for POL. Skipping USD calculation.');
    } else {
      // Step 2: Calculate the prize pool in USD
      const prizePoolInUsd = prizePoolAsNumber * usdRate;
      console.log(`💸 Current Prize Pool (in USD): ${prizePoolInUsd.toFixed(2)} USD`);
      
      // Optional: You might want to save the USD value in Firestore or a database
      await updateStats(network, "currentPrizePoolUsd", prizePoolInUsd);
    }

    //await updateStats(network, "currentPrizePool", prizePoolAsNumber);
  } catch (error) {
    console.error("❌ Error processing CurrentPrizePool event:", error);
  }
}

/**
 * 🔥 Handle TotalQueries Event
 */
async function handleTotalQueries(network, contractAddress, queries) {
  try {
    console.log(" \n🔥 TotalQueries Event Detected");

    const breakinAttempts = queries;

    console.log(" 🏦 Total Break-in Attempts:", breakinAttempts);
    await updateStats(network, "breakInAttempts", breakinAttempts);
  } catch (error) {
    console.error("❌ Error processing TotalQueries event:", error);
  }
}

/**
 * 🔥 Get the current POL to USD rate from CoinMarketCap
 */
async function getPolToUsdRate(network) {
  try {
    const { CMC_API_KEY } = await getNetworkSecrets(network);
    const url = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=POL&convert=USD';
    const options = {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        //'X-CMC_PRO_API_KEY': 'd8c23299-30ca-4801-8295-36e14b34c437' // 🔥 Replace this with your actual API key
        'X-CMC_PRO_API_KEY': CMC_API_KEY 
      }
    };

    const response = await fetch(url, options);
    const data = await response.json();

    if (!data || !data.data || !data.data.POL || !data.data.POL.quote || !data.data.POL.quote.USD) {
      console.warn('⚠️ USD rate not found for POL. API response:', data);
      return 0;
    }

    const usdRate = data.data.POL.quote.USD.price;
    console.log('💸 POL/USD Rate:', usdRate);
    return usdRate;

  } catch (error) {
    console.error('❌ Error fetching POL to USD rate:', error);
    return 0; // Return 0 to avoid breaking the app
  }
}

module.exports = {
  handleQueryFeePaid,
  handleNextQueryFee,
  handleCurrentPrizePool,
  handleTotalQueries
};
