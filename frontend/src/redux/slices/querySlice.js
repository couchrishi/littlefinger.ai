import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  queryStatus: "idle", // Possible states: idle, calculating_query_fee, waiting_for_tx_approval, tx_submitted, tx_success, tx_failed, query_submitted, query_successful
  queryFee: null,
  transactionHash: null,
  queryID: null, // Added to track the query ID
  error: null,
  timeStamp: null, // Added to track the submission timestamp
};

const querySlice = createSlice({
  name: "query",
  initialState,
  reducers: {
    startQuery(state) {
      state.queryStatus = "calculating_query_fee";
      state.queryFee = null;
      state.transactionHash = null;
      state.queryID = null;
      state.error = null;
      state.timeStamp = null;
    },
    setQueryFee(state, action) {
      state.queryStatus = "waiting_for_tx_approval";
      state.queryFee = action.payload;
    },
    setQueryID(state, action) {
      state.queryID = action.payload; // Save the generated queryID
    },
    submitTransaction(state, action) {
      state.queryStatus = "tx_submitted";
      state.transactionHash = action.payload;
    },
    transactionSuccess(state, action) {
      state.queryStatus = "tx_success";
      state.transactionHash = action.payload;
    },
    transactionFailure(state, action) {
      state.queryStatus = "tx_failed";
      state.error = action.payload;
    },
    querySubmitted(state, action) {
      state.queryStatus = "query_submitted";
      state.timeStamp = action.payload; // Save the query submission timestamp
      console.log("Query Submitted at:", state.timeStamp);
    },
    querySuccess(state, action) {
      state.queryStatus = "query_successful";
      state.error = null;
    },
    queryFailed(state, action) {
      state.queryStatus = "query_failed";
      state.error = action.payload;
    },
    resetQueryState() {
      return initialState;
    },
  },
});

export const {
  startQuery,
  setQueryFee,
  setQueryID, // New action for setting queryID
  submitTransaction,
  transactionSuccess,
  transactionFailure,
  querySubmitted,
  querySuccess,
  queryFailed,
  resetQueryState,
} = querySlice.actions;

export default querySlice.reducer;
