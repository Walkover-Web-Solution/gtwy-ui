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

export const generateEmbedTokenAction = (data) => async (dispatch) => {
  try {
    const response = await generateEmbedTokenApi(data);
    return response;
  } catch (error) {
    toast.error("something went wrong");
    console.error(error);
  }
};

export const generateRagEmbedTokenAction = (data) => async (dispatch) => {
  try {
    const response = await generateRagEmbedTokenApi(data);
    return response;
  } catch (error) {
    toast.error("something went wrong");
    console.error(error);
  }
};
