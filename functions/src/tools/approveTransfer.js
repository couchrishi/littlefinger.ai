const ethers = require("ethers");
require("dotenv").config({ path: require("path").resolve(__dirname, "../../../.env") });

// 🚀 Load Configuration
const abi = require("../blockchain/abis/LittlefingerGame.json").abi;
const RPC_URL = process.env.POLYGON_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const MAX_PRIORITY_FEE_GWEI = process.env.MAX_PRIORITY_FEE_GWEI || "25";
const FALLBACK_MAX_FEE_GWEI = process.env.FALLBACK_MAX_FEE_GWEI || "50";
const GAS_LIMIT = process.env.GAS_LIMIT || 100000;

// 🔥 Validate required environment variables
if (!RPC_URL) throw new Error("❌ Missing RPC_URL in environment variables.");
if (!PRIVATE_KEY) throw new Error("❌ Missing PRIVATE_KEY in environment variables.");
if (!CONTRACT_ADDRESS) throw new Error("❌ Missing CONTRACT_ADDRESS in environment variables.");

// 🎉 Main Function to Approve Transfer
const invokeApproveTransfer = async (recipientAddress) => {
  if (!recipientAddress) {
    console.error("❌ Recipient address is required to invoke the approveTransfer.");
    return;
  }

  try {
    console.log(`🚀 Starting approveTransfer for recipient: ${recipientAddress}`);
    
    // 1️⃣ Connect to provider and signer
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);
    
    // 2️⃣ Get the current gas fees
    const feeData = await provider.getFeeData();
    const maxPriorityFeePerGas = ethers.utils.parseUnits(MAX_PRIORITY_FEE_GWEI, "gwei"); 
    const maxFeePerGas = feeData.maxFeePerGas
      ? feeData.maxFeePerGas.add(maxPriorityFeePerGas)
      : ethers.utils.parseUnits(FALLBACK_MAX_FEE_GWEI, "gwei");

    console.log(`🔧 Gas Settings: 
      Max Priority Fee: ${ethers.utils.formatUnits(maxPriorityFeePerGas, "gwei")} gwei, 
      Max Fee: ${ethers.utils.formatUnits(maxFeePerGas, "gwei")} gwei, 
      Gas Limit: ${GAS_LIMIT}`);

    // 3️⃣ Call the contract's approveTransfer function
    console.log(`🔓 Invoking approveTransfer for recipient: ${recipientAddress}`);
    const tx = await contract.approveTransfer(recipientAddress, {
      maxPriorityFeePerGas,
      maxFeePerGas,
      gasLimit: GAS_LIMIT,
    });

    console.log(`🚀 Transaction sent! Hash: ${tx.hash}`);
    
    // 4️⃣ Wait for the transaction to be mined
    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed! Hash: ${receipt.transactionHash}`);

    return receipt.transactionHash;

  } catch (error) {
    console.error("❌ Error invoking approveTransfer:", error.message);
    console.error(error);
    throw new Error("Error invoking approveTransfer.");
  }
};

module.exports = invokeApproveTransfer;
