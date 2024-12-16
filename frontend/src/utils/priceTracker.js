
export const getPolToUsdRate = async () => {
    try {
      const url = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=POL&convert=USD'
      const options = {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'X-CMC_PRO_API_KEY': 'd8c23299-30ca-4801-8295-36e14b34c437'
        }
      };

    const data = fetch(url, options)
        .then(res => res.json())
        .then(json => console.log(json))
        .catch(err => console.error(err));

      console.log("Response from coingecko: ", data);
      const usdRate = data.pol.usd;
      console.log("The new POL to USD rate: ", usdRate)
      return usdRate;
    } catch (error) {
      console.error('❌ Error fetching POL to USD rate:', error);
      return 0; // Return 0 to avoid breaking the app
    }
  };
  

