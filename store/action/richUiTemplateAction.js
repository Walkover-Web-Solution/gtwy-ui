import { createRichUiTemplateApi, deleteRichUiTemplate, getRichUiTemplates } from "@/config/index";
import {
  getRichUiTemplatesPending,
  getRichUiTemplatesSuccess,
  getRichUiTemplatesError,
  createRichUiTemplateApiSuccess,
  deleteRichUiTemplateSuccess,
} from "../reducer/richUiTemplateReducer";
import { getErrorMessage, handleApiError, isNetworkError } from "@/utils/errorHandler";
import { toast } from "react-toastify";

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

export const deleteRichUiTemplateAction = (templateId) => async (dispatch) => {
  try {
    const response = await deleteRichUiTemplate(templateId);

    if (response?.success) {
      dispatch(deleteRichUiTemplateSuccess(templateId));
      toast.success(response?.message || "Widget deleted successfully");
      return response;
    }

    throw new Error(response?.message || "Failed to delete widget");
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    dispatch(getRichUiTemplatesError(errorMessage));
    toast.error(errorMessage);
    throw error;
  }
};
