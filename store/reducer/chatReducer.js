import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  // Messages by channel identifier (bridgeId + version)
  messagesByChannel: {},
  // Conversation arrays by channel identifier
  conversationsByChannel: {},
  // Loading states by channel
  loadingByChannel: {},
  // Error states by channel
  errorsByChannel: {},
  // Test case data by channel
  testCasesByChannel: {},
  // Uploaded files by channel
  uploadedFilesByChannel: {},
  // Uploaded images by channel
  uploadedImagesByChannel: {},
  // Test case IDs by channel (persisted until manual clear)
  testCaseIdByChannel: {},
};

export const chatReducer = createSlice({
  name: "Chat",
  initialState,
  reducers: {
    // Initialize channel
    initializeChannel: (state, action) => {
      const { channelId } = action.payload;
      if (!state.messagesByChannel[channelId]) {
        state.messagesByChannel[channelId] = [];
        state.conversationsByChannel[channelId] = [];
        state.loadingByChannel[channelId] = false;
        state.errorsByChannel[channelId] = "";
        state.testCasesByChannel[channelId] = {};
        state.uploadedFilesByChannel[channelId] = [];
        state.uploadedImagesByChannel[channelId] = [];
        state.testCaseIdByChannel[channelId] = null;
      }
    },

    // Add user message
    addUserMessage: (state, action) => {
      const { channelId, message } = action.payload;
      if (state.messagesByChannel[channelId]) {
        state.messagesByChannel[channelId].push(message);

        // Add to conversation for backend
        const conversationMessage = {
          role: "user",
          content: message.content,
          user_urls: message.user_urls || [],
          video_data: message.video_data || null,
          youtube_url: message.youtube_url || null,
        };
        state.conversationsByChannel[channelId].push(conversationMessage);
      }
    },

    // Add assistant message (from RT layer)
    addAssistantMessage: (state, action) => {
      const { channelId, message } = action.payload;
      if (state.messagesByChannel[channelId]) {
        state.messagesByChannel[channelId].push(message);

        // Add to conversation for backend
        const conversationMessage = {
          role: message.role || "assistant",
          content: message.content,
          fallback: message.fallback,
          firstAttemptError: message.firstAttemptError,
          llm_urls: message.llm_urls || [],
          model: message.model,
          finish_reason: message.finish_reason,
        };
        state.conversationsByChannel[channelId].push(conversationMessage);
      }
    },

    // Update loading assistant message with real content
    updateAssistantMessage: (state, action) => {
      const { channelId, messageId, content, additionalData } = action.payload;
      if (state.messagesByChannel[channelId]) {
        const messageIndex = state.messagesByChannel[channelId].findIndex((msg) => msg.id === messageId);
        if (messageIndex !== -1) {
          state.messagesByChannel[channelId][messageIndex] = {
            ...state.messagesByChannel[channelId][messageIndex],
            content,
            isLoading: false,
            ...additionalData,
          };

          // Update conversation as well
          const conversationIndex = state.conversationsByChannel[channelId].findIndex(
            (msg, index) =>
              index ===
              messageIndex -
                state.messagesByChannel[channelId].filter((m, i) => i < messageIndex && m.sender === "user").length
          );
          if (conversationIndex !== -1) {
            state.conversationsByChannel[channelId][conversationIndex] = {
              ...state.conversationsByChannel[channelId][conversationIndex],
              content,
              ...additionalData,
            };
          }
        }
      }
    },

    // Edit message
    editMessage: (state, action) => {
      const { channelId, messageId, newContent } = action.payload;
      if (state.messagesByChannel[channelId]) {
        const messageIndex = state.messagesByChannel[channelId].findIndex((msg) => msg.id === messageId);
        if (messageIndex !== -1) {
          state.messagesByChannel[channelId][messageIndex] = {
            ...state.messagesByChannel[channelId][messageIndex],
            content: newContent,
            isEdited: true,
          };

          // Update conversation array - rebuild from all user/assistant messages
          const updatedConversation = [];
          state.messagesByChannel[channelId].forEach((msg) => {
            if (msg.sender === "user" || msg.sender === "assistant") {
              updatedConversation.push({
                role: msg.sender === "user" ? "user" : "assistant",
                content: msg.content,
              });
            }
          });
          state.conversationsByChannel[channelId] = updatedConversation;
        }
      }
    },

    // Remove message
    removeMessage: (state, action) => {
      const { channelId, messageId } = action.payload;
      if (state.messagesByChannel[channelId]) {
        // Remove message from messages array
        state.messagesByChannel[channelId] = state.messagesByChannel[channelId].filter((msg) => msg.id !== messageId);

        // Rebuild conversation array from remaining user/assistant messages
        const updatedConversation = [];
        state.messagesByChannel[channelId].forEach((msg) => {
          if (msg.sender === "user" || msg.sender === "assistant") {
            updatedConversation.push({
              role: msg.sender === "user" ? "user" : "assistant",
              content: msg.content,
            });
          }
        });
        state.conversationsByChannel[channelId] = updatedConversation;
      }
    },

    // Set loading state
    setChannelLoading: (state, action) => {
      const { channelId, loading } = action.payload;
      state.loadingByChannel[channelId] = loading;
    },

    // Set error state
    setChannelError: (state, action) => {
      const { channelId, error } = action.payload;
      state.errorsByChannel[channelId] = error;
    },

    // Clear messages for channel
    clearChannelMessages: (state, action) => {
      const { channelId } = action.payload;
      if (state.messagesByChannel[channelId]) {
        state.messagesByChannel[channelId] = [];
        state.conversationsByChannel[channelId] = [];
        state.errorsByChannel[channelId] = "";
        state.testCasesByChannel[channelId] = {};
      }
    },

    // Load test case messages
    loadTestCaseMessages: (state, action) => {
      const { channelId, messages, conversation, testCaseId } = action.payload;
      if (state.messagesByChannel[channelId]) {
        state.messagesByChannel[channelId] = messages;
        state.conversationsByChannel[channelId] = conversation;
        state.testCasesByChannel[channelId] = { testCaseId };
      }
    },

    // Set uploaded files
    setUploadedFiles: (state, action) => {
      const { channelId, files } = action.payload;
      state.uploadedFilesByChannel[channelId] = files;
    },

    // Set uploaded images
    setUploadedImages: (state, action) => {
      const { channelId, images } = action.payload;
      state.uploadedImagesByChannel[channelId] = images;
    },

    // RT Layer: Add message from socket
    addRtLayerMessage: (state, action) => {
      const { channelId, message, messageType } = action.payload;

      if (!state.messagesByChannel[channelId]) {
        // Initialize channel if it doesn't exist
        state.messagesByChannel[channelId] = [];
        state.conversationsByChannel[channelId] = [];
        state.loadingByChannel[channelId] = false;
        state.errorsByChannel[channelId] = "";
        state.testCasesByChannel[channelId] = {};
        state.uploadedFilesByChannel[channelId] = [];
        state.uploadedImagesByChannel[channelId] = [];
      }

      // Replace loading message if it exists, otherwise add new message
      const messages = state.messagesByChannel[channelId];
      const loadingMessageIndex = messages.findIndex((msg) => msg.isLoading && msg.sender === "assistant");

      if (loadingMessageIndex !== -1) {
        // Replace loading message with RT layer response
        messages[loadingMessageIndex] = message;
      } else {
        // Add new message if no loading message found
        messages.push(message);
      }

      // Add to conversation if it's user or assistant message
      if (messageType === "user" || messageType === "assistant") {
        const conversationMessage = {
          role: messageType,
          content: message.content,
          ...(messageType === "assistant" && {
            fallback: message.fallback,
            firstAttemptError: message.firstAttemptError,
            llm_urls: message.llm_urls || [],
            model: message.model,
            finish_reason: message.finish_reason,
          }),
        };
        state.conversationsByChannel[channelId].push(conversationMessage);
      }
    },

    // Add error message as chat message (for RT layer errors only)
    addErrorMessage: (state, action) => {
      const { channelId, error } = action.payload;
      const timestamp = Date.now();

      if (!state.messagesByChannel[channelId]) {
        // Initialize channel if it doesn't exist
        state.messagesByChannel[channelId] = [];
        state.conversationsByChannel[channelId] = [];
        state.loadingByChannel[channelId] = false;
        state.errorsByChannel[channelId] = "";
        state.testCasesByChannel[channelId] = {};
        state.uploadedFilesByChannel[channelId] = [];
        state.uploadedImagesByChannel[channelId] = [];
      }

      // Replace loading message if it exists with error message
      const messages = state.messagesByChannel[channelId];
      const loadingMessageIndex = messages.findIndex((msg) => msg.isLoading && msg.sender === "assistant");

      const errorMessage = {
        id: `error_${timestamp}`,
        sender: "error",
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        content: error,
        isError: true,
        isLoading: false,
      };

      if (loadingMessageIndex !== -1) {
        // Replace loading message with error message
        messages[loadingMessageIndex] = errorMessage;
      } else {
        // Add new error message
        messages.push(errorMessage);
      }

      // Also set the error in the error state
      state.errorsByChannel[channelId] = error;
    },

    // RT Layer: Update streaming message
    updateRtLayerMessage: (state, action) => {
      const { channelId, messageId, content, isComplete } = action.payload;

      if (state.messagesByChannel[channelId]) {
        const messageIndex = state.messagesByChannel[channelId].findIndex((msg) => msg.id === messageId);
        if (messageIndex !== -1) {
          state.messagesByChannel[channelId][messageIndex] = {
            ...state.messagesByChannel[channelId][messageIndex],
            content,
            isLoading: !isComplete,
          };

          // Update conversation if complete
          if (isComplete) {
            const conversationIndex = state.conversationsByChannel[channelId].length - 1;
            if (
              conversationIndex >= 0 &&
              state.conversationsByChannel[channelId][conversationIndex].role === "assistant"
            ) {
              state.conversationsByChannel[channelId][conversationIndex].content = content;
            }
          }
        }
      }
    },

    // Set testcase_id for channel (persisted until manual clear)
    setChatTestCaseId: (state, action) => {
      const { channelId, testCaseId } = action.payload;
      if (state.testCaseIdByChannel[channelId] !== undefined) {
        state.testCaseIdByChannel[channelId] = testCaseId;
      }
    },

    // Clear testcase_id for channel (manual clear only)
    clearChatTestCaseId: (state, action) => {
      const { channelId } = action.payload;
      if (state.testCaseIdByChannel[channelId] !== undefined) {
        state.testCaseIdByChannel[channelId] = null;
      }
    },

    // Clear all data for channel (when switching agents)
    clearChannelData: (state, action) => {
      const { channelId } = action.payload;
      delete state.messagesByChannel[channelId];
      delete state.conversationsByChannel[channelId];
      delete state.loadingByChannel[channelId];
      delete state.errorsByChannel[channelId];
      delete state.testCasesByChannel[channelId];
      delete state.uploadedFilesByChannel[channelId];
      delete state.uploadedImagesByChannel[channelId];
      delete state.testCaseIdByChannel[channelId];
    },
  },
});

export const {
  initializeChannel,
  addUserMessage,
  addAssistantMessage,
  updateAssistantMessage,
  editMessage,
  removeMessage,
  setChannelLoading,
  setChannelError,
  clearChannelMessages,
  loadTestCaseMessages,
  setUploadedFiles,
  setUploadedImages,
  addRtLayerMessage,
  addErrorMessage,
  updateRtLayerMessage,
  setChatTestCaseId,
  clearChatTestCaseId,
  clearChannelData,
} = chatReducer.actions;

export default chatReducer.reducer;
