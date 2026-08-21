import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import ChatTextInput from "./ChatTextInput";
import { PdfIcon } from "@/icons/pdfIcon";
import GoogleDocIcon from "@/icons/GoogleDocIcon";
import { isWordFileUrl } from "@/utils/attachmentUtils";
import { truncate } from "../historyPageComponents/AssistFile";
import { AlertIcon, CloseCircleIcon } from "@/components/Icons";
import {
  ExternalLink,
  Menu,
  PlayIcon,
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
  SquarePen,
  Copy,
  Check,
} from "lucide-react";
import TestCaseSidebar from "./TestCaseSidebar";
import AddTestCaseModal from "../modals/AddTestCaseModal";
import { createConversationForTestCase, toggleSidebar, openModal, extractErrorMessage } from "@/utils/utility";
import { MODAL_TYPE, DEFAULT_STARTER_QUESTIONS, AVAILABLE_MODEL_TYPES } from "@/utils/enums";
import { validatePromptVariables, buildVariablesObject } from "@/utils/variableValidation";
import { runTestCaseAction } from "@/store/action/testCasesAction";
import { testRunResetReducer } from "@/store/reducer/testCasesReducer";
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
  clearTestCaseConversationAction,
  setChatTestCaseIdAction,
} from "@/store/action/chatAction";
import RenderNode from "../richUI/RenderNode";
import ReasoningAccordion from "./ReasoningAccordion";
import ReviewPhaseAccordion from "./ReviewPhaseAccordion";
import { mdComponentsDark, mdRemarkPlugins, mdProseClass } from "@/utils/markdownComponents";

const mdComponents = mdComponentsDark;

const isRichUiMessage = (message) => {
  if (!message || !message.content) return false;
  if (message.type === "richui_json" || message.type === "template") return true;

  let content = message.content;
  if (typeof content === "string") {
    const trimmed = content.trim();
    if (
      trimmed.startsWith("{") &&
      trimmed.includes('"type"') &&
      (trimmed.includes('"Card"') || trimmed.includes('"Title"') || trimmed.includes('"children"'))
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        return parsed && (parsed.type === "Card" || parsed.type === "template" || Array.isArray(parsed.children));
      } catch {
        return false;
      }
    }
  } else if (typeof content === "object") {
    return content.type === "Card" || content.type === "template" || Array.isArray(content.children);
  }
  return false;
};

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

  // Auto-open when streaming content starts arriving during tool call
  useEffect(() => {
    if (toolCall.status === "calling" && toolCall.streamingContent) setOpen(true);
  }, [toolCall.status, toolCall.streamingContent]);

  // Auto-open when result arrives
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

  const hasBody = toolCall.status === "done" ? !!toolCall.result : !!toolCall.streamingContent;
  const canToggle = hasBody;

  return (
    <div className="rounded-lg border border-base-300 bg-base-200 text-xs overflow-hidden">
      <div
        className={`flex items-center gap-2 px-3 py-1.5 select-none ${canToggle ? "cursor-pointer" : "cursor-default"}`}
        onClick={() => canToggle && setOpen((v) => !v)}
      >
        {toolCall.status === "calling" ? (
          <span className="loading loading-spinner loading-xs text-primary" />
        ) : (
          <Wrench className="h-3.5 w-3.5 text-success shrink-0" />
        )}
        <span className=" font-medium truncate flex-1">{toolCall.name}</span>
        {!canToggle ? (
          <span className="text-base-content/50 italic">calling…</span>
        ) : open ? (
          <ChevronUp className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 shrink-0" />
        )}
      </div>
      {open && hasBody && (
        <div className="border-t border-base-300 px-3 py-2 bg-base-100 whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
          {toolCall.status === "done" ? (
            // Final tool result
            typeof parsedResult === "object" ? (
              JSON.stringify(parsedResult, null, 2)
            ) : (
              String(parsedResult)
            )
          ) : (
            // Live streaming output while the tool is executing
            <span className="text-base-content/70">{toolCall.streamingContent}</span>
          )}
        </div>
      )}
    </div>
  );
}

function Chat({ params, userMessage, isOrchestralModel = false, searchParams, isEmbedUser, draftPrompt }) {
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
  // Number of messages loaded from a freshly-clicked testcase. While the chat
  // length stays equal to this, the conversation hasn't changed yet so we hide
  // the "Add To Testcase" CTA (the testcase already exists).
  const [loadedTestcaseMsgCount, setLoadedTestcaseMsgCount] = useState(0);
  // When set, the next render with non-empty messages captures the baseline
  // length (because loadTestCaseIntoChat may filter/append messages).
  const pendingTestcaseLoadRef = useRef(false);
  const [currentRunIndex, setCurrentRunIndex] = useState(null);
  const [isRunningTestCase, setIsRunningTestCase] = useState(false);
  const [showTestCaseResults, setShowTestCaseResults] = useState({});
  const [isLoadingTestCase, setIsLoadingTestCase] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editContent, setEditContent] = useState("");
  const originalEditContentRef = useRef("");
  const testCaseResultRef = useRef(null);
  const [testCaseConversation, setTestCaseConversation] = useState([]);
  const [pendingTestIndex, setPendingTestIndex] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const uploadRef = useRef(null);
  const [copiedMessageId, setCopiedMessageId] = useState(null);

  // Get published version ID from Redux store
  const publishedVersionId = useCustomSelector(
    (state) => state?.bridgeReducer?.allBridgesMap?.[params?.id]?.published_version_id
  );

  const currentUserId = isEmbedUser
    ? typeof window !== "undefined"
      ? sessionStorage.getItem("gtwy_user_id")
      : null
    : useCustomSelector((state) => state?.userDetailsReducer?.userDetails?.id);

  const channelIdentifier = useMemo(() => {
    const isPublished = searchParams?.isPublished === "true";

    if (isPublished) {
      // For published version, use published version ID in channel identifier
      return (params.org_id + "_" + params?.id + "_" + publishedVersionId + "_" + (currentUserId || "")).replace(
        / /g,
        "_"
      );
    } else {
      // For draft versions, include the version
      return (params.org_id + "_" + params?.id + "_" + searchParams?.version + "_" + (currentUserId || "")).replace(
        / /g,
        "_"
      );
    }
  }, [params, searchParams, publishedVersionId, currentUserId]);

  // Redux selectors for chat state
  const {
    messages,
    finishReasonDescription,
    variablesKeyValue,
    prompt,
    showVariables: showVariablesFromRedux,
    testRun,
    testCases,
    directTestResults,
    starterQuestions,
    bridgeType,
    modelType,
  } = useCustomSelector((state) => {
    const versionData = state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[searchParams?.version];
    const bridgeData = state?.bridgeReducer?.allBridgesMap?.[params?.id];
    const isPublished = searchParams?.isPublished === "true";
    return {
      messages: state?.chatReducer?.messagesByChannel?.[channelIdentifier] || [],
      finishReasonDescription: state?.flowDataReducer?.flowData?.finishReasonsData || [],
      variablesKeyValue:
        state?.variableReducer?.VariableMapping?.[params?.id]?.[searchParams?.version]?.variables || [],
      prompt: versionData?.configuration?.prompt,
      showVariables: state?.appInfoReducer?.embedUserDetails?.showVariables || false,
      testRun: state?.testCasesReducer?.testRuns?.[params?.id] || null,
      testCases: state?.testCasesReducer?.testCases?.[params?.id] || [],
      directTestResults: state?.testCasesReducer?.directTestResults?.[params?.id] || {},
      starterQuestions: bridgeData?.starterQuestion || [],
      bridgeType: bridgeData?.bridgeType || "",
      modelType: isPublished ? bridgeData?.configuration?.type : versionData?.configuration?.type,
    };
  });

  // Starter questions: use bridge-level configured ones, fall back to defaults
  const displayStarterQuestions = useMemo(() => {
    const configured = Array.isArray(starterQuestions) ? starterQuestions.filter((q) => q?.trim()) : [];
    return configured.length > 0 ? configured : DEFAULT_STARTER_QUESTIONS;
  }, [starterQuestions]);

  // Follow-up suggestions attach to the last assistant message; once a new
  // message is sent it's no longer last, so the chips naturally disappear.
  const latestAssistantMessage = messages[messages.length - 1];
  const latestAssistantSuggestions =
    latestAssistantMessage?.sender === "assistant" && !latestAssistantMessage?.isLoading
      ? latestAssistantMessage.suggestions
      : null;

  // Initialize channel and RT layer
  useEffect(() => {
    if (channelIdentifier) {
      dispatch(initializeChatChannel(channelIdentifier));
    }
  }, [channelIdentifier, dispatch]);

  useRtLayerEventHandler(channelIdentifier);

  // Handle testcase results from RT layer
  useEffect(() => {
    if (!testRun) return;

    // Find the message that corresponds to this testcase run
    // Only proceed if we have a valid currentRunIndex
    if (currentRunIndex === null) return;
    const expectedIndex = currentRunIndex + 1;
    const messageIndex = messages.findIndex((msg, idx) => msg.sender === "assistant" && idx === expectedIndex);

    if (messageIndex === -1) return;

    const { testcaseId, status, perTestcase } = testRun;
    const versionId = searchParams.version;

    // Try to get result from testcase version_history first (for database testcases)
    let latestResult = null;
    if (testcaseId && testCases.length > 0) {
      const testCase = testCases.find((tc) => tc._id === testcaseId);
      if (testCase?.version_history?.[versionId]?.length > 0) {
        latestResult = testCase.version_history[versionId][testCase.version_history[versionId].length - 1];
      }
    }

    // If no result from version_history, check directTestResults (for direct testcases)
    if (!latestResult && testcaseId && directTestResults?.[versionId]?.[testcaseId]) {
      latestResult = directTestResults[versionId][testcaseId];
    }

    // For direct testcases where testcaseId is null, check perTestcase and directTestResults
    if (!latestResult && !testcaseId && perTestcase) {
      // Get the first testcase_id from perTestcase
      const tcIds = Object.keys(perTestcase);
      if (tcIds.length > 0) {
        const actualTestCaseId = tcIds[0];
        // Check directTestResults with this testcase_id
        if (directTestResults?.[versionId]?.[actualTestCaseId]) {
          latestResult = directTestResults[versionId][actualTestCaseId];
        }
      }
    }

    // If no result yet and run is not completed, wait
    if (!latestResult && status !== "completed") {
      return;
    }

    // If still no result after completion, return
    if (!latestResult) {
      return;
    }

    // Update the message with the test case result
    const updatedMessages = [...messages];
    const messageToUpdate = updatedMessages[messageIndex];
    const updatedMessage = {
      ...messageToUpdate,
      testCaseResult: {
        score: latestResult.score,
        actual_result: latestResult.actual_result,
        expected: latestResult.expected,
        matching_type: latestResult.matching_type,
        success: latestResult.success,
        error: latestResult.error,
      },
    };

    dispatch(editChatMessage(channelIdentifier, messageToUpdate.id, updatedMessage));

    // Show the test case results card
    setShowTestCaseResults((prev) => ({
      ...prev,
      [messageToUpdate.id]: true,
    }));

    // Reset running state only when run is completed
    if (status === "completed") {
      setIsRunningTestCase(false);
      setCurrentRunIndex(null);
    }
  }, [
    testRun,
    testCases,
    directTestResults,
    messages,
    currentRunIndex,
    searchParams.version,
    channelIdentifier,
    dispatch,
  ]);

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

  // Capture loaded testcase baseline once messages reflect in redux.
  useEffect(() => {
    if (pendingTestcaseLoadRef.current && Array.isArray(messages) && messages.length > 0) {
      setLoadedTestcaseMsgCount(messages.length);
      pendingTestcaseLoadRef.current = false;
    }
  }, [messages]);

  const handleResetChat = () => {
    setTestCaseId(null);
    setLoadedTestcaseMsgCount(0);
    pendingTestcaseLoadRef.current = false;
    if (channelIdentifier) {
      dispatch(clearChatMessages(channelIdentifier));
      // Clear loading state from send button
      dispatch(setChatLoading(channelIdentifier, false));
      // Clear testcase_id from Redux
      dispatch(clearChatTestCaseIdAction(channelIdentifier));
      // Clear stored test case conversation so it isn't re-sent on next message
      dispatch(clearTestCaseConversationAction(channelIdentifier));
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
  const handleAddConversationToTestCase = () => {
    if (!messages || messages.length === 0) return;

    // Find the most recent user + assistant message pair.
    const lastUserMsg = [...messages].reverse().find((m) => m?.sender === "user");
    const lastAssistantMsg = [...messages].reverse().find((m) => m?.sender === "assistant");
    if (!lastUserMsg || !lastAssistantMsg) return;

    const userUrls = lastUserMsg?.user_urls ?? lastUserMsg?.image_urls ?? [];

    const item = {
      user:
        typeof lastUserMsg?.content === "string"
          ? lastUserMsg.content
          : lastUserMsg?.content == null
            ? ""
            : JSON.stringify(lastUserMsg.content),
      llm_message:
        typeof lastAssistantMsg?.content === "string"
          ? lastAssistantMsg.content
          : lastAssistantMsg?.content == null
            ? ""
            : JSON.stringify(lastAssistantMsg.content),
      user_urls: userUrls,
      threadVariables: typeof variables === "object" && !Array.isArray(variables) ? { ...variables } : {},
      message_id: lastAssistantMsg?.message_id ?? lastAssistantMsg?.id ?? null,
    };

    setTestCaseConversation([item]);
    openModal(MODAL_TYPE.ADD_TEST_CASE_MODAL);
  };

  const handleEditMessage = (messageId, currentContent) => {
    setEditingMessage(messageId);
    setEditContent(currentContent);
    originalEditContentRef.current = currentContent;
  };

  const handleSaveEdit = (messageId) => {
    if (!editContent.trim()) {
      return;
    }
    if (editContent === originalEditContentRef.current) {
      return;
    }
    if (channelIdentifier) {
      dispatch(editChatMessage(channelIdentifier, messageId, editContent));
    }
    setEditingMessage(null);
    setEditContent("");
    originalEditContentRef.current = "";
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setEditContent("");
    originalEditContentRef.current = "";
  };

  const handleCopyMessage = (message, index) => {
    const raw =
      message.testCaseResult && message.sender === "assistant"
        ? message.testCaseResult.actual_result || message.content
        : message.content;
    const textToCopy = typeof raw === "string" ? raw : raw != null ? JSON.stringify(raw) : "";
    navigator.clipboard.writeText(textToCopy);
    setCopiedMessageId(message.id || index);
    setTimeout(() => {
      setCopiedMessageId(null);
    }, 2000);
  };

  const handleTestCaseClick = async (testCaseConversation, expected, testcase_id, matching_type) => {
    setIsLoadingTestCase(true);

    try {
      // Add a small delay to show loading state
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (channelIdentifier) {
        // Pass the correct testcase_id from the clicked test case
        dispatch(loadTestCaseIntoChat(channelIdentifier, testCaseConversation, expected, testcase_id));
        // Store the test case ID in Redux so the next API call sends it in testcase_data
        if (testcase_id) {
          dispatch(setChatTestCaseIdAction(channelIdentifier, testcase_id));
        }
        // Defer baseline capture until messages reflect in redux (the loader
        // filters empty-content turns and may append the expected response).
        pendingTestcaseLoadRef.current = true;
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

  const handleRunTestCase = async (index, strategyOrForceRun = "exact", forceRun = false) => {
    let strategy = selectedStrategy;
    let actualForceRun = forceRun;
    if (typeof strategyOrForceRun === "boolean") {
      actualForceRun = strategyOrForceRun;
    } else {
      strategy = strategyOrForceRun;
      setSelectedStrategy(strategyOrForceRun);
    }

    // Reset previous testcase run state in Redux to prevent premature loading updates
    dispatch(testRunResetReducer({ bridgeId: params?.id }));

    // Check if slider auto-open is disabled
    const isSliderAutoOpenDisabled =
      typeof window !== "undefined" && sessionStorage.getItem("variableSliderDisabled") === "true";

    // Validate variables before running test (skip if actualForceRun is true or slider is disabled)
    if (!actualForceRun && !isSliderAutoOpenDisabled) {
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

    // Reset previous testcase result if running again
    const nextMessage = messages[index + 1];
    if (nextMessage) {
      const nextMessageId = nextMessage.id;
      const updatedNextMessage = {
        ...nextMessage,
      };
      delete updatedNextMessage.testCaseResult;
      dispatch(editChatMessage(channelIdentifier, nextMessageId, updatedNextMessage));
      setShowTestCaseResults((prev) => ({
        ...prev,
        [nextMessageId]: false,
      }));
    }

    const conversationForTestCase = messages.slice(-6, index + 1);
    conversationForTestCase.push(messages[index + 1]);
    const { conversation, expected } = createConversationForTestCase(conversationForTestCase);
    setCurrentRunIndex(index);
    setIsRunningTestCase(true);
    try {
      const data = await dispatch(
        runTestCaseAction({
          versionIds: searchParams.version,
          bridgeId: params?.id,
          testcase_id: null,
          testCaseData: {
            conversation,
            expected,
            matching_type: strategy.toLowerCase(),
          },
          variables,
        })
      );
      // If we got synchronous results (legacy path), update the message immediately
      if (data?.results?.[0]) {
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
        // Reset running state for synchronous response
        setIsRunningTestCase(false);
        setCurrentRunIndex(null);
      }
      // If no synchronous results, RT layer will handle the result asynchronously
      // The running state will be reset by the useEffect when RT layer results arrive
    } catch {
      // Reset running state on error
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

  // ----------------- DRAG AND DROP HANDLERS -----------------
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    if (e.dataTransfer?.types?.includes("Files")) {
      setIsDragging(true);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    if (uploadRef.current && uploadRef.current.uploadFiles) {
      const files = Array.from(e.dataTransfer.files);
      uploadRef.current.uploadFiles(files);
    }
  }, []);

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
                  {isWordFileUrl(url) ? <GoogleDocIcon height={20} width={20} /> : <PdfIcon height={20} width={20} />}
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
    <div
      data-testid="chat-container"
      id="chat-container"
      className="flex flex-col h-full w-full bg-base-100 relative"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
    >
      {/* Drag and Drop Overlay */}
      {isDragging && (
        <div
          data-testid="chat-drag-overlay"
          id="chat-drag-overlay"
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="absolute inset-0 bg-base-200/90 border-4 border-dashed border-primary flex items-center justify-center z-50 backdrop-blur-sm"
        >
          <div className="pointer-events-none flex flex-col items-center gap-3 bg-base-100 p-6 rounded-xl shadow-2xl border border-primary/20">
            <span className="loading loading-spinner loading-md text-primary"></span>
            <span className="text-primary font-semibold text-lg">Drop files here to upload to Chat</span>
          </div>
        </div>
      )}
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
        <div className="flex items-center gap-1">
          {/* New Chat button — only when there are messages */}
          {messages?.length > 0 && (
            <div className="tooltip tooltip-bottom" data-tip="New Chat">
              <button
                data-testid="chat-reset-chat-button"
                id="chat-reset-chat-button"
                className="btn btn-sm btn-ghost btn-square"
                onClick={handleResetChat}
              >
                <SquarePen size={16} />
              </button>
            </div>
          )}

          {/* Add to Test Case button — only when there are messages and the
              conversation has been extended beyond the loaded testcase. */}
          {messages?.length > 0 && messages.length > loadedTestcaseMsgCount && (
            <div className="tooltip tooltip-bottom" data-tip="Add to Test Case">
              <button
                data-testid="chat-add-conversation-to-testcase-button"
                id="chat-add-conversation-to-testcase-button"
                className="btn btn-sm gap-1.5 px-3"
                onClick={handleAddConversationToTestCase}
                disabled={
                  !messages ||
                  messages.filter((m) => m.sender === "user" || m.sender === "assistant").length === 0 ||
                  modelType === AVAILABLE_MODEL_TYPES.IMAGE ||
                  messages.some((m) => m?.llm_urls?.length > 0)
                }
              >
                + Add To Testcase
              </button>
            </div>
          )}
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
              {/* Empty state: full-width vertical starter question list */}
              {messages.length === 0 &&
                bridgeType?.toLowerCase() === "chatbot" &&
                displayStarterQuestions.length > 0 && (
                  <div
                    data-testid="chat-starter-questions"
                    id="chat-starter-questions"
                    className="flex flex-col justify-center flex-1 gap-3 py-8 px-2"
                  >
                    <p className="text-xs font-medium text-base-content/40 uppercase tracking-widest text-center mb-1">
                      Start a conversation or try one of these examples:
                    </p>
                    <div className="flex flex-col gap-2 w-full">
                      {displayStarterQuestions.slice(0, 4).map((question, i) => (
                        <button
                          key={i}
                          data-testid={`chat-starter-question-${i}`}
                          id={`chat-starter-question-${i}`}
                          className="flex items-center justify-between gap-3 w-full px-4 py-3 rounded-xl border border-base-content/10 bg-base-200/40 hover:bg-base-200/80 hover:border-primary/30 transition-all duration-150 text-left group"
                          onClick={() => {
                            if (handleSendMessageRef.current && inputRef.current) {
                              inputRef.current.value = question;
                              setTimeout(() => handleSendMessageRef.current(null, true), 50);
                              setTimeout(() => {
                                if (inputRef.current) inputRef.current.value = "";
                              }, 200);
                            }
                          }}
                        >
                          <span className="text-sm text-base-content/75 leading-snug">{question}</span>
                          <span className="text-base-content/30 group-hover:text-primary/50 transition-colors shrink-0 text-base">
                            →
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

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
                    <div className="chat-header flex items-start gap-1.5 mb-1">
                      {!(message.sender === "assistant" && message.isLoading && !message.content) && (
                        <div className="flex items-center gap-1.5 h-5">
                          <span className="text-xs font-semibold capitalize tracking-wide opacity-70">
                            {message.sender === "error"
                              ? "Error"
                              : message.testCaseResult
                                ? "Model Answer"
                                : message.sender}
                          </span>
                          {message.isEdited && <span className="text-xs text-warning font-medium">(edited)</span>}
                          <time className="text-[10px] opacity-40 whitespace-nowrap">{message.time}</time>
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
                          className={`flex gap-2 show-on-hover ${message.sender === "user" ? "justify-end" : "justify-start"} w-full max-w-[720px] min-w-0 ${message?.content?.length > 100 ? "items-end" : "items-center"} relative ${editingMessage === message.id && message.sender === "assistant" ? "w-[500px]" : ""}`}
                        >
                          {message?.sender === "user" && message?.content && modelType !== "image" && (
                            <div className="dropdown dropdown-end see-on-hover flex-shrink-0">
                              <button
                                tabIndex={0}
                                role="button"
                                data-testid={`chat-run-test-button-${index}`}
                                id={`chat-run-test-button-${index}`}
                                className="btn btn-sm btn-outline hover:btn-primary flex mt-0"
                                disabled={isRunningTestCase}
                              >
                                <PlayIcon className="h-3 w-3" />
                                <span>Run</span>
                              </button>
                              <ul
                                tabIndex={0}
                                className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-28 z-40 text-xs border border-base-200"
                              >
                                <li>
                                  <button
                                    onClick={() => {
                                      handleRunTestCase(index, "exact");
                                      if (document.activeElement) document.activeElement.blur();
                                    }}
                                  >
                                    Exact
                                  </button>
                                </li>
                                <li>
                                  <button
                                    onClick={() => {
                                      handleRunTestCase(index, "ai");
                                      if (document.activeElement) document.activeElement.blur();
                                    }}
                                  >
                                    AI
                                  </button>
                                </li>
                                <li>
                                  <button
                                    onClick={() => {
                                      handleRunTestCase(index, "cosine");
                                      if (document.activeElement) document.activeElement.blur();
                                    }}
                                  >
                                    Cosine
                                  </button>
                                </li>
                              </ul>
                            </div>
                          )}

                          {/* Show either assistant message or test case result */}
                          <div
                            className={`flex flex-col ${message.sender === "assistant" ? "w-full min-w-0" : "w-fit max-w-[75%] shrink-0"}`}
                          >
                            {message?.testCaseResult && showTestCaseResults[message.id] ? (
                              <div ref={testCaseResultRef} className="chat-bubble gap-0 relative min-w-full">
                                {/* Test Case Result Display */}
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
                            ) : (
                              /* Regular Assistant/User/Expected/Error Message - Show model answer if testcase was run */
                              <div
                                data-testid={`playground-ai-response-message-${message.id}`}
                                className={`gap-0 justify-start relative min-w-0 ${
                                  message.sender === "assistant"
                                    ? `mr-8 w-full rounded-xl break-words ${message.content ? "px-4 py-3 border border-base-content/20" : ""}`
                                    : message.sender === "error"
                                      ? "rounded-xl w-full overflow-hidden bg-error/10 border border-error/30 text-error px-4 py-3 text-sm"
                                      : "chat-bubble w-fit max-w-full text-sm text-neutral-content break-words whitespace-pre-wrap"
                                } ${isRichUiMessage(message) ? "!bg-transparent !shadow-none !p-0 !border-0" : ""}`}
                              >
                                {/* Show loader overlay if this is the message being tested and no result yet */}
                                {isRunningTestCase &&
                                  currentRunIndex !== null &&
                                  index === currentRunIndex + 1 &&
                                  !message.testCaseResult && (
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
                                        disabled={!editContent.trim() || editContent === originalEditContentRef.current}
                                        className="btn btn-sm btn-success disabled:opacity-50 disabled:cursor-not-allowed"
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
                                  <div>
                                    <div
                                      className={`relative group flex flex-col ${message.sender === "user" ? "w-fit" : "w-full"}`}
                                    >
                                      {/* Retried / Fallback block inside bubble at the top */}
                                      {message?.sender === "assistant" && message?.fallback && (
                                        <div className="select-none mb-3 w-full">
                                          <div className="text-primary rounded-lg text-[10px] border border-primary/20 overflow-hidden transition-all duration-200 hover:bg-base-200/90 flex flex-col w-full bg-base-300/10">
                                            <input
                                              autoComplete="off"
                                              id={`retry-${message.id}`}
                                              type="checkbox"
                                              className="peer hidden"
                                            />
                                            <label
                                              htmlFor={`retry-${message.id}`}
                                              className="px-3 py-1.5 cursor-pointer flex items-center gap-1 transition-all duration-200 hover:bg-base-300/20 peer-checked:bg-base-300/30 font-semibold"
                                            >
                                              <span className="opacity-80">↻</span>
                                              <span>Retried with</span>
                                              <span className="text-primary">{message?.modelName}</span>
                                            </label>
                                            <div className="max-h-0 peer-checked:max-h-96 transition-all duration-300 ease-in-out overflow-hidden bg-base-300/10">
                                              <pre className="text-xs text-error/90 whitespace-pre-wrap px-3 py-2.5 leading-relaxed ">
                                                {extractErrorMessage(message.firstAttemptError)}
                                              </pre>
                                            </div>
                                          </div>
                                        </div>
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
                                        <div data-testid="chat-loading-state" className="py-1">
                                          <span className="loading loading-dots loading-sm"></span>
                                        </div>
                                      ) : message.isStreaming && message.content ? (
                                        <StreamingMessage content={message.content} isStreaming={message.isStreaming} />
                                      ) : message.sender === "error" ? (
                                        /* Error Message - Display with error styling and icon */
                                        <div className="flex min-w-0 items-start gap-2">
                                          <AlertTriangle className="h-4 w-4 text-error flex-shrink-0 mt-0.5" />
                                          <div className="min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-error font-medium">
                                            {extractErrorMessage(message.content)}
                                          </div>
                                        </div>
                                      ) : (
                                        /* Regular message with markdown */
                                        <div className={message.sender === "assistant" ? mdProseClass.dark : undefined}>
                                          <ReactMarkdown components={mdComponents} remarkPlugins={mdRemarkPlugins}>
                                            {!isRichUiMessage(message)
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

                                      {isRichUiMessage(message) && message?.content && (
                                        <div className="mt-4 richui-container w-full">
                                          {(() => {
                                            let parsedContent = message.content;
                                            if (typeof message.content === "string") {
                                              try {
                                                parsedContent = JSON.parse(message.content);
                                              } catch (e) {
                                                console.error("Failed to parse richui_json content", e);
                                              }
                                            }
                                            return (
                                              <RenderNode
                                                node={parsedContent}
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
                                                      console.warn(
                                                        "[Chat] handleSendMessageRef or inputRef is missing",
                                                        {
                                                          handleSendMessageRef: handleSendMessageRef.current,
                                                          inputRef: inputRef.current,
                                                        }
                                                      );
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
                                  </div>
                                )}
                              </div>
                            )}
                            {/* Action Buttons Toolbar for Assistant Messages (including Metrics) */}
                            {editingMessage !== message.id && message.sender === "assistant" && !message.isLoading && (
                              <div className="flex items-center justify-between gap-1.5 w-full pr-8">
                                <div className="flex items-center gap-1.5">
                                  {/* Toggle Button for Test Case Results */}
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
                                      className="flex items-center gap-2 text-xs text-base-content/70 hover:text-base-content transition-colors px-2 py-1 rounded-full bg-base-100 border border-base-content/20 shadow-sm hover:bg-base-200/50"
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

                                  {/* Message Metrics (Tokens, Cost, Latency) */}
                                  {(message.usage || message.latency) && (
                                    <div className="see-on-hover transition-opacity duration-200 inline-flex flex-wrap items-center gap-1.5 text-[10px] text-base-content/60 font-medium select-none">
                                      {message.usage?.cost > 0 && (
                                        <span
                                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-base-200 border border-base-content/15 shadow-sm"
                                          title="Estimated cost"
                                        >
                                          <span className="font-semibold text-base-content/70">Cost:</span>
                                          <span className="text-base-content/90">${message.usage.cost.toFixed(4)}</span>
                                        </span>
                                      )}
                                      {message.latency?.over_all_time > 0 && (
                                        <span className="group inline-flex items-center w-fit px-1.5 py-0.5 rounded bg-base-200 border border-base-content/15 shadow-sm hover:bg-base-300/60 transition-all duration-200 cursor-pointer">
                                          <span className="font-semibold text-base-content/70">Time:</span>
                                          <span className="ml-1  text-base-content/90">
                                            {message.latency.over_all_time.toFixed(2)}s
                                          </span>
                                          {message.latency.model_execution_time > 0 && (
                                            <span className="inline-flex items-center max-w-0 opacity-0 overflow-hidden group-hover:max-w-xs group-hover:opacity-100 transition-all duration-300 ease-in-out pl-0 group-hover:pl-1.5 ml-0 group-hover:ml-1.5 border-l border-transparent group-hover:border-base-content/20 text-base-content/50  text-[9px] whitespace-nowrap">
                                              Model: {message.latency.model_execution_time.toFixed(2)}s
                                              {message.latency.over_all_time - message.latency.model_execution_time >
                                                0 &&
                                                ` • Net: ${(message.latency.over_all_time - message.latency.model_execution_time).toFixed(2)}s`}
                                            </span>
                                          )}
                                        </span>
                                      )}
                                      {message.usage?.total_tokens > 0 && (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-base-200 border border-base-content/15 shadow-sm">
                                          <span className="font-semibold text-base-content/70">Tokens:</span>
                                          <span className="text-base-content/90">
                                            {message.usage.total_tokens.toLocaleString()}
                                          </span>
                                          <span className="inline-flex items-center ml-2">
                                            In: {message.usage.input_tokens || 0} • Out:{" "}
                                            {message.usage.output_tokens || 0}
                                            {message.usage.reasoning_tokens > 0
                                              ? ` • Reasoning: ${message.usage.reasoning_tokens}`
                                              : ""}
                                            {message.usage.cached_tokens > 0
                                              ? ` • Cached: ${message.usage.cached_tokens}`
                                              : ""}
                                          </span>
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5 see-on-hover ml-auto">
                                  {!isRichUiMessage(message) && !(message?.llm_urls?.length > 0) && (
                                    <button
                                      data-testid={`playground-ai-response-pencil-button-${message.id}`}
                                      id={`chat-edit-message-button-${message.id}`}
                                      onClick={() => handleEditMessage(message.id, message.content)}
                                      className="btn btn-xs btn-ghost text-base-content/50 hover:text-base-content hover:bg-base-300/50 h-7 w-7 p-0 min-h-0 rounded-md transition-colors flex items-center justify-center"
                                      title="Edit message"
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                  {!(message?.llm_urls?.length > 0) && (
                                    <button
                                      data-testid={`playground-ai-response-copy-button-${message.id}`}
                                      id={`chat-copy-message-button-${message.id}`}
                                      onClick={() => handleCopyMessage(message, index)}
                                      className="btn btn-xs btn-ghost text-base-content/50 hover:text-base-content hover:bg-base-300/50 h-7 w-7 p-0 min-h-0 rounded-md transition-colors flex items-center justify-center"
                                      title="Copy response"
                                    >
                                      {copiedMessageId === (message.id || index) ? (
                                        <Check className="h-3.5 w-3.5 text-success" />
                                      ) : (
                                        <Copy className="h-3.5 w-3.5" />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
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
                {/* Follow-up suggestion chips — shown above the input while the latest
                    assistant message has suggestions attached; disappear once the next
                    message is sent since a new last message won't carry them. */}
                {latestAssistantSuggestions?.length > 0 && (
                  <div data-testid="chat-suggestions" className="flex flex-wrap gap-2">
                    {latestAssistantSuggestions.map((suggestion, sIndex) => (
                      <button
                        key={sIndex}
                        data-testid={`chat-suggestion-chip-${sIndex}`}
                        className="px-3 py-1.5 rounded-full border border-base-content/15 bg-base-200/50 hover:bg-primary/10 hover:border-primary/40 text-xs text-base-content/80 transition-colors duration-150"
                        onClick={() => {
                          if (handleSendMessageRef.current && inputRef.current) {
                            inputRef.current.value = suggestion;
                            setTimeout(() => handleSendMessageRef.current(null, true), 50);
                            setTimeout(() => {
                              if (inputRef.current) inputRef.current.value = "";
                            }, 200);
                          }
                        }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
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
                    draftPrompt={draftPrompt}
                    uploadRef={uploadRef}
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
