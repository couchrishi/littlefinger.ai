import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  chatHistory: [],
  message: "", // Input field message
};

const chatboxSlice = createSlice({
  name: "chatbox",
  initialState,
  reducers: {
    setChatHistory(state, action) {
      state.chatHistory = action.payload;
    },
    addMessage(state, action) {
      state.chatHistory.push(action.payload);
    },
    updateMessage(state, action) {
      state.message = action.payload; // Update the input field state
    },
    updateMessageStatus(state, action) {
      const { index, status, errorMessage } = action.payload;
      if (state.chatHistory[index]) {
        state.chatHistory[index].status = status;
        if (errorMessage) {
          state.chatHistory[index].errorMessage = errorMessage;
        }
      }
    },
  },
});

export const { setChatHistory, addMessage, updateMessage, updateMessageStatus } =
  chatboxSlice.actions;

export default chatboxSlice.reducer;
