import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import CodeBlock from "../codeBlock/CodeBlock";
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
} from "lucide-react";
import TestCaseSidebar from "./TestCaseSidebar";
import AddTestCaseModal from "../modals/AddTestCaseModal";
import { createConversationForTestCase } from "@/utils/utility";
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

function Chat({ params, userMessage, isOrchestralModel = false, searchParams, isEmbedUser }) {
  const messagesContainerRef = useRef(null);
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
  const { messages, finishReasonDescription } = useCustomSelector((state) => ({
    messages: state?.chatReducer?.messagesByChannel?.[channelIdentifier] || [],
    finishReasonDescription: state?.flowDataReducer?.flowData?.finishReasonsData || [],
  }));

  // Initialize channel and RT layer
  useEffect(() => {
    if (channelIdentifier) {
      dispatch(initializeChatChannel(channelIdentifier));
    }
  }, [channelIdentifier, dispatch]);

  useRtLayerEventHandler(channelIdentifier);
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

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

  const handleRunTestCase = async (index) => {
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
        runTestCaseAction({ versionId: searchParams.version, bridgeId: null, testcase_id: null, testCaseData })
      );
      const updatedMessages = [...messages];
      updatedMessages[index + 1] = {
        ...updatedMessages[index + 1],
        testCaseResult: data?.results?.[0],
      };

      // Automatically show the test case results card after running the test
      const nextMessageId = updatedMessages[index + 1].id;
      dispatch(editChatMessage(channelIdentifier, index + 1, updatedMessages[index + 1]));
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

  const renderMessageAttachments = (message) => {
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
          <div className="flex flex-wrap gap-2">
            {message.llm_urls.map((urlObj, imgIndex) => {
              const imageUrl = typeof urlObj === "string" ? urlObj : urlObj?.url;
              const isImage = typeof urlObj === "string" || urlObj?.type === "image";

              return imageUrl && isImage ? (
                <Image
                  key={`llm-img-${imgIndex}`}
                  src={imageUrl}
                  alt={`Generated Image ${imgIndex + 1}`}
                  width={80}
                  height={80}
                  className="w-20 h-20 object-cover rounded-lg cursor-pointer"
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
    <div id="chat-container" className="px-4 pt-4 bg-base-300">
      <div id="chat-header" className="w-full flex justify-between items-center px-2">
        <button
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
        <span className="label-text">Experiments</span>
        <div className="flex items-center gap-2">
          {messages?.length > 0 && (
            <div className="flex items-center gap-2 justify-center">
              <select
                id="chat-strategy-select"
                className="select select-sm select-bordered"
                value={selectedStrategy}
                onChange={(e) => setSelectedStrategy(e.target.value)}
              >
                <option value="cosine">Cosine</option>
                <option value="ai">AI</option>
                <option value="exact">Exact</option>
              </select>
              <button id="chat-add-testcase-button" className="btn btn-sm" onClick={handleResetChat}>
                {" "}
                <PlusIcon size={14} />
                Add Test Case
              </button>
            </div>
          )}
          {/* Test Cases Toggle Button */}
        </div>
      </div>
      <div id="chat-content-wrapper" className="flex mt-4 h-[86vh] overflow-hidden relative">
        {/* Overlay Test Cases Sidebar */}
        {showTestCases && (
          <div id="chat-testcase-sidebar-overlay" className="absolute inset-0 z-low flex">
            {/* Optional backdrop */}
            <div className="absolute inset-0 bg-black/30" onClick={() => setShowTestCases(false)}></div>

            {/* Sidebar */}
            <div
              id="chat-testcase-sidebar"
              className="relative w-[70%] h-full border border-base-content/30 rounded-md bg-base-100 shadow-lg z-30 animate-slideIn"
            >
              <TestCaseSidebar params={params} resolvedParams={searchParams} onTestCaseClick={handleTestCaseClick} />
            </div>
          </div>
        )}

        {/* Chat Section */}
        <div id="chat-messages-section" className="w-full flex-grow min-w-0 relative">
          {/* Loading overlay for testcase loading */}
          {isLoadingTestCase && (
            <div
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
              id="chat-messages-container"
              ref={messagesContainerRef}
              className="flex flex-col w-full flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-thumb-blue scrollbar-thumb-rounded scrollbar-track-blue-lighter scrollbar-w-1 mb-4 pr-2"
            >
              {messages.map((message, index) => {
                return (
                  <div
                    id={`chat-message-${index}`}
                    key={index}
                    className={`chat show-on-hover ${
                      message.sender === "user" ? "chat-end flex flex-col mt-2" : "chat-start"
                    }`}
                  >
                    <div className="chat-image avatar"></div>
                    <div className="chat-header">
                      {message.sender === "expected"
                        ? "Expected Response"
                        : message.sender === "error"
                          ? "Error"
                          : message.testCaseResult
                            ? "Model Answer"
                            : message.sender}
                      {message.isEdited && <span className="text-xs text-warning ml-2 font-medium">(edited)</span>}
                      <time className="text-xs opacity-50 pl-2">{message.time}</time>
                      {message?.sender === "assistant" && message?.fallback && (
                        <div className="my-1">
                          <div className="max-w-[30rem] text-primary rounded-lg text-xs overflow-hidden transition-all duration-200 hover:bg-base-200/90">
                            <input id={`retry-${message.id}`} type="checkbox" className="peer hidden" />

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
                                  href="https://gtwy.ai/blogs/finish-reasons?source=public"
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
                          className={`flex gap-2 show-on-hover justify-start max-w-[700px] items-center relative ${editingMessage === message.id && message.sender === "assistant" ? "w-[500px]" : ""}`}
                        >
                          {message?.sender === "user" && message?.content && (
                            <button
                              id={`chat-run-test-button-${index}`}
                              className="btn btn-sm btn-outline hover:btn-primary see-on-hover flex mt-2"
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
                              className={`chat-bubble break-all gap-0 justify-start relative w-full ${
                                message.sender === "assistant"
                                  ? "mr-8"
                                  : message.sender === "error"
                                    ? "bg-error/10 border border-error/30 text-error"
                                    : ""
                              }`}
                            >
                              {/* Show loader overlay if this is the message being tested */}
                              {isRunningTestCase && currentRunIndex !== null && index === currentRunIndex + 1 && (
                                <div className="absolute inset-0 bg-base-100/80 backdrop-blur-sm flex items-center justify-center rounded-lg z-10">
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
                                    id="chat-edit-textarea"
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className="textarea bg-white dark:bg-black/15 textarea-bordered w-full min-h-[100px] resize-y text-base-content bg-base-100"
                                    placeholder="Edit message content..."
                                  />
                                  <div className="flex gap-2 mt-2">
                                    <button
                                      id="chat-save-edit-button"
                                      onClick={() => handleSaveEdit(message.id)}
                                      className="btn btn-sm btn-success"
                                    >
                                      <Save className="h-3 w-3" />
                                      Save
                                    </button>
                                    <button
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
                                  {message.sender === "assistant" && !message.isLoading && (
                                    <button
                                      id={`chat-edit-message-button-${message.id}`}
                                      onClick={() => handleEditMessage(message.id, message.content)}
                                      className="absolute -top-2 -right-5 opacity-0 group-hover:opacity-100 transition-opacity btn btn-sm btn-circle btn-ghost"
                                      title="Edit message"
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </button>
                                  )}

                                  {/* Loading state for assistant message */}
                                  {message.isLoading ? (
                                    <div className="py-1">
                                      <span className="loading loading-dots loading-sm"></span>
                                    </div>
                                  ) : message.sender === "expected" ? (
                                    /* Expected Response - Plain text display with label */
                                    <div className="whitespace-pre-wrap">{message.content}</div>
                                  ) : message.sender === "error" ? (
                                    /* Error Message - Display with error styling and icon */
                                    <div className="flex items-start gap-2">
                                      <AlertTriangle className="h-4 w-4 text-error flex-shrink-0 mt-0.5" />
                                      <div className="whitespace-pre-wrap text-error font-medium">
                                        {message.content}
                                      </div>
                                    </div>
                                  ) : (
                                    /* Regular message with markdown */
                                    <ReactMarkdown
                                      components={{
                                        code: ({ node, inline, className, children, ...props }) => (
                                          <CodeBlock inline={inline} className={className} isDark={true} {...props}>
                                            {children}
                                          </CodeBlock>
                                        ),
                                      }}
                                    >
                                      {/* Show model's actual response if testcase was run, otherwise show original content */}
                                      {message.testCaseResult && message.sender === "assistant"
                                        ? message.testCaseResult.actual_result || message.content
                                        : message.content}
                                    </ReactMarkdown>
                                  )}
                                  {renderMessageAttachments(message)}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Absolute Toggle Button for Test Case Results */}
                          {message?.testCaseResult && (
                            <button
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

            <div id="chat-input-wrapper" className=" border-base-content/30 px-4 pt-4 mb-2 sm:mb-0 w-full">
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
