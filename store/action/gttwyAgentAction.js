import { getAllAgentsApi, privateAgentLoginApi, publicAgentLoginApi } from "@/config/index";
import { toast } from "react-toastify";
import { getAllAgentReducer, getPrivateAgentDataReducer, getPublicAgentDataReducer } from "../reducer/gwtyAgentReducer";
import { getFromCookies } from "@/utils/utility";

export const getAllAgentAction = () => async (dispatch) => {
  try {
    const response = await getAllAgentsApi();
    if (response) {
      dispatch(getAllAgentReducer({ data: response?.data }));
    }
  } catch (error) {
    toast.error("something went wrong");
    console.error(error);
  }
};

export const publicAgentLoginAction = () => async (dispatch) => {
  const user_id = getFromCookies("publicAgentUserId");
  try {
    const response = await publicAgentLoginApi(user_id != "undefined" && user_id ? user_id : {});
    setInCookies("AgentToken", response?.data?.token);
    setInCookies("publicAgentUserId", response?.data?.user_id);
    if (response) {
      dispatch(getPublicAgentDataReducer({ data: response?.data }));
    }
  } catch (error) {
    toast.error("something went wrong");
    console.error(error);
  }
};

export const privateAgentLoginAction = () => async (dispatch) => {
  const user_id = getFromCookies("privateAgentUserId");
  try {
    const response = await privateAgentLoginApi(user_id != "undefined" && user_id ? user_id : {});
    setInCookies("AgentToken", response?.data?.token);
    setInCookies("privateAgentUserId", response?.data?.user_id);
    if (response) {
      dispatch(getPrivateAgentDataReducer({ data: response?.data }));
    }
  } catch (error) {
    toast.error("Something went wrong");
    console.error(error);
  }
};
