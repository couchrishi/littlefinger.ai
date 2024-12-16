import { configureStore } from '@reduxjs/toolkit';
import metaMaskReducer from './slices/metaMaskSlice';
import chatboxReducer from './slices/chatboxSlice';
import queryReducer from "./slices/querySlice"
import gameStateReducer from "./slices/gameStateSlice";
import gameStatsReducer from "./slices/gameStatsSlice";


const store = configureStore({
  reducer: {
    metaMask: metaMaskReducer,
    chatbox: chatboxReducer, // Add the chatbox reducer
    query: queryReducer,
    gameState: gameStateReducer, // Ensure gameState is registered in the store
    gameStats: gameStatsReducer,

  },
});

export default store;
