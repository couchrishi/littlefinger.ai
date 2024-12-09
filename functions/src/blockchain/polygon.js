import { ethers } from "ethers";

// Define the transaction details interface
export interface TransactionDetails {
  confirmed: boolean;
  fromAddress: string;
  toAddress: string;
  amount: bigint;
}

// Function to check transaction on Polygon
async function checkTransactionPolygon(txHash: string): Promise<TransactionDetails | null> {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL); // Amoy testnet RPC URL
    const tx = await provider.getTransaction(txHash);

    if (!tx) {
      return null;
    }

    // Wait for transaction to be mined and get receipt
    const receipt = await tx.wait();

    if (!receipt) {
      return null;
    }

    return {
      confirmed: true,
      fromAddress: tx.from,
      toAddress: tx.to || "",
      amount: tx.value,
    };
  } catch (error) {
    console.error("Error checking transaction:", error);
    return null;
  }
}

// Function to validate a transaction
export async function isTxValidPolygon(txHash: string, minAmount: string, toAddress: string): Promise<boolean> {
  try {
    const details = await checkTransactionPolygon(txHash);

    // Early return false if no transaction details
    if (!details) {
      return false;
    }

    // Convert minAmount from POL to Wei
    const minAmountWei = ethers.utils.parseUnits(minAmount, 18);

    // All conditions must be true for valid transaction
    const isConfirmed = details.confirmed;
    const isToAddressValid = details.toAddress.toLowerCase() === toAddress.toLowerCase();
    const isAmountSufficient = details.amount >= minAmountWei;

    return isConfirmed && isToAddressValid && isAmountSufficient;
  } catch (error) {
    console.error("Error validating transaction:", error);
    return false;
  }
}

// Function to transfer POL tokens
export async function transferTokensPolygon(recipient: string, amount: string): Promise<string> {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL); // Amoy testnet RPC URL
    const wallet = new ethers.Wallet(process.env.POLYGON_PRIVATE_KEY, provider);

    // Define POL token contract ABI
    const tokenABI = [
      "function transfer(address recipient, uint256 amount) public returns (bool)",
    ];
    const tokenContract = new ethers.Contract(process.env.POLYGON_TOKEN_ADDRESS, tokenABI, wallet);

    const tx = await tokenContract.transfer(recipient, ethers.utils.parseUnits(amount, 18));
    await tx.wait(); // Wait for the transaction to be mined
    return tx.hash;
  } catch (error) {
    console.error("Error transferring tokens:", error);
    throw new Error("Token transfer failed");
  }
}

// Function to get an address's POL balance
export async function getAddressBalancePolygon(address: string): Promise<string> {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
    const balance = await provider.getBalance(address);

    // Convert balance from Wei to POL
    return ethers.utils.formatUnits(balance, 18);
  } catch (error) {
    console.error("Error getting address balance:", error);
    throw error;
  }
}
