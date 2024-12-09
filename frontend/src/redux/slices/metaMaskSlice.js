import { createSlice } from '@reduxjs/toolkit';

// Define initial state
const initialState = {
  connectedAccount: null,
  currentChainId: null,
  SUPPORTED_NETWORKS: {
    "0x89": "Polygon Mainnet",
    "0x13882": "Polygon Amoy Testnet",
  },
};

// Create slice
const metaMaskSlice = createSlice({
  name: 'metaMask',
  initialState,
  reducers: {
    setConnectedAccount: (state, action) => {
      state.connectedAccount = action.payload;
    },
    setCurrentChainId: (state, action) => {
      state.currentChainId = action.payload;
    },
  },
});

// Export actions and reducer
export const { setConnectedAccount, setCurrentChainId } = metaMaskSlice.actions;
export default metaMaskSlice.reducer;
