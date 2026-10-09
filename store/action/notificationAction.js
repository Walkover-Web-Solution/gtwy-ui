import {
  getNotificationsApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
  getNotificationCatalogueApi,
  getNotificationChannelsApi,
  createNotificationChannelApi,
  updateNotificationChannelApi,
  deleteNotificationChannelApi,
  testNotificationChannelApi,
  getNotificationRulesApi,
  createNotificationRuleApi,
  updateNotificationRuleApi,
  deleteNotificationRuleApi,
  getNotificationDeliveriesApi,
  retryNotificationDeliveryApi,
} from "@/config/index";
import {
  setInboxLoadingReducer,
  setInboxReducer,
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
} from "../reducer/notificationReducer";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/utils/errorHandler";

// ---------- inbox ----------

export const fetchNotificationsAction =
  ({ page = 1, limit = 20, unread, severity, event_type } = {}) =>
  async (dispatch) => {
    dispatch(setInboxLoadingReducer(true));
    try {
      const response = await getNotificationsApi({ page, limit, unread, severity, event_type });
      if (response?.success) {
        dispatch(
          setInboxReducer({
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
      console.error("Error fetching notifications:", error);
    } finally {
      dispatch(setInboxLoadingReducer(false));
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

export const markAllNotificationsReadAction = () => async (dispatch) => {
  dispatch(markAllNotificationsReadReducer());
  try {
    await markAllNotificationsReadApi();
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
  }
};

export const fetchNotificationCatalogueAction = () => async (dispatch, getState) => {
  if (getState().notificationReducer?.catalogue?.length) return;
  try {
    const response = await getNotificationCatalogueApi();
    if (response?.success) dispatch(setCatalogueReducer(response.data));
  } catch (error) {
    console.error("Error fetching notification catalogue:", error);
  }
};

// ---------- channels ----------

export const fetchNotificationChannelsAction = () => async (dispatch) => {
  dispatch(setSettingsLoadingReducer({ key: "channels", loading: true }));
  try {
    const response = await getNotificationChannelsApi();
    if (response?.success) dispatch(setChannelsReducer(response.data));
  } catch (error) {
    toast.error(getErrorMessage(error));
    dispatch(setSettingsLoadingReducer({ key: "channels", loading: false }));
  }
};

export const saveNotificationChannelAction = (id, channel) => async (dispatch) => {
  try {
    const response = id ? await updateNotificationChannelApi(id, channel) : await createNotificationChannelApi(channel);
    if (response?.success) {
      dispatch(upsertChannelReducer(response.data));
      toast.success(id ? "Channel updated" : "Channel created");
      return response.data;
    }
  } catch (error) {
    toast.error(getErrorMessage(error));
  }
  return null;
};

export const deleteNotificationChannelAction = (id) => async (dispatch) => {
  try {
    const response = await deleteNotificationChannelApi(id);
    if (response?.success) {
      dispatch(removeChannelReducer(id));
      toast.success("Channel deleted");
    }
  } catch (error) {
    toast.error(getErrorMessage(error));
    throw error;
  }
};

export const testNotificationChannelAction = (id) => async () => {
  try {
    const response = await testNotificationChannelApi(id);
    if (response?.success) toast.success("Test sent. The channel responded successfully.");
    else toast.error(`Test failed: ${response?.data?.error || "no response"}`);
    return response;
  } catch (error) {
    toast.error(getErrorMessage(error));
  }
};

// ---------- rules ----------

export const fetchNotificationRulesAction = () => async (dispatch) => {
  dispatch(setSettingsLoadingReducer({ key: "rules", loading: true }));
  try {
    const response = await getNotificationRulesApi();
    if (response?.success) dispatch(setRulesReducer(response.data));
  } catch (error) {
    toast.error(getErrorMessage(error));
    dispatch(setSettingsLoadingReducer({ key: "rules", loading: false }));
  }
};

export const saveNotificationRuleAction = (id, rule) => async (dispatch) => {
  try {
    const response = id ? await updateNotificationRuleApi(id, rule) : await createNotificationRuleApi(rule);
    if (response?.success) {
      dispatch(upsertRuleReducer(response.data));
      toast.success(id ? "Rule updated" : "Rule created");
      return response.data;
    }
  } catch (error) {
    toast.error(getErrorMessage(error));
  }
  return null;
};

export const toggleNotificationRuleAction = (rule) => async (dispatch) => {
  dispatch(upsertRuleReducer({ ...rule, enabled: !rule.enabled }));
  try {
    await updateNotificationRuleApi(rule._id, { enabled: !rule.enabled });
  } catch (error) {
    dispatch(upsertRuleReducer(rule));
    toast.error(getErrorMessage(error));
  }
};

export const deleteNotificationRuleAction = (id) => async (dispatch) => {
  try {
    const response = await deleteNotificationRuleApi(id);
    if (response?.success) {
      dispatch(removeRuleReducer(id));
      toast.success("Rule deleted");
    }
  } catch (error) {
    toast.error(getErrorMessage(error));
    throw error;
  }
};

// ---------- delivery log ----------

export const fetchNotificationDeliveriesAction =
  ({ status, page = 1 } = {}) =>
  async (dispatch) => {
    dispatch(setSettingsLoadingReducer({ key: "deliveries", loading: true }));
    try {
      const response = await getNotificationDeliveriesApi({ status, page });
      if (response?.success) {
        dispatch(
          setDeliveriesReducer({ data: response.data, total: response.total, page: response.page, append: page > 1 })
        );
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
      dispatch(setSettingsLoadingReducer({ key: "deliveries", loading: false }));
    }
  };

// The backend sends the retry before replying, so callers refetch the log to show the outcome.
export const retryNotificationDeliveryAction = (id) => async () => {
  try {
    const response = await retryNotificationDeliveryApi(id);
    if (response?.success) toast.success("Retry sent");
    return response?.success;
  } catch (error) {
    toast.error(getErrorMessage(error));
    return false;
  }
};
