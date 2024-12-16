// redux/slices/gameConfigSlice.js
const initialState = {
    contractAddress: null,
    contractABI: null,
    isLoading: true,
  };
  
  // Selector Usage
  const contractAddress = useSelector((state) => state.gameConfig.contractAddress);
  