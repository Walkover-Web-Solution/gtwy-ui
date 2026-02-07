import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  organizations: [],
  currentOrgId: null,
  loading: false,
  error: null,
  users: [],
};

const orgReducer = createSlice({
  name: "organization",
  initialState,
  reducers: {
    organizationCreated: (state, action) => {
      if (!state.organizations) {
        state.organizations = [];
      }
      state.organizations.push(action.payload);
      // return action.payload._id
    },
    organizationsFetched: (state, action) => {
      state.organizations = action.payload.data.data;
      const allOrgMap = {};

      action.payload.data.data?.map((singleOrg) => {
        allOrgMap[singleOrg?._id] = singleOrg;
      });
      state.allOrgMap = allOrgMap;
    },
    setCurrentOrgId: (state, action) => {
      state.currentOrgId = action.payload;
    },
    clearCurrentOrgId: (state) => {
      state.currentOrgId = null;
    },
    usersFetched: (state, action) => {
      state.users = action.payload.data;
    },
  },
});

export const { organizationCreated, organizationsFetched, setCurrentOrgId, clearCurrentOrgId, usersFetched } =
  orgReducer.actions;

export default orgReducer.reducer;
