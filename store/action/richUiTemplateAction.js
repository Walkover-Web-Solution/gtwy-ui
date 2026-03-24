import { createRichUiTemplateApi, getRichUiTemplates } from "@/config/index";
import {
  getRichUiTemplatesPending,
  getRichUiTemplatesSuccess,
  getRichUiTemplatesError,
  createRichUiTemplateApiSuccess,
} from "../reducer/richUiTemplateReducer";

export const getRichUiTemplatesAction = (orgId) => async (dispatch) => {
  try {
    dispatch(getRichUiTemplatesPending());
    const response = await getRichUiTemplates(orgId);
    dispatch(getRichUiTemplatesSuccess(response.data.data));
  } catch (error) {
    dispatch(getRichUiTemplatesError(error.message));
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
