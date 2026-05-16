import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import ChatTextInput from "./ChatTextInput";
import { PdfIcon } from "@/icons/pdfIcon";
import { truncate } from "../historyPageComponents/AssistFile";
import { AlertIcon, CloseCircleIcon } from "@/components/Icons";
import {
  ExternalLink,
  Menu,
  PlayIcon,
  PlusIcon,
  Zap,
  CheckCircle,
  Target,
  ToggleLeft,
  ToggleRight,
  Edit2,
  Save,
  X,
  AlertTriangle,
  Wrench,
  ChevronDown,
  ChevronUp,
  CircleQuestionMark,
} from "lucide-react";
import TestCaseSidebar from "./TestCaseSidebar";
import AddTestCaseModal from "../modals/AddTestCaseModal";
import InfoTooltip from "../InfoTooltip";
import { createConversationForTestCase, toggleSidebar } from "@/utils/utility";
import { validatePromptVariables, buildVariablesObject } from "@/utils/variableValidation";
import { runTestCaseAction } from "@/store/action/testCasesAction";
import { useDispatch } from "react-redux";
import { useCustomSelector } from "@/customHooks/customSelector";
import Protected from "../Protected";
import ReactMarkdown from "../LazyMarkdown";
import useRtLayerEventHandler from "@/customHooks/useRtLayerEventHandler";
import {
  initializeChatChannel,
  editChatMessage,
  setChatLoading,
  clearChatMessages,
  loadTestCaseIntoChat,
  clearChatTestCaseIdAction,
} from "@/store/action/chatAction";
import RenderNode from "../richUI/RenderNode";
import ReasoningAccordion from "./ReasoningAccordion";
import ReviewPhaseAccordion from "./ReviewPhaseAccordion";
import { mdComponentsDark, mdRemarkPlugins, mdProseClass } from "@/utils/markdownComponents";

const mdComponents = mdComponentsDark;

const ChatImage = ({ src, alt, onClick }) => {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div
      className={`relative group cursor-pointer inline-flex flex-col w-full max-w-[250px] sm:max-w-[400px] rounded-lg overflow-hidden border border-base-content/10 shadow-sm transition-all duration-300 ${
        isLoading ? "skeleton min-h-[200px] bg-base-300/50" : "bg-base-200/50"
      }`}
      onClick={onClick}
    >
      <img
        src={src}
        alt={alt}
        className={`w-full h-auto transition-opacity duration-300 ${isLoading ? "opacity-0" : "opacity-100"}`}
        onLoad={() => setIsLoading(false)}
      />
    </div>
  );
};

function StreamingMessage({ content, isStreaming }) {
  const displayContent = isStreaming ? content + "\u200B" : content;

  return (
    <div className={mdProseClass.dark}>
      <ReactMarkdown components={mdComponents} remarkPlugins={mdRemarkPlugins}>
        {displayContent}
      </ReactMarkdown>
      {isStreaming && <span className="inline-block w-[2px] h-[1em] bg-current align-middle ml-0.5 animate-pulse" />}
    </div>
  );
}

function ToolCallItem({ toolCall, isMessageComplete }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (toolCall.status === "done") setOpen(true);
  }, [toolCall.status]);
  useEffect(() => {
    if (isMessageComplete) setOpen(false);
  }, [isMessageComplete]);
  let parsedResult = null;
  if (toolCall.result) {
    try {
      parsedResult = JSON.parse(toolCall.result);
    } catch {
      parsedResult = toolCall.result;
    }
  }
  return (
    <div className="rounded-lg border border-base-300 bg-base-200 text-xs overflow-hidden">
      <div
        className={`flex items-center gap-2 px-3 py-1.5 select-none ${toolCall.status === "done" ? "cursor-pointer" : "cursor-default"}`}
        onClick={() => toolCall.status === "done" && setOpen((v) => !v)}
      >
        {toolCall.status === "calling" ? (
          <span className="loading loading-spinner loading-xs text-primary" />
        ) : (
          <Wrench className="h-3.5 w-3.5 text-success shrink-0" />
        )}
        <span className="font-mono font-medium truncate flex-1">{toolCall.name}</span>
        {toolCall.status === "calling" ? (
          <span className="text-base-content/50 italic">calling…</span>
        ) : open ? (
          <ChevronUp className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 shrink-0" />
        )}
      </div>
      {toolCall.status === "done" && open && (
        <div className="border-t border-base-300 px-3 py-2 bg-base-100 font-mono whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
          {typeof parsedResult === "object" ? JSON.stringify(parsedResult, null, 2) : String(parsedResult)}
        </div>
      )}
    </div>
  );
}

function Chat({ params, userMessage, isOrchestralModel = false, searchParams, isEmbedUser }) {
  const messagesContainerRef = useRef(null);
  const attachScrollListener = useCallback((el) => {
    if (!el) return;
    messagesContainerRef.current = el;
    const onScroll = () => {
      isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_NEAR_BOTTOM_THRESHOLD;
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);
  const isAtBottomRef = useRef(true);
  const dispatch = useDispatch();
  const inputRef = useRef(null);
  const [showTestCases, setShowTestCases] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState("exact");
  const [testCaseId, setTestCaseId] = useState(null);
  const [currentRunIndex, setCurrentRunIndex] = useState(null);
  const [isRunningTestCase, setIsRunningTestCase] = useState(false);
  const [showTestCaseResults, setShowTestCaseResults] = useState({});
  const [isLoadingTestCase, setIsLoadingTestCase] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editContent, setEditContent] = useState("");
  const testCaseResultRef = useRef(null);
  const [testCaseConversation, setTestCaseConversation] = useState([]);
  const [pendingTestIndex, setPendingTestIndex] = useState(null);

  // Get published version ID from Redux store
  const publishedVersionId = useCustomSelector(
    (state) => state?.bridgeReducer?.allBridgesMap?.[params?.id]?.published_version_id
  );

  const channelIdentifier = useMemo(() => {
    const isPublished = searchParams?.isPublished === "true";

    if (isPublished) {
      // For published version, use published version ID in channel identifier
      return (params.org_id + "_" + params?.id + "_" + publishedVersionId).replace(/ /g, "_");
    } else {
      // For draft versions, include the version
      return (params.org_id + "_" + params?.id + "_" + searchParams?.version).replace(/ /g, "_");
    }
  }, [params, searchParams, publishedVersionId]);

  // Redux selectors for chat state
  const {
    messages,
    finishReasonDescription,
    variablesKeyValue,
    prompt,
    showVariables: showVariablesFromRedux,
  } = useCustomSelector((state) => {
    const versionData = state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[searchParams?.version];
    return {
      messages: state?.chatReducer?.messagesByChannel?.[channelIdentifier] || [],
      finishReasonDescription: state?.flowDataReducer?.flowData?.finishReasonsData || [],
      variablesKeyValue:
        state?.variableReducer?.VariableMapping?.[params?.id]?.[searchParams?.version]?.variables || [],
      prompt: versionData?.configuration?.prompt,
      showVariables: state?.appInfoReducer?.embedUserDetails?.showVariables || false,
    };
  });

  // Initialize channel and RT layer
  useEffect(() => {
    if (channelIdentifier) {
      dispatch(initializeChatChannel(channelIdentifier));
    }
  }, [channelIdentifier, dispatch]);

  useRtLayerEventHandler(channelIdentifier);

  // Build variables object from variablesKeyValue (using shared utility)
  const variables = useMemo(() => buildVariablesObject(variablesKeyValue), [variablesKeyValue]);

  // Validate missing variables in prompt (using shared utility)
  const validateVariables = useCallback(
    () => validatePromptVariables(prompt, variablesKeyValue),
    [prompt, variablesKeyValue]
  );
  const SCROLL_NEAR_BOTTOM_THRESHOLD = 50;

  const messagesCount = messages.length;

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      isAtBottomRef.current = true;
    }
  }, [messagesCount]);

  // MutationObserver: fires on every DOM change inside the container (text appended,
  // nodes added). This catches Immer in-place mutations during streaming that
  // never change React refs and would be missed by useEffect dependencies.
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;

    const observer = new MutationObserver(() => {
      if (isAtBottomRef.current) {
        el.scrollTop = el.scrollHeight;
      }
    });

    observer.observe(el, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      // Check if click is outside test case result and not on a toggle button
      const isToggleButton = event.target.closest('button[class*="absolute -bottom-8"]');
      if (testCaseResultRef.current && !testCaseResultRef.current.contains(event.target) && !isToggleButton) {
        setShowTestCaseResults({});
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleResetChat = () => {
    setTestCaseId(null);
    if (channelIdentifier) {
      dispatch(clearChatMessages(channelIdentifier));
      // Clear loading state from send button
      dispatch(setChatLoading(channelIdentifier, false));
      // Clear testcase_id from Redux
      dispatch(clearChatTestCaseIdAction(channelIdentifier));
    }
    setEditingMessage(null);
    setEditContent("");

    // Focus on input field after reset
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
  };

  const handleEditMessage = (messageId, currentContent) => {
    setEditingMessage(messageId);
    setEditContent(currentContent);
  };

  const handleSaveEdit = (messageId) => {
    if (channelIdentifier) {
      dispatch(editChatMessage(channelIdentifier, messageId, editContent));
    }
    setEditingMessage(null);
    setEditContent("");
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setEditContent("");
  };

  const handleTestCaseClick = async (testCaseConversation, expected, testcase_id, matching_type) => {
    setIsLoadingTestCase(true);

    try {
      // Add a small delay to show loading state
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (channelIdentifier) {
        dispatch(loadTestCaseIntoChat(channelIdentifier, testCaseConversation, expected, testCaseId));
      }

      // Close testcase sidebar
      setShowTestCases(false);
    } finally {
      setIsLoadingTestCase(false);
    }
  };

  // Handle userMessage prop - automatically send message and create Redux entry
  const handleSendMessageRef = useRef(null);

  useEffect(() => {
    if (userMessage && userMessage.trim() !== "") {
      if (handleSendMessageRef.current && inputRef.current) {
        inputRef.current.value = userMessage;
        setTimeout(() => {
          handleSendMessageRef.current(null, true); // Pass forceRun=true
        }, 50);

        // Clear the input field after sending
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.value = "";
          }
        }, 200);
      } else {
        console.warn("[Chat] Missing handleSendMessageRef or inputRef");
      }
    }
  }, [userMessage]);

  // Listen for runAnyway event from VariableCollectionSlider
  useEffect(() => {
    const handleRunAnyway = () => {
      // Check if there's a pending playground test
      if (pendingTestIndex !== null) {
        handleRunTestCase(pendingTestIndex, true); // Run with forceRun=true
      }
    };

    window.addEventListener("runAnyway", handleRunAnyway);
    return () => window.removeEventListener("runAnyway", handleRunAnyway);
  }, [pendingTestIndex]);

  const handleRunTestCase = async (index, forceRun = false) => {
    // Check if slider auto-open is disabled
    const isSliderAutoOpenDisabled =
      typeof window !== "undefined" && sessionStorage.getItem("variableSliderDisabled") === "true";

    // Validate variables before running test (skip if forceRun is true or slider is disabled)
    if (!forceRun && !isSliderAutoOpenDisabled) {
      const validation = validateVariables();
      const shouldShowVariables = isEmbedUser ? showVariablesFromRedux : true;
      if (!validation.isValid && shouldShowVariables) {
        // Store the pending test index
        setPendingTestIndex(index);

        // Open the variable collection slider
        toggleSidebar("variable-collection-slider", "right");

        // Store missing variables in sessionStorage for the slider to highlight
        sessionStorage.setItem("missingVariables", JSON.stringify(validation.missingVariables));

        return; // Don't run the test
      }
    }

    // Clear pending state and missing variables
    setPendingTestIndex(null);
    sessionStorage.removeItem("missingVariables");

    const conversationForTestCase = messages.slice(-6, index + 1);
    conversationForTestCase.push(messages[index + 1]);
    const { conversation, expected } = createConversationForTestCase(conversationForTestCase);
    setCurrentRunIndex(index);
    setIsRunningTestCase(true);
    const testCaseData = {
      conversation,
      expected,
      matching_type: selectedStrategy,
    };
    try {
      const data = await dispatch(
        runTestCaseAction({
          versionId: searchParams.version,
          bridgeId: null,
          testcase_id: null,
          testCaseData,
          variables,
        })
      );
      const updatedMessages = [...messages];
      const nextMessage = updatedMessages[index + 1];
      const nextMessageId = nextMessage.id;
      const updatedNextMessage = {
        ...nextMessage,
        testCaseResult: data?.results?.[0],
      };
      // Automatically show the test case results card after running the test
      dispatch(editChatMessage(channelIdentifier, nextMessageId, updatedNextMessage));
      setShowTestCaseResults((prev) => ({
        ...prev,
        [nextMessageId]: true,
      }));
    } finally {
      setIsRunningTestCase(false);
      setCurrentRunIndex(null);
    }
  };

  // Opens the embedded chatbot panel and sends any necessary data beforehand

  // ----------------- RICH UI ACTIONS -----------------
  const handleRichUIActions = (event) => {
    // Event delegation: find closest element with data-action
    const target = event.target.closest("[data-action]");
    if (!target) return;

    event.preventDefault();

    const actionDataStr = target.getAttribute("data-action");
    const elementId = target.getAttribute("id");
    try {
      const actionPayload = JSON.parse(actionDataStr);
      // 1. Show loading state
      target.classList.add("loading", "loading-spinner", "btn-disabled"); // DaisyUI classes

      // 2. Send to parent
      if (typeof window !== "undefined") {
        window.parent.postMessage(
          {
            type: "GTWY_ACTION",
            payload: actionPayload,
            elementId: elementId,
          },
          "*"
        );
      }
    } catch (e) {
      console.error("Failed to parse action data", e);
    }
  };

  const _renderMessageAttachments = (message) => {
    // Check for both image_urls (user images) and llm_urls (assistant images)
    const isAssistant = message?.sender === "assistant" || message?.role === "assistant";
    const hasUserImages = !isAssistant && Array.isArray(message?.image_urls) && message.image_urls.length > 0;
    const hasLlmImages = Array.isArray(message?.llm_urls) && message.llm_urls.length > 0;
    const hasFiles = Array.isArray(message?.files) && message.files.length > 0;
    const hasVideo = Boolean(message?.video_data);
    const hasYoutube = Boolean(message?.youtube_url);

    if (!hasUserImages && !hasLlmImages && !hasFiles && !hasVideo && !hasYoutube) {
      return null;
    }

    return (
      <div className="mt-3 flex flex-col gap-3">
        {/* User images - only show for non-assistant messages */}
        {hasUserImages && (
          <div className="flex flex-wrap gap-2">
            {message.image_urls.map((url, imgIndex) =>
              typeof url === "string" && url ? (
                <Image
                  key={`user-img-${imgIndex}`}
                  src={url}
                  alt={`User Image ${imgIndex + 1}`}
                  width={80}
                  height={80}
                  className="w-20 h-20 object-cover rounded-lg cursor-pointer"
                  onClick={() => window.open(url, "_blank")}
                />
              ) : null
            )}
          </div>
        )}

        {/* LLM/Assistant images */}
        {hasLlmImages && (
          <div className="flex flex-wrap gap-4 mt-1">
            {message.llm_urls.map((urlObj, imgIndex) => {
              const imageUrl = typeof urlObj === "string" ? urlObj : urlObj?.url;
              const isImage = typeof urlObj === "string" || urlObj?.type === "image";

              return imageUrl && isImage ? (
                <ChatImage
                  key={`llm-img-${imgIndex}`}
                  src={imageUrl}
                  alt={`Generated Image ${imgIndex + 1}`}
                  onClick={() => window.open(imageUrl, "_blank")}
                />
              ) : null;
            })}
          </div>
        )}

        {hasVideo && (
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <video
                src={message.video_data?.uri}
                width={160}
                height={120}
                className="w-40 h-30 object-cover rounded-lg cursor-pointer"
                controls
                preload="metadata"
                onClick={() => window.open(message.video_data?.uri, "_blank")}
              />
              <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">Video</div>
            </div>
          </div>
        )}

        {hasYoutube && (
          <div className="bg-base-200 p-3 rounded-lg border border-base-content/30">
            <div className="flex items-center gap-2 mb-2">
              <PlayIcon size={16} className="text-red-500" />
              <span className="text-sm font-medium">YouTube Video</span>
            </div>
            <a
              data-testid="chat-youtube-link"
              id="chat-youtube-link"
              href={message.youtube_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:underline block truncate"
            >
              {message.youtube_url}
            </a>
          </div>
        )}

        {hasFiles && (
          <div className="flex flex-wrap gap-2 bg-base-200 p-2 rounded-md">
            {message.files.map((url, fileIndex) =>
              typeof url === "string" && url ? (
                <a
                  data-testid={`chat-file-link-${fileIndex}`}
                  id={`chat-file-link-${fileIndex}`}
                  key={fileIndex}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 hover:underline"
                >
                  <PdfIcon height={20} width={20} />
                  <span className="text-sm overflow-hidden truncate max-w-[10rem]">
                    {truncate(url.split("/").pop(), 20)}
                  </span>
                </a>
              ) : null
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div data-testid="chat-container" id="chat-container" className="flex flex-col h-full w-full bg-base-100">
      <div
        data-testid="chat-header"
        id="chat-header"
        className="w-full flex justify-between items-center px-4 pt-4 pb-2"
      >
        <button
          data-testid="chat-toggle-testcases-button"
          id="chat-toggle-testcases-button"
          className="btn btn-sm btn-square"
          onClick={() => setShowTestCases((prev) => !prev)}
          title="Toggle Test Cases"
        >
          <div
            className="flex items-center gap-2 tooltip tooltip-right"
            data-tip={showTestCases ? "Hide Test Cases" : "Show Test Cases"}
          >
            {showTestCases ? <CloseCircleIcon /> : <Menu />}
          </div>
        </button>
        <span className="label-text">New Test Case</span>
        <div className="flex items-center gap-2">
          {messages?.length > 0 && (
            <div className="flex items-center gap-2 justify-center">
              <InfoTooltip
                tooltipContent={`Matching strategies:
 - Cosine finds semantically similar responses.
 - Exact matches strict text patterns.
 - AI uses model judgment to pick the best match.`}
              >
                <CircleQuestionMark
                  size={14}
                  className="text-gray-500 hover:text-gray-700 cursor-help"
                  aria-label="Matching strategy information"
                />
              </InfoTooltip>
              <select
                data-testid="chat-strategy-select"
                id="chat-strategy-select"
                className="select select-sm select-bordered"
                value={selectedStrategy}
                onChange={(e) => setSelectedStrategy(e.target.value)}
              >
                <option value="cosine">Cosine</option>
                <option value="ai">AI</option>
                <option value="exact">Exact</option>
              </select>
              <button
                data-testid="chat-add-testcase-button"
                id="chat-add-testcase-button"
                className="btn btn-sm"
                onClick={handleResetChat}
              >
                {" "}
                <PlusIcon size={14} />
                Add Test Case
              </button>
            </div>
          )}
          {/* Test Cases Toggle Button */}
        </div>
      </div>
      <div
        data-testid="chat-content-wrapper"
        id="chat-content-wrapper"
        className="flex flex-1 overflow-hidden relative px-4"
      >
        {/* Overlay Test Cases Sidebar */}
        {showTestCases && (
          <div id="chat-testcase-sidebar-overlay" className="absolute inset-0 z-very-high flex">
            {/* Optional backdrop */}
            <div className="absolute inset-0 bg-black/30" onClick={() => setShowTestCases(false)}></div>

            {/* Sidebar */}
            <div
              data-testid="chat-testcase-sidebar"
              id="chat-testcase-sidebar"
              className="relative w-[70%] h-full border border-base-content/30 rounded-md bg-base-100 shadow-lg z-very-high animate-slideIn"
            >
              <TestCaseSidebar
                params={params}
                resolvedParams={searchParams}
                matching_type={selectedStrategy}
                onTestCaseClick={handleTestCaseClick}
              />
            </div>
          </div>
        )}

        {/* Chat Section */}
        <div
          data-testid="chat-messages-section"
          id="chat-messages-section"
          className="w-full flex-grow min-w-0 relative"
        >
          {/* Loading overlay for testcase loading */}
          {isLoadingTestCase && (
            <div
              data-testid="chat-loading-overlay"
              id="chat-loading-overlay"
              className="absolute inset-0 bg-base-100/80 backdrop-blur-sm flex items-center justify-center rounded-md z-50"
            >
              <div className="flex items-center gap-3 bg-base-100 p-4 rounded-lg shadow-lg border border-base-content/20">
                <span className="loading loading-spinner loading-md text-primary"></span>
                <span className="text-base font-medium">Loading test case conversation...</span>
              </div>
            </div>
          )}

          <div className="sm:p-2 justify-between flex flex-col h-full min-h-0 w-full z-low">
            <div
              data-testid="chat-messages-container"
              id="chat-messages-container"
              ref={attachScrollListener}
              className="flex flex-col w-full flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-thumb-blue scrollbar-thumb-rounded scrollbar-track-blue-lighter scrollbar-w-1 pr-2"
              onClick={handleRichUIActions}
            >
              {messages.map((message, index) => {
                return (
                  <div
                    data-testid={`chat-message-${index}`}
                    id={`chat-message-${index}`}
                    key={index}
                    className={`chat show-on-hover ${
                      message.sender === "user" ? "chat-end flex flex-col mt-2" : "chat-start"
                    }`}
                  >
                    <div className="chat-image avatar"></div>
                    <div className="chat-header flex items-center gap-1.5 mb-1">
                      {!(message.sender === "assistant" && message.isLoading && !message.content) && (
                        <>
                          <span className="text-xs font-semibold capitalize tracking-wide opacity-70">
                            {message.sender === "error"
                              ? "Error"
                              : message.testCaseResult
                                ? "Model Answer"
                                : message.sender}
                          </span>
                          {message.isEdited && <span className="text-xs text-warning font-medium">(edited)</span>}
                          <time className="text-[10px] opacity-40">{message.time}</time>
                        </>
                      )}
                      {message?.sender === "assistant" && message?.fallback && (
                        <div className="my-1">
                          <div className="max-w-[30rem] text-primary rounded-lg text-xs overflow-hidden transition-all duration-200 hover:bg-base-200/90">
                            <input
                              autoComplete="off"
                              id={`retry-${message.id}`}
                              type="checkbox"
                              className="peer hidden"
                            />

                            <label
                              htmlFor={`retry-${message.id}`}
                              className="px-3 py-1.5 min-h-0 h-7 leading-none cursor-pointer flex items-center justify-between w-full gap-2 transition-all duration-200 hover:bg-base-300/20 peer-checked:bg-base-300/30 flex-row-reverse"
                            >
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <span className="text-xs opacity-80">↻</span>
                                <span className="truncate">Retried with</span>
                                <span className="font-medium truncate text-primary/90">{message?.modelName}</span>
                              </div>
                            </label>

                            <div className="max-h-0 peer-checked:max-h-96 transition-all duration-300 ease-in-out overflow-hidden bg-base-300/10">
                              <pre className="text-xs text-error/90 whitespace-pre-wrap px-3 py-2 leading-relaxed">
                                {message.firstAttemptError}
                              </pre>
                            </div>
                          </div>
                        </div>
                      )}

                      {message?.sender === "assistant" &&
                        message?.finish_reason &&
                        message.finish_reason !== "completed" &&
                        message.finish_reason !== "no_reason" && (
                          <div className="my-1">
                            <div className="max-w-[30rem] bg-base-200/50 border border-warning/20 rounded-md px-3 py-1.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <AlertIcon size={12} className="text-warning flex-shrink-0" />
                                  <span className="text-xs text-base-content/80 leading-tight">
                                    {finishReasonDescription[message.finish_reason]}
                                  </span>
                                </div>
                                <a
                                  href="https://app.docstar.io/p/finish-reasons?collectionId=inYU67SKiHgW"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-warning/70 hover:text-warning transition-colors flex-shrink-0 ml-2"
                                  title="More details"
                                >
                                  <ExternalLink size={10} />
                                </a>
                              </div>
                            </div>
                          </div>
                        )}
                    </div>

                    {message?.sender === "tools_call" && message?.tools_call_data && (
                      <div className="flex flex-wrap justify-center items-center gap-2 my-2">
                        {Object.entries(message.tools_call_data).map(([functionName]) => (
                          <div
                            key={functionName}
                            className="bg-base-200 border border-base-content/20 rounded-md p-2 min-w-[120px] max-w-[200px] shadow-sm"
                          >
                            <div className="flex items-center justify-center space-x-1 mb-1">
                              <div className="w-4 h-4 bg-primary/10 rounded-full flex items-center justify-center">
                                <Zap className="text-base-content" size={14} />
                              </div>
                              <span className="text-xs font-medium text-base-content/80">Function</span>
                            </div>
                            <div className="text-center">
                              <div className="text-sm font-semibold text-primary mb-1 truncate" title={functionName}>
                                {functionName}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {(message.sender === "user" ||
                      message.sender === "assistant" ||
                      message.sender === "expected" ||
                      message.sender === "error") &&
                      (message?.content ||
                        message?.isLoading ||
                        message?.llm_urls?.length > 0 ||
                        message?.image_urls?.length > 0) && (
                        <div
                          className={`flex gap-2 show-on-hover ${message.sender === "user" ? "justify-end" : "justify-start"} w-full max-w-[720px] min-w-0 items-center relative ${editingMessage === message.id && message.sender === "assistant" ? "w-[500px]" : ""}`}
                        >
                          {message?.sender === "user" && message?.content && (
                            <button
                              data-testid={`chat-run-test-button-${index}`}
                              id={`chat-run-test-button-${index}`}
                              className="btn btn-sm btn-outline hover:btn-primary see-on-hover flex mt-0"
                              onClick={() => handleRunTestCase(index)}
                              disabled={isRunningTestCase}
                            >
                              <PlayIcon className="h-3 w-3" />
                              <span>Run</span>
                            </button>
                          )}

                          {/* Show either assistant message or test case result */}
                          {message?.testCaseResult && showTestCaseResults[message.id] ? (
                            <div ref={testCaseResultRef}>
                              {/* Test Case Result Display */}
                              <div className="chat-bubble gap-0 relative min-w-full">
                                <div className="bg-neutral/90 border border-neutral-content/20 rounded-lg p-4 text-neutral-content">
                                  {/* Header */}
                                  <div className="flex items-center gap-2 mb-4">
                                    <Target className="h-4 w-4" />
                                    <span className="text-sm font-medium">Test Case Result</span>
                                    {message.testCaseResult.success && (
                                      <CheckCircle className="h-4 w-4 text-success ml-auto" />
                                    )}
                                  </div>

                                  {/* Similarity Score */}
                                  <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-medium text-neutral-content/80">
                                      SIMILARITY SCORE
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <div className="w-12 bg-neutral-content/20 rounded-full h-1.5">
                                        <div
                                          className={`h-1.5 rounded-full transition-all duration-300 ${
                                            message.testCaseResult.score >= 0.8
                                              ? "bg-success"
                                              : message.testCaseResult.score >= 0.6
                                                ? "bg-warning"
                                                : "bg-error"
                                          }`}
                                          style={{ width: `${Math.max(message.testCaseResult.score * 100, 8)}%` }}
                                        ></div>
                                      </div>
                                      <span className="text-sm font-medium">
                                        {(message.testCaseResult.score * 100).toFixed(1)}%
                                      </span>
                                    </div>
                                  </div>

                                  {/* Method */}
                                  <div className="flex items-center justify-between mb-4">
                                    <span className="text-sm font-medium text-neutral-content/80">METHOD</span>
                                    <span className="text-sm font-medium capitalize">
                                      {message.testCaseResult.matching_type}
                                    </span>
                                  </div>

                                  {/* Expected */}
                                  <div className="mb-3">
                                    <span className="text-sm font-medium text-neutral-content/80 block mb-2">
                                      EXPECTED
                                    </span>
                                    <div className="text-sm bg-neutral-content/10 rounded-md p-3 border border-neutral-content/20">
                                      {message.testCaseResult.expected?.response || "No expected response"}
                                    </div>
                                  </div>

                                  {/* Actual */}
                                  <div>
                                    <span className="text-sm font-medium text-neutral-content/80 block mb-2">
                                      ACTUAL
                                    </span>
                                    <div className="text-sm bg-neutral-content/10 rounded-md p-3 border border-neutral-content/20">
                                      {message.testCaseResult.actual_result || "No actual result"}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            /* Regular Assistant/User/Expected/Error Message - Show model answer if testcase was run */
                            <div
                              className={`break-words gap-0 justify-start relative min-w-0 ${
                                message.sender === "assistant"
                                  ? `mr-8 w-full rounded-xl ${message.content ? "px-4 py-3 border border-base-content/20" : ""}`
                                  : message.sender === "error"
                                    ? "rounded-xl w-fit max-w-[75%] overflow-hidden bg-error/10 border border-error/30 text-error px-4 py-3 text-sm"
                                    : "chat-bubble w-fit max-w-[75%] text-sm"
                              } ${message?.type === "template" || message?.type === "richui_json" ? "!bg-transparent !shadow-none !p-0 !border-0" : ""}`}
                            >
                              {/* Show loader overlay if this is the message being tested */}
                              {isRunningTestCase && currentRunIndex !== null && index === currentRunIndex + 1 && (
                                <div className="absolute inset-0 bg-base-100/80 backdrop-blur-sm flex items-center justify-center rounded-lg z-10 pointer-events-none">
                                  <div className="flex items-center gap-2">
                                    <span className="loading loading-spinner loading-sm"></span>
                                    <span className="text-sm font-medium">Running Test Case...</span>
                                  </div>
                                </div>
                              )}

                              {/* Edit Mode */}
                              {editingMessage === message.id ? (
                                <div className="w-full">
                                  <textarea
                                    data-testid="chat-edit-textarea"
                                    id="chat-edit-textarea"
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className="textarea textarea-bordered w-full min-h-[100px] resize-y text-base-content bg-base-100"
                                    placeholder="Edit message content..."
                                  />
                                  <div className="flex gap-2 mt-2">
                                    <button
                                      data-testid="chat-save-edit-button"
                                      id="chat-save-edit-button"
                                      onClick={() => handleSaveEdit(message.id)}
                                      className="btn btn-sm btn-success"
                                    >
                                      <Save className="h-3 w-3" />
                                      Save
                                    </button>
                                    <button
                                      data-testid="chat-cancel-edit-button"
                                      id="chat-cancel-edit-button"
                                      onClick={handleCancelEdit}
                                      className="btn btn-sm btn-error"
                                    >
                                      <X className="h-3 w-3" />
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                /* Display Mode */
                                <div className="relative group">
                                  {/* Edit Button for Assistant Messages */}
                                  {message.sender === "assistant" &&
                                    !message.isLoading &&
                                    message?.type !== "richui_json" &&
                                    message?.type !== "template" &&
                                    !(message?.llm_urls?.length > 0) && (
                                      <button
                                        data-testid={`chat-edit-message-button-${message.id}`}
                                        id={`chat-edit-message-button-${message.id}`}
                                        onClick={() => handleEditMessage(message.id, message.content)}
                                        className="absolute -top-2 -right-5 opacity-0 group-hover:opacity-100 transition-opacity btn btn-sm btn-circle btn-ghost"
                                        title="Edit message"
                                      >
                                        <Edit2 className="h-4 w-4" />
                                      </button>
                                    )}

                                  {/* Review phase accordion (shown when agent has a reviewer configured) */}
                                  {message.review_phases?.length > 0 && (
                                    <ReviewPhaseAccordion reviewPhases={message.review_phases} />
                                  )}

                                  {/* Reasoning accordion (shown when model emits reasoning events) */}
                                  {message.reasoning && (
                                    <ReasoningAccordion
                                      reasoning={message.reasoning}
                                      isStreaming={!!(message.isStreaming || message.isLoading)}
                                      messageContent={message.content}
                                    />
                                  )}

                                  {/* Tool calls (tool_call / tool_result events) */}
                                  {message.toolCalls?.length > 0 && (
                                    <div className="flex flex-col gap-1 mb-2">
                                      {message.toolCalls.map((tc) => (
                                        <ToolCallItem
                                          key={tc.call_id}
                                          toolCall={tc}
                                          isMessageComplete={!message.isStreaming && !message.isLoading}
                                        />
                                      ))}
                                    </div>
                                  )}

                                  {/* Loading state for assistant message */}
                                  {message.isLoading && !message.content && !message.toolCalls?.length ? (
                                    <div className="py-1">
                                      <span className="loading loading-dots loading-sm"></span>
                                    </div>
                                  ) : message.isStreaming && message.content ? (
                                    <StreamingMessage content={message.content} isStreaming={message.isStreaming} />
                                  ) : message.sender === "error" ? (
                                    /* Error Message - Display with error styling and icon */
                                    <div className="flex min-w-0 items-start gap-2">
                                      <AlertTriangle className="h-4 w-4 text-error flex-shrink-0 mt-0.5" />
                                      <div className="min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-error font-medium">
                                        {message.content}
                                      </div>
                                    </div>
                                  ) : (
                                    /* Regular message with markdown */
                                    <div className={message.sender === "assistant" ? mdProseClass.dark : undefined}>
                                      <ReactMarkdown components={mdComponents} remarkPlugins={mdRemarkPlugins}>
                                        {message.type !== "template" && message.type !== "richui_json"
                                          ? (() => {
                                              const raw =
                                                message.testCaseResult && message.sender === "assistant"
                                                  ? message.testCaseResult.actual_result || message.content
                                                  : message.content;
                                              return typeof raw === "string"
                                                ? raw
                                                : raw != null
                                                  ? JSON.stringify(raw)
                                                  : "";
                                            })()
                                          : ""}
                                      </ReactMarkdown>
                                    </div>
                                  )}

                                  {message?.type === "richui_json" && message?.content && (
                                    <div className="mt-4 richui-container w-full">
                                      {(() => {
                                        return (
                                          <RenderNode
                                            node={message.content}
                                            onAction={(action) => {
                                              if (action?.type === "reply" && action?.text) {
                                                if (handleSendMessageRef.current && inputRef.current) {
                                                  // Set the input field value and triggers send
                                                  inputRef.current.value = action.text;
                                                  setTimeout(() => {
                                                    handleSendMessageRef.current(null, true);
                                                  }, 50);

                                                  // Clear the input field after sending
                                                  setTimeout(() => {
                                                    if (inputRef.current) {
                                                      inputRef.current.value = "";
                                                    }
                                                  }, 200);
                                                } else {
                                                  console.warn("[Chat] handleSendMessageRef or inputRef is missing", {
                                                    handleSendMessageRef: handleSendMessageRef.current,
                                                    inputRef: inputRef.current,
                                                  });
                                                }
                                              }
                                            }}
                                          />
                                        );
                                      })()}
                                    </div>
                                  )}

                                  {/* Render message attachments (images, etc.) */}
                                  {_renderMessageAttachments(message)}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Absolute Toggle Button for Test Case Results */}
                          {message?.testCaseResult && (
                            <button
                              data-testid={`chat-toggle-result-button-${message.id}`}
                              id={`chat-toggle-result-button-${message.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowTestCaseResults((prev) => ({
                                  ...prev,
                                  [message.id]: !prev[message.id],
                                }));
                              }}
                              className="absolute -bottom-8 left-4 flex items-center gap-2 text-xs text-base-content/70 hover:text-base-content transition-colors px-2 py-1 rounded-full bg-base-100 border border-base-content/20 shadow-sm hover:bg-base-200/50"
                            >
                              {showTestCaseResults[message.id] ? (
                                <>
                                  <ToggleRight className="h-3 w-3" />
                                  <span>Model Answer</span>
                                </>
                              ) : (
                                <>
                                  <ToggleLeft className="h-3 w-3" />
                                  <span>Test Details</span>
                                  <span
                                    className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                      message.testCaseResult.score >= 0.8
                                        ? "bg-success/20 text-success"
                                        : message.testCaseResult.score >= 0.6
                                          ? "bg-warning/20 text-warning"
                                          : "bg-error/20 text-error"
                                    }`}
                                  >
                                    {(message.testCaseResult.score * 100).toFixed(1)}%
                                  </span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      )}
                  </div>
                );
              })}
            </div>

            <div
              data-testid="chat-input-wrapper"
              id="chat-input-wrapper"
              className="border-base-content/30 pt-4 pb-4 w-full"
            >
              <div className="relative flex flex-col gap-4 w-full">
                <div className="flex flex-row gap-2">
                  <ChatTextInput
                    channelIdentifier={channelIdentifier}
                    params={params}
                    isOrchestralModel={isOrchestralModel}
                    inputRef={inputRef}
                    searchParams={searchParams}
                    setTestCaseId={setTestCaseId}
                    testCaseId={testCaseId}
                    selectedStrategy={selectedStrategy}
                    handleSendMessageRef={handleSendMessageRef}
                    showTestCases={showTestCases}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AddTestCaseModal
        testCaseConversation={testCaseConversation}
        setTestCaseConversation={setTestCaseConversation}
        channelIdentifier={channelIdentifier}
      />
    </div>
  );
}

export default Protected(Chat);
