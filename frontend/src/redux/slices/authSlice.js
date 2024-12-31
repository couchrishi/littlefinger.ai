import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isAuthenticated: false, // Initial authentication state
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    login: (state) => {
      state.isAuthenticated = true; // Set authentication to true
    },
    logout: (state) => {
      state.isAuthenticated = false; // Reset authentication
    },
  },
});

export const { login, logout } = authSlice.actions;
export default authSlice.reducer;
