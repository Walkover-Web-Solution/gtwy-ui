import axios from "@/utils/interceptor";

const URL = process.env.NEXT_PUBLIC_SERVER_URL;

// Integration Management APIs
export const createIntegrationApi = async (data) => {
  try {
    const response = await axios.post(`${URL}/api/embed/`, data);
    return response?.data;
  } catch (error) {
    console.error(error);
    return error;
  }
};

export const getAllIntegrationApi = async () => {
  try {
    const response = await axios.get(`${URL}/api/embed/`);
    return response.data;
  } catch (error) {
    console.error(error);
    return error;
  }
};

export const updateIntegrationData = async (dataToSend) => {
  try {
    const response = await axios.put(`${URL}/api/embed/`, { folder_id: dataToSend?.folder_id, ...dataToSend });
    return response;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const generateGtwyAccessTokenApi = async () => {
  try {
    const response = await axios.post(`${URL}/api/utils/token`, {
      type: "embed",
    });
    return response;
  } catch (error) {
    console.error(error);
    return error;
  }
};
