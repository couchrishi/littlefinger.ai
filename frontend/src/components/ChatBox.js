import React, { useRef, useEffect, useState } from "react"; // 🛠️ Add useState

import { parseUnits } from "ethers"; // Import parseUnits directly
import { toBigInt } from "ethers"; // Import the BigInt utility

import { listenForGlobalChat, fetchAppConfig } from "../utils/firestoreUtils";
import { v4 as uuidv4 } from "uuid";
import { useSelector, useDispatch } from "react-redux";
import {
  setChatHistory,
  addMessage,
  updateMessage,
  updateMessageStatus,
} from "../redux/slices/chatboxSlice";
import {
  startQuery,
  setQueryID,
  setQueryFee,
  submitTransaction,
  transactionSuccess,
  transactionFailure,
  querySubmitted,
  querySuccess,
  queryFailed,
  resetQueryState,
} from "../redux/slices/querySlice";
import { BrowserProvider, Contract } from "ethers";
import LittlefingerGameData from "../abis/LittlefingerGame.json";
import config from "../config";
import md5 from "md5";



export default function ChatBox() {

  // Set the variable to track the status of the chat
  const chatEndRef = useRef(null);

  // Initialiaze Redux Dispatch
  const dispatch = useDispatch();

  // Initialize State Variables
  const connectedAccount = useSelector((state) => state.metaMask.connectedAccount);
  const currentChainId = useSelector((state) => state.metaMask.currentChainId);
  const chatHistory = useSelector((state) => state.chatbox.chatHistory);
  const message = useSelector((state) => state.chatbox.message);
  const queryState = useSelector((state) => state.query);

  // Initialize Blockchain Primitives -  Network, Contract Address and Gas Station endpoints to estimate gas fees
  const SUPPORTED_NETWORKS = {
    "0x89": "Polygon PoS Mainnet",
    "0x13882": "Polygon Amoy Testnet",
  };

  const [contractAddress, setContractAddress] = useState(null); // 🛠️ Contract address loaded from Firestore
  const [contractABI, setContractABI] = useState(null); 


  //const contractAddress = "0x25d876AD7Fd48FF35f654446AE8795b4eF6004A3";
  const GAS_STATION_URL = currentChainId === "0x89"
    ? "https://gasstation.polygon.technology/v2"
    : "https://gasstation.polygon.technology/amoy";

  const fetchGasFees = async () => {
    try {
      const response = await fetch(GAS_STATION_URL);
      const gasData = await response.json();
      return {
        maxPriorityFee: parseUnits(gasData.standard.maxPriorityFee.toString(), "gwei"),
        maxFee: parseUnits(gasData.standard.maxFee.toString(), "gwei"),
      };
    } catch (err) {
      console.error("Error fetching gas fee recommendations:", err);
      return {
        maxPriorityFee: parseUnits("30", "gwei"), // Fallback
        maxFee: parseUnits("50", "gwei"), // Fallback
      };
    }
  };

  // Pull global chat history
  useEffect(() => {
    if (!connectedAccount || !currentChainId || !SUPPORTED_NETWORKS[currentChainId]) {
      dispatch(setChatHistory([]));
      return;
    }

    const networkKey = currentChainId === "0x89" ? "mainnet" : "testnet";

    // 🔥 Fetch app config and extract the contract address
    const fetchConfig = async () => {
      try {
        const configData = await fetchAppConfig(networkKey); // Call the utility function
        if (configData && configData.contract.address && configData.abi_json.abi) {
          console.log(configData.contract.address);
          setContractAddress(configData.contract.address); // 🛠️ Store contract address in state
          setContractABI(configData.abi_json.abi); // 🛠️ Store ABI
          console.log("✅ Contract address loaded from Firestore:", configData.address);
          console.log("✅ ABI loaded from Firestore:", configData.abi_json.abi);

        } else {
          console.error(`❌ No contract address or ABI found for network: ${networkKey}`);
        }
      } catch (error) {
        console.error("Error fetching app config:", error);
      }
    };

    fetchConfig(); // Call fetch on component mount

    const unsubscribe = listenForGlobalChat(networkKey, (messages) => {
      dispatch(setChatHistory(messages));
    });

    return () => unsubscribe();
  }, [connectedAccount, currentChainId, dispatch]);

  // Scroll to the latest message when new messages are added
  useEffect(() => {
    if (chatEndRef.current && chatHistory.length > 0) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [chatHistory]);

  const isInputDisabled = !connectedAccount || !SUPPORTED_NETWORKS[currentChainId] || queryState.queryStatus !== "idle";

  // The function to handle the sending and receiving of messages on the chatbox 

  const handleSend = async () => {
    if (message.trim() && queryState.queryStatus === "idle") {

      const currentMessage = message;
      const queryID = uuidv4(); // Generate unique queryID
      console.log("QueryID: ", queryID);
      dispatch(startQuery());
      dispatch(setQueryID(queryID));
      dispatch(updateMessage("")); // Clear input field

      const messageIndex = chatHistory.length;
      dispatch(
        addMessage({
          sender: "user",
          text: currentMessage,
          status: "calculating_query_fee",
          timestamp: new Date().toISOString(),
        })
      );

    // The outer try block to handle all the elements of the conversation
      try {  
        // The first inner try block to handle only the "Metmask" trasnactions
        //  Sending Transaction
        try {
          const provider = new BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();

          // 🛑 Check if contract address is loaded
          if (!contractAddress) {
            console.error("Contract address is not loaded yet.");
            return;
          }
          
          const contract = new Contract(contractAddress, contractABI, signer);
          console.log("ABI:", contractABI);

          console.log("Contract instance methods:", contract.interface.functions);
          console.log("Contract address:", contractAddress);
          console.log("Loaded ABI:", contractABI);




          // Calculate query fee
          const queryFee = await contract.calculateQueryFee();
          dispatch(setQueryFee(queryFee.toString()));
          console.log("Query fee calculated:", queryFee.toString());

          dispatch(updateMessageStatus({ index: messageIndex, status: "waiting_for_tx_approval" }));

          // Fetch Gas Fee Recommendations
          const gasFees = await fetchGasFees();

          var tx = await contract.submitQuery(currentMessage, queryID, {
            maxFeePerGas: gasFees.maxFee,
            maxPriorityFeePerGas: gasFees.maxPriorityFee,
            value: queryFee 
          });
          
          dispatch(submitTransaction(tx.hash));
          console.log("Transaction submitted:", tx.hash);

          dispatch(updateMessageStatus({ index: messageIndex, status: "tx_submitted" }));

          const receipt = await tx.wait();
          dispatch(transactionSuccess(tx.hash));
          console.log("Transaction confirmed:", tx.hash);

          dispatch(updateMessageStatus({ index: messageIndex, status: "tx_success" }));

        } catch (err) {

          console.error("Error processing query:", err);

          const errorMessage = err.message.includes("insufficient funds")
            ? "Insufficient funds. Please top up your wallet."
            : "Metamask transaction failed. Check your balance or increase the gas fee before trying again";

          // Update only the status without adding a duplicate error message
          dispatch(transactionFailure(err.message));
          dispatch(updateMessageStatus({ index: messageIndex, status: "tx_failed", errorMessage }));

        }
        
         // The second inner try block to handle only the queries to the backend Littlefinger API / Gemini calls
        // Sending Query

        try {

          dispatch(updateMessageStatus({ index: messageIndex, status: "query_submitted" }));

          const response = await fetch(`${config.API_BASE_URL}/chatWithAI`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: currentMessage,
              chainId: currentChainId,
              queryId: queryID,
              txId: tx.hash,
              sessionId: connectedAccount || "anonymous",
            }),
          });

          dispatch(querySubmitted(new Date().toISOString()));

          if (!response.ok) throw new Error("AI query failed");

          const data = await response.json();
          console.log("AI response received:", data.response);
          console.log("AI response type:", data.responseType);

          dispatch(updateMessageStatus({ index: messageIndex, status: "query_success" }));
          dispatch(querySuccess(data.response));
          console.log("Query processed successfully.");

        } catch (err) {
          console.error("Error processing query:", err);
          const errorMessage = "Littlefinger is having some issues. Your payment will be reversed soon."
          // Update only the status without adding a duplicate error message
          dispatch(transactionFailure(err.message));
          dispatch(updateMessageStatus({ index: messageIndex, status: "query_failed", errorMessage }));

        }
        } catch (err) {
          console.error("Error processing query:", err);

          const errorMessage = err.message.includes("insufficient funds")
            ? "Insufficient funds. Please top up your wallet."
            : "Metamask transaction failed. Check your balance or increase the gas fee before trying again";

          // Update only the status without adding a duplicate error message
          dispatch(transactionFailure(err.message));
          dispatch(updateMessageStatus({ index: messageIndex, status: "tx_failed", errorMessage }));

          // Do not add a redundant error message to chat history
        } finally {
          dispatch(resetQueryState());
        }
      }
    };

  return (
    <div className="p-4 bg-dark-secondary shadow-md rounded-lg border border-neon-green">
      <div className="h-64 overflow-y-auto bg-black p-4 mb-4 rounded-lg border border-neon-green">
        {chatHistory.map((msg, index) => {
          const isAI = msg.sender === "Gemini";
          const walletHash = md5(msg.sender);
          const profileColor = `#${walletHash.slice(0, 6)}`;
          const alignmentClass = isAI ? "flex-row text-left" : "flex-row-reverse text-right";

          const messageStyle =
            msg.status === "tx_failed" || msg.status === "query_failed"
              ? "bg-red-500 text-white"
              : msg.status === "calculating_query_fee" ||
                msg.status === "tx_submitted" ||
                msg.status === "waiting_for_tx_approval"
              ? "bg-gray-500 text-white italic"
              : isAI
              ? "bg-gray-700 text-neon-green"
              : "bg-purple-500 text-white";

          let statusIcon = null;
          let statusText = "";

          switch (msg.status) {
            case "calculating_query_fee":
              statusIcon = (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-yellow-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 11v-6m0 0l-6 6m6-6h6" />
                </svg>
              );
              statusText = "Calculating interaction fee...";
              break;
            case "tx_submitted":
              statusIcon = (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-yellow-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-7-7v14" />
                </svg>
              );
              statusText = "Paying interaction fee...";
              break;
            case "waiting_for_tx_approval":
              statusIcon = (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-blue-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              );
              statusText = "Waiting for payment confirmation...";
              break;
            case "query_submitted":
              statusIcon = (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-indigo-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L12 12m0 0l-5.25 5.25M12 12h9" />
                </svg>
              );
              statusText = "Payment confirmed. Talking to Littlefinger now...";
              break;
            case "query_success":
              statusIcon = (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-green-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              );
              //statusText = "Reply from Littlefinger.";
              statusText = "";
              break;
            case "tx_failed":
              statusIcon = (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-red-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 12m0 0L5.25 5.25M12 12l6.75-6.75M12 12L5.25 18.75M12 12l6.75 6.75" />
                </svg>
              );
              statusText = msg.errorMessage || "Transaction failed. Check your funds or try increasing the gas fee. ";

            case "query_failed":
              statusIcon = (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-red-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 12m0 0L5.25 5.25M12 12l6.75-6.75M12 12L5.25 18.75M12 12l6.75 6.75" />
                </svg>
              );
              statusText = msg.errorMessage || "Littlefinger failed to respond. Your transaction will be reveresed.";
              break;
            default:
              break;
          }

          return (
            <div key={index} className={`mb-4 flex ${alignmentClass} items-center gap-2`}>
              <div className="w-8 h-8 rounded-full cursor-pointer flex-shrink-0" style={{ backgroundColor: profileColor }}></div>
              <div>
                <span className={`inline-block px-3 py-2 rounded-lg ${messageStyle}`}>{msg.text || "No response"}</span>
                <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                  <span>
                    {new Date(msg.timestamp).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {statusIcon && (
                    <span className="flex items-center gap-1">
                      {statusIcon}
                      {statusText && <span>{statusText}</span>}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>
      <div className="flex">
        <input
          type="text"
          value={message}
          onChange={(e) => dispatch(updateMessage(e.target.value))}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          disabled={isInputDisabled}
          className="flex-1 p-2 border border-neon-green bg-black text-neon-green rounded-l-lg placeholder-gray-500 disabled:opacity-50"
          placeholder="Type your message"
        />
        <button
          onClick={handleSend}
          disabled={isInputDisabled}
          className="p-2 bg-neon-green text-black rounded-r-lg disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
