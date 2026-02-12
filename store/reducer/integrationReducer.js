import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  integrationData: {},
  gtwyAccessToken: "",
  embedTokens: {}, // Store embedTokens by folder_id
  loading: false,
};

export const integrationReducer = createSlice({
  name: "integration",
  initialState,
  reducers: {
    fetchAllIntegrationData: (state, action) => {
      state.integrationData[action.payload.orgId] = action.payload.data;
      state.loading = false;
    },
    addIntegrationDataReducer: (state, action) => {
      const { orgId, data, _id } = action.payload;
      if (state.integrationData[orgId]) {
        state.integrationData[orgId].push({ ...data, _id });
      } else {
        state.integrationData[orgId] = [{ ...data, _id }];
      }
    },
    updateIntegrationDataReducer: (state, action) => {
      const { orgId, data } = action.payload;
      if (state.integrationData[orgId]) {
        state.integrationData[orgId] = state.integrationData[orgId].map((entry) => {
          if (entry._id === data._id) {
            return { ...entry, ...data };
          }
          return entry;
        });
      }
    },
    setEmbedToken: (state, action) => {
      const { folderId, token } = action.payload;
      state.embedTokens[folderId] = token;
    },
    clearEmbedToken: (state, action) => {
      const { folderId } = action.payload;
      delete state.embedTokens[folderId];
    },
  },
});

export const {
  fetchAllIntegrationData,
  addIntegrationDataReducer,
  updateIntegrationDataReducer,
  setEmbedToken,
  clearEmbedToken,
} = integrationReducer.actions;

export default integrationReducer.reducer;
