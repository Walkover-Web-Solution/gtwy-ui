import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  history: [],
  versionHistory: [],
  thread: [],
  recursiveHistory: null,
  recursiveHistoryLoading: false,
  recursiveHistoryError: null,
  selectedVersion: "all",
  loading: false,
  success: false,
};

export const historyReducer = createSlice({
  name: "History",
  initialState,
  reducers: {
    fetchAllHistoryReducer: (state, action) => {
      if (action.payload.page === 1) {
        state.history = action.payload.data;
      } else {
        state.history = [...state.history, ...action.payload.data];
      }
      state.success = true;
    },
    fetchThreadReducer: (state, action) => {
      if (action.payload.nextPage == 1) {
        state.thread = action.payload.data.data;
      } else {
        state.thread = [...action.payload.data.data, ...state.thread];
      }
    },

    clearThreadData: (state) => {
      state.thread = [];
    },
    updateHistoryMessageReducer: (state, action) => {
      const { index, data } = action.payload;
      state.thread[index] = { ...state.thread[index], ...data };
    },
    userFeedbackCountReducer: (state, action) => {
      const { data } = action.payload;
      state.userFeedbackCount = data;
    },
    fetchSubThreadReducer: (state, action) => {
      const { data } = action.payload;
      state.subThreads = data;
    },
    clearSubThreadData: (state) => {
      state.subThreads = [];
    },
    setSelectedVersion: (state, action) => {
      state.selectedVersion = action.payload;
    },
    clearHistoryData: (state) => {
      state.history = [];
    },
    addThreadUsingRtLayer: (state, action) => {
      const { Thread } = action.payload;
      const threadIndex = state.history.findIndex((thread) => thread.thread_id === Thread.thread_id);
      if (threadIndex !== -1) {
        state.history.splice(threadIndex, 1);
        state.history.unshift(Thread);
      } else {
        state.history.unshift(Thread);
      }
    },
    addThreadNMessageUsingRtLayer: (state, action) => {
      const { thread_id, sub_thread_id, Messages } = action.payload;
      const threadIndex = state.thread.findIndex(
        (thread) => thread.thread_id === thread_id && thread.sub_thread_id === sub_thread_id
      );
      if (threadIndex !== -1) {
        state.thread.push(Messages);
      }
    },
    fetchRecursiveHistoryStart: (state) => {
      state.recursiveHistoryLoading = true;
      state.recursiveHistoryError = null;
    },
    fetchRecursiveHistorySuccess: (state, action) => {
      state.recursiveHistory = action.payload.data;
      state.recursiveHistoryLoading = false;
      state.recursiveHistoryError = null;
    },
  },
});

export const {
  fetchAllHistoryReducer,
  fetchThreadReducer,
  clearThreadData,
  updateHistoryMessageReducer,
  userFeedbackCountReducer,
  fetchSubThreadReducer,
  clearSubThreadData,
  setSelectedVersion,
  clearHistoryData,
  addThreadUsingRtLayer,
  addThreadNMessageUsingRtLayer,
  fetchRecursiveHistoryStart,
  fetchRecursiveHistorySuccess,
} = historyReducer.actions;
export default historyReducer.reducer;
