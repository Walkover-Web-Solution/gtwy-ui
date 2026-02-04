import axios from "@/utils/interceptor";
import { toast } from "react-toastify";

const URL = process.env.NEXT_PUBLIC_SERVER_URL;
const PYTHON_URL = process.env.NEXT_PUBLIC_PYTHON_SERVER_URL;

// Bridge Management APIs
export const getSingleBridge = async (bridgeId) => {
  try {
    const response = await axios.get(`${URL}/api/agent/${bridgeId}`);
    return response;
  } catch (error) {
    if (error.response) {
      throw error.response;
    } else {
      throw error;
    }
  }
};

export const getAllBridges = async () => {
  try {
    const data = await axios.get(`${URL}/api/agent/`);
    return data;
  } catch (error) {
    console.error(error);
    throw new Error(error);
  }
};

export const createBridge = async (dataToSend) => {
  try {
    return await axios.post(`${URL}/api/agent/`, dataToSend);
  } catch (error) {
    toast.error(error.response.data.error);
    throw error;
  }
};

export const updateBridge = async ({ bridgeId, dataToSend }) => {
  try {
    const response = await axios.put(`${URL}/api/agent/${bridgeId}`, dataToSend);
    return response;
  } catch (error) {
    console.error(error);
    toast.error(error?.response?.data?.error);
    throw error;
  }
};

export const deleteBridge = async (bridgeId, org_id, restore = false) => {
  try {
    const response = await axios.delete(`${URL}/api/agent/${bridgeId}`, { data: { org_id, restore } });
    return response;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const createDuplicateBridge = async (bridge_id) => {
  try {
    const response = await axios.post(`${PYTHON_URL}/bridge/duplicate`, { bridge_id });
    return response.data;
  } catch (error) {
    console.error(error);
    throw new Error(error);
  }
};

export const archiveBridgeApi = async (bridge_id, newStatus) => {
  try {
    const response = await axios.put(`${URL}/api/agent/${bridge_id}`, { status: newStatus });
    return response.data;
  } catch (error) {
    console.error(error);
    throw new Error(error);
  }
};

export const createBridgeWithAiAPi = async ({ ...dataToSend }) => {
  try {
    // Node uses create_bridge for both AI and normal creation if purpose is present
    const response = await axios.post(`${URL}/api/agent/`, dataToSend);
    return response;
  } catch (error) {
    console.error(error);
    return error;
  }
};

// Bridge Version APIs
export const getBridgeVersionApi = async ({ bridgeVersionId = null }) => {
  try {
    const response = await axios.get(`${URL}/api/versions/${bridgeVersionId}`);
    return response?.data;
  } catch (error) {
    console.error(error);
    throw new Error(error);
  }
};

export const createBridgeVersionApi = async (dataToSend) => {
  try {
    const result = await axios.post(`${URL}/api/versions/`, dataToSend);
    return result?.data;
  } catch (error) {
    toast.error(error.response.data.error);
    throw error;
  }
};

export const deleteBridgeVersionApi = async ({ versionId }) => {
  try {
    const response = await axios.delete(`${URL}/api/versions/${versionId}`);
    return response?.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const updateBridgeVersionApi = async ({ versionId, dataToSend }) => {
  try {
    const response = await axios.put(`${URL}/api/versions/${versionId}`, dataToSend);
    return response?.data;
  } catch (error) {
    console.error(error);
    toast.error(error?.response?.data?.message || "Failed to update bridge version");
  }
};

export const publishBridgeVersionApi = async ({ versionId }) => {
  try {
    const response = await axios.post(`${URL}/api/versions/publish/${versionId}`);
    return response?.data;
  } catch (error) {
    console.error(error);
    return error;
  }
};

export const discardBridgeVersionApi = async ({ bridgeId, versionId }) => {
  try {
    const response = await axios.post(`${URL}/api/versions/discard/${versionId}`, { bridge_id: bridgeId });
    return response.data;
  } catch (error) {
    console.error(error);
    return error;
  }
};

export const publishBulkVersionApi = async (version_ids) => {
  try {
    const response = await axios.post(`${URL}/api/versions/bulk_publish`, { version_ids });
    return response;
  } catch (error) {
    console.error(error);
    throw new Error(error);
  }
};

export const getTestcasesScrore = async (version_id) => {
  try {
    const response = await axios.get(`${URL}/testcases/score/${version_id}`);
    return response.data;
  } catch (error) {
    console.error("error while getting testcase score", error);
  }
};

export const modelSuggestionApi = async ({ versionId }) => {
  try {
    const response = await axios.get(`${URL}/api/versions/suggest-model/${versionId}`);
    return response.data;
  } catch (error) {
    console.error(error);
    return error;
  }
};

export const genrateSummary = async (version_id) => {
  try {
    const response = await axios.post(`${URL}/api/utils/call-gtwy`, {
      type: "generate_summary",
      version_id: version_id.versionId,
    });
    return response.data.result;
  } catch (error) {
    toast.error(error);
  }
};

export const getConnectedAgentFlowApi = async ({ versionId }) => {
  try {
    const response = await axios.get(`${URL}/api/versions/connected-agents/${versionId}?type=version`);
    return response?.data;
  } catch (error) {
    console.error("Failed to fetch connected agent flow", error);
    throw error;
  }
};

// Bridge Configuration History
export const getBridgeConfigHistory = async (versionId, page = 1, pageSize = 30) => {
  try {
    const response = await axios.get(`${URL}/api/v1/config/getuserupdates/${versionId}?page=${page}&limit=${pageSize}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching bridge config history:", error);
    throw new Error(error);
  }
};

export const fetchBridgeUsageMetricsApi = async ({ start_date, end_date }) => {
  try {
    const response = await axios.post(`${URL}/api/metrics/agent`, { start_date, end_date });
    return response?.data;
  } catch (error) {
    console.error("Failed to fetch bridge usage metrics", error);
    throw error?.response || error;
  }
};
