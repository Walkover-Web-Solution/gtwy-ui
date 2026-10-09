import { createSlice } from "@reduxjs/toolkit";

const initialInbox = () => ({ items: [], page: 1, total: 0, unreadCount: 0, loading: false, fetched: false });

// The inbox holds every notification the user can see: org-wide, every agent's, and global
// broadcasts. Alerts are configured in the Alerts section; this only shows what happened.
const initialState = {
  inbox: initialInbox(),
  catalogue: [],
};

export const notificationReducer = createSlice({
  name: "Notification",
  initialState,
  reducers: {
    setInboxLoadingReducer: (state, action) => {
      state.inbox.loading = action.payload;
    },
    setInboxReducer: (state, action) => {
      const { data, page, total, unread_count, append } = action.payload;
      const existing = append ? state.inbox.items : [];
      const seen = new Set(existing.map((item) => item._id));
      state.inbox.items = [...existing, ...data.filter((item) => !seen.has(item._id))];
      state.inbox.page = page;
      state.inbox.total = total;
      state.inbox.unreadCount = unread_count;
      state.inbox.fetched = true;
    },
    addNotificationReducer: (state, action) => {
      const { notification } = action.payload;
      const incoming = { ...notification, read: false };
      const index = state.inbox.items.findIndex((item) => item._id === notification._id);
      if (index === -1) {
        state.inbox.items = [incoming, ...state.inbox.items];
        state.inbox.total += 1;
        state.inbox.unreadCount += 1;
        return;
      }
      const existing = state.inbox.items[index];
      // The same push can arrive twice (several listeners); only a newer version counts.
      if (existing.updatedAt && existing.updatedAt === notification.updatedAt) return;
      // A repeat of the alert was merged into this notification: move it up, unread again.
      if (existing.read) state.inbox.unreadCount += 1;
      state.inbox.items.splice(index, 1);
      state.inbox.items.unshift(incoming);
    },
    markNotificationReadReducer: (state, action) => {
      const notification = state.inbox.items.find((item) => item._id === action.payload.id);
      if (notification && !notification.read) {
        notification.read = true;
        state.inbox.unreadCount = Math.max(0, state.inbox.unreadCount - 1);
      }
    },
    markAllNotificationsReadReducer: (state) => {
      state.inbox.items = state.inbox.items.map((item) => ({ ...item, read: true }));
      state.inbox.unreadCount = 0;
    },
    setCatalogueReducer: (state, action) => {
      state.catalogue = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase("organization/setCurrentOrgId", () => initialState)
      .addCase("organization/clearCurrentOrgId", () => initialState);
  },
});

export const {
  setInboxLoadingReducer,
  setInboxReducer,
  addNotificationReducer,
  markNotificationReadReducer,
  markAllNotificationsReadReducer,
  setCatalogueReducer,
} = notificationReducer.actions;

export default notificationReducer.reducer;
