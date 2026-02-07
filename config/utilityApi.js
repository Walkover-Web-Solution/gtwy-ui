import axios from "@/utils/interceptor";

const URL = process.env.NEXT_PUBLIC_SERVER_URL;
const PYTHON_URL = process.env.NEXT_PUBLIC_PYTHON_SERVER_URL;

// Utility and Helper APIs
export const uploadImage = async (formData, isVedioOrPdf) => {
  try {
    const response = await axios.post(`${PYTHON_URL}/image/processing/${isVedioOrPdf ? "upload" : ""}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data; // Return the response data for further handling
  } catch (error) {
    console.error("Error uploading image:", error);
    // Extract error message if available
    const errorMessage =
      error.response?.data?.message || error.response?.data?.detail?.error || error.message || "File upload failed.";
    throw new Error(errorMessage);
  }
};

export const optimizePromptApi = async ({
  bridge_id,
  version_id,
  query,
  thread_id,
  data = { query, thread_id, version_id },
}) => {
  try {
    const response = await axios.post(`${URL}/api/utils/call-gtwy`, {
      type: "optimize_prompt",
      ...data,
      bridge_id: bridge_id || data.bridge_id,
      version_id: version_id || data.version_id,
    });
    return response.data.result;
  } catch (error) {
    console.error(error);
    return error;
  }
};

export const optimizeSchemaApi = async ({ data }) => {
  try {
    const response = await axios.post(`${URL}/api/utils/call-gtwy`, {
      type: "structured_output",
      ...data,
    });
    return response.data;
  } catch (error) {
    console.error(error);
    return error;
  }
};

export const optimizeJsonApi = async ({ data }) => {
  try {
    const response = await axios.post(`${URL}/api/utils/call-gtwy`, {
      type: "generate_json",
      ...data,
    });
    return response.data;
  } catch (error) {
    console.error(error);
    return error;
  }
};

export const improvePrompt = async (variables) => {
  try {
    const response = await axios.post(`${URL}/api/utils/call-gtwy`, {
      type: "improve_prompt",
      variables,
    });
    return response?.data?.result;
  } catch (error) {
    console.error(error);
    throw new Error(error);
  }
};

// AI Assistant Tools APIs
export const getPrebuiltPrompts = async () => {
  try {
    const getPrebuiltPrompts = await axios.get(`${URL}/api/prebuilt_prompt`);
    return getPrebuiltPrompts?.data?.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const updatePrebuiltPrompt = async (dataToSend) => {
  try {
    const response = await axios.put(`${URL}/api/prebuilt_prompt`, dataToSend);
    return response?.data?.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const resetPrebuiltPrompt = async (dataToSend) => {
  try {
    const response = await axios.post(`${URL}/api/prebuilt_prompt/reset`, dataToSend);
    return response?.data?.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

// Functions Management APIs
export const getAllFunctionsApi = async () => {
  try {
    const data = await axios.get(`${URL}/api/tools/`);
    return data;
  } catch (error) {
    console.error(error);
    throw new Error(error);
  }
};

export const updateFunctionApi = async ({ function_id, dataToSend }) => {
  try {
    const response = await axios.put(`${URL}/api/tools/${function_id}`, { dataToSend });
    return response.data;
  } catch (error) {
    console.error(error);
    throw new Error(error);
  }
};

export const deleteFunctionApi = async (script_id) => {
  try {
    const response = await axios.delete(`${URL}/api/tools/`, {
      data: { script_id },
    });
    return response.data;
  } catch (error) {
    console.error(error);
    return error;
  }
};

export const getPrebuiltToolsApi = async () => {
  try {
    const response = await axios.get(`${URL}/api/tools/inbuilt`);
    return response.data;
  } catch (error) {
    console.error(error);
    throw new Error(error);
  }
};

// Webhook and Alerting APIs
export const createWebhookAlert = async (dataToSend) => {
  try {
    const response = await axios.post(`${URL}/api/alerting`, dataToSend);
    return response.data;
  } catch (error) {
    console.error(error);
    return error;
  }
};

export const updateWebhookAlert = async ({ data, id }) => {
  try {
    const response = await axios.put(`${URL}/api/alerting/${id}`, data);
    return response.data;
  } catch (error) {
    console.error(error);
    return error;
  }
};

export const getAllWebhookAlert = async () => {
  try {
    const response = await axios.get(`${URL}/api/alerting`);
    return response.data;
  } catch (error) {
    console.error(error);
    return error;
  }
};

export const deleteWebhookAlert = async (id) => {
  try {
    const response = await axios.delete(`${URL}/api/alerting`, {
      data: { id: id },
    });
    return response.data;
  } catch (error) {
    console.error(error);
    return error;
  }
};

// Integration and External APIs
export const updateFlow = async (embed_token, functionId, description, title) => {
  try {
    const response = await fetch(`https://flow-api.viasocket.com/projects/updateflowembed/${functionId}`, {
      method: "PUT",
      headers: {
        Authorization: embed_token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        description: description,
        title: title,
        endpoint_name: title,
      }),
    });

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error(error);
    return error;
  }
};

export const integration = async (embed_token) => {
  try {
    const response = await fetch("https://flow-api.viasocket.com/projects/projXzlaXL3n/integrations", {
      method: "GET",
      headers: {
        Authorization: embed_token,
      },
    });
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error(error);
    return error;
  }
};

export const createapi = async (dataFromEmbed) => {
  try {
    const response = await axios.post(`${URL}/api/tools/`, dataFromEmbed);
    return response?.data;
  } catch (error) {
    console.error(error);
    return error;
  }
};

export const updateapi = async (bridge_id, dataFromEmbed) => {
  try {
    const response = await axios.put(`${URL}/api/tools/pre_tool/${bridge_id}`, dataFromEmbed);
    return response;
  } catch (error) {
    console.error(error);
    return error;
  }
};

// Marketing and External Service APIs
export const storeMarketingRefUser = async (data) => {
  try {
    const response = await axios.post("https://flow.sokt.io/func/scribmgUXqSE", data);
    return response;
  } catch (error) {
    console.error(error);
    throw new Error(error);
  }
};

// Tutorial and Guide APIs
export const getTutorial = async () => {
  try {
    const response = await axios.get("https://flow.sokt.io/func/scri33jNs1M1");
    return response;
  } catch (error) {
    throw new Error(error);
  }
};

export const getApiKeyGuide = async () => {
  try {
    const response = await axios.get("https://flow.sokt.io/func/scriDewB9Jk2");
    return response;
  } catch (error) {
    throw new Error(error);
  }
};

export const getDescriptions = async () => {
  try {
    const response = await axios.get("https://flow.sokt.io/func/scriPqFeiEKa");
    return response;
  } catch (error) {
    throw new Error(error);
  }
};

export const getGuardrailsTemplates = async () => {
  try {
    const response = await axios.get("https://flow.sokt.io/func/scriKh8LMVKV");
    return response;
  } catch (error) {
    throw new Error(error);
  }
};

// Showcase APIs
export const getAllShowCase = async () => {
  try {
    const response = await axios.get(`${URL}/showcase/all`);
    return response?.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const getAllAgentsApi = async () => {
  try {
    const response = await axios.get(`${URL}/api/runagents/`);
    return response;
  } catch (error) {
    console.error(error);
    throw new Error(error);
  }
};

export const getFinishReasons = async () => {
  try {
    const response = await axios.get("https://flow.sokt.io/func/scritxGh53At");
    return response;
  } catch (error) {
    console.error(error);
    throw new Error(error);
  }
};
export const getLinks = async () => {
  try {
    const response = await axios.get("https://flow.sokt.io/func/scriiS7RkdxI");
    return response;
  } catch (error) {
    console.error(error);
    throw new Error(error);
  }
};
