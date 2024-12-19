

//const { ethers } = require('ethers');
const { getNetworkSecrets } = require('./secrets');
const { ethers } = require('ethers');



async function pollTransactionStatus(network, queryID, transactionHash) {
  console.log(`[pollTransactionStatus] 🚀 Polling transaction status: ${transactionHash} for queryID: ${queryID}`);

  const { RPC_URL } = await getNetworkSecrets(network);

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  let attempts = 0;
  const maxAttempts = 3;
  const delay = 1000; // 1 second delay between attempts

  try {
    while (attempts < maxAttempts) {
      attempts++;
      console.log(`[pollTransactionStatus] 🕒 Attempt #${attempts} for transaction: ${transactionHash}`);

      try {
        const receipt = await provider.getTransactionReceipt(transactionHash);

        if (receipt) {
          const txStatus = receipt.status === 1 ? "success" : "failure";
          console.log(`[pollTransactionStatus] 📋 Transaction status: ${txStatus} for TX: ${transactionHash}`);

          if (txStatus === 'success') {
            return { status: 'success', receipt };
          }
        }

        if (attempts < maxAttempts) {
          console.log(`[pollTransactionStatus] ⏳ Waiting for ${delay / 1000} seconds before retrying...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        console.error(`[pollTransactionStatus] ❌ Error while polling for TX: ${transactionHash}`, error);
      }
    }

    console.log(`[pollTransactionStatus] ⚠️ Unable to confirm transaction status after ${maxAttempts} attempts.`);
    return { status: 'failure' };

  } finally {
    // 🧹 Ensure the provider is properly cleaned up
    console.log(`[pollTransactionStatus] 🧹 Cleaning up the provider for TX: ${transactionHash}`);
    if (provider && typeof provider.destroy === 'function') {
      try {
        await provider.destroy();
        console.log(`[pollTransactionStatus] ✅ Provider cleaned up successfully.`);
      } catch (error) {
        console.error(`[pollTransactionStatus] ❌ Error while cleaning up the provider for TX: ${transactionHash}`, error);
      }
    } else {
      console.warn(`[pollTransactionStatus] ⚠️ Provider destroy method not available.`);
    }
  }
}

module.exports = { pollTransactionStatus };
