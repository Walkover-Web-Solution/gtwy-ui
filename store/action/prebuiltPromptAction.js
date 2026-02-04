import { getPrebuiltPrompts, resetPrebuiltPrompt, updatePrebuiltPrompt } from "@/config/index";
import { getAllPrebuiltPrompts, updatePrebuiltPromptData } from "../reducer/prebuiltPromptReducer";

export const getPrebuiltPromptsAction = () => async (dispatch) => {
  try {
    const response = await getPrebuiltPrompts();
    dispatch(getAllPrebuiltPrompts(response));
  } catch (error) {
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
    console.error("Reset action error:", error);
  }
};
