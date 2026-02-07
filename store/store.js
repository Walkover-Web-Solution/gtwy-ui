import { configureStore, combineReducers } from "@reduxjs/toolkit";
import persistReducer from "redux-persist/es/persistReducer";
import persistStore from "redux-persist/es/persistStore";
import createWebStorage from "redux-persist/lib/storage/createWebStorage";
import authDataSliceReducer from "./reducer/authkeyReducer";
import bridgeSliceReducer from "./reducer/bridgeReducer";
import chatBotSliceReducer from "./reducer/ChatBotReducer";
import dryRunSliceReducer from "./reducer/dryRunReducer";
import historySliceReducer from "./reducer/historyReducer";
import knowledgeBaseSliceReducer from "./reducer/knowledgeBaseReducer";
import modelSliceReducer from "./reducer/modelReducer";
import orgSliceReducer from "./reducer/orgReducer";
import responseTypeSliceReducer from "./reducer/responseTypeReducer";
import userDetailsSliceReducer from "./reducer/userDetailsReducer";
import testCasesSliceReducer from "./reducer/testCasesReducer";
import serviceSliceReducer from "./reducer/serviceReducer";
import flowDataSliceReducer from "./reducer/flowDataReducer";
import integrationSliceReducer from "./reducer/integrationReducer";
import authSliceReducer from "./reducer/authReducer";
import gtwyAgentSliceReducer from "./reducer/gwtyAgentReducer";
import orchestralFlowSliceReducer from "./reducer/orchestralFlowReducer";
import prebuiltPromptSliceReducer from "./reducer/prebuiltPromptReducer";
import apiKeysSliceReducer from "./reducer/apiKeysReducer";
import variableSliceReducer from "./reducer/variableReducer";
import chatSliceReducer from "./reducer/chatReducer";
import appInfoSliceReducer from "./reducer/appInfoReducer";
const createNoopStorage = () => {
  return {
    getItem(_key) {
      return Promise.resolve(null);
    },
    setItem(_key, value) {
      return Promise.resolve(value);
    },
    removeItem(_key) {
      return Promise.resolve();
    },
  };
};

const storage = typeof window !== "undefined" ? createWebStorage("local") : createNoopStorage();

// Persist ONLY API Keys slice. Do not persist bridge or any other slices.
// Note: whitelist keys refer to the keys used in combineReducers below.
const persistConfig = {
  key: "root",
  storage,
  // Add the reducer keys you actually want to persist here.
  // IMPORTANT: These must match the keys defined in combineReducers below.
  whitelist: [
    "authDataReducer",
    "bridgeReducer",
    "orgReducer",
    "userDetailsReducer",
    "serviceReducer",
    "modelReducer",
    "flowDataReducer",
    "apiKeysReducer",
    "variableReducer",
    "orchestralFlowReducer",
    "appInfoReducer",
    // Add/remove more slice keys as needed
  ],
};

const rootReducer = combineReducers({
  bridgeReducer: bridgeSliceReducer,
  modelReducer: modelSliceReducer,
  historyReducer: historySliceReducer,
  dryRunReducer: dryRunSliceReducer,
  userDetailsReducer: userDetailsSliceReducer,
  authDataReducer: authDataSliceReducer,
  orgReducer: orgSliceReducer,
  responseTypeReducer: responseTypeSliceReducer,
  ChatBot: chatBotSliceReducer,
  knowledgeBaseReducer: knowledgeBaseSliceReducer,
  testCasesReducer: testCasesSliceReducer,
  serviceReducer: serviceSliceReducer,
  gtwyAgentReducer: gtwyAgentSliceReducer,
  flowDataReducer: flowDataSliceReducer,
  integrationReducer: integrationSliceReducer,
  authReducer: authSliceReducer,
  orchestralFlowReducer: orchestralFlowSliceReducer,
  prebuiltPromptReducer: prebuiltPromptSliceReducer,
  apiKeysReducer: apiKeysSliceReducer,
  variableReducer: variableSliceReducer,
  chatReducer: chatSliceReducer,
  appInfoReducer: appInfoSliceReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST", "persist/REHYDRATE", "persist/REGISTER"],
        ignoredPaths: ["register"], // Adjust the paths as necessary
      },
    }),
});

export const persistor = persistStore(store);
