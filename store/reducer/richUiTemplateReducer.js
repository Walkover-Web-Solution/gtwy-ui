import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  templates: [],
  isLoading: false,
  isError: false,
  errorMessage: "",
};

const richUiTemplateSlice = createSlice({
  name: "richUiTemplate",
  initialState,
  reducers: {
    getRichUiTemplatesPending: (state) => {
      state.isLoading = true;
      state.isError = false;
    },
    getRichUiTemplatesSuccess: (state, action) => {
      state.isLoading = false;
      state.templates = action.payload;
      state.isError = false;
    },
    getRichUiTemplatesError: (state, action) => {
      state.isLoading = false;
      state.isError = true;
      state.errorMessage = action.payload;
    },
    createRichUiTemplateApiSuccess: (state, action) => {
      state.isLoading = false;
      state.templates = [action.payload, ...state.templates];
      state.isError = false;
    },
  },
});

export const {
  getRichUiTemplatesPending,
  getRichUiTemplatesSuccess,
  getRichUiTemplatesError,
  createRichUiTemplateApiSuccess,
} = richUiTemplateSlice.actions;

export default richUiTemplateSlice.reducer;
