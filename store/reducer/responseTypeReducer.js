import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  responses: {},
  loading: false,
  error: null,
};

const responseTypeReducer = createSlice({
  name: "responseType",
  initialState,
  reducers: {
    getAllResponseTypeSuccess: (state, action) => {
      const { responseTypes, orgId } = action.payload;
      state.responses[orgId] = responseTypes;
    },
  },
});

export const { getAllResponseTypeSuccess } = responseTypeReducer.actions;
export default responseTypeReducer.reducer;
