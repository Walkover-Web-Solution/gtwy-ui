import {
  getHistory,
  getSingleThreadData,
  getSubThreadIds,
  getThreads,
  updateHistoryMessage,
  userFeedbackCount,
  getRecursiveHistory,
} from "@/config";
import {
  fetchAllHistoryReducer,
  fetchSubThreadReducer,
  fetchThreadReducer,
  updateHistoryMessageReducer,
  userFeedbackCountReducer,
  fetchRecursiveHistoryStart,
  fetchRecursiveHistorySuccess,
} from "../reducer/historyReducer";

export const getHistoryAction =
  (id, page = 1, user_feedback, isErrorTrue, selectedVersion, keyword, startDate, endDate) =>
  async (dispatch) => {
    try {
      const data = await getThreads(id, page, user_feedback, isErrorTrue, selectedVersion, keyword, startDate, endDate);
      if (data && data.data) {
        dispatch(fetchAllHistoryReducer({ data: data.data, page }));
      }
      if (data && data?.total_user_feedback_count) {
        dispatch(userFeedbackCountReducer({ data: data.total_user_feedback_count }));
      }
      return data.data;
    } catch (error) {
      console.error(error);
    }
  };

export const getThread =
  ({ threadId, bridgeId, subThreadId, nextPage, user_feedback, versionId, error }) =>
  async (dispatch) => {
    try {
      const data = await getSingleThreadData(
        threadId,
        bridgeId,
        subThreadId,
        nextPage,
        user_feedback,
        versionId,
        error
      );
      dispatch(fetchThreadReducer({ data: data.data, nextPage }));
      return data.data;
    } catch (error) {
      console.error(error);
    }
  };

export const updateContentHistory =
  ({ id, bridge_id, message, index }) =>
  async (dispatch) => {
    try {
      const data = await updateHistoryMessage({ id, bridge_id, message });
      dispatch(updateHistoryMessageReducer({ data: data?.result?.[0], index }));
      return data;
    } catch (error) {
      console.error(error);
    }
  };

export const userFeedbackCountAction =
  ({ bridge_id, user_feedback }) =>
  async (dispatch) => {
    try {
      const _data = await userFeedbackCount({ bridge_id, user_feedback });
    } catch (error) {
      console.error(error);
    }
  };

export const getSubThreadsAction =
  ({ thread_id, error, bridge_id, version_id }) =>
  async (dispatch) => {
    try {
      const data = await getSubThreadIds({ thread_id, error, bridge_id, version_id });
      dispatch(fetchSubThreadReducer({ data: data.threads }));
    } catch (error) {
      console.error(error);
    }
  };

export const getRecursiveHistoryAction =
  ({ agent_id, thread_id, message_id }) =>
  async (dispatch) => {
    try {
      dispatch(fetchRecursiveHistoryStart());

      const data = await getRecursiveHistory({ agent_id, thread_id, message_id });

      dispatch(fetchRecursiveHistorySuccess({ data }));
      return data;
    } catch (error) {
      console.error("Error in getRecursiveHistoryAction:", error);
    }
  };
