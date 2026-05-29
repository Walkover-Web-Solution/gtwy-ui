import {
  createTestCaseApi,
  deleteTestCaseApi,
  getAllTestCasesOfBridgeApi,
  runTestCaseApi,
  updateTestCaseApi,
  generateAdditionalTestCasesApi,
} from "@/config/index";
import {
  createTestCaseReducer,
  deleteTestCaseReducer,
  getAllTestCasesReducer,
  appendTestCasesReducer,
  updateTestCaseReducer,
  runTestCaseReducer,
  testRunStartedReducer,
  testRunFailedReducer,
} from "../reducer/testCasesReducer";
import { toast } from "react-toastify";

export const createTestCaseAction =
  ({ bridgeId, data }) =>
  async (dispatch) => {
    try {
      const response = await createTestCaseApi({ bridgeId, data });
      if (response?.success) {
        dispatch(createTestCaseReducer({ bridgeId, data: response?.result }));
        toast.success("Test case created successfully");
      }
      return;
    } catch (error) {
      console.error(error);
    }
  };

export const getAllTestCasesOfBridgeAction =
  ({ bridgeId, page = 1, limit = 30, append = false }) =>
  async (dispatch) => {
    try {
      const response = await getAllTestCasesOfBridgeApi({ bridgeId, page, limit });
      if (response?.success) {
        const data = Array.isArray(response?.data) ? response.data : [];
        const total = response?.total || 0;
        if (append && page > 1) {
          dispatch(appendTestCasesReducer({ bridgeId, data, total }));
        } else {
          dispatch(getAllTestCasesReducer({ bridgeId, data, total }));
        }
        // Backend now returns total count — use it to determine hasMore
        const hasMore = data.length >= limit && page * limit < total;
        return { success: true, data, hasMore, page, total };
      }
      return { success: false, data: [], hasMore: false, page, total: 0 };
    } catch (error) {
      console.error(error);
      return { success: false, data: [], hasMore: false, page, total: 0 };
    }
  };

export const deleteTestCaseAction =
  ({ testCaseId, bridgeId }) =>
  async (dispatch) => {
    try {
      const response = await deleteTestCaseApi({ testCaseId });
      if (response?.success) {
        dispatch(deleteTestCaseReducer({ testCaseId, bridgeId }));
        toast.success("Test case deleted successfully");
      }
      return;
    } catch (error) {
      console.error(error);
    }
  };

export const runTestCaseAction =
  ({
    versionIds = null,
    bridgeId = null,
    testcase_id = null,
    testCaseData = null,
    variables = null,
    matching_type = null,
  }) =>
  async (dispatch) => {
    try {
      // Optimistically mark run as started so UI shows running state without waiting
      // for the run_started RTLayer event (which arrives moments later on the bridge channel).
      if (bridgeId) {
        const versionIdsArrayInit = Array.isArray(versionIds) ? versionIds : [versionIds].filter(Boolean);
        dispatch(
          testRunStartedReducer({
            bridgeId,
            total: 0,
            versionIds: versionIdsArrayInit,
            testcaseId: testcase_id || null,
          })
        );
      }

      const response = await runTestCaseApi({
        versionIds,
        testcase_id,
        testCaseData,
        bridgeId,
        variables,
        matching_type,
      });

      // New flow: backend returns immediately with rtlayer_cred and streams results via RTLayer.
      // The `useRtLayerEventHandler` hook listens on `${orgId}_${bridgeId}` and updates the
      // store via `testRunResultReducer` / `testRunCompletedReducer`. Nothing else to do here.
      if (response?.rtlayer_cred && !response?.results) {
        return response;
      }

      // Legacy synchronous response path (kept as fallback for ad-hoc / direct testcase_data runs).
      if (response?.success && response?.results) {
        // Transform the results array into the format the reducer expects
        const versionIdsArray = Array.isArray(versionIds) ? versionIds : [versionIds];

        versionIdsArray.forEach((versionId) => {
          const testcases_result = {};
          response.results.forEach((result) => {
            if (result.testcase_id) {
              testcases_result[result.testcase_id] = {
                result: {
                  score: result.score,
                  model_output: result.actual_result,
                  expected: result.expected,
                  matching_type: result.matching_type,
                  metadata: {
                    bridge_id: result.bridge_id,
                  },
                  created_at: new Date().toISOString(),
                },
              };
            }
          });

          if (Object.keys(testcases_result).length > 0 && bridgeId && versionId) {
            dispatch(
              runTestCaseReducer({
                data: { testcases_result },
                bridgeId,
                versionId,
              })
            );
          }
        });

        toast.success("Test case run successfully");
      }
      return response;
    } catch (error) {
      console.error(error);
      if (bridgeId) {
        dispatch(
          testRunFailedReducer({
            bridgeId,
            error: error?.response?.data?.detail?.error || error?.message || "Failed to start test run",
          })
        );
      }
    }
  };

export const updateTestCaseAction =
  ({ testCaseId, dataToUpdate }) =>
  async (dispatch) => {
    try {
      const response = await updateTestCaseApi({ testCaseId, dataToUpdate });
      if (response?.success) {
        // Use the API result so updatedAt and other server-set fields are accurate
        dispatch(updateTestCaseReducer({ testCaseId, dataToUpdate: response?.result || dataToUpdate }));
        toast.success("Test case updated successfully");
      }
      return;
    } catch (error) {
      console.error(error);
    }
  };

export const generateAdditionalTestCasesAction =
  ({ bridgeId, versionId }) =>
  async (dispatch) => {
    try {
      const response = await generateAdditionalTestCasesApi({ bridgeId, versionId });
      if (response?.success) {
        toast.success("Additional test cases generated successfully");
      }
      return response;
    } catch (error) {
      console.error(error);
    }
  };
