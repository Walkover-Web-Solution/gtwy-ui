import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  plan: null,
  label: null,
  services: "*",
  loaded: false,
};

export const planReducer = createSlice({
  name: "Plan",
  initialState,
  reducers: {
    fetchPlanReducer: (state, action) => {
      const { plan, label, services } = action.payload;
      state.plan = plan;
      state.label = label;
      state.services = services ?? "*";
      state.loaded = true;
    },
  },
});

export const { fetchPlanReducer } = planReducer.actions;
export default planReducer.reducer;
