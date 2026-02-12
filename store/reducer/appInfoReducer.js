import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  embedUserDetails: {},
  appInfo: {},
  loading: false,
  error: null,
};

export const appInfoReducer = createSlice({
  name: "appInfo",
  initialState,
  reducers: {
    setEmbedUserDetails: (state, action) => {
      const validUpdates = Object.entries(action.payload).reduce((acc, [key, value]) => {
        if (value !== null && value !== undefined) {
          // Convert string booleans to actual booleans
          if (value === 'true') {
            acc[key] = true;
          } else if (value === 'false') {
            acc[key] = false;
          } else {
            acc[key] = value;
          }
        }
        return acc;
      }, {});
      state.embedUserDetails = {
        ...state.embedUserDetails,
        ...validUpdates,
      };
    },
    clearEmbedThemeDetails: (state) => {
      state.embedUserDetails.theme_config = {};
    },
  },
});

export const { setEmbedUserDetails, clearEmbedThemeDetails } = appInfoReducer.actions;

export default appInfoReducer.reducer;
