import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  ChatBotMap: {},
  org: {},
  chatbot_token: "",
  loading: false,
};

export const ChatBot = createSlice({
  name: "Chatbot",
  initialState,
  reducers: {
    isPending: (state) => {
      state.loading = true;
    },
    isError: (state) => {
      state.loading = false;
    },
    // addorRemoveResponseIdInChatBot: (state, action) => {
    //   const { response } = action.payload;
    //   state.allBridgesMap[response.bridge_id] = { ...state.allBridgesMap[response.bridge_id], ...response }
    // },
    // fetchSingleChatBot: (state, action) => {
    //   const { bridges, integrationData } = action.payload;
    //   const { _id, configuration: { model: { default: modelDefault } }, service, type } = bridges;
    //   const obj2 = modelInfo[service][modelDefault];
    //   const response = updatedData(bridges, obj2, type);
    //   state.allBridgesMap[_id] = { ...state.allBridgesMap[_id], ...response, integrationData, responseFormat: handleResponseFormat(bridges) };
    //   state.loading = false;
    // },

    getAllChatBotReducer: (state, action) => {
      state.org = { ...state.org, [action.payload.orgId]: [...action.payload.chatbots] };
      state.chatbot_token = action.payload.chatbot_token;
      state.loading = false;
    },
    getChatBotDetailsReducer: (state, action) => {
      state.ChatBotMap = { ...state.ChatBotMap, [action.payload.botId]: action.payload?.data?.chatbot };
    },
    createNewBotReducer: (state, action) => {
      state.ChatBotMap = { ...state.ChatBotMap, [action.payload.chatbot._id]: action.payload.chatbot };
      state.org[action.payload.orgId].push(action.payload.chatbot);
    },
    addorRemoveBridgeInChatBotReducer: (state, action) => {
      state.ChatBotMap[action.payload.botId].bridges.push(action.payload.bridgeId);
    },
    updateChatBotReducer: (state, action) => {
      state.ChatBotMap[action.payload.botId] = action.payload.data;
    },
    updateChatBotConfigReducer: (state, action) => {
      state.ChatBotMap[action.payload.botId].config = action.payload.data.config;
    },
  },
});

export const {
  isPending,
  isError,
  getAllChatBotReducer,
  getChatBotDetailsReducer,
  createNewBotReducer,
  addorRemoveBridgeInChatBotReducer,
  updateChatBotReducer,
  updateChatBotConfigReducer,
} = ChatBot.actions;
export default ChatBot.reducer;
