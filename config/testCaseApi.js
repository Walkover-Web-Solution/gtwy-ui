import axios from "@/utils/interceptor";
import { toast } from "react-toastify";

const URL = process.env.NEXT_PUBLIC_SERVER_URL;
const PYTHON_URL = process.env.NEXT_PUBLIC_PYTHON_SERVER_URL;

// Test Case Management APIs
export const getAllTestCasesOfBridgeApi = async ({ bridgeId, page = 1, limit = 30, keyword }) => {
  try {
    const params = { page, limit };

    // Only add keyword to params if it's provided and not empty
    if (keyword) {
      params.keyword = keyword;
    }

    const response = await axios.get(`${URL}/api/testcases/${bridgeId}`, {
      params,
    });
    return response.data;
  } catch (error) {
    console.error(error);
    return error;
  }
};

export const createTestCaseApi = async ({ bridgeId, data }) => {
  try {
    const response = await axios.post(`${URL}/api/testcases/create`, { bridge_id: bridgeId, ...data });
    return response.data;
  } catch (error) {
    console.error(error);
    return error;
  }
};

export const updateTestCaseApi = async ({ testCaseId, dataToUpdate }) => {
  try {
    const response = await axios.put(`${URL}/api/testcases/${testCaseId}`, dataToUpdate);
    return response.data;
  } catch (error) {
    console.error(error);
    return error;
  }
};

export const deleteTestCaseApi = async ({ testCaseId }) => {
  try {
    const response = await axios.delete(`${URL}/api/testcases/${testCaseId}`);
    return response.data;
  } catch (error) {
    console.error(error);
    return error;
  }
};

// Bulk delete: same base endpoint, no id in path, ids sent in body.
export const deleteMultipleTestCasesApi = async ({ testCaseIds }) => {
  try {
    const response = await axios.delete(`${URL}/api/testcases`, {
      data: { testCaseIds },
    });
    return response.data;
  } catch (error) {
    console.error(error);
    return error;
  }
};

export const runTestCaseApi = async ({
  versionIds,
  testcase_id,
  testcase_ids,
  testCaseData,
  bridgeId,
  variables,
  matching_type,
  ai_matching_custom_prompt,
  model,
  service,
  models,
}) => {
  try {
    const payload = {
      version_ids: Array.isArray(versionIds) ? versionIds : [versionIds],
      testcases: true,
      testcase_id: testcase_id,
      testcase_data: testCaseData,
      bridge_id: bridgeId,
      variables: variables,
      matching_type: matching_type,
    };

    // Include bulk testcase_ids array only when provided (multi-select run)
    if (Array.isArray(testcase_ids) && testcase_ids.length > 0) {
      payload.testcase_ids = testcase_ids;
    }

    // Only add optional parameters if they are provided
    if (ai_matching_custom_prompt) {
      payload.agent_info = {
        ai_matching_custom_prompt: ai_matching_custom_prompt,
      };
    }
    if (model) {
      payload.model = model;
    }
    if (service) {
      payload.service = service;
    }
    // Multi-model run: send an array of { model, service } pairs. Backend fans out
    // every selected version across every selected model.
    if (Array.isArray(models) && models.length > 0) {
      payload.models = models;
    }

    const response = await axios.post(`${PYTHON_URL}/api/v2/model/testcases`, payload);
    return response.data;
  } catch (error) {
    toast.error(
      error?.response?.data?.detail?.error ? error?.response?.data?.detail?.error : "Error while running the testcases"
    );
    console.error(error);
    throw error;
  }
};

export const generateAdditionalTestCasesApi = async ({ bridgeId, versionId }) => {
  try {
    const response = await axios.post(`${URL}/api/utils/call-gtwy`, {
      type: "generate_test_cases",
      bridge_id: bridgeId,
      version_id: versionId,
    });
    return response.data;
  } catch (error) {
    toast.error(
      error?.response?.data?.detail?.error
        ? error?.response?.data?.detail?.error
        : "Error while generating additional test cases"
    );
    console.error(error);
    return error;
  }
};
