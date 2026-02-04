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
  updateTestCaseReducer,
  runTestCaseReducer,
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
  ({ bridgeId }) =>
  async (dispatch) => {
    try {
      const response = await getAllTestCasesOfBridgeApi({ bridgeId });
      if (response?.success) {
        dispatch(getAllTestCasesReducer({ bridgeId, data: response?.data }));
      }
      return;
    } catch (error) {
      console.error(error);
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
  ({ versionId = null, bridgeId = null, testcase_id = null, testCaseData = null }) =>
  async (dispatch) => {
    try {
      const response = await runTestCaseApi({ versionId, testcase_id, testCaseData, bridgeId });

      if (response?.success && response?.results) {
        // Transform the results array into the format the reducer expects
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

        toast.success("Test case run successfully");
      }
      return response;
    } catch (error) {
      console.error(error);
    }
  };

export const updateTestCaseAction =
  ({ testCaseId, dataToUpdate }) =>
  async (dispatch) => {
    try {
      const response = await updateTestCaseApi({ testCaseId, dataToUpdate });
      if (response?.success) {
        // Pass testCaseId and update data to the reducer
        dispatch(updateTestCaseReducer({ testCaseId, dataToUpdate }));
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
