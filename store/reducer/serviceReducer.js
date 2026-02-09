import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  services: {},
};

export const serviceReducer = createSlice({
  name: "Service",
  initialState,
  reducers: {
    fetchServiceReducer: (state, action) => {
      const { services, default_model } = action.payload;
      state.services = services;
      state.default_model = default_model;
    },
  },
});

export const { fetchServiceReducer } = serviceReducer.actions;
export default serviceReducer.reducer;
