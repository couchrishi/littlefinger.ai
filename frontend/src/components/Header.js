import React, { useEffect } from "react"; // Import useEffect from React
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setConnectedAccount, setCurrentChainId } from "../redux/slices/metaMaskSlice";
import { FaSyncAlt, FaUnlink } from "react-icons/fa"; // Importing react-icons for icon buttons

export default function Header() {
  const dispatch = useDispatch();

  // Redux state selectors
  const connectedAccount = useSelector((state) => state.metaMask.connectedAccount);
  const currentChainId = useSelector((state) => {
    console.log("currentChainId in Redux: ", state.metaMask.currentChainId);
    return state.metaMask.currentChainId;
  });
  
  const SUPPORTED_NETWORKS = useSelector((state) => state.metaMask.SUPPORTED_NETWORKS);

  /**
   * 🚀 UseEffect: Listen for changes to the chain/network and update Redux
   */
  useEffect(() => {

    if (!window.ethereum) {
      console.error("MetaMask is not installed or Ethereum provider is missing.");
      return;
    }

  
    const handleChainChanged = (chainId) => {
      console.log("🔥 Chain changed to:", chainId);
      dispatch(setCurrentChainId(chainId)); // Update the Redux state with the new chain ID
    };

    // Attach listener for when the chain/network is changed in MetaMask
    window.ethereum.on('chainChanged', handleChainChanged);

    // Clean up listener on component unmount
    return () => window.ethereum.removeListener('chainChanged', handleChainChanged);
  }, []); // Only run this effect once, since dispatch never changes

  // Functions for MetaMask actions
  const connectWallet = async () => {
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      console.log(chainId);
      dispatch(setConnectedAccount(accounts[0]));
      dispatch(setCurrentChainId(chainId));
    } catch (err) {
      console.error("Error connecting wallet:", err);
    }
  };
  
  
  const reconnectWallet = async () => {
    try {
      await window.ethereum.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
      });

      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      
      dispatch(setConnectedAccount(accounts[0]));
      dispatch(setCurrentChainId(chainId));

      console.log("Reconnected wallet to:", accounts[0]);
    } catch (err) {
      console.error("Error reconnecting wallet:", err);
    }
  };

  const disconnectWallet = () => {
    dispatch(setConnectedAccount(null));
    dispatch(setCurrentChainId(null));
  };

  const handleNetworkChange = async (event) => {
    const selectedChainId = event.target.value; // selectedChainId is already in hex, no need to convert
    console.log("🌀 Current chainId:", currentChainId);
    console.log("🌀 Selected chainId:", selectedChainId);
  
    if (currentChainId !== selectedChainId) {
      // ✅ Update Redux before MetaMask
      console.log(`🔄 Updating Redux with new chainId: ${selectedChainId}`);
      dispatch(setCurrentChainId(selectedChainId)); // Update Redux immediately
  
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: selectedChainId }],
        });
        console.log("✅ Switched to", selectedChainId);
      } catch (err) {
        console.error("❌ Error switching network:", err.message);
        if (err.code === 4902) {
          console.log("🛠️ This network is not available in MetaMask.");
        }
      }
    } else {
      console.log("⏸️ Chain is already set to", selectedChainId);
    }
  };
  

  const formatAddress = (address) =>
    address ? `${address.slice(0, 4)}...` : "";

  return (
    <header className="relative bg-dark-bg py-4 mt-6">
      <div className="absolute left-40 top-1/5 transform -translate-y-1/2 mt-8">
        <div style={{ fontSize: "2.5rem", fontWeight: "bold", textShadow: "0 0 1px #00ff00, 0 0 10px #00ff00" }}>Littlefinger.ai</div>
      </div>

      <div className="flex justify-center mt-6">
        <nav>
          <ul className="flex space-x-8 text-neon-green text-md">
            <li className="hover:text-neon-yellow cursor-pointer">
              <Link to="/">Home</Link>
            </li>
            <li className="hover:text-neon-yellow cursor-pointer">
              <Link to="/about">Legend</Link>
            </li>
            <li className="hover:text-neon-yellow cursor-pointer">
              <Link to="/faq">FAQ</Link>
            </li>
            <li className="hover:text-neon-yellow cursor-pointer">
              <Link to="/terms">Terms</Link>
            </li>
          </ul>
        </nav>
      </div>

      <div className="absolute right-36 top-1/2 transform -translate-y-1/2 flex items-center space-x-2 mt-4">
        {connectedAccount ? (
          <div className="flex items-center space-x-1.5">
            <select
              value={currentChainId || ""}
              onChange={handleNetworkChange}
              // className="p-1 bg-dark-secondary text-neon-green border border-neon-green rounded-md text-sm"
              className="p-1 bg-dark-secondary text-neon-green rounded-md text-sm"

            >
              {console.log("📢 Selected value in Dropdown (value of select):", currentChainId)} 
              <option value="" disabled>
                Select Network
              </option>
              {Object.entries(SUPPORTED_NETWORKS).map(([chainId, name]) => (
                <option key={chainId} value={chainId}>
                  {name}
                </option>
              ))}
            </select>

            <FaSyncAlt 
              onClick={reconnectWallet} 
              className="text-green text-xl cursor-pointer hover:text-neon-yellow transition-all" 
              title="Reconnect" 
            />

            <FaUnlink 
              onClick={disconnectWallet} 
              className="text-purple-600 text-xl cursor-pointer hover:text-red-700 transition-all" 
              title="Disconnect" 
            />

            <span className="text-neon-green text-sm">
              {formatAddress(connectedAccount)}
            </span>
          </div>
        ) : (
          <button
            onClick={connectWallet}
            className="px-3 py-1 bg-[#8247e5] text-black rounded-md text-sm hover:bg-neon-yellow transition-all"
          >
            Connect Wallet
          </button>
        )}
      </div>
    </header>
  );
}
