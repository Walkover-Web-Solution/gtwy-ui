import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  // Messages by channel identifier (bridgeId + version)
  messagesByChannel: {},
  // Thread IDs by channel (sent to backend instead of conversation)
  threadIdByChannel: {},
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
  // Raw test case conversation [{role, content}] to send in configuration.conversation
  testCaseConversationByChannel: {},
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
        state.loadingByChannel[channelId] = false;
        state.errorsByChannel[channelId] = "";
        state.testCasesByChannel[channelId] = {};
        state.uploadedFilesByChannel[channelId] = [];
        state.uploadedImagesByChannel[channelId] = [];
        state.testCaseIdByChannel[channelId] = null;
        state.threadIdByChannel[channelId] = crypto.randomUUID();
      }
    },

    // Add user message
    addUserMessage: (state, action) => {
      const { channelId, message } = action.payload;
      if (state.messagesByChannel[channelId]) {
        state.messagesByChannel[channelId].push(message);
      }
    },

    // Add assistant message (from RT layer)
    addAssistantMessage: (state, action) => {
      const { channelId, message } = action.payload;
      if (state.messagesByChannel[channelId]) {
        state.messagesByChannel[channelId].push(message);
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
        }
      }
    },

    // Edit message
    editMessage: (state, action) => {
      const { channelId, messageId, newContent } = action.payload;
      if (state.messagesByChannel[channelId]) {
        const messageIndex = state.messagesByChannel[channelId].findIndex((msg) => msg.id === messageId);
        if (messageIndex !== -1) {
          const isObjectUpdate = newContent && typeof newContent === "object" && !Array.isArray(newContent);
          state.messagesByChannel[channelId][messageIndex] = {
            ...state.messagesByChannel[channelId][messageIndex],
            ...(isObjectUpdate ? newContent : { content: newContent, isEdited: true }),
          };
        }
      }
    },

    // Remove message
    removeMessage: (state, action) => {
      const { channelId, messageId } = action.payload;
      if (state.messagesByChannel[channelId]) {
        state.messagesByChannel[channelId] = state.messagesByChannel[channelId].filter((msg) => msg.id !== messageId);
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
        state.errorsByChannel[channelId] = "";
        state.testCasesByChannel[channelId] = {};
        state.testCaseConversationByChannel[channelId] = null;
        state.threadIdByChannel[channelId] = crypto.randomUUID();
      }
    },

    // Load test case messages
    loadTestCaseMessages: (state, action) => {
      const { channelId, messages, testCaseId, rawConversation } = action.payload;
      if (state.messagesByChannel[channelId]) {
        state.messagesByChannel[channelId] = messages;
        state.testCasesByChannel[channelId] = { testCaseId };
        state.testCaseConversationByChannel[channelId] = rawConversation || null;
      }
    },

    // Clear loaded test case conversation for channel
    clearTestCaseConversation: (state, action) => {
      const { channelId } = action.payload;
      state.testCaseConversationByChannel[channelId] = null;
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
      const { channelId, message } = action.payload;

      if (!state.messagesByChannel[channelId]) {
        // Initialize channel if it doesn't exist
        state.messagesByChannel[channelId] = [];
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
    },

    // Add error message as chat message (for RT layer errors only)
    addErrorMessage: (state, action) => {
      const { channelId, error } = action.payload;
      const timestamp = Date.now();

      if (!state.messagesByChannel[channelId]) {
        // Initialize channel if it doesn't exist
        state.messagesByChannel[channelId] = [];
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

    // RT Layer: Append chunk to streaming message
    appendRtLayerMessageChunk: (state, action) => {
      const { channelId, messageId, chunk } = action.payload;
      if (state.messagesByChannel[channelId]) {
        let messageIndex = -1;
        if (messageId) {
          messageIndex = state.messagesByChannel[channelId].findIndex((msg) => msg.id === messageId);
        }

        // If no messageId or not found, fallback to the last loading assistant message
        if (messageIndex === -1) {
          const messages = state.messagesByChannel[channelId];
          for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].isLoading && messages[i].sender === "assistant") {
              messageIndex = i;
              break;
            }
          }
        }

        if (messageIndex !== -1) {
          // Append chunk to the content
          state.messagesByChannel[channelId][messageIndex].content += chunk;
        }
      }
    },

    // RT Layer: Update streaming message
    updateRtLayerMessage: (state, action) => {
      const { channelId, messageId, content, isComplete, llmUrls, usage, latency } = action.payload;

      if (state.messagesByChannel[channelId]) {
        const messageIndex = state.messagesByChannel[channelId].findIndex((msg) => msg.id === messageId);
        if (messageIndex !== -1) {
          state.messagesByChannel[channelId][messageIndex] = {
            ...state.messagesByChannel[channelId][messageIndex],
            content,
            isLoading: !isComplete,
            isStreaming: !isComplete,
            ...(llmUrls && llmUrls.length > 0 ? { llm_urls: llmUrls } : {}),
            ...(usage ? { usage } : {}),
            ...(latency ? { latency } : {}),
          };
        }
      }
    },

    // Append a reasoning chunk to a streaming message
    appendReasoningChunk: (state, action) => {
      const { channelId, messageId, chunk } = action.payload;
      const messages = state.messagesByChannel[channelId];
      if (!messages) return;
      const idx = messages.findIndex((m) => m.id === messageId);
      if (idx === -1) return;
      if (!messages[idx].reasoning) messages[idx].reasoning = "";
      messages[idx].reasoning += chunk;
    },

    // Add a tool_call entry to a streaming message
    addToolCallToMessage: (state, action) => {
      const { channelId, messageId, toolCall } = action.payload;
      const messages = state.messagesByChannel[channelId];
      if (!messages) return;
      const idx = messages.findIndex((m) => m.id === messageId);
      if (idx === -1) return;
      if (!messages[idx].toolCalls) messages[idx].toolCalls = [];
      messages[idx].toolCalls.push(toolCall);
    },

    // Append a streaming delta chunk into a tool call's streamingContent (deltas emitted between tool_call and tool_result)
    appendToolCallDelta: (state, action) => {
      const { channelId, messageId, callId, name, chunk } = action.payload;
      const messages = state.messagesByChannel[channelId];
      if (!messages) return;
      const msgIdx = messages.findIndex((m) => m.id === messageId);
      if (msgIdx === -1) return;
      const toolCalls = messages[msgIdx].toolCalls;
      if (!toolCalls) return;
      // Match by call_id first; fall back to matching by name with status "calling"
      let tcIdx = toolCalls.findIndex((tc) => tc.call_id === callId);
      if (tcIdx === -1 && name) {
        tcIdx = toolCalls.findIndex((tc) => tc.name === name && tc.status === "calling");
      }
      if (tcIdx !== -1) {
        toolCalls[tcIdx].streamingContent = (toolCalls[tcIdx].streamingContent || "") + chunk;
      }
    },

    // Update a tool_call entry with its result
    updateToolCallResult: (state, action) => {
      const { channelId, messageId, callId, name, result } = action.payload;
      const messages = state.messagesByChannel[channelId];
      if (!messages) return;
      const msgIdx = messages.findIndex((m) => m.id === messageId);
      if (msgIdx === -1) return;
      const toolCalls = messages[msgIdx].toolCalls;
      if (!toolCalls) return;
      // Try matching by call_id first; fall back to matching by name with status "calling"
      let tcIdx = toolCalls.findIndex((tc) => tc.call_id === callId);
      if (tcIdx === -1 && name) {
        tcIdx = toolCalls.findIndex((tc) => tc.name === name && tc.status === "calling");
      }
      if (tcIdx !== -1) {
        toolCalls[tcIdx].status = "done";
        toolCalls[tcIdx].result = result;
        // Clear streaming content now that we have the final result
        toolCalls[tcIdx].streamingContent = null;
      }
    },

    // Review phase: handle phase events (reviewer_start, reviewer_done, main_rerun_start)
    setReviewData: (state, action) => {
      const { channelId, messageId, phase, round = 1, passed, reason } = action.payload;
      const messages = state.messagesByChannel[channelId];
      if (!messages) return;
      const idx = messageId
        ? messages.findIndex((m) => m.id === messageId)
        : messages.findLastIndex((m) => m.sender === "assistant");
      if (idx === -1) return;
      if (!messages[idx].review_phases) messages[idx].review_phases = [];

      if (phase === "reviewer_start") {
        messages[idx].review_phases.push({ phase, round, isStreaming: true, reviewContent: "" });
      } else if (phase === "reviewer_done") {
        const entry = messages[idx].review_phases.findLast((e) => e.round === round);
        if (entry) {
          const jsonMatch = entry.reviewContent?.match(/\{[\s\S]*\}$/);
          if (jsonMatch) entry.reviewContent = entry.reviewContent.slice(0, -jsonMatch[0].length).trimEnd();
          entry.passed = passed;
          entry.reason = reason || "";
          entry.isStreaming = false;
        }
      } else if (phase === "main_rerun_start") {
        const lastEntry = messages[idx].review_phases[messages[idx].review_phases.length - 1];
        if (lastEntry) lastEntry.snapshotContent = messages[idx].content;
        messages[idx].review_phases.push({ phase, round, isStreaming: false });
        messages[idx].content = "";
      }
    },

    // Review phase: append streamed chunk to the last streaming review entry
    appendReviewDelta: (state, action) => {
      const { channelId, messageId, chunk } = action.payload;
      const messages = state.messagesByChannel[channelId];
      if (!messages) return;
      const idx = messageId
        ? messages.findIndex((m) => m.id === messageId)
        : messages.findLastIndex((m) => m.sender === "assistant");
      if (idx === -1) return;
      const phases = messages[idx].review_phases;
      if (!phases) return;
      const streamingEntry = phases.findLast((e) => e.isStreaming);
      if (streamingEntry) streamingEntry.reviewContent = (streamingEntry.reviewContent || "") + chunk;
    },

    // Review phase: mark active streaming review entry as errored
    setReviewError: (state, action) => {
      const { channelId, messageId, round, error } = action.payload;
      const messages = state.messagesByChannel[channelId];
      if (!messages) return;
      const idx = messageId
        ? messages.findIndex((m) => m.id === messageId)
        : messages.findLastIndex((m) => m.sender === "assistant");
      if (idx === -1) return;
      if (!messages[idx].review_phases) messages[idx].review_phases = [];
      // Find the streaming entry for this round, or the last streaming entry
      const entry =
        (round != null && messages[idx].review_phases.findLast((e) => e.round === round)) ||
        messages[idx].review_phases.findLast((e) => e.isStreaming);
      if (entry) {
        entry.isStreaming = false;
        entry.passed = false;
        entry.error = error || "Reviewer call failed";
        entry.reason = error || "Reviewer call failed";
      } else {
        messages[idx].review_phases.push({
          phase: "reviewer_done",
          round: round ?? 1,
          isStreaming: false,
          passed: false,
          error: error || "Reviewer call failed",
          reason: error || "Reviewer call failed",
          reviewContent: "",
        });
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
      delete state.loadingByChannel[channelId];
      delete state.errorsByChannel[channelId];
      delete state.testCasesByChannel[channelId];
      delete state.uploadedFilesByChannel[channelId];
      delete state.uploadedImagesByChannel[channelId];
      delete state.testCaseIdByChannel[channelId];
      delete state.threadIdByChannel[channelId];
      delete state.testCaseConversationByChannel[channelId];
    },

    // Set fallback data for a message
    setFallbackData: (state, action) => {
      const { channelId, messageId, fallbackData } = action.payload;
      if (state.messagesByChannel[channelId]) {
        let messageIndex = -1;
        if (messageId) {
          messageIndex = state.messagesByChannel[channelId].findIndex((msg) => msg.id === messageId);
        }
        if (messageIndex === -1) {
          messageIndex = state.messagesByChannel[channelId].findLastIndex((msg) => msg.sender === "assistant");
        }
        if (messageIndex !== -1) {
          state.messagesByChannel[channelId][messageIndex] = {
            ...state.messagesByChannel[channelId][messageIndex],
            ...fallbackData,
          };
        }
      }
    },

    // Attach AI-generated follow-up suggestions to the last assistant message
    // (the suggestions payload carries no message id to match against)
    setMessageSuggestions: (state, action) => {
      const { channelId, suggestions } = action.payload;
      if (state.messagesByChannel[channelId]) {
        const messageIndex = state.messagesByChannel[channelId].findLastIndex((msg) => msg.sender === "assistant");
        if (messageIndex !== -1) {
          state.messagesByChannel[channelId][messageIndex].suggestions = suggestions;
        }
      }
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
  clearTestCaseConversation,
  setUploadedFiles,
  setUploadedImages,
  addRtLayerMessage,
  addErrorMessage,
  appendRtLayerMessageChunk,
  updateRtLayerMessage,
  setChatTestCaseId,
  clearChatTestCaseId,
  clearChannelData,
  addToolCallToMessage,
  appendToolCallDelta,
  updateToolCallResult,
  appendReasoningChunk,
  setReviewData,
  appendReviewDelta,
  setReviewError,
  setFallbackData,
  setMessageSuggestions,
} = chatReducer.actions;

export default chatReducer.reducer;
