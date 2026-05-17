import { createRichUiTemplateApi, getRichUiTemplates } from "@/config/index";
import {
  getRichUiTemplatesPending,
  getRichUiTemplatesSuccess,
  getRichUiTemplatesError,
  createRichUiTemplateApiSuccess,
} from "../reducer/richUiTemplateReducer";
import { handleApiError, isNetworkError } from "@/utils/errorHandler";

export const getRichUiTemplatesAction = (orgId) => async (dispatch) => {
  try {
    dispatch(getRichUiTemplatesPending());
    const response = await getRichUiTemplates(orgId);
    dispatch(getRichUiTemplatesSuccess(response.data.data));
  } catch (error) {
    const errorMessage = isNetworkError(error)
      ? "Connection lost. Please check your internet connection."
      : error.message;
    dispatch(getRichUiTemplatesError(errorMessage));
    if (isNetworkError(error)) {
      handleApiError(error, "Failed to load Rich UI Templates");
    }
    console.error("Error fetching Rich UI Templates:", error);
  }
};

export const createRichUiTemplateAction = (data) => async (dispatch) => {
  try {
    const response = await createRichUiTemplateApi(data);

    if (response) {
      dispatch(createRichUiTemplateApiSuccess(response.data));
    }
  } catch (error) {
    console.error("Error creating Rich UI Template:", error);
  }
};
