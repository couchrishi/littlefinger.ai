require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");

// Replace with your deployed contract address
const contractAddress = "0x7Bb2bCF2117aa62FA5Fc3dB66261b500d619c9cf"; // Update this

// Load the ABI dynamically from the compiled artifacts
const artifactPath = "../artifacts/contracts/LittlefingerGame.sol/LittlefingerGame.json";
const contractABI = JSON.parse(fs.readFileSync(artifactPath, "utf8")).abi;

async function testContract() {
  try {
    // Connect to Polygon Amoy Testnet
    const provider = new ethers.providers.JsonRpcProvider("https://rpc-amoy.polygon.technology/");

    // Wallet setup using private key from .env
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    console.log("Wallet address:", wallet.address);

    // Connect to the deployed contract
    const contract = new ethers.Contract(contractAddress, contractABI, wallet);

    // Test Case 1: Verify Contract Owner
    console.log("\nTest Case 1: Verify Contract Owner");
    const owner = await contract.owner();
    console.log("Owner of the contract:", owner);

    // Test Case 2: Check Initial Prize Pool
    console.log("\nTest Case 2: Check Initial Prize Pool");
    const prizePool = await contract.prizePool();
    console.log("Initial Prize Pool:", ethers.utils.formatEther(prizePool), "ETH");

    // Test Case 3: Submit a Query
    console.log("\nTest Case 3: Submit a Query");
    const initialQueryFee = await contract.calculateQueryFee();
    console.log("Current Query Fee:", ethers.utils.formatEther(initialQueryFee), "ETH");

    // Define custom gas settings
    const gasSettings = {
      maxPriorityFeePerGas: ethers.utils.parseUnits("50", "gwei"), // Adjust based on network requirements
      maxFeePerGas: ethers.utils.parseUnits("60", "gwei"),        // Adjust based on network requirements
      gasLimit: 500000                                           // Adjust as needed for the function
    };

    // Submit a query
    const queryTx = await contract.submitQuery("Test Query 1", {
      value: initialQueryFee,
      ...gasSettings,
    });
    await queryTx.wait();
    console.log("Query submitted successfully.");

    // Check Prize Pool After Query
    const updatedPrizePool = await contract.prizePool();
    console.log("Updated Prize Pool:", ethers.utils.formatEther(updatedPrizePool), "ETH");

    // Test Case 4: Verify Global Query Count
    console.log("\nTest Case 4: Verify Global Query Count");
    const globalQueryCount = await contract.globalQueryCount();
    console.log("Global Query Count:", globalQueryCount.toString());

    // // Test Case 5: Approve Transfer (Owner only)
    // console.log("\nTest Case 5: Approve Transfer");
    // const recipientAddress = "0xA8Dfe77e807c1E4794e8A2342FA3b4d0ecE1482B"; // Replace with desired recipient address
    // const approveTx = await contract.approveTransfer(recipientAddress, gasSettings);
    // await approveTx.wait();
    // console.log(`Prize pool transferred to recipient: ${recipientAddress}`);

    // Test Case 6: Check Contract Balance After Transfer
    console.log("\nTest Case 6: Check Contract Balance After Transfer");
    const contractBalance = await provider.getBalance(contractAddress);
    console.log("Contract Balance After Transfer:", ethers.utils.formatEther(contractBalance), "ETH");

    console.log("\nAll tests completed successfully!");
  } catch (error) {
    console.error("Error during contract testing:", error);
  }
} 
// Run the test
testContract();
