const fetch = require('node-fetch'); // Import fetch for Node.js

/**
 * 🔥 Get the current POL to USD rate from CoinMarketCap
 */
async function getPolToUsdRate() {
  try {
    const url = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=POL&convert=USD';
    const options = {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'X-CMC_PRO_API_KEY': 'd8c23299-30ca-4801-8295-36e14b34c437' // 🔥 Replace this with your actual API key
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

// Call the function to test it
getPolToUsdRate()
  .then(rate => console.log(`✅ Test completed. Final POL/USD Rate: ${rate}`))
  .catch(error => console.error('❌ Test failed:', error));
