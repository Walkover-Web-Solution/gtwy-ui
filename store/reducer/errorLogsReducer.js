import { createSlice, nanoid } from "@reduxjs/toolkit";

// NOTE: This slice is intentionally NOT added to the redux-persist whitelist.
// Error logs are kept only for the current session to aid debugging.

const MAX_LOGS = 100;

const initialState = {
  logs: [],
  unseenCount: 0,
};

const errorLogsSlice = createSlice({
  name: "errorLogs",
  initialState,
  reducers: {
    addErrorLog: {
      prepare: (payload = {}) => ({
        payload: {
          id: nanoid(),
          timestamp: Date.now(),
          message: payload.message || "Unknown error",
          status: payload.status ?? null,
          url: payload.url || null,
          method: payload.method || null,
          source: payload.source || "api",
          details: payload.details || null,
        },
      }),
      reducer: (state, action) => {
        state.logs.unshift(action.payload);
        if (state.logs.length > MAX_LOGS) {
          state.logs.length = MAX_LOGS;
        }
        state.unseenCount += 1;
      },
    },
    markErrorLogsSeen: (state) => {
      state.unseenCount = 0;
    },
    removeErrorLog: (state, action) => {
      state.logs = state.logs.filter((log) => log.id !== action.payload);
    },
    clearErrorLogs: (state) => {
      state.logs = [];
      state.unseenCount = 0;
    },
  },
});

export const { addErrorLog, markErrorLogsSeen, removeErrorLog, clearErrorLogs } = errorLogsSlice.actions;

export default errorLogsSlice.reducer;
