import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { setConnectedAccount, setCurrentChainId } from "../redux/slices/metaMaskSlice";

export default function Header() {
  const dispatch = useDispatch();

  // Redux state selectors
  const connectedAccount = useSelector((state) => state.metaMask.connectedAccount);
  const currentChainId = useSelector((state) => state.metaMask.currentChainId);
  const SUPPORTED_NETWORKS = useSelector((state) => state.metaMask.SUPPORTED_NETWORKS);

  // Functions for MetaMask actions
  const connectWallet = async () => {
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      dispatch(setConnectedAccount(accounts[0]));
      dispatch(setCurrentChainId(chainId));
    } catch (err) {
      console.error("Error connecting wallet:", err);
    }
  };

  const reconnectWallet = async () => {
    try {
      // Request new permissions to choose accounts again
      await window.ethereum.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
      });

      // Request accounts after permissions are granted
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const chainId = await window.ethereum.request({ method: "eth_chainId" });

      // Update Redux state with the newly selected account and chain
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
    const selectedChainId = event.target.value;
    if (currentChainId !== selectedChainId) {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: selectedChainId }],
        });
        dispatch(setCurrentChainId(selectedChainId));
      } catch (err) {
        console.error("Error switching network:", err);
      }
    }
  };

  const formatAddress = (address) =>
    address ? `${address.slice(0, 4)}...` : "";

  return (
    <header className="relative bg-dark-bg py-4 mt-6">
      <div className="absolute left-40 top-1/5 transform -translate-y-1/2 mt-8">
        <div className="text-neon-green text-4xl font-bold cursor-pointer">Littlefinger.ai</div>
      </div>

      <div className="flex justify-center mt-6">
        <nav>
          <ul className="flex space-x-8 text-neon-green text-md ">
            <li className="hover:text-neon-yellow cursor-pointer">Home</li>
            <li className="hover:text-neon-yellow cursor-pointer">About</li>
            <li className="hover:text-neon-yellow cursor-pointer">FAQ</li>
            <li className="hover:text-neon-yellow cursor-pointer">Stats</li>
          </ul>
        </nav>
      </div>

      <div className="absolute right-36 top-1/2 transform -translate-y-1/2 flex items-center space-x-2 mt-4">
        {connectedAccount ? (
          <div className="flex items-center space-x-2">
            <select
              value={currentChainId || ""}
              onChange={handleNetworkChange}
              className="p-1 bg-dark-secondary text-neon-green border border-neon-green rounded-md text-sm"
            >
              <option value="" disabled>
                Select Network
              </option>
              {Object.entries(SUPPORTED_NETWORKS).map(([chainId, name]) => (
                <option key={chainId} value={chainId}>
                  {name}
                </option>
              ))}
            </select>
            <button
              onClick={reconnectWallet}
              className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-all"
            >
              Reconnect
            </button>
            <button
              onClick={disconnectWallet}
              className="px-3 py-1 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 transition-all"
            >
              Disconnect
            </button>
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
