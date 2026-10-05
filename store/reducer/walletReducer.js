import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  data: null,
  loaded: false,
};

export const walletReducer = createSlice({
  name: "Wallet",
  initialState,
  reducers: {
    fetchWalletReducer: (state, action) => {
      state.data = action.payload;
      state.loaded = true;
    },
  },
});

export const { fetchWalletReducer } = walletReducer.actions;
export default walletReducer.reducer;
