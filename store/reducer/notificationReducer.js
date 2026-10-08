import { createSlice } from "@reduxjs/toolkit";

const initialInbox = () => ({ items: [], page: 1, total: 0, unreadCount: 0, loading: false, fetched: false });

// The inbox holds every notification the user can see: org-wide, every agent's, and global
// broadcasts. Rules, channels and deliveries back the admin tabs of the notification centre.
const initialState = {
  inbox: initialInbox(),
  catalogue: [],
  rules: { items: [], loading: false, fetched: false },
  channels: { items: [], loading: false, fetched: false },
  deliveries: { items: [], total: 0, page: 1, loading: false },
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
      // The same notification can arrive on more than one RTLayer channel; keep one copy.
      if (state.inbox.items.some((item) => item._id === notification._id)) return;
      state.inbox.items = [{ ...notification, read: false }, ...state.inbox.items];
      state.inbox.total += 1;
      state.inbox.unreadCount += 1;
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
    setSettingsLoadingReducer: (state, action) => {
      const { key, loading } = action.payload;
      state[key].loading = loading;
    },
    setRulesReducer: (state, action) => {
      state.rules = { items: action.payload, loading: false, fetched: true };
    },
    upsertRuleReducer: (state, action) => {
      const rule = action.payload;
      const index = state.rules.items.findIndex((item) => item._id === rule._id);
      if (index === -1) state.rules.items.unshift(rule);
      else state.rules.items[index] = rule;
    },
    removeRuleReducer: (state, action) => {
      state.rules.items = state.rules.items.filter((item) => item._id !== action.payload);
    },
    setChannelsReducer: (state, action) => {
      state.channels = { items: action.payload, loading: false, fetched: true };
    },
    upsertChannelReducer: (state, action) => {
      const channel = action.payload;
      const index = state.channels.items.findIndex((item) => item._id === channel._id);
      if (index === -1) state.channels.items.unshift(channel);
      else state.channels.items[index] = channel;
    },
    removeChannelReducer: (state, action) => {
      const channelId = action.payload;
      state.channels.items = state.channels.items.filter((item) => item._id !== channelId);
      // The backend drops a deleted channel from every rule; mirror that locally.
      state.rules.items = state.rules.items.map((rule) => ({
        ...rule,
        channel_ids: (rule.channel_ids || []).filter((id) => id !== channelId),
      }));
    },
    setDeliveriesReducer: (state, action) => {
      const { data, total, page, append } = action.payload;
      state.deliveries = {
        items: append ? [...state.deliveries.items, ...data] : data,
        total,
        page,
        loading: false,
      };
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
  setSettingsLoadingReducer,
  setRulesReducer,
  upsertRuleReducer,
  removeRuleReducer,
  setChannelsReducer,
  upsertChannelReducer,
  removeChannelReducer,
  setDeliveriesReducer,
} = notificationReducer.actions;

export default notificationReducer.reducer;
