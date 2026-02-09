import { createNewAuth, getAuthData } from "@/config/index";
import { toast } from "react-toastify";
import { addAuthenticationData, fetchAllAuthenticationData } from "../reducer/authReducer";

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
