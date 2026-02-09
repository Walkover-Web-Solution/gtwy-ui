import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  serviceModels: {},
  loading: false,
};

export const modelReducer = createSlice({
  name: "Model",
  initialState,
  reducers: {
    fetchModelReducer: (state, action) => {
      const { data, service } = action.payload;
      state.serviceModels[service] = data;
    },
    addNewModelReducer: (state, action) => {
      const { service, type, modelData } = action.payload;
      if (!state.serviceModels[service]) {
        state.serviceModels[service] = {};
      }
      if (!state.serviceModels[service][type]) {
        state.serviceModels[service][type] = {};
      }
      state.serviceModels[service][type][modelData.model_name] = modelData;
    },
    deleteModelReducer: (state, action) => {
      const { service, type, model_name } = action.payload;
      if (state.serviceModels[service]?.[type]?.[model_name]) {
        delete state.serviceModels[service][type][model_name];
      }
    },
  },
});

export const { fetchModelReducer, addNewModelReducer, deleteModelReducer } = modelReducer.actions;
export default modelReducer.reducer;
