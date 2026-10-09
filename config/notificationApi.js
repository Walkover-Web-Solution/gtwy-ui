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
