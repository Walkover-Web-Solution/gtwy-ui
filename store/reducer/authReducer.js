import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  authenticationData: {},
  loading: false,
};

export const authDataReducer = createSlice({
  name: "authenticationData",
  initialState,
  reducers: {
    fetchAllAuthenticationData: (state, action) => {
      const { orgId, data } = action.payload;
      if (data) state.authenticationData[orgId] = [data];
    },
    addAuthenticationData: (state, action) => {
      const { orgId, data } = action.payload;
      if (!state.authenticationData[orgId]) {
        state.authenticationData[orgId] = [];
      }
      state.authenticationData[orgId] = [data];
    },
  },
});

export const { fetchAllAuthenticationData, addAuthenticationData } = authDataReducer.actions;

export default authDataReducer.reducer;
