import axios from "@/utils/interceptor";
import { toast } from "react-toastify";
import { getFromCookies } from "@/utils/utility";

const URL = process.env.NEXT_PUBLIC_SERVER_URL;
const PYTHON_URL = process.env.NEXT_PUBLIC_PYTHON_SERVER_URL;

export const getAllModels = async (service) => {
  try {
    const response = await axios.get(`${URL}/api/service/${service}`);
    return response.data;
  } catch (error) {
    console.error(error);
    throw new Error(error);
  }
};

export const getAllServices = async () => {
  try {
    const response = await axios.get(`${URL}/api/service`);
    return response.data;
  } catch (error) {
    console.error(error);
    throw new Error(error);
  }
};

export const addNewModel = async (newModelObj) => {
  try {
    const response = await axios.post(`${URL}/api/models`, newModelObj);
    return response;
  } catch (error) {
    throw error;
  }
};

export const deleteModel = async (dataToSend) => {
  try {
    const response = await axios.delete(`${URL}/api/models?${new URLSearchParams(dataToSend).toString()}`);
    toast.success(response?.data?.message);
    return response;
  } catch (error) {
    throw error;
    toast.error(error?.response?.data?.error || error?.response?.data?.message);
  }
};

// API Key Management APIs
export const saveApiKeys = async (data) => {
  try {
    const response = await axios.post(`${URL}/api/apikeys`, data);
    return response;
  } catch (error) {
    console.error(error);
    toast.error(error?.response?.data?.message);
    return error;
  }
};

export const updateApikey = async (dataToSend) => {
  try {
    const response = await axios.put(`${URL}/api/apikeys/${dataToSend.apikey_object_id}`, dataToSend);
    return response;
  } catch (error) {
    console.error(error);
    toast.error(error?.response?.data?.message);
    return error;
  }
};

export const deleteApikey = async (id, service) => {
  try {
    const response = await axios.delete(`${URL}/api/apikeys`, {
      data: { apikey_object_id: id, service },
    });
    return response;
  } catch (error) {
    console.error(error);
    toast.error(error?.response?.data?.message);
    return error;
  }
};

export const getAllApikey = async (org_id) => {
  try {
    const response = await axios.get(`${URL}/api/apikeys`, org_id);
    return response;
  } catch (error) {
    console.error(error);
    return error;
  }
};

// Model Playground and Testing APIs
export const dryRun = async ({ localDataToSend, bridge_id }) => {
  try {
    const modelType = localDataToSend.configuration.type;
    const isChat = modelType !== "completion" && modelType !== "embedding";
    const isStream = !!localDataToSend.flag;

    // Streaming path — use native fetch so the ReadableStream body is accessible
    if (isChat && isStream) {
      const localToken = getFromCookies("local_token");
      const response = await fetch(`${PYTHON_URL}/api/v2/model/playground/chat/completion/${bridge_id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: localToken || "",
        },
        body: JSON.stringify(localDataToSend),
      });
      if (!response.ok) {
        let body = "";
        try {
          body = await response.text();
        } catch {
          /* ignore */
        }
        throw new Error(`API error: ${response.status}${body ? ` — ${body}` : ""}`);
      }
      return { success: true, stream: true, response };
    }

    // Non-streaming path (original behaviour)
    let dryRun;
    if (isChat)
      dryRun = await axios.post(`${PYTHON_URL}/api/v2/model/playground/chat/completion/${bridge_id}`, localDataToSend);
    if (modelType === "completion")
      dryRun = await axios.post(`${URL}/api/v1/model/playground/completion/${bridge_id}`, localDataToSend);
    if (modelType === "embedding")
      dryRun = await axios.post(`${PYTHON_URL}/api/v2/model/playground/chat/completion/${bridge_id}`, localDataToSend);
    if (isChat) {
      return dryRun.data;
    }
    return { success: true, data: dryRun.data };
  } catch (error) {
    console.error("dry run error", error, error?.response?.data?.error);

    const errorMessage =
      error?.response?.data?.error || error?.response?.data?.detail?.error || error?.message || "Something went wrong.";

    const hasBothErrors = errorMessage.includes("Initial Error:") && errorMessage.includes("Fallback Error:");

    if (hasBothErrors) {
      const initialErrorMatch = errorMessage.match(/Initial Error: (.+?) \(Type:/);
      const fallbackErrorMatch = errorMessage.match(/Fallback Error: (.+?) \(Type:/);
      initialErrorMatch && fallbackErrorMatch
        ? (() => {
            const initialError = initialErrorMatch[1].trim();
            const fallbackError = fallbackErrorMatch[1].trim();

            toast.error(`Initial Error: ${initialError}`);
            setTimeout(() => toast.error(`Fallback Error: ${fallbackError}`), 1000);
          })()
        : toast.error(errorMessage);
    } else {
      toast.error(errorMessage);
    }
    throw error;
  }
};

export const batchApi = async ({ payload }) => {
  try {
    const response = await axios.post(`${PYTHON_URL}/api/v2/model/batch/chat/completion`, payload);
    return response.data;
  } catch (error) {
    console.error("Error in batch API:", error);
    throw error;
  }
};
