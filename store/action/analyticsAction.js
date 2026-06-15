import { getAgentAnalyticsApi } from "@/config/index";
import { fetchAnalyticsFailure, fetchAnalyticsStart, fetchAnalyticsSuccess } from "../reducer/analyticsReducer";

export const getAgentAnalyticsAction =
  (bridge_id, queryParams = {}) =>
  async (dispatch) => {
    dispatch(fetchAnalyticsStart());
    try {
      const response = await getAgentAnalyticsApi(bridge_id, queryParams);
      dispatch(fetchAnalyticsSuccess(response));
      return response;
    } catch (error) {
      console.error("Error in getAgentAnalyticsAction:", error);
      dispatch(fetchAnalyticsFailure(error?.response?.data || error.message));
      throw error;
    }
  };
