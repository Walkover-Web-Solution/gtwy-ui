import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  DryRun: {},
  loading: false,
  success: false,
};

export const dryRunReducer = createSlice({
  name: "PlayGround",
  initialState,
  reducers: {
    dryRun: (state, action) => {
      state.DryRun = action.payload.data;
      state.success = action.payload.success;
    },
  },
});

export const { dryRun } = dryRunReducer.actions;
export default dryRunReducer.reducer;
