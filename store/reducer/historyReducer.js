import { createSlice } from "@reduxjs/toolkit";

export const buildThreadKey = (threadId, subThreadId) => (threadId ? `${threadId}::${subThreadId || threadId}` : null);

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
  subThreads: [],
  subThreadsParentId: null,
  // Which thread the messages in `thread` belong to.
  loadedThreadKey: null,
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
      const { threadKey = null, nextPage } = action.payload;
      if (nextPage == 1) {
        state.thread = action.payload.data.data;
        state.loadedThreadKey = threadKey;
        return;
      }
      // Drop a page that resolved after the user moved to another thread.
      if (threadKey && state.loadedThreadKey && threadKey !== state.loadedThreadKey) return;
      state.thread = [...action.payload.data.data, ...state.thread];
      if (threadKey) state.loadedThreadKey = threadKey;
    },

    clearThreadData: (state) => {
      state.thread = [];
      state.loadedThreadKey = null;
      state.recursiveHistory = null;
      state.recursiveHistoryLoading = false;
      state.recursiveHistoryError = null;
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
      const { data, thread_id } = action.payload;
      state.subThreads = data;
      state.subThreadsParentId = thread_id;
    },
    clearSubThreadData: (state) => {
      state.subThreads = [];
      state.subThreadsParentId = null;
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
        if (Messages && typeof Messages === "object") {
          Object.values(Messages).forEach((message) => {
            const exists = state.thread.some((msg) => msg.id === message.id);
            if (!exists) {
              state.thread.push(message);
            }
          });
        }
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
    clearRecursiveHistory: (state) => {
      state.recursiveHistory = null;
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
  clearRecursiveHistory,
} = historyReducer.actions;
export default historyReducer.reducer;
