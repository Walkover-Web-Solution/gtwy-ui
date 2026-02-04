import { getRichUiTemplates } from "@/config/index";
import {
  getRichUiTemplatesPending,
  getRichUiTemplatesSuccess,
  getRichUiTemplatesError,
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
