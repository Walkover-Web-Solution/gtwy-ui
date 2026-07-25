import axios from "@/utils/interceptor";

const URL = process.env.NEXT_PUBLIC_SERVER_URL;

export const getAgentAnalyticsApi = async (bridge_id, queryParams = {}, org_id, user_id) => {
  try {
    const resolvedUserId = user_id || (typeof window !== "undefined" ? sessionStorage.getItem("gtwy_user_id") : null);
    const response = await axios.get(`${URL}/api/analytics/agent/${encodeURIComponent(bridge_id)}`, {
      params: {
        ...queryParams,
        analytics: true,
        ...(org_id && { org_id }),
        ...(resolvedUserId && { user_id: resolvedUserId }),
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching agent analytics:", error);
    throw error;
  }
};

export const getAgentAnalyticsFiltersApi = async (bridge_id, user_id) => {
  try {
    const resolvedUserId = user_id || (typeof window !== "undefined" ? sessionStorage.getItem("gtwy_user_id") : null);
    const response = await axios.get(`${URL}/api/analytics/agent/${encodeURIComponent(bridge_id)}/filters`, {
      params: { ...(resolvedUserId && { user_id: resolvedUserId }) },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching agent analytics filters:", error);
    throw error;
  }
};
