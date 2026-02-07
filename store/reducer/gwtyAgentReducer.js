import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  gwtyAgent: {},
  loading: false,
};

export const gtwyAgentReducer = createSlice({
  name: "gwtyAgent",
  initialState,
  reducers: {
    getAllAgentReducer: (state, action) => {
      const agent = action.payload.data?.data;
      state.gwtyAgent.publicAgent = agent.filter((item) => item.page_config.availability === "public");
      state.gwtyAgent.privateAgent = agent.filter((item) => item.page_config.availability === "private");
      state.loading = false;
    },
    getPublicAgentDataReducer: (state, action) => {
      state.gwtyAgent.publicAgentData = action.payload.data;
      state.loading = false;
    },
    getPrivateAgentDataReducer: (state, action) => {
      state.gwtyAgent.privateAgentData = action.payload.data;
      state.loading = false;
    },
    clearAgentsData: (state) => {
      state.gwtyAgent.publicAgent = [];
      state.gwtyAgent.privateAgent = [];
      state.gwtyAgent.publicAgentData = {};
      state.gwtyAgent.privateAgentData = {};
      state.loading = false;
    },
  },
});

export const { getAllAgentReducer, getPublicAgentDataReducer, getPrivateAgentDataReducer, clearAgentsData } =
  gtwyAgentReducer.actions;

export default gtwyAgentReducer.reducer;
