import { createSlice } from "@reduxjs/toolkit";

// Per-bridge persisted UI configuration for the Test Cases page.
// Stores: selected versions, version display order, matching type + custom
// prompt, and the optional run-with model/service.
const initialState = {
  configs: {},
};

const defaultConfig = {
  selectedVersions: [],
  versionOrder: [],
  matchingType: "AI",
  customPrompt: "",
  customPromptSaved: "",
  selectedModel: null,
  selectedService: null,
};

const testCaseConfigSlice = createSlice({
  name: "testCaseConfig",
  initialState,
  reducers: {
    setTestCaseConfig: (state, action) => {
      const { bridgeId, ...patch } = action.payload || {};
      if (!bridgeId) return;
      const existing = state.configs[bridgeId] || { ...defaultConfig };
      state.configs[bridgeId] = { ...existing, ...patch };
    },
    resetTestCaseConfig: (state, action) => {
      const { bridgeId } = action.payload || {};
      if (!bridgeId) return;
      delete state.configs[bridgeId];
    },
  },
});

export const { setTestCaseConfig, resetTestCaseConfig } = testCaseConfigSlice.actions;
export const getTestCaseConfigDefaults = () => ({ ...defaultConfig });
export default testCaseConfigSlice.reducer;
