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
        const newThreads = rest.threads || rest.data || [];
        const isFirstPage = !rest.pagination || (rest.pagination?.page || 1) <= 1;
        if (isFirstPage) {
          // Replace threads on first page / filter change
          state.analyticsData[bridge_id] = {
            ...state.analyticsData[bridge_id],
            ...rest,
            threads: newThreads,
          };
        } else {
          // Merge threads on pagination (infinite scroll)
          const existingThreads = state.analyticsData[bridge_id]?.threads || [];
          const threadMap = new Map();
          [...existingThreads, ...newThreads].forEach((t) => {
            if (t?.thread_id) threadMap.set(t.thread_id, t);
          });
          state.analyticsData[bridge_id] = {
            ...state.analyticsData[bridge_id],
            ...rest,
            threads: Array.from(threadMap.values()),
          };
        }
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
    addAnalyticsThread: (state, action) => {
      const { bridge_id, thread } = action.payload;
      if (!bridge_id || !thread?.thread_id) return;
      if (!state.analyticsData[bridge_id]) {
        state.analyticsData[bridge_id] = { threads: [] };
      }
      const existing = state.analyticsData[bridge_id].threads || [];
      const idx = existing.findIndex((t) => t.thread_id === thread.thread_id);
      if (idx === -1) {
        state.analyticsData[bridge_id].threads = [thread, ...existing];
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
  addAnalyticsThread,
} = analyticsSlice.actions;

export default analyticsSlice.reducer;
