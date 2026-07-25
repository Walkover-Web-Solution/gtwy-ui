import { getAgentAnalyticsApi } from "@/config/index";
import { fetchAnalyticsFailure, fetchAnalyticsStart, fetchAnalyticsSuccess } from "../reducer/analyticsReducer";

export const getAgentAnalyticsAction =
  (bridge_id, queryParams = {}, org_id) =>
  async (dispatch, getState) => {
    dispatch(fetchAnalyticsStart());
    try {
      const state = getState();
      const user_id =
        state?.userDetailsReducer?.userDetails?.id ||
        (typeof window !== "undefined" ? sessionStorage.getItem("gtwy_user_id") : null);
      const response = await getAgentAnalyticsApi(bridge_id, queryParams, org_id, user_id);
      const pageSize = parseInt(queryParams.page_size, 10) || 20;
      const pageNum = parseInt(queryParams.page, 10) || 1;
      dispatch(
        fetchAnalyticsSuccess({
          ...response,
          bridge_id,
          pagination: {
            page: pageNum,
            page_size: pageSize,
            has_more: (response?.data?.length || 0) >= pageSize,
          },
        })
      );
      return response;
    } catch (error) {
      console.error("Error in getAgentAnalyticsAction:", error);
      dispatch(fetchAnalyticsFailure(error?.response?.data || error.message));
      throw error;
    }
  };
