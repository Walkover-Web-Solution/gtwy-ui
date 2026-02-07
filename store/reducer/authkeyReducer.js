import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  authData: [],
  loading: false,
};

export const authDataReducer = createSlice({
  name: "authData",
  initialState,
  reducers: {
    fetchAllAuthData: (state, action) => {
      state.authData = action.payload;
      //   state.modelInfo = action.payload.modelInfo
    },
    addAuthData: (state, action) => {
      state.authData = [action.payload.data, ...state.authData];
    },
    removeAuthData: (state, action) => {
      const id = action.payload;
      state.authData = state.authData.filter((item) => item.id !== id);
    },
  },
});

export const { fetchAllAuthData, addAuthData, removeAuthData } = authDataReducer.actions;
export default authDataReducer.reducer;
