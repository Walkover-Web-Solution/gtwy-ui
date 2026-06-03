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
  updateToolCallResult,
  appendReasoningChunk,
  setReviewData,
  appendReviewDelta,
  setReviewError,
} from "../reducer/chatReducer";
import { haveSameItems, buildUserUrls, buildLlmUrls, extractImageUrlsFromResponse } from "@/utils/attachmentUtils";

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
    // Skip messages with empty or null content
    if (!msg.content || msg.content === "" || msg.content === null) {
      return;
    }

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
      sender: "assistant",
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      content: typeof expected.response === "object" ? JSON.stringify(expected.response) : expected.response,
      isExpected: true,
    };
    convertedMessages.push(expectedMessage);
  }

  // Build the raw conversation (all messages except the expected answer) in the
  // [{role, content}] format expected by the completion API's configuration.conversation.
  const rawConversation = testCaseConversation
    .filter((msg) => msg.content !== null && msg.content !== undefined && msg.content !== "")
    .map((msg) => ({
      role: msg.role,
      content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
    }));

  dispatch(
    loadTestCaseMessages({
      channelId,
      messages: convertedMessages,
      testCaseId,
      rawConversation,
    })
  );
};

// Clear the stored raw test case conversation for a channel
export const clearTestCaseConversationAction = (channelId) => (dispatch) => {
  dispatch(clearTestCaseConversation({ channelId }));
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

  // Clear loading state when RT layer message is received, unless it's a streaming start message
  if (!socketMessage.isStreaming) {
    dispatch(setChatLoading(channelId, false));
  }
  return uiMessage;
};

// Handle RT layer streaming update for chunks
export const handleRtLayerStreamChunk = (channelId, messageId, chunk) => (dispatch) => {
  dispatch(appendRtLayerMessageChunk({ channelId, messageId, chunk }));
};

// Helper to handle streaming done event
const handleStreamingDoneEvent = (dispatch, channelId, streamingState, rafId, parsed) => {
  // Cancel any pending RAF flush and do a final complete dispatch
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  // Skip streaming update if this was a template response (already rendered)
  if (!streamingState.isTemplateResponse && streamingState.messageId) {
    const llmUrls = extractImageUrlsFromResponse(parsed);
    dispatch(handleRtLayerStreamingUpdate(channelId, streamingState.messageId, streamingState.content, true, llmUrls));
  }
  dispatch(setChatLoading(channelId, false));
};

// Handle RT layer streaming update
export const handleRtLayerStreamingUpdate =
  (channelId, messageId, content, isComplete = false, llmUrls = []) =>
  (dispatch) => {
    dispatch(
      updateRtLayerMessage({
        channelId,
        messageId,
        content,
        isComplete,
        llmUrls,
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

// Send message and handle response via API streaming (start/delta/done SSE events)
export const sendMessageWithApiStreaming =
  (channelId, messageContent, apiCall, isOrchestralModel = false, additionalData = {}) =>
  async (dispatch) => {
    let userMessage = null;
    let loadingMessage = null;
    const streamingState = { messageId: null, content: "", isReviewStreaming: false, isTemplateResponse: false };
    let rafId = null;

    try {
      dispatch(setChatLoading(channelId, true));
      userMessage = dispatch(sendUserMessage(channelId, messageContent, null, additionalData));
      loadingMessage = dispatch(addLoadingAssistantMessage(channelId));

      const result = await apiCall();

      // Non-streaming response — let sendMessageWithRtLayer semantics apply
      if (!result?.stream) {
        // Keep loading until RT layer resolves the assistant/loading message.
        return { userMessage, loadingMessage, response: result };
      }

      // Streaming path: read SSE body from fetch Response or Axios Response
      const streamBody = result.response.body || result.response.data;
      if (!streamBody) {
        throw new Error("Stream body not available in response");
      }
      const reader = streamBody.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // Flush accumulated content to Redux on the next animation frame
      const scheduleFlush = () => {
        if (rafId) return;
        rafId = requestAnimationFrame(() => {
          rafId = null;
          if (streamingState.messageId) {
            dispatch(handleRtLayerStreamingUpdate(channelId, streamingState.messageId, streamingState.content, false));
          }
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop(); // keep incomplete line for next chunk

        for (const line of lines) {
          // SSE format: lines start with "data: "
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data:")) continue;

          const jsonStr = trimmed.slice(5).trim(); // strip "data:" prefix
          if (!jsonStr) continue;

          try {
            const parsed = JSON.parse(jsonStr);

            if (parsed.event === "start") {
              const msgId = parsed.message_id || `stream_${channelId}_${Date.now()}`;
              streamingState.messageId = msgId;
              streamingState.content = "";
              dispatch(
                handleRtLayerMessage(channelId, {
                  id: msgId,
                  content: "",
                  role: "assistant",
                  model: parsed.model,
                  isStreaming: true,
                  fromRTLayer: true,
                  images: [],
                  llm_urls: [],
                  tools_data: {},
                  annotations: null,
                })
              );
            } else if (parsed.event === "review_phase") {
              if (parsed.phase) {
                if (parsed.phase === "reviewer_start") streamingState.isReviewStreaming = true;
                else if (parsed.phase === "reviewer_done") streamingState.isReviewStreaming = false;
                else if (parsed.phase === "main_rerun_start") {
                  streamingState.isReviewStreaming = false;
                  streamingState.content = "";
                }
                dispatch(
                  setReviewData({
                    channelId,
                    messageId: streamingState.messageId,
                    phase: parsed.phase,
                    round: parsed.round ?? 1,
                    passed: parsed.passed,
                    reason: parsed.reason || "",
                  })
                );
              }
            } else if (parsed.event === "delta") {
              if (streamingState.isReviewStreaming) {
                dispatch(
                  appendReviewDelta({ channelId, messageId: streamingState.messageId, chunk: parsed.content || "" })
                );
              } else {
                // Accumulate content; flush to Redux once per animation frame
                streamingState.content += parsed.content || "";
                scheduleFlush();
              }
            } else if (parsed.event === "reasoning") {
              if (streamingState.messageId) {
                dispatch(
                  appendReasoningChunk({ channelId, messageId: streamingState.messageId, chunk: parsed.content || "" })
                );
              }
            } else if (parsed.event === "tool_call") {
              dispatch(
                addToolCallToMessage({
                  channelId,
                  messageId: streamingState.messageId,
                  toolCall: {
                    call_id: parsed.call_id,
                    name: parsed.name,
                    args: parsed.args || {},
                    status: "calling",
                    result: null,
                  },
                })
              );
            } else if (parsed.event === "tool_result") {
              dispatch(
                updateToolCallResult({
                  channelId,
                  messageId: streamingState.messageId,
                  callId: parsed.call_id,
                  name: parsed.name,
                  result: parsed.content,
                })
              );
            } else if (parsed.event === "template_response") {
              // Handle template response with rich UI content
              if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
              }
              // Remove loading message since template response is complete
              if (loadingMessage) {
                dispatch(removeMessage({ channelId, messageId: loadingMessage.id }));
                loadingMessage = null;
              }
              streamingState.isTemplateResponse = true;
              dispatch(
                handleRtLayerMessage(channelId, {
                  id: parsed.message_id,
                  content: parsed.content, // Rich UI template structure
                  role: "assistant",
                  type: "template",
                  isLoading: false,
                  isStreaming: false,
                  fromRTLayer: true,
                  response_type: parsed.metadata || { is_template: true },
                  template_id: parsed.metadata?.template_id,
                  template_name: parsed.metadata?.template_name,
                  images: [],
                  llm_urls: [],
                  tools_data: {},
                  annotations: null,
                })
              );
            } else if (parsed.event === "error") {
              if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
              }
              const errMsg = parsed.error || "Something went wrong. Please try again.";
              // Detect reviewer errors: "Reviewer call failed on round N: ..."
              const reviewerErrMatch = errMsg.match(/^Reviewer call failed on round (\d+):\s*([\s\S]*)$/);
              if (reviewerErrMatch) {
                const round = parseInt(reviewerErrMatch[1], 10);
                let reason = reviewerErrMatch[2].trim();
                try {
                  const parsed2 = JSON.parse(reason);
                  reason = parsed2?.error?.message || reason;
                } catch {}
                dispatch(setReviewError({ channelId, messageId: streamingState.messageId, round, error: reason }));
                streamingState.isReviewStreaming = false;
                // Don't return — let the stream continue to the done event
              } else {
                dispatch(addChatErrorMessage(channelId, errMsg));
                return { userMessage, loadingMessage: null, response: { success: false } };
              }
            } else if (parsed.event === "done") {
              handleStreamingDoneEvent(dispatch, channelId, streamingState, rafId, parsed);
            }
          } catch (parseErr) {
            console.debug("[SSE] Skipping non-JSON line:", jsonStr, parseErr);
          }
        }
      }

      // Flush any remaining buffer line
      if (buffer.trim().startsWith("data:")) {
        try {
          const parsed = JSON.parse(buffer.trim().slice(5).trim());
          if (parsed.event === "done" && streamingState.messageId) {
            handleStreamingDoneEvent(dispatch, channelId, streamingState, rafId, parsed);
          }
        } catch (parseErr) {
          console.debug("[SSE] Skipping non-JSON buffer remainder:", buffer, parseErr);
        }
      }

      return { userMessage, loadingMessage, response: { success: true } };
    } catch (error) {
      // Cancel any pending animation frame to prevent stale flush after error
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (userMessage) dispatch(removeMessage({ channelId, messageId: userMessage.id }));
      if (loadingMessage) dispatch(removeMessage({ channelId, messageId: loadingMessage.id }));
      dispatch(setChatError(channelId, error.message || "Something went wrong. Please try again."));
      dispatch(setChatLoading(channelId, false));
      throw error;
    }
  };

// Set testcase_id for channel (persisted until manual clear)
export const setChatTestCaseIdAction = (channelId, testCaseId) => (dispatch) => {
  dispatch(setChatTestCaseId({ channelId, testCaseId }));
};

// Clear testcase_id for channel (manual clear only)
export const clearChatTestCaseIdAction = (channelId) => (dispatch) => {
  dispatch(clearChatTestCaseId({ channelId }));
};

// Handle intermediate RT layer function call / status updates
export const handleRtLayerFunctionCall = (channelId, response) => (dispatch, getState) => {
  const state = getState();
  const messages = state?.chatReducer?.messagesByChannel?.[channelId] || [];

  // Find the last assistant message (which is typically the loading one)
  const lastAssistantIndex = messages.findLastIndex((msg) => msg.sender === "assistant" || msg.role === "assistant");

  if (lastAssistantIndex !== -1) {
    const lastAssistantMsg = messages[lastAssistantIndex];
    const messageId = lastAssistantMsg.id;

    // Create a copy of existing toolCalls or initialize an empty array
    let updatedToolCalls = lastAssistantMsg.toolCalls ? [...lastAssistantMsg.toolCalls] : [];
    let updatedContent = lastAssistantMsg.content || "";

    let hasChanges = false;

    if (response.Name && Array.isArray(response.Name)) {
      response.Name.forEach((name) => {
        // Check if this toolCall already exists
        const exists = updatedToolCalls.some((tc) => tc.name === name);
        if (!exists) {
          updatedToolCalls.push({
            call_id: name,
            name: name,
            status: "calling",
            result: null,
          });
          hasChanges = true;
        }
      });
    }

    if (response.message) {
      // Update content to show reasoning status (e.g. "Continuing AI reasoning…")
      updatedContent = response.message;
      hasChanges = true;
    }

    if (hasChanges) {
      dispatch(
        editMessage({
          channelId,
          messageId,
          newContent: {
            content: updatedContent,
            toolCalls: updatedToolCalls,
          },
        })
      );
    }
  }
};
