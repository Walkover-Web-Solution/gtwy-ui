import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  connectedAgentFlowByBridge: {}, // Structure: orgId > bridgeId > versionId = data
  connectedAgentFlowLoading: false,
};

export const orchetralFlowReducer = createSlice({
  name: "orchetralFlow",
  initialState,
  reducers: {
    setConnectedAgentFlowLoading: (state, action) => {
      state.connectedAgentFlowLoading = action.payload;
    },
    setConnectedAgentFlowData: (state, action) => {
      const { orgId, bridgeId, versionId, data } = action.payload;

      // Ensure root object exists (in case of corrupted or partial rehydrated state)
      if (!state.connectedAgentFlowByBridge) {
        state.connectedAgentFlowByBridge = {};
      }

      // Initialize nested structure if it doesn't exist
      if (!state.connectedAgentFlowByBridge[orgId]) {
        state.connectedAgentFlowByBridge[orgId] = {};
      }
      if (!state.connectedAgentFlowByBridge[orgId][bridgeId]) {
        state.connectedAgentFlowByBridge[orgId][bridgeId] = {};
      }

      // Store data at orgId > bridgeId > versionId
      state.connectedAgentFlowByBridge[orgId][bridgeId][versionId] = data || {};
      state.connectedAgentFlowLoading = false;
    },
    setConnectedAgentFlowError: (state) => {
      state.connectedAgentFlowLoading = false;
    },
    clearConnectedAgentFlowData: (state, action) => {
      const { orgId, bridgeId, versionId } = action.payload;
      if (state.connectedAgentFlowByBridge[orgId]?.[bridgeId]?.[versionId]) {
        delete state.connectedAgentFlowByBridge[orgId][bridgeId][versionId];
      }
    },
  },
});

export const {
  setConnectedAgentFlowLoading,
  setConnectedAgentFlowData,
  setConnectedAgentFlowError,
  clearConnectedAgentFlowData,
} = orchetralFlowReducer.actions;

export default orchetralFlowReducer.reducer;
