import {
  createIntegrationApi,
  generateChatbotTokenApi,
  generateEmbedTokenApi,
  generateRagEmbedTokenApi,
  getAllIntegrationApi,
  updateIntegrationData,
} from "@/config/index";
import { toast } from "react-toastify";
import {
  addIntegrationDataReducer,
  fetchAllIntegrationData,
  updateIntegrationDataReducer,
  setEmbedToken,
} from "../reducer/integrationReducer";
import { updateGtwyAccessToken } from "../reducer/userDetailsReducer";

export const createIntegrationAction = (data) => async (dispatch) => {
  try {
    const response = await createIntegrationApi(data);
    if (response.data) {
      dispatch(
        addIntegrationDataReducer({
          orgId: data?.orgId,
          data: response?.data,
          _id: response?.data?._id,
        })
      );
    }
  } catch (error) {
    toast.error("something went wrong");
    console.error(error);
  }
};

export const getAllIntegrationDataAction = (orgId) => async (dispatch) => {
  try {
    const response = await getAllIntegrationApi();
    if (response.data) {
      dispatch(fetchAllIntegrationData({ data: response?.data, orgId, gtwyAccessToken: response?.gtwyAccessToken }));
    }
  } catch (error) {
    toast.error("something went wrong");
    console.error(error);
  }
};

export const updateIntegrationDataAction = (orgId, dataToSend) => async (dispatch) => {
  try {
    const response = await updateIntegrationData(dataToSend);
    if (response.data) {
      dispatch(updateIntegrationDataReducer({ data: response?.data?.data, orgId }));
      return response;
    }
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const generateEmbedTokenAction = (folderId, userId, orgId) => async (dispatch) => {
  try {
    // Construct request data with folder_id and org_id (userId)
    const requestData = {
      folder_id: folderId,
      user_id: userId,
    };

    const response = await generateEmbedTokenApi(requestData);

    // Store token in Redux if folderId is provided
    if (response?.data?.embedToken && folderId) {
      dispatch(setEmbedToken({ folderId, token: response.data.embedToken }));
    }
    if (response?.data?.gtwyAccessToken) {
      dispatch(updateGtwyAccessToken({ orgId, gtwyAccessToken: response?.data?.gtwyAccessToken }));
    }

    return response;
  } catch (error) {
    toast.error("something went wrong");
    console.error(error);
  }
};
export const generateChatbotTokenAction = (chabtotID, userId) => async (dispatch) => {
  try {
    const response = await generateChatbotTokenApi({ folder_id: chabtotID, user_id: userId });
    if (response?.data?.embedToken && chabtotID) {
      dispatch(setEmbedToken({ folderId: chabtotID, token: response.data.embedToken }));
    }
    return response;
  } catch (error) {
    toast.error("something went wrong");
    console.error(error);
  }
};

export const generateRagEmbedTokenAction = (folderId, userId) => async (dispatch) => {
  try {
    const response = await generateRagEmbedTokenApi({ folder_id: folderId, user_id: userId });
    if (response?.data?.embedToken && folderId) {
      dispatch(setEmbedToken({ folderId, token: response.data.embedToken }));
    }
    return response;
  } catch (error) {
    toast.error("something went wrong");
    console.error(error);
  }
};
