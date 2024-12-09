import { createSlice } from '@reduxjs/toolkit';

const dummySlice = createSlice({
  name: 'dummy',
  initialState: {
    counter: 0,
  },
  reducers: {
    increment: (state) => {
      state.counter += 1;
    },
    decrement: (state) => {
      state.counter -= 1;
    },
  },
});

export const { increment, decrement } = dummySlice.actions;
export default dummySlice.reducer;
