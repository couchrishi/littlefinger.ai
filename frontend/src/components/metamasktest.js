const connectWallet = async () => {
    if (typeof window.ethereum !== "undefined") {
      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      console.log("Current chain ID:", chainId);
  
      if (chainId !== "0x1") {
        // 0x1 = Ethereum Mainnet
        alert("Please switch to the Ethereum Mainnet in MetaMask.");
        return;
      }
  
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      console.log("Connected account:", accounts[0]);
    } else {
      alert("MetaMask is not installed. Please install MetaMask to continue.");
    }
  };
  