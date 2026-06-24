import { getAgentAnalyticsApi } from "@/config/index";
import { fetchAnalyticsFailure, fetchAnalyticsStart, fetchAnalyticsSuccess } from "../reducer/analyticsReducer";

export const getAgentAnalyticsAction =
  (bridge_id, queryParams = {}, org_id) =>
  async (dispatch) => {
    dispatch(fetchAnalyticsStart());
    try {
      const response = await getAgentAnalyticsApi(bridge_id, queryParams, org_id);
      dispatch(fetchAnalyticsSuccess({ ...response, bridge_id }));
      return response;
    } catch (error) {
      console.error("Error in getAgentAnalyticsAction:", error);
      dispatch(fetchAnalyticsFailure(error?.response?.data || error.message));
      throw error;
    }
  };
