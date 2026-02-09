import {
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
} from "../reducer/chatReducer";
import { haveSameItems, buildUserUrls, buildLlmUrls } from "@/utils/attachmentUtils";

const getVideoIdentifier = (video) => {
  if (!video) return null;
  if (typeof video === "string") return video;
  if (typeof video === "object") {
    return video?.uri || video?.url || null;
  }
  return null;
};

// Initialize chat channel
export const initializeChatChannel = (channelId) => (dispatch) => {
  dispatch(initializeChannel({ channelId }));
};

// Send user message (for dry run API)
export const sendUserMessage =
  (channelId, messageContent, messageId, extraData = {}) =>
  (dispatch) => {
    const timestamp = Date.now();

    // Prefer canonical user_urls structure if provided
    const baseUserUrls = Array.isArray(extraData.user_urls)
      ? extraData.user_urls
      : buildUserUrls(extraData.image_urls || extraData.images || [], extraData.files || []);

    // Derive simple image/file URL arrays for existing UI from user_urls
    const images = baseUserUrls
      .filter((item) => item?.type === "image")
      .map((item) => item.url)
      .filter(Boolean);

    const files = baseUserUrls
      .filter((item) => item?.type === "pdf")
      .map((item) => item.url)
      .filter(Boolean);

    const attachments = {
      image_urls: images,
      files,
      user_urls: baseUserUrls,
      video_data: extraData.video_data || null,
      youtube_url: extraData.youtube_url || null,
    };
    const userMessage = {
      id: messageId || `user_${timestamp}`,
      sender: "user",
      playground: true,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      content: messageContent.replace(/\n/g, "  \n"), // Markdown line break
      ...attachments,
    };

    dispatch(addUserMessage({ channelId, message: userMessage }));
    return userMessage;
  };

// Add loading assistant message
export const addLoadingAssistantMessage = (channelId, messageId) => (dispatch) => {
  const timestamp = Date.now();
  const loadingMessage = {
    id: messageId || `assistant_${timestamp}`,
    sender: "assistant",
    time: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    content: "",
    isLoading: true,
  };

  dispatch(addAssistantMessage({ channelId, message: loadingMessage }));
  return loadingMessage;
};

// Update assistant message with response
export const updateAssistantMessageWithResponse = (channelId, messageId, responseData) => (dispatch) => {
  const content = responseData?.content || "";
  const additionalData = {
    fallback: responseData?.fallback,
    firstAttemptError: responseData?.firstAttemptError,
    model: responseData?.model,
    finish_reason: responseData?.finish_reason,
    role: responseData?.role || "assistant",
  };

  dispatch(
    updateAssistantMessage({
      channelId,
      messageId,
      content,
      additionalData,
    })
  );
};

// Edit message action
export const editChatMessage = (channelId, messageId, newContent) => (dispatch) => {
  dispatch(editMessage({ channelId, messageId, newContent }));
};

// Set loading state
export const setChatLoading = (channelId, loading) => (dispatch) => {
  dispatch(setChannelLoading({ channelId, loading }));
};

// Set error state
export const setChatError = (channelId, error) => (dispatch) => {
  dispatch(setChannelError({ channelId, error }));
};

// Clear chat messages
export const clearChatMessages = (channelId) => (dispatch) => {
  dispatch(clearChannelMessages({ channelId }));
};

// Load test case into chat
export const loadTestCaseIntoChat = (channelId, testCaseConversation, expected, testCaseId) => (dispatch) => {
  const convertedMessages = [];
  const baseTimestamp = Date.now();

  testCaseConversation.forEach((msg, index) => {
    const chatMessage = {
      id: `testcase_${msg.role}_${baseTimestamp}_${index}`,
      sender: msg.role === "user" ? "user" : "assistant",
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
    };
    convertedMessages.push(chatMessage);
  });

  if (expected?.response) {
    const expectedMessage = {
      id: `testcase_expected_${baseTimestamp}`,
      sender: "expected",
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      content: expected.response,
      isExpected: true,
    };
    convertedMessages.push(expectedMessage);
  }

  // Convert to conversation format for the backend
  const backendConversation = testCaseConversation.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  dispatch(
    loadTestCaseMessages({
      channelId,
      messages: convertedMessages,
      conversation: backendConversation,
      testCaseId,
    })
  );
};

// Set uploaded files
export const setChatUploadedFiles = (channelId, files) => (dispatch) => {
  dispatch(setUploadedFiles({ channelId, files }));
};

// Set uploaded images
export const setChatUploadedImages = (channelId, images) => (dispatch) => {
  dispatch(setUploadedImages({ channelId, images }));
};

// RT Layer Actions

// Add error message as chat message (for RT layer errors only)
export const addChatErrorMessage = (channelId, error) => (dispatch) => {
  dispatch(addErrorMessage({ channelId, error }));
  dispatch(setChatLoading(channelId, false));
};

// Handle incoming RT layer message
export const handleRtLayerMessage = (channelId, socketMessage) => (dispatch, getState) => {
  const timestamp = Date.now();

  // Determine message type and create UI message
  const messageType = socketMessage.role || socketMessage.sender || "assistant";

  let uiMessage = {
    id: socketMessage.id || `rt_${messageType}_${timestamp}`,
    sender: messageType,
    time: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    content: socketMessage.content || "",
    isLoading: socketMessage.isStreaming || false,
    ...socketMessage,
  };

  const normalizedImages = Array.isArray(socketMessage.image_urls)
    ? socketMessage.image_urls
    : Array.isArray(socketMessage.images)
      ? socketMessage.images
      : [];
  uiMessage.image_urls = normalizedImages;
  uiMessage.files = Array.isArray(socketMessage.files) ? socketMessage.files : uiMessage.files || [];
  const llmUrls = buildLlmUrls(normalizedImages, uiMessage.files || []);
  uiMessage.llm_urls = llmUrls;
  uiMessage.video_data = socketMessage.video_data || uiMessage.video_data || null;
  uiMessage.youtube_url = socketMessage.youtube_url || uiMessage.youtube_url || null;

  if (messageType === "assistant" && channelId) {
    const state = getState();
    const existingMessages = state?.chatReducer?.messagesByChannel?.[channelId] || [];
    const lastUserMessage = [...existingMessages].reverse().find((msg) => msg.sender === "user");

    if (lastUserMessage) {
      if (haveSameItems(lastUserMessage.image_urls, uiMessage.image_urls)) {
        uiMessage = { ...uiMessage, image_urls: [] };
      }
      if (haveSameItems(lastUserMessage.files, uiMessage.files)) {
        uiMessage = { ...uiMessage, files: [] };
      }
      const userVideo = getVideoIdentifier(lastUserMessage.video_data);
      const assistantVideo = getVideoIdentifier(uiMessage.video_data);
      if (userVideo && assistantVideo && userVideo === assistantVideo) {
        uiMessage = { ...uiMessage, video_data: null };
      }
      if (
        lastUserMessage.youtube_url &&
        uiMessage.youtube_url &&
        lastUserMessage.youtube_url === uiMessage.youtube_url
      ) {
        uiMessage = { ...uiMessage, youtube_url: null };
      }
    }
  }

  dispatch(
    addRtLayerMessage({
      channelId,
      message: uiMessage,
      messageType,
    })
  );

  // Clear loading state when RT layer message is received
  dispatch(setChatLoading(channelId, false));
  return uiMessage;
};

// Handle RT layer streaming update
export const handleRtLayerStreamingUpdate =
  (channelId, messageId, content, isComplete = false) =>
  (dispatch) => {
    dispatch(
      updateRtLayerMessage({
        channelId,
        messageId,
        content,
        isComplete,
      })
    );

    // Clear loading state when streaming is complete
    if (isComplete) {
      dispatch(setChatLoading(channelId, false));
    }
  };

// Clear all channel data (when switching agents)
export const clearChatChannelData = (channelId) => (dispatch) => {
  dispatch(clearChannelData({ channelId }));
};

// Combined action for sending message and handling RT response
export const sendMessageWithRtLayer =
  (channelId, messageContent, apiCall, isOrchestralModel = false, additionalData = {}) =>
  async (dispatch, getState) => {
    let userMessage = null;
    let loadingMessage = null;

    try {
      // Set loading state
      dispatch(setChatLoading(channelId, true));

      // Send user message
      userMessage = dispatch(sendUserMessage(channelId, messageContent, null, additionalData));

      // Add loading assistant message
      loadingMessage = dispatch(addLoadingAssistantMessage(channelId));

      // Make API call (this should trigger RT layer response)
      const response = await apiCall({
        conversation: [], // Will be populated from Redux state
        user: messageContent,
      });
      return { userMessage, loadingMessage, response };
    } catch (error) {
      // Remove both user message and loading assistant message on error
      if (userMessage) {
        dispatch(removeMessage({ channelId, messageId: userMessage.id }));
      }
      if (loadingMessage) {
        dispatch(removeMessage({ channelId, messageId: loadingMessage.id }));
      }

      dispatch(setChatError(channelId, error.message || "Something went wrong. Please try again."));
      dispatch(setChatLoading(channelId, false)); // Clear loading on error
      throw error;
    }
    // Note: No finally block - loading cleared only when RT response received or on error
  };

// Set testcase_id for channel (persisted until manual clear)
export const setChatTestCaseIdAction = (channelId, testCaseId) => (dispatch) => {
  dispatch(setChatTestCaseId({ channelId, testCaseId }));
};

// Clear testcase_id for channel (manual clear only)
export const clearChatTestCaseIdAction = (channelId) => (dispatch) => {
  dispatch(clearChatTestCaseId({ channelId }));
};
