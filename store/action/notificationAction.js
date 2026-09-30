import { getNotificationsApi, markNotificationReadApi, markAllNotificationsReadApi } from "@/config/index";
import {
  setNotificationsReducer,
  markNotificationReadReducer,
  markAllNotificationsReadReducer,
  setNotificationsLoadingReducer,
} from "../reducer/notificationReducer";

export const fetchOrgNotificationsAction =
  ({ page = 1, limit = 20 } = {}) =>
  async (dispatch) => {
    dispatch(setNotificationsLoadingReducer({ agentId: null, loading: true }));
    try {
      const response = await getNotificationsApi({ scope: "org", page, limit });
      if (response?.success) {
        dispatch(
          setNotificationsReducer({
            agentId: null,
            data: response.data,
            page: response.page,
            total: response.total,
            unread_count: response.unread_count,
            append: page > 1,
          })
        );
      }
      return response;
    } catch (error) {
      console.error("Error fetching org notifications:", error);
    } finally {
      dispatch(setNotificationsLoadingReducer({ agentId: null, loading: false }));
    }
  };

export const fetchAgentNotificationsAction =
  ({ agentId, page = 1, limit = 20 } = {}) =>
  async (dispatch) => {
    if (!agentId) return;
    dispatch(setNotificationsLoadingReducer({ agentId, loading: true }));
    try {
      const response = await getNotificationsApi({ agent_id: agentId, page, limit });
      if (response?.success) {
        dispatch(
          setNotificationsReducer({
            agentId,
            data: response.data,
            page: response.page,
            total: response.total,
            unread_count: response.unread_count,
            append: page > 1,
          })
        );
      }
      return response;
    } catch (error) {
      console.error("Error fetching agent notifications:", error);
    } finally {
      dispatch(setNotificationsLoadingReducer({ agentId, loading: false }));
    }
  };

export const markNotificationReadAction = (id) => async (dispatch) => {
  dispatch(markNotificationReadReducer({ id }));
  try {
    await markNotificationReadApi(id);
  } catch (error) {
    console.error("Error marking notification as read:", error);
  }
};

export const markAllNotificationsReadAction = (agentId) => async (dispatch) => {
  dispatch(markAllNotificationsReadReducer({ agentId }));
  try {
    await markAllNotificationsReadApi(agentId);
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
  }
};
