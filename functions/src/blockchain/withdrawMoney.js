const ethers = require("ethers");
const contractData = require("../blockchain/abis/LittlefingerGame.json");
require("dotenv").config({ path: require("path").resolve(__dirname, "../../../.env") });

const abi = contractData.abi || contractData;
const RPC_URL = process.env.POLYGON_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const CONTRACT_ADDRESS = "0x35170619117aDC828f75d8277CaA1369ED1C61b4"; // Replace with your contract address
const RECIPIENT_ADDRESS = "0x26ed9e000Da07C3878483A75DeAb232DED55f236"; // Replace with your wallet address

const invokeApproveTransfer = async () => {
  try {
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);

    // Get the current gas price
    const feeData = await provider.getFeeData();
    const maxPriorityFeePerGas = ethers.utils.parseUnits("25", "gwei"); // Customize this
    const maxFeePerGas = feeData.maxFeePerGas
      ? feeData.maxFeePerGas.add(maxPriorityFeePerGas)
      : ethers.utils.parseUnits("50", "gwei"); // Fallback to 50 gwei

    console.log(`Gas Settings: 
      Max Priority Fee: ${ethers.utils.formatUnits(maxPriorityFeePerGas, "gwei")} gwei, 
      Max Fee: ${ethers.utils.formatUnits(maxFeePerGas, "gwei")} gwei`);

    // Call approveTransfer
    console.log(`Invoking approveTransfer for recipient: ${RECIPIENT_ADDRESS}`);
    const tx = await contract.approveTransfer(RECIPIENT_ADDRESS, {
      maxPriorityFeePerGas, // Tip for miners
      maxFeePerGas, // Total gas cap
      gasLimit: 100000, // Adjust gas limit as per your contract needs
    });

    console.log(`Transaction sent. Waiting for confirmation...`);
    const receipt = await tx.wait();
    console.log(`Transaction confirmed! Hash: ${receipt.transactionHash}`);
  } catch (error) {
    console.error("Error invoking approveTransfer:", error);
  }
};

invokeApproveTransfer();
