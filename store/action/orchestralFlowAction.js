import { getConnectedAgentFlowApi } from "@/config/index";
import {
  setConnectedAgentFlowData,
  setConnectedAgentFlowError,
  setConnectedAgentFlowLoading,
} from "../reducer/orchestralFlowReducer";

export const getConnectedAgentFlowAction =
  ({ orgId, bridgeId, versionId }) =>
  async (dispatch) => {
    if (!versionId || !orgId || !bridgeId) return;
    try {
      dispatch(setConnectedAgentFlowLoading(true));
      const response = await getConnectedAgentFlowApi({ versionId });
      const payload = response?.data || response;
      dispatch(setConnectedAgentFlowData({ orgId, bridgeId, versionId, data: payload }));
    } catch (error) {
      dispatch(setConnectedAgentFlowError());
      console.error("Failed to load connected agent flow", error);
    }
  };

// Action to update connected agent flow in Redux (for real-time updates)
export const updateConnectedAgentFlowAction =
  ({ orgId, bridgeId, versionId, flowData }) =>
  (dispatch) => {
    dispatch(setConnectedAgentFlowData({ orgId, bridgeId, versionId, data: flowData }));
  };
