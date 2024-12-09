import { configureStore } from '@reduxjs/toolkit';
import metaMaskReducer from './slices/metaMaskSlice';
import chatboxReducer from './slices/chatboxSlice';
import queryReducer from "./slices/querySlice"

const store = configureStore({
  reducer: {
    metaMask: metaMaskReducer,
    chatbox: chatboxReducer, // Add the chatbox reducer
    query: queryReducer,
  },
});

export default store;
