import { createNewAuth, getAuthData } from "@/config/index";
import toast from "react-hot-toast";
import { addAuthenticationData, fetchAllAuthenticationData } from "../reducer/authReducer";
import {
  loginUser,
  switchUser,
  logoutUserFromMsg91,
  logoutUser,
  verifyAuth,
  getClientInfo,
  getOrCreateNotificationAuthKey,
} from "@/config/authApi";

export const getAuthDataAction = (orgId) => async (dispatch) => {
  try {
    const response = await getAuthData();
    if (response.data) {
      dispatch(
        fetchAllAuthenticationData({
          orgId,
          data: response?.data?.result,
        })
      );
    }
  } catch (error) {
    console.error(error);
  }
};
export const createAuth = (data, orgId) => async (dispatch) => {
  try {
    const response = await createNewAuth(data);
    if (response.data) {
      dispatch(
        addAuthenticationData({
          orgId,
          data: response?.data?.result,
        })
      );
    }
  } catch (error) {
    toast.error("something went wrong");
    console.error(error);
  }
};

// Pass-through thunks: call the API and return its response unchanged (errors propagate to the caller).
export const loginUserAction = (dataToSend) => async () => loginUser(dataToSend);
export const switchUserAction = (dataToSend) => async () => switchUser(dataToSend);
export const logoutUserFromMsg91Action = (headers) => async () => logoutUserFromMsg91(headers);
export const logoutUserAction = (token) => async () => logoutUser(token);
export const verifyAuthAction = (data) => async () => verifyAuth(data);
export const getClientInfoAction = (client_id) => async () => getClientInfo(client_id);
export const getOrCreateNotificationAuthKeyAction = (name) => async () => getOrCreateNotificationAuthKey(name);
