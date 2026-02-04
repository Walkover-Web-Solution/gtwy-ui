import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  apikeys: {},
  apikeysBackup: {},
  loading: false,
  error: null,
};

export const apiKeysReducer = createSlice({
  name: "ApiKeys",
  initialState,
  reducers: {
    apikeyDataReducer: (state, action) => {
      const { org_id, data } = action.payload;
      if (!state.apikeys) {
        state.apikeys = {};
      }

      if (!state.apikeys[org_id]) {
        state.apikeys[org_id] = [];
      }
      state.apikeys[org_id] = data;
    },
    createApiKeyReducer: (state, action) => {
      const { org_id, data } = action.payload;
      if (state.apikeys[org_id]) {
        state.apikeys[org_id].push(data);
      } else {
        state.apikeys[org_id] = [data];
      }
    },

    // Create a backup of the API keys before any updates
    backupApiKeysReducer: (state, action) => {
      const { org_id } = action.payload;

      // Make sure apikeysBackup exists
      if (!state.apikeysBackup) {
        state.apikeysBackup = {};
      }

      // Only make a backup if the keys exist
      if (state.apikeys && state.apikeys[org_id]) {
        // Use deep cloning to avoid reference issues
        state.apikeysBackup[org_id] = state.apikeys[org_id];
      } else {
        state.apikeysBackup[org_id] = [];
      }
    },

    // Restore from backup when an API call fails
    apikeyRollBackReducer: (state, action) => {
      const { org_id } = action.payload;

      // Only restore if we have a backup
      if (state.apikeysBackup && state.apikeysBackup[org_id]) {
        // Restore the backup
        state.apikeys[org_id] = [...state.apikeysBackup[org_id]];
      }
    },

    // Update an API key (optimistically or with server data)
    apikeyUpdateReducer: (state, action) => {
      const { org_id, id, data, name, comment, apikey_limit, apikey_usage } = action.payload;

      if (state.apikeys && state.apikeys[org_id]) {
        const index = state.apikeys[org_id].findIndex((apikey) => apikey._id === id);
        if (index !== -1) {
          // Update the target with new values
          const target = state.apikeys[org_id][index];
          if (name !== undefined) target.name = name;
          if (data !== undefined) target.apikey = data;
          if (comment !== undefined) target.comment = comment;
          if (apikey_limit !== undefined) target.apikey_limit = apikey_limit;
          if (apikey_usage !== undefined) target.apikey_usage = apikey_usage;
        }
      }
    },

    apikeyDeleteReducer: (state, action) => {
      const { org_id, name } = action.payload;
      if (state.apikeys[org_id]) {
        state.apikeys[org_id] = state.apikeys[org_id].filter((apiKey) => apiKey.name !== name);
      }
    },
  },
});

export const {
  apikeyDataReducer,
  createApiKeyReducer,
  backupApiKeysReducer,
  apikeyRollBackReducer,
  apikeyUpdateReducer,
  apikeyDeleteReducer,
} = apiKeysReducer.actions;

export default apiKeysReducer.reducer;
