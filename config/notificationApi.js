import axios from "@/utils/interceptor";

const URL = process.env.NEXT_PUBLIC_SERVER_URL;

export const getNotificationsApi = async ({ agent_id, scope, page = 1, limit = 20 } = {}) => {
  try {
    const params = new URLSearchParams({ page, limit });
    if (scope) params.set("scope", scope);
    if (agent_id) params.set("agent_id", agent_id);
    const response = await axios.get(`${URL}/api/notifications?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching notifications:", error);
    throw new Error(error);
  }
};

export const markNotificationReadApi = async (id) => {
  try {
    const response = await axios.patch(`${URL}/api/notifications/${id}/read`);
    return response.data;
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw new Error(error);
  }
};

export const markAllNotificationsReadApi = async (agent_id) => {
  try {
    const response = await axios.patch(`${URL}/api/notifications/read-all`, agent_id ? { agent_id } : {});
    return response.data;
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    throw new Error(error);
  }
};
