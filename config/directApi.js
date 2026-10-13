import axios from "@/utils/interceptor";

const URL = process.env.NEXT_PUBLIC_SERVER_URL;
const PYTHON_URL = process.env.NEXT_PUBLIC_PYTHON_SERVER_URL;

export const DIRECT_COMPLETION_PATH = "/api/v2/model/ai/completion";

// Id of the org's hidden "direct" agent that backs agentless calls. Null until the org's
// first direct call, since the Python service creates it lazily.
export const getDirectAgentId = async () => {
  const response = await axios.get(`${URL}/api/agent/direct`);
  return response?.data?.agent_id || null;
};

// Runs a completion with the whole configuration (model, prompt, params, tools) in the body.
export const runDirectCompletion = async (payload) => {
  const response = await axios.post(`${PYTHON_URL}${DIRECT_COMPLETION_PATH}`, payload);
  return response.data;
};
