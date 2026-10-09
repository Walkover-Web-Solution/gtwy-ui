import {
  getNotificationsApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
  getNotificationCatalogueApi,
} from "@/config/index";
import {
  setInboxLoadingReducer,
  setInboxReducer,
  markNotificationReadReducer,
  markAllNotificationsReadReducer,
  setCatalogueReducer,
} from "../reducer/notificationReducer";

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
