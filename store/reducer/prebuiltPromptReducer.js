import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  PrebuiltPrompts: [],
  loading: false,
  error: null,
};

const prebuiltPromptReducer = createSlice({
  name: "prebuiltPrompt",
  initialState,
  reducers: {
    getAllPrebuiltPrompts: (state, action) => {
      state.PrebuiltPrompts = action.payload;
    },
    updatePrebuiltPromptData: (state, action) => {
      const { key, value } = action.payload;
      const index = state.PrebuiltPrompts.findIndex((item) => item[key] !== undefined);

      if (index !== -1) {
        // Update existing item
        state.PrebuiltPrompts[index][key] = value;
      } else {
        // Add new item if not found
        state.PrebuiltPrompts.push({ [key]: value });
      }
    },
  },
});

export const { getAllPrebuiltPrompts, updatePrebuiltPromptData } = prebuiltPromptReducer.actions;

export default prebuiltPromptReducer.reducer;
