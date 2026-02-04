import {
  addorRemoveBridgeInChatBot,
  createOrRemoveAction,
  getAllChatBot,
  getChatBotDetails,
  updateChatBot,
  updateChatBotConfig,
} from "@/config";
import {
  getAllChatBotReducer,
  getChatBotDetailsReducer,
  updateChatBotConfigReducer,
  updateChatBotReducer,
} from "../reducer/ChatBotReducer";
import { updateBridgeActionReducer, updateBridgeReducer } from "../reducer/bridgeReducer";

export const getAllChatBotAction = (orgId) => async (dispatch) => {
  try {
    const response = await getAllChatBot(orgId);
    const chatbot_token = response?.data?.chatbot_token;
    dispatch(getAllChatBotReducer({ chatbots: response.data.result.chatbots, orgId, chatbot_token }));
    return { chatbot_token };
  } catch (error) {
    console.error(error);
  }
};

// export const createNewChatbot = (dataToSend, onSuccess) => async (dispatch, getState) => {
//     try {
//         const response = await createChatBot(dataToSend);
//         onSuccess(response);
//         dispatch(createNewBotReducer({ chatbot: response.data.chatBot, orgId: dataToSend.orgId }));
//     } catch (error) {
//         console.error(error);
//     }
// };

export const getChatBotDetailsAction = (botId) => async (dispatch, getState) => {
  try {
    const response = await getChatBotDetails(botId);
    dispatch(getChatBotDetailsReducer({ botId, data: response.data }));
    // dispatch(getAllChatBotReducer({ bridges: response, orgId }));
  } catch (error) {
    console.error(error);
  }
};

export const addorRemoveBridgeInChatBotAction = (orgId, botId, bridgeId, type) => async (dispatch, getState) => {
  try {
    const response = await addorRemoveBridgeInChatBot(orgId, botId, bridgeId, type);
    dispatch(updateBridgeReducer(response.data.result));
    dispatch(updateChatBotReducer({ botId, data: response.data.chatBot.chatBot }));
    // dispatch(addorRemoveBridgeInChatBotReducer({ orgId, botId, bridgeId, type }));
  } catch (error) {
    console.error(error);
  }
};

export const updateChatBotAction = (botId, dataToSend) => async (dispatch, getState) => {
  try {
    const response = await updateChatBot(botId, dataToSend);
    dispatch(updateChatBotReducer({ botId, data: response.data }));
  } catch (error) {
    console.error(error);
  }
};

export const updateChatBotConfigAction = (botId, dataToSend) => async (dispatch, getState) => {
  try {
    const response = await updateChatBotConfig(botId, { config: dataToSend });
    dispatch(updateChatBotConfigReducer({ botId, data: response.data }));
  } catch (error) {
    console.error(error);
  }
};

export const createOrRemoveActionBridge = (dataToSend) => async (dispatch) => {
  try {
    const response = await createOrRemoveAction(dataToSend);
    if (response?.success) {
      dispatch(
        updateBridgeActionReducer({
          bridgeId: response.data?.["parent_id"],
          actionData: response.data?.actions,
          versionId: response.data?.["_id"],
        })
      );
    }
  } catch (error) {
    console.error(error);
  }
};
