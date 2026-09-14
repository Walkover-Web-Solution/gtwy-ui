import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  userDetails: {},
  organizations: [],
  blockedOrgIds: [],
  blockedOrgReasons: {},
  loading: false,
  success: false,
};

export const userDetailsReducer = createSlice({
  name: "user",
  initialState,
  reducers: {
    fetchUserDetails: (state, action) => {
      state.userDetails = action.payload;
      const org = {};
      action.payload.c_companies.forEach((element) => {
        org[element.id] = element;
      });
      state.organizations = org;
      state.success = action.payload.success;
    },
    updateUserDetails: (state, action) => {
      const { orgId, updatedUserDetails } = action.payload;
      state.organizations[orgId] = updatedUserDetails;
    },
    updateToken: (state, action) => {
      const { auth_token, orgId } = action.payload;
      state.organizations[orgId] = {
        ...state.organizations[orgId],
        meta: {
          ...state.organizations[orgId]?.meta,
          auth_token: auth_token,
        },
      };
    },
    updateGtwyAccessToken: (state, action) => {
      const { gtwyAccessToken, orgId } = action.payload;
      state.organizations[orgId] = {
        ...state.organizations[orgId],
        meta: {
          ...state.organizations[orgId]?.meta,
          gtwyAccessToken: gtwyAccessToken,
        },
      };
    },
    updateUserMeta: (state, action) => {
      const { user } = action.payload;
      state.userDetails = {
        ...state.userDetails,
        meta: {
          ...state.userDetails.meta,
          ...user?.meta,
        },
      };
    },
    setBlockedOrgs: (state, action) => {
      const blockedOrgs = action.payload || [];
      state.blockedOrgIds = blockedOrgs.map((blockedOrg) => blockedOrg.org_id);
      state.blockedOrgReasons = blockedOrgs.reduce((reasons, blockedOrg) => {
        reasons[blockedOrg.org_id] = blockedOrg.reason;
        return reasons;
      }, {});
    },
  },
});

export const {
  fetchUserDetails,
  updateUserDetails,
  updateToken,
  updateGtwyAccessToken,
  updateUserMeta,
  setBlockedOrgs,
} = userDetailsReducer.actions;
export default userDetailsReducer.reducer;
