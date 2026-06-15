import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  analyticsData: {},
  loading: false,
  error: null,
};

export const analyticsSlice = createSlice({
  name: "analytics",
  initialState,
  reducers: {
    fetchAnalyticsStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchAnalyticsSuccess: (state, action) => {
      state.loading = false;
      const { bridge_id, ...rest } = action.payload;
      if (bridge_id) {
        state.analyticsData[bridge_id] = { ...state.analyticsData[bridge_id], ...rest };
      }
    },
    updateAnalyticsFromRtLayer: (state, action) => {
      const { bridge_id, type, ...data } = action.payload;
      if (!bridge_id || !type) return;

      if (!state.analyticsData[bridge_id]) {
        state.analyticsData[bridge_id] = {};
      }

      if (type === "summary") {
        state.analyticsData[bridge_id].summary = data.summary;
      } else if (type === "requests_over_time") {
        state.analyticsData[bridge_id].requests_over_time = data.requests_over_time;
      } else if (type === "response_time") {
        state.analyticsData[bridge_id].response_time = data.response_time;
      }
    },
    fetchAnalyticsFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    clearAnalyticsData: (state, action) => {
      const bridge_id = action.payload;
      if (bridge_id) {
        delete state.analyticsData[bridge_id];
      } else {
        state.analyticsData = {};
      }
    },
  },
});

export const {
  fetchAnalyticsStart,
  fetchAnalyticsSuccess,
  fetchAnalyticsFailure,
  clearAnalyticsData,
  updateAnalyticsFromRtLayer,
} = analyticsSlice.actions;

export default analyticsSlice.reducer;
