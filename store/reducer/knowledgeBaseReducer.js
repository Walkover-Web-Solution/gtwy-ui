import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  knowledgeBaseData: {},
  knowledgeBaseBackup: {},
  loading: false,
};

export const knowledgeBaseReducer = createSlice({
  name: "knowledgeBase",
  initialState,
  reducers: {
    knowledgeBaseRollBackReducer: (state, action) => {
      const { orgId } = action.payload;
      // Only restore if we have a backup
      if (state.knowledgeBaseBackup && state.knowledgeBaseBackup[orgId]) {
        // Restore from backup
        state.knowledgeBaseData[orgId] = [...state.knowledgeBaseBackup[orgId]];
      }
    },

    fetchAllKnowlegdeBaseData: (state, action) => {
      state.knowledgeBaseData[action.payload.orgId] = action.payload.data;
      state.loading = false;
    },

    addKnowbaseDataReducer: (state, action) => {
      const { orgId, data, docId, _id } = action.payload;
      if (state.knowledgeBaseData[orgId]) {
        state.knowledgeBaseData[orgId].push({ ...data, docId, _id });
      } else {
        state.knowledgeBaseData[orgId] = [{ ...data, docId, _id }];
      }
    },
    deleteKnowledgeBaseReducer: (state, action) => {
      const { orgId, id } = action.payload;
      if (state.knowledgeBaseData[orgId]) {
        // Handle both property naming patterns (id and _id)
        state.knowledgeBaseData[orgId] = state.knowledgeBaseData[orgId].filter((entry) => {
          // If the entry has _id property, compare with that
          if (entry._id) return entry._id !== id;
          // If the entry has id property, compare with that
          if (entry.id) return entry.id !== id;
          // Default case - shouldn't happen but just in case
          return true;
        });
      }
    },
    // Create a backup of knowledge base data before making changes
    backupKnowledgeBaseReducer: (state, action) => {
      const { orgId } = action.payload;

      // Make sure the backup object exists
      if (!state.knowledgeBaseBackup) {
        state.knowledgeBaseBackup = {};
      }

      // Only create backup if data exists for this org
      if (state.knowledgeBaseData && state.knowledgeBaseData[orgId]) {
        // Use deep cloning to avoid reference issues
        state.knowledgeBaseBackup[orgId] = state.knowledgeBaseData[orgId];
      } else {
        state.knowledgeBaseBackup[orgId] = [];
      }
    },

    // Restore from backup when API call fails
    updateKnowledgeBaseReducer: (state, action) => {
      const { orgId, data, _id } = action.payload;
      if (state.knowledgeBaseData[orgId]) {
        state.knowledgeBaseData[orgId] = state.knowledgeBaseData[orgId].map((entry) =>
          entry._id === _id ? { ...data, _id } : entry
        );
      }
    },
  },
});

export const {
  fetchAllKnowlegdeBaseData,
  addKnowbaseDataReducer,
  deleteKnowledgeBaseReducer,
  updateKnowledgeBaseReducer,
  backupKnowledgeBaseReducer,
  knowledgeBaseRollBackReducer,
} = knowledgeBaseReducer.actions;

export default knowledgeBaseReducer.reducer;
