import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  prizePool: 0,
  prizePoolInUsd: 0,
  participants: 0,
  breakInAttempts: 0,
  interactionCost: "0.00",
  usdRate: 0
};

const gameStatsSlice = createSlice({
  name: "gameStats",
  initialState,
  reducers: {
    setStats: (state, action) => {
      state.prizePool = action.payload.prizePool;
      state.prizePoolInUsd = action.payload.prizePoolInUsd;
      state.participants = action.payload.participants;
      state.breakInAttempts = action.payload.breakInAttempts;
      state.interactionCost = action.payload.interactionCost;
    }

  },
});

export const { setStats } = gameStatsSlice.actions;
export default gameStatsSlice.reducer;
