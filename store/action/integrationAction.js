import {
  createIntegrationApi,
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
    toast.error("Something went Wrong");
    console.error(error);
  }
};

export const generateEmbedTokenAction = (folderId, userId) => async (dispatch) => {
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
