import axios from "@/utils/interceptor";
import { toast } from "react-toastify";

const URL = process.env.NEXT_PUBLIC_SERVER_URL;
const PROXY_URL = process.env.NEXT_PUBLIC_PROXY_URL;
const PYTHON_URL = process.env.NEXT_PUBLIC_PYTHON_SERVER_URL;

// User Authentication APIs
export const userdetails = async () => {
  try {
    const details = await axios.get(`${PROXY_URL}/api/c/getDetails`);
    return details;
  } catch (error) {
    console.error(error);
  }
};

export const logoutUserFromMsg91 = async (headers) => {
  const User = await axios.delete(`${PROXY_URL}/api/c/logout`, headers);
  return User;
};

export const logoutUser = async (token) => {
  try {
    const response = await axios.post(
      `${URL}/api/auth/logout`, 
      {}, 
      {
        headers: { Authorization: token }
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const loginUser = async (dataToSend) => {
  try {
    const response = await axios.post(`${URL}/api/user/localToken`, dataToSend);
    return response.data?.data;
  } catch (error) {
    console.error(error);
    return error;
  }
};

export const switchUser = async (dataToSend) => {
  try {
    const response = await axios.post(`${URL}/api/user/switchOrg`, dataToSend);
    return response.data?.data;
  } catch (error) {
    console.error(error);
    return error;
  }
};

// Auth Key Management APIs
export const allAuthKey = async (name = null) => {
  try {
    let url = `${PROXY_URL}/api/c/authkey`;

    // If name is provided, add it as a query parameter
    if (name) {
      url += `?name=${encodeURIComponent(name)}`;
    }

    const response = await axios(url);
    return response?.data?.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const createAuthKey = async (dataToSend) => {
  try {
    return await axios.post(`${PROXY_URL}/api/c/authkey`, dataToSend);
  } catch (error) {
    console.error(error);
  }
};

export const deleteAuthkey = async (id) => {
  try {
    await axios.delete(`${PROXY_URL}/api/c/authkey/${id}`);
  } catch (error) {
    console.error(error);
  }
};

export const getOrCreateNotificationAuthKey = async (name) => {
  try {
    // First, get the notification auth key by name
    const notificationAuthKeys = await allAuthKey(name);

    // Check if the notification auth key exists
    const notificationAuthKey = notificationAuthKeys?.data?.length > 0 ? notificationAuthKeys?.data[0] : null;

    if (notificationAuthKey) {
      // If it exists, return it
      return notificationAuthKey;
    } else {
      // If it doesn't exist, create it
      const dataToSend = {
        name: name,
        throttle_limit: "60:800",
        temporary_throttle_limit: "60:600",
        temporary_throttle_time: "30",
      };

      const response = await createAuthKey(dataToSend);
      return response?.data;
    }
  } catch (error) {
    console.error("Error in getOrCreateNotificationAuthKey:", error);
    throw error;
  }
};

// User Management APIs
export const updateUser = async ({ user_id, user }) => {
  const updateObject = { user_id, user: { meta: user?.meta } };
  try {
    const response = await axios.put(`${URL}/api/user/updateDetails`, updateObject);
    return response?.data;
  } catch (error) {
    console.error("Error updating details:", error.response?.data?.message || error.message);
    throw new Error(error.response?.data?.message || "Something went wrong");
  }
};

export const removeUsersFromOrg = async (user_id) => {
  try {
    const response = await axios.delete(`${URL}/api/user/deleteUser`, {
      data: { user_id },
    });
    return response.data;
  } catch (error) {
    toast.error(error.response.data.message);
    console.error(error);
    return error;
  }
};

// OAuth and Authentication APIs
export const getAuthData = async () => {
  try {
    const response = await axios.get(`${URL}/api/auth/`);
    return response;
  } catch (error) {
    console.error(error);
    return error;
  }
};

export const createNewAuth = async (data) => {
  try {
    const response = await axios.post(`${URL}/api/auth/`, data);
    return response;
  } catch (error) {
    console.error(error);
    return error;
  }
};

export const verifyAuth = async (data) => {
  try {
    const respnse = await axios.post(`${URL}/api/auth/verify`, data);
    return respnse;
  } catch (error) {
    console.error(error);
    return error;
  }
};

export const getClientInfo = async (client_id) => {
  try {
    const respnse = await axios.get(`${URL}/api/auth/client_info?client_id=${client_id}`);
    return respnse?.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

// Public Agent Authentication
export const publicAgentLoginApi = async (user_id) => {
  try {
    const repsonse = await axios.post(`${URL}/api/runagents/public/login`, { user_id });
    return repsonse;
  } catch (error) {
    console.error(error);
    throw new Error(error);
  }
};

export const privateAgentLoginApi = async (user_id) => {
  try {
    const response = await axios.post(`${URL}/api/runagents/login`, { user_id });
    return response;
  } catch (error) {
    console.error(error);
    throw new Error(error);
  }
};
