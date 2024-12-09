import React, { useRef, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { updateDoc, arrayUnion } from "firebase/firestore";

import { useSelector, useDispatch } from "react-redux";
import {
  setChatHistory,
  addMessage,
  updateMessage,
  updateMessageStatus,
} from "../redux/slices/chatboxSlice";
import {
  startQuery,
  setQueryFee,
  submitTransaction,
  transactionSuccess,
  transactionFailure,
  querySuccess,
  queryFailed,
  resetQueryState,
} from "../redux/slices/querySlice";
import { BrowserProvider, Contract } from "ethers";
import LittlefingerGameData from "../abis/LittlefingerGame.json";
import config from "../config";
import db from "../config/firebaseConfig";

export default function ChatBox() {
  const dispatch = useDispatch();

  const connectedAccount = useSelector((state) => state.metaMask.connectedAccount);
  const currentChainId = useSelector((state) => state.metaMask.currentChainId);
  const SUPPORTED_NETWORKS = {
    "0x89": "Polygon PoS Mainnet",
    "0x13882": "Polygon Amoy Testnet",
  };
  const chatHistory = useSelector((state) => state.chatbox.chatHistory);
  const message = useSelector((state) => state.chatbox.message);
  const queryState = useSelector((state) => state.query);

  const chatEndRef = useRef(null);

  const contractAddress = "0x74317761d61bD2fb367A68ebF0F0D4F0B83713Ed";

  // Pull global chat history
  useEffect(() => {
    if (!connectedAccount || !currentChainId || !SUPPORTED_NETWORKS[currentChainId]) {
      dispatch(setChatHistory([]));
      return;
    }

    const networkKey = currentChainId === "0x89" ? "mainnet" : "testnet";
    const globalChatRef = doc(db, "littlefinger-global", networkKey);

    const unsubscribe = onSnapshot(globalChatRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const globalData = docSnapshot.data();
        dispatch(setChatHistory(globalData.messages || []));
      } else {
        console.log("No global chat context found.");
        dispatch(setChatHistory([]));
      }
    });

    return () => unsubscribe();
  }, [connectedAccount, currentChainId, dispatch]);

  // Scroll to latest message
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory]);

  const isInputDisabled = queryState.queryStatus !== "idle";

  const handleSend = async () => {
    if (message.trim() && queryState.queryStatus === "idle") {
      const currentMessage = message;
      console.log("Sending message:", currentMessage);

      dispatch(startQuery());
      dispatch(updateMessage("")); // Clear input field

      const messageIndex = chatHistory.length;
      dispatch(addMessage({ sender: "user", text: currentMessage, status: "calculating_query_fee" }));
      console.log("Message added to chat history with 'calculating_query_fee' status.");

      try {
        const provider = new BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new Contract(contractAddress, LittlefingerGameData.abi, signer);

        console.log("Connected to contract:", contractAddress);

        // Calculate query fee
        const queryFee = await contract.calculateQueryFee();
        dispatch(setQueryFee(queryFee.toString()));
        console.log("Query fee calculated:", queryFee.toString());

        // Update message status to waiting_for_tx_approval
        dispatch(updateMessageStatus({ index: messageIndex, status: "waiting_for_tx_approval" }));
        console.log("Waiting for transaction approval...");

        // Request transaction approval via MetaMask
        const tx = await contract.submitQuery(currentMessage, { value: queryFee });
        dispatch(submitTransaction(tx.hash));
        console.log("Transaction submitted:", tx.hash);

        // Update message status to tx_submitted
        dispatch(updateMessageStatus({ index: messageIndex, status: "tx_submitted" }));
        console.log("Transaction submitted to the blockchain.");

        // Wait for transaction confirmation
        await tx.wait();
        dispatch(transactionSuccess(tx.hash));
        console.log("Transaction confirmed:", tx.hash);

        // Update message status to tx_success
        dispatch(updateMessageStatus({ index: messageIndex, status: "tx_success" }));
        console.log("Transaction successful.");

        // Send query to backend AI
        const response = await fetch(`${config.API_BASE_URL}/chatWithAI`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: currentMessage,
            sessionId: connectedAccount || "anonymous",
          }),
        });

        if (!response.ok) throw new Error("AI query failed");

        const data = await response.json();
        console.log("The raw AI API response:", data);
        console.log("AI response received:", data.response);

        if (data.responseType === "winning_message") {
          dispatch(addMessage({ sender: "ai", text: data.response, responseType: "winning_message" }));

          // Disable chatbox
          dispatch(resetQueryState());
          alert("You have won! The prize has been approved. Chatbox is now closed.");
          return; // Exit without allowing further messages
        }

        dispatch(querySuccess(data.response));
        dispatch(addMessage({ sender: "ai", text: data.response, status: "query_successful" }));
        console.log("AI response added to chat history.");

        // Reset query state
        dispatch(resetQueryState());
      } catch (err) {
        console.error("Error processing query:", err);
        dispatch(transactionFailure(err.message));

        // Update message status to tx_failed or query_failed
        dispatch(updateMessageStatus({ index: messageIndex, status: "tx_failed", errorMessage: err.message }));

        // Reset query state after failure
        dispatch(resetQueryState());
      }
    }
  };

  return (
    <div className="p-4 bg-dark-secondary shadow-md rounded-lg border border-neon-green">
      <div className="h-64 overflow-y-auto bg-black p-4 mb-4 rounded-lg border border-neon-green">
        {chatHistory.map((msg, index) => {
          const isHistoricAIMessage = msg.sender === "ai";
          const isHistoricUserMessage = msg.sender !== "ai";
          const isCurrentUserMessage = msg.sender === connectedAccount;

          // Alignment logic
          const alignmentClass = isHistoricAIMessage || !isCurrentUserMessage ? "text-left" : "text-right";

          // Style logic
          const messageStyle =
            msg.status === "tx_failed" || msg.status === "query_failed"
              ? "bg-red-500 text-white"
              : msg.status === "calculating_query_fee" ||
                msg.status === "waiting_for_tx_approval" ||
                msg.status === "tx_submitted"
              ? "bg-gray-500 text-white italic"
              : msg.responseType === "winning_message"
              ? "bg-yellow-500 text-black font-bold"
              : isHistoricAIMessage
              ? "bg-gray-700 text-neon-green"
              : isHistoricUserMessage || isCurrentUserMessage
              ? "bg-purple-500 text-white"
              : "bg-gray-700 text-white";

          return (
            <div key={index} className={`mb-2 ${alignmentClass}`}>
              <span className={`inline-block px-3 py-2 rounded-lg ${messageStyle}`}>
                {msg.text || "No response"}
              </span>
              {msg.status === "tx_failed" && (
                <div className="text-sm italic text-red-300 mt-1">{msg.errorMessage}</div>
              )}
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
