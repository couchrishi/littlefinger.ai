import { createSlice } from '@reduxjs/toolkit';

// Initial state for the game status
const initialState = {
  gameStatus: null, // Possible values: "started", "stopped", etc.
  lockOverlay: true, 
  winningMessage: '', 
  gameExhaustedMessage: '', 
  showConfetti: false,
  isGameStatusLoading: true, // Tracks when we are fetching game state from Firestore
  contractAddress: null,
  contractABI: null,
};

// Create the slice
const gameStateSlice = createSlice({
  name: 'gameState',
  initialState,
  reducers: {
    setGameStatus: (state, action) => {
      state.gameStatus = action.payload;
    },
    setLockOverlay: (state, action) => {
      state.lockOverlay = action.payload;
    },
    setWinningMessage: (state, action) => {
      state.winningMessage = action.payload;
    },
    setGameExhaustedMessage: (state, action) => {
      state.gameExhaustedMessage = action.payload;
    },
    setShowConfetti: (state, action) => {
      state.showConfetti = action.payload;
    },
    setIsGameStatusLoading: (state, action) => {
      state.isGameStatusLoading = action.payload;
    },
    setContractAddress: (state, action) => {
      state.contractAddress = action.payload;
    },
    setContractABI: (state, action) => {
      state.contractABI = action.payload;
    },
  },
});

// Export actions and reducer
export const {  setGameStatus,
  setLockOverlay,
  setWinningMessage,
  setGameExhaustedMessage,
  setShowConfetti,
  setIsGameStatusLoading,
  setContractAddress,
  setContractABI } = gameStateSlice.actions;
export default gameStateSlice.reducer;
