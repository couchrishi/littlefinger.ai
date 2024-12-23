
const { accessSecret, getNetworkSecrets } = require('./secrets');
const { ethers } = require('ethers');


// // Get Contract Info 
// async function getContractInfo(network) {
//   try {
//     console.log(`Fetching contract ABI for network: ${network}`);
//     const { contractAddress, abi } = await getContractInfoFromFirestore(network);
    
//     if (!contractAddress || !abi) {
//       throw new Error(`[blockchainUtils] ❌ Missing contract address or ABI for network: ${network}`);
//     }

//     console.log(`[blockchainUtils] ✅ Successfully retrieved contract info for network: ${network}`);
//     return { contractAddress, abi };
//   } catch (error) {
//     console.error(`[blockchainUtils] ❌ Error fetching contract ABI for network: ${network}`, error);
//     throw error; // Bubble the error up
//   }
// }

// async function getPrizePool(network) {
//   try {
//     console.log(`Fetching prize pool for network: ${network}`);
//     const prizePool = await getPrizePoolFromFirestore(network);
    
//     if (!prizePool) {
//       throw new Error(`[blockchainUtils] ❌ Missing contract prize pool for network: ${network}`);
//     }

//     console.log(`[blockchainUtils] ✅ Successfully retrieved prize pool for network: ${network}`);
//     return { contractAddress, abi };
//   } catch (error) {
//     console.error(`[blockchainUtils] ❌ Error fetching prize pool for network: ${network}`, error);
//     throw error; // Bubble the error up
//   }
// }

// async function transferFunds(queryId, sessionId, network) {
//   console.log(`[transferFunds] Function called by user ${sessionId} for the winning query ${queryId}` );

//   if (!ethers.utils.isAddress(sessionId)) {
//     throw new Error(`❌ Invalid recipient address: ${recipient}`);
//   }
//   try {
//     // 🔥 Step 1: Load secrets from GCP Secret Manager and contract info from firestore
//     const secrets = getNetworkSecrets(network);
//     const { contractAddress, contractABI } = await getContractInfo(network);
//     const prizePool = await getPrizePool(network);
//     const PRIVATE_KEY = secrets.PRIVATE_KEY;
//     const RPC_URL = secrets.RPC_URL;
//     console.log(`🔐 Secrets loaded for ${network}. Contract Address: ${CONTRACT_ADDRESS}`);

//     // 🔥 Step 2: Connect to the blockchain
//     const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
//     const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
//     const contract = new ethers.Contract(contractAddress, contractABI, wallet);

//     // 🔥 Step 3: Call the approveTransfer function on the contract
//     console.log(`🚀 Calling Smart Contract function - 'approveTransfer' for recipient: ${sessionId}`);
//     const tx = await contract.approveTransfer(sessionId);
//     console.log(`📜 Transaction hash: ${tx.hash}`);

//     // 🔥 Step 4: Wait for transaction confirmation
//     const receipt = await tx.wait();
//     console.log(`✅ Transaction confirmed. Block Number: ${receipt.blockNumber}, Gas Used: ${receipt.gasUsed}`);

//     return {
//       status: 'success',
//       txHash: receipt.transactionHash
//     };
//   }
//   catch (error) {
//     console.error(`❌ Error during transfer to recipient: ${recipient}`, error);
//     return {
//       status: 'failure',
//       error: error.message
//     };
//   }
// }

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
