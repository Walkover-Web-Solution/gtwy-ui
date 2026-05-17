import { getPrebuiltPrompts, resetPrebuiltPrompt, updatePrebuiltPrompt } from "@/config/index";
import { getAllPrebuiltPrompts, updatePrebuiltPromptData } from "../reducer/prebuiltPromptReducer";
import { handleApiError, isNetworkError } from "@/utils/errorHandler";

export const getPrebuiltPromptsAction = () => async (dispatch) => {
  try {
    const response = await getPrebuiltPrompts();
    dispatch(getAllPrebuiltPrompts(response));
  } catch (error) {
    if (isNetworkError(error)) {
      handleApiError(error, "Failed to load prebuilt prompts");
    }
    console.error(error);
  }
};
export const updatePrebuiltPromptAction = (dataToSend) => async (dispatch) => {
  try {
    const response = await updatePrebuiltPrompt(dataToSend);

    // Transform response to match reducer expectations
    if (response && typeof response === "object") {
      Object.keys(response).forEach((key) => {
        dispatch(
          updatePrebuiltPromptData({
            key: key,
            value: response[key],
          })
        );
      });
    }
  } catch (error) {
    if (isNetworkError(error)) {
      handleApiError(error, "Failed to update prebuilt prompt");
    }
    console.error(error);
  }
};
export const resetPrebuiltPromptAction = (dataToSend) => async (dispatch) => {
  try {
    const response = await resetPrebuiltPrompt(dataToSend);

    // Transform response to match reducer expectations
    if (response && typeof response === "object") {
      Object.keys(response).forEach((key) => {
        dispatch(
          updatePrebuiltPromptData({
            key: key,
            value: response[key],
          })
        );
      });
    }
  } catch (error) {
    if (isNetworkError(error)) {
      handleApiError(error, "Failed to reset prebuilt prompt");
    }
    console.error("Reset action error:", error);
  }
};
