import { createSlice } from "@reduxjs/toolkit";

const createBucket = () => ({ items: [], page: 1, total: 0, unreadCount: 0, loading: false });

const initialState = {
  org: createBucket(),
  byAgent: {},
};

function getBucket(state, agentId) {
  if (!agentId) return state.org;
  if (!state.byAgent[agentId]) {
    state.byAgent[agentId] = createBucket();
  }
  return state.byAgent[agentId];
}

export const notificationReducer = createSlice({
  name: "Notification",
  initialState,
  reducers: {
    setNotificationsReducer: (state, action) => {
      const { agentId, data, page, total, unread_count, append } = action.payload;
      const bucket = getBucket(state, agentId);
      bucket.items = append ? [...bucket.items, ...data] : data;
      bucket.page = page;
      bucket.total = total;
      bucket.unreadCount = unread_count;
    },
    addNotificationReducer: (state, action) => {
      const { agentId, notification } = action.payload;
      const bucket = getBucket(state, agentId);
      // The RTLayer channel a notification arrives on already matches its scope
      // (org channel vs agent channel), but guard against duplicate delivery anyway.
      if (bucket.items.some((item) => item._id === notification._id)) {
        return;
      }
      bucket.items = [{ ...notification, read: false }, ...bucket.items];
      bucket.total += 1;
      bucket.unreadCount += 1;
    },
    markNotificationReadReducer: (state, action) => {
      const { id } = action.payload;
      const buckets = [state.org, ...Object.values(state.byAgent)];
      for (const bucket of buckets) {
        const notification = bucket.items.find((item) => item._id === id);
        if (notification && !notification.read) {
          notification.read = true;
          bucket.unreadCount = Math.max(0, bucket.unreadCount - 1);
          break;
        }
      }
    },
    markAllNotificationsReadReducer: (state, action) => {
      const agentId = action.payload?.agentId;
      const buckets = agentId ? [state.org, getBucket(state, agentId)] : [state.org];
      buckets.forEach((bucket) => {
        bucket.items = bucket.items.map((item) => ({ ...item, read: true }));
        bucket.unreadCount = 0;
      });
    },
    setNotificationsLoadingReducer: (state, action) => {
      const { agentId, loading } = action.payload;
      getBucket(state, agentId).loading = loading;
    },
  },
});

export const {
  setNotificationsReducer,
  addNotificationReducer,
  markNotificationReadReducer,
  markAllNotificationsReadReducer,
  setNotificationsLoadingReducer,
} = notificationReducer.actions;

export default notificationReducer.reducer;
