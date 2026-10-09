import axios from "@/utils/interceptor";

const URL = process.env.NEXT_PUBLIC_SERVER_URL;
const BASE = `${URL}/api/notifications`;

// ---------- inbox ----------

export const getNotificationsApi = async ({ unread, severity, event_type, page = 1, limit = 20 } = {}) => {
  try {
    const params = new URLSearchParams({ page, limit });
    if (unread) params.set("unread", "true");
    if (severity) params.set("severity", severity);
    if (event_type) params.set("event_type", event_type);
    const response = await axios.get(`${BASE}?${params.toString()}`);
    return response?.data;
  } catch (error) {
    console.error("Error fetching notifications:", error);
    throw error;
  }
};

export const markNotificationReadApi = async (id) => {
  try {
    const response = await axios.patch(`${BASE}/${id}/read`);
    return response?.data;
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
};

export const markAllNotificationsReadApi = async () => {
  try {
    const response = await axios.patch(`${BASE}/read-all`, { scope: "all" });
    return response?.data;
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    throw error;
  }
};

export const getNotificationCatalogueApi = async () => {
  try {
    const response = await axios.get(`${BASE}/catalogue`);
    return response?.data;
  } catch (error) {
    console.error("Error fetching notification catalogue:", error);
    throw error;
  }
};

// ---------- channels ----------

export const getNotificationChannelsApi = async () => {
  try {
    const response = await axios.get(`${BASE}/channels`);
    return response?.data;
  } catch (error) {
    console.error("Error fetching notification channels:", error);
    throw error;
  }
};

export const createNotificationChannelApi = async (channel) => {
  try {
    const response = await axios.post(`${BASE}/channels`, channel);
    return response?.data;
  } catch (error) {
    console.error("Error creating notification channel:", error);
    throw error;
  }
};

export const updateNotificationChannelApi = async (id, updates) => {
  try {
    const response = await axios.put(`${BASE}/channels/${id}`, updates);
    return response?.data;
  } catch (error) {
    console.error("Error updating notification channel:", error);
    throw error;
  }
};

export const deleteNotificationChannelApi = async (id) => {
  try {
    const response = await axios.delete(`${BASE}/channels/${id}`);
    return response?.data;
  } catch (error) {
    console.error("Error deleting notification channel:", error);
    throw error;
  }
};

export const testNotificationChannelApi = async (id) => {
  try {
    const response = await axios.post(`${BASE}/channels/${id}/test`);
    return response?.data;
  } catch (error) {
    console.error("Error testing notification channel:", error);
    throw error;
  }
};

// ---------- rules ----------

export const getNotificationRulesApi = async () => {
  try {
    const response = await axios.get(`${BASE}/rules`);
    return response?.data;
  } catch (error) {
    console.error("Error fetching notification rules:", error);
    throw error;
  }
};

export const createNotificationRuleApi = async (rule) => {
  try {
    const response = await axios.post(`${BASE}/rules`, rule);
    return response?.data;
  } catch (error) {
    console.error("Error creating notification rule:", error);
    throw error;
  }
};

export const updateNotificationRuleApi = async (id, updates) => {
  try {
    const response = await axios.put(`${BASE}/rules/${id}`, updates);
    return response?.data;
  } catch (error) {
    console.error("Error updating notification rule:", error);
    throw error;
  }
};

export const deleteNotificationRuleApi = async (id) => {
  try {
    const response = await axios.delete(`${BASE}/rules/${id}`);
    return response?.data;
  } catch (error) {
    console.error("Error deleting notification rule:", error);
    throw error;
  }
};

// ---------- delivery log ----------

export const getNotificationDeliveriesApi = async ({ status, channel_id, page = 1, limit = 50 } = {}) => {
  try {
    const params = new URLSearchParams({ page, limit });
    if (status) params.set("status", status);
    if (channel_id) params.set("channel_id", channel_id);
    const response = await axios.get(`${BASE}/deliveries?${params.toString()}`);
    return response?.data;
  } catch (error) {
    console.error("Error fetching notification deliveries:", error);
    throw error;
  }
};

export const retryNotificationDeliveryApi = async (id) => {
  try {
    const response = await axios.post(`${BASE}/deliveries/${id}/retry`);
    return response?.data;
  } catch (error) {
    console.error("Error retrying notification delivery:", error);
    throw error;
  }
};
