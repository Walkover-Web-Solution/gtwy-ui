import {
  CircleAlertIcon,
  FileClockIcon,
  PencilIcon,
  AddIcon,
  SquareFunctionIcon,
  BotMessageIcon,
  FileTextIcon,
  BotIcon,
  CopyIcon,
  CheckCircleIcon,
} from "@/components/Icons";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ExpandCollapse } from "@/components/UI/ExpandCollapse";
import { truncate } from "./AssistFile";
import ToolsDataModal from "./ToolsDataModal";
import { useCustomSelector } from "@/customHooks/customSelector";
import {
  getIconOfService,
  getToolName,
  openModal,
  allowedAttributes,
  extractErrorMessage,
  formatCostValue,
  formatTokensTable,
} from "@/utils/utility";
import { BATCH_PROCESSING_STATUSES, MODAL_TYPE } from "@/utils/enums";
import { PdfIcon } from "@/icons/pdfIcon";
import {
  AlertTriangle,
  Braces,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  ExternalLink,
  RotateCcw,
  ChevronRight,
  BookOpen,
  ArrowDown,
  SlidersHorizontal,
  Maximize2,
  Plus,
  User,
} from "lucide-react";
import { rerunApi } from "@/config/modelApi";
import { toast } from "react-toastify";
import { GenericSlider, useSlider } from "@/utils/sliderUtility";
import CodeBlock from "../codeBlock/CodeBlock";
import MessageExecutionTrace from "../historyUi/executionTrace/MessageExecutionTrace";
import { FinalResponseCard } from "../historyUi/FinalResponseCard";
import { ThreadActionPill, ThreadInlinePanel, ThreadSystemPromptPanel } from "../historyUi/ThreadActionPill";
import { HUE_THEME } from "../historyUi/executionTrace/traceTheme";
import { useThemeManager } from "@/customHooks/useThemeManager";
import { flattenToolsCallData } from "@/utils/executionTraceTransform";

// Inline variable value with show more/less for long content and JSON formatting using ExpandCollapse
function InlineVarValue({ raw, isLong }) {
  // Parse JSON if possible
  const parsedJson = useMemo(() => {
    if (!raw) return null;
    const trimmed = raw.trim();
    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return null;
      }
    }
    return null;
  }, [raw]);

  if (parsedJson !== null) {
    const prettyJson = JSON.stringify(parsedJson, null, 2);
    return (
      <div className="flex flex-col gap-1.5 w-full">
        <div className="w-full max-w-full overflow-hidden">
          <ExpandCollapse collapsedHeight={160} fadeHeight={60}>
            <CodeBlock className="language-json" showCopy={false}>
              {prettyJson}
            </CodeBlock>
          </ExpandCollapse>
        </div>
      </div>
    );
  }

  // Not JSON, handle normal text/non-JSON value
  return (
    <span className="text-xs break-all text-base-content whitespace-pre-wrap block">
      <ExpandCollapse collapsedHeight={150} fadeHeight={40}>
        {raw}
      </ExpandCollapse>
    </span>
  );
}

// Resolve any possible url shape (string, object with permanent_url, etc.)
const resolveAttachmentUrl = (rawUrl) => {
  if (!rawUrl) return null;
  if (typeof rawUrl === "string") return rawUrl;
  if (typeof rawUrl === "object") {
    return rawUrl.permanent_url || rawUrl.url || null;
  }
  return null;
};

// Helper function to normalize attachment data with enhanced fallback
const normalizeImageUrls = (imageData, source = "assistant") => {
  if (!Array.isArray(imageData)) return [];

  return imageData.reduce((acc, attachment) => {
    if (!attachment) return acc;
    const resolvedUrl = resolveAttachmentUrl(attachment.permanent_url || attachment.url);
    if (!resolvedUrl) return acc;

    acc.push({
      ...attachment,
      resolvedUrl,
      normalizedType: attachment?.type,
      source,
    });
    return acc;
  }, []);
};

// Enhanced fallback component with better UX
const ImageFallback = ({ type = "large", url = "", error = "failed_to_load" }) => {
  const isLarge = type === "large";
  const containerSize = isLarge ? "w-[180px] h-[180px]" : "w-16 h-16";

  const getErrorMessage = () => {
    switch (error) {
      case "failed_to_load":
        return "Failed to Load image";
      default:
        return "Preview unavailable";
    }
  };

  const getIcon = () => {
    return <FileTextIcon />;
  };

  return (
    <div
      className={`flex items-center justify-center bg-base-200/50 border border-base-300/50 rounded-lg ${containerSize} group hover:bg-base-200/70 transition-colors duration-200`}
    >
      <div className="text-center p-3">
        <div className="mb-2 flex justify-center">{getIcon()}</div>
        {isLarge && (
          <>
            <p className="text-sm text-base-content/60 font-medium mb-2">{getErrorMessage()}</p>
          </>
        )}
      </div>
    </div>
  );
};

// Enhanced image component with loading states - MOVED OUTSIDE ThreadItem to fix React Hooks ordering
const EnhancedImage = ({ src, alt, width, height, className, type = "large", onError, onLoad }) => {
  const [imageState, setImageState] = useState("loading");
  const [hasError, setHasError] = useState(false);

  const handleImageLoad = () => {
    setImageState("loaded");
    if (onLoad) onLoad();
  };

  const handleImageError = (e) => {
    setImageState("error");
    setHasError(true);
    if (onError) onError(e);
  };

  if (hasError) {
    return <ImageFallback type={type} url={src} error="failed_to_load" />;
  }

  return (
    <div className="relative group">
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={`${className} transition-opacity duration-200 ${imageState === "loading" ? "opacity-0" : "opacity-100"} hover:opacity-90 rounded-lg`}
        loading="lazy"
        onLoad={handleImageLoad}
        onError={handleImageError}
      />
      {imageState === "loaded" && type === "large" && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            data-testid="thread-item-image-open-new-tab"
            id="thread-item-image-open-new-tab"
            onClick={() => window.open(src, "_blank")}
            className="btn btn-sm btn-circle btn-ghost bg-base-100/80 hover:bg-base-100"
            title="Open in new tab"
          >
            <ExternalLink size={14} className="text-base-primary" />
          </button>
        </div>
      )}
    </div>
  );
};

const ThreadItem = ({
  index,
  item,
  thread,
  isSingleQuery = false,
  threadHandler,
  formatDateAndTime,
  integrationData,
  params,
  threadRefs,
  searchMessageId,
  setSearchMessageId,
  handleAddTestCase,
  setModalInput,
}) => {
  const { actualTheme } = useThemeManager();
  const isDark = actualTheme === "dark";

  // Determine message type based on new data structure
  const getInitialMessageType = () => {
    if (item?.user === "user") {
      return "user";
    }
    // Prioritize chatbot_message first
    if (item?.chatbot_message) return "chatbot_message";
    if (item?.updated_llm_message) return "updated_llm_message";
    if (item?.llm_message) return "llm_message";
    if (item?.error) return "error";
    return "llm_message"; // Default fallback
  };

  const [messageType, setMessageType] = useState(getInitialMessageType());
  const [toolsData, setToolsData] = useState([]);
  const toolsDataModalRef = useRef(null);
  const { embedToken, knowledgeBaseData, isEmbedUser, orgBridges, allBridgesMap, publishedVersionId } =
    useCustomSelector((state) => ({
      embedToken: state?.bridgeReducer?.org?.[params?.org_id]?.embed_token,
      knowledgeBaseData: state?.knowledgeBaseReducer?.knowledgeBaseData?.[params?.org_id] || [],
      isEmbedUser: state?.appInfoReducer?.embedUserDetails?.isEmbedUser,
      orgBridges: state?.bridgeReducer?.org?.[params?.org_id]?.orgs || [],
      allBridgesMap: state?.bridgeReducer?.allBridgesMap || {},
      publishedVersionId: state?.bridgeReducer?.allBridgesMap?.[item?.bridge_id]?.published_version_id,
    }));
  const [isDropupOpen, setIsDropupOpen] = useState(false);
  const [isRerunning, setIsRerunning] = useState(false);
  const [isSystemPromptExpanded, setIsSystemPromptExpanded] = useState(false);
  const [isUserQueryExpanded, setIsUserQueryExpanded] = useState(false);
  const handleRerun = async () => {
    if (!item?.message_id) return;
    setIsRerunning(true);
    try {
      await rerunApi({
        agent_id: item.bridge_id,
        thread_id: item?.thread_id,
        sub_thread_id: item?.sub_thread_id,
        message_ids: [item.message_id],
      });
      toast.success("Rerun triggered successfully");
    } catch {
    } finally {
      setIsRerunning(false);
    }
  };

  const [isVariablesOpen, setIsVariablesOpen] = useState(false);
  const [variablesFilter, setVariablesFilter] = useState("");
  const [isMoreDetailsExpanded, setIsMoreDetailsExpanded] = useState(false);
  const [copiedAllVariables, setCopiedAllVariables] = useState(false);

  // Keep toolbar visible whenever any accordion panel is open
  const isAnyPanelOpen = isVariablesOpen || isMoreDetailsExpanded || isSystemPromptExpanded;

  const handleCopyAllVariables = () => {
    const jsonString = JSON.stringify(item?.variables || {}, null, 2);
    navigator.clipboard.writeText(jsonString);
    setCopiedAllVariables(true);
    toast.success("Variables copied to clipboard");
    setTimeout(() => {
      setCopiedAllVariables(false);
    }, 2000);
  };

  const { sliderState, openSlider, closeSlider } = useSlider();
  const dropupRef = useRef(null);
  const router = useRouter();

  // Handle click-outside and ESC key to close viasocket embed
  useEffect(() => {
    const handleClickOutside = (event) => {
      const viasocketContainer = document.getElementById("iframe-viasocket-embed-parent-container");
      if (viasocketContainer && !viasocketContainer.contains(event.target)) {
        if (typeof window.handleclose === "function") {
          window.handleclose();
        }
      }
    };

    const handleEscapeKey = (event) => {
      if (event.key === "Escape") {
        if (typeof window.handleclose === "function") {
          window.handleclose();
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscapeKey);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, []);
  const batchStatus = item?.batch_data?.status;
  const isBatchResponse = Boolean(item?.batch_data?.batch_id);
  const getBatchStatusMeta = (status) => {
    const statusLower = (status || "").toLowerCase();
    if (statusLower === "completed") {
      return { icon: CheckCircle2, className: "badge-success", label: "Completed" };
    }
    if (BATCH_PROCESSING_STATUSES.includes(statusLower)) {
      return { icon: Clock3, className: "badge-warning", label: status || "Unknown" };
    }
    return { icon: AlertTriangle, className: "badge-error", label: status || "Unknown" };
  };

  const batchStatusMeta = getBatchStatusMeta(batchStatus);
  const BatchStatusIcon = batchStatusMeta.icon;

  const _handleVisualizeClick = () => {
    if (!params?.org_id || !params?.id) return;
    const searchParams = new URLSearchParams();
    if (item?.message_id) searchParams.set("message_id", item.message_id);
    if (item?.thread_id) searchParams.set("thread_id", item.thread_id);
    if (item?.sub_thread_id || item?.thread_id) {
      searchParams.set("subThread_id", item?.sub_thread_id || item?.thread_id);
    }
    router.push(`/org/${params.org_id}/agents/history/${params.id}/visualize?${searchParams.toString()}`);
  };

  const getToolNameHelper = useCallback(
    (tool) => {
      const toolId = tool?.name;
      return getToolName(toolId, allBridgesMap, orgBridges, integrationData);
    },
    [allBridgesMap, orgBridges, integrationData]
  );

  const flattenTools = useCallback((toolsData) => {
    const flattened = [];
    (toolsData || []).forEach((entry) => {
      if (!entry || typeof entry !== "object") return;

      // If entry has a type property, it's a flat tool
      if (entry.type) {
        flattened.push(entry);
      } else {
        // Entry is an object with nested tools, extract all values
        Object.values(entry).forEach((tool) => {
          if (tool && typeof tool === "object" && (tool.type || tool.name)) {
            flattened.push(tool);
          }
        });
      }
    });
    return flattened;
  }, []);

  // Check if a tool exists in integration data (flows) or bridges
  const isToolAvailable = useCallback(
    (tool) => {
      if (!tool) {
        return false;
      }

      // Always show RAG/knowledge base tools and agent tools
      if (tool?.data?.metadata?.type === "RAG" || tool?.data?.metadata?.type === "agent" || !isEmbedUser) {
        return true;
      }

      const toolIdentifier = tool.name || tool.id;

      if (!toolIdentifier) {
        return false;
      }
      // Check in integrationData (flows) - integrationData is an object with flow IDs as keys
      if (integrationData && typeof integrationData === "object") {
        // Check if the tool identifier matches any flow ID (key)
        if (integrationData[toolIdentifier]) {
          return true;
        }

        // Check if the tool identifier matches any flow title
        for (const integrationId in integrationData) {
          const integration = integrationData[integrationId];
          if (integration?.title === toolIdentifier) {
            return true;
          }
        }
      }
      return false;
    },
    [integrationData, isEmbedUser]
  );

  const hasAgentsOrTools = useMemo(
    () => flattenToolsCallData(item?.tools_call_data).length > 0,
    [item?.tools_call_data]
  );

  const rootAgentName = useMemo(() => {
    const bridge = orgBridges.find((b) => b?._id === params?.id || b?.id === params?.id);
    return bridge?.name || bridge?.agent_name || bridge?.bridge_name || item?.name || "Agent";
  }, [orgBridges, params?.id, item?.name]);

  const isStatelessConversation = useMemo(() => {
    const bridge = allBridgesMap?.[params?.id];
    return bridge?.settings?.stateless_conversation === true;
  }, [allBridgesMap, params?.id]);

  const statelessBtnClass =
    "inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold uppercase tracking-wide transition-colors bg-base-200 text-trace-gold hover:bg-base-300";

  useEffect(() => {
    setMessageType(getInitialMessageType());
  }, [item]);

  // Determine the role based on the current messageType
  const getMessageRole = () => {
    if (item?.tools_call_data && item.tools_call_data.length > 0) return "tools_call";
    if (item?.error && messageType === "error") return "error";

    // Role is determined by what messageType is currently selected
    if (item.user === "user") return "user";

    // All other types (llm_message, chatbot_message, updated_llm_message) are assistant
    return "assistant";
  };

  const handleEdit = () => {
    // For user messages, use user content
    if (getMessageRole() === "user") {
      setModalInput({
        content: item.user || "",
        originalContent: item.user || "",
        index,
        Id: item.id || item.Id,
      });
    } else {
      // For assistant messages, don't fall back to user content
      setModalInput({
        content: item.updated_llm_message || item.llm_message || item.chatbot_message || "",
        originalContent: item.llm_message || "",
        index,
        Id: item.id || item.Id,
      });
    }
    openModal(MODAL_TYPE.EDIT_MESSAGE_MODAL);
  };

  const getMessageToDisplay = useCallback(() => {
    switch (messageType) {
      case "user":
        return item.user || "";
      case "llm_message":
        return item.llm_message || "";
      case "chatbot_message":
        return item.chatbot_message || "";
      case "updated_llm_message":
        return item.updated_llm_message || "";
      case "error":
        return item.error || "";
      // Backward compatibility with numeric types
      case 0:
        return item.chatbot_message || "";
      case 1:
        return item.llm_message || item.user || "";
      case 2:
        return item.updated_llm_message || "";
      default:
        return item.llm_message || item.user || "";
    }
  }, [messageType, item]);

  const preFunctionEntry = useMemo(() => {
    const allTools = flattenTools(item?.tools_call_data);
    // Don't filter by isToolAvailable for pre_function - show all pre_function tools
    const found = allTools.find((tool) => tool?.type === "pre_function");
    return found || null;
  }, [item?.tools_call_data, flattenTools]);

  const {
    preTools,
    postTools,
    otherTools: _otherTools,
  } = useMemo(() => {
    const allTools = flattenTools(item?.tools_call_data);
    const pre = [];
    const post = [];
    const other = [];

    allTools.forEach((tool) => {
      if (!tool) return;

      const type = tool.type;

      // Apply isToolAvailable filter ONLY to tools, pre_tool, and post_tool
      // Do NOT filter pre_function or other types
      if (type === "pre_tool") {
        if (isToolAvailable(tool)) {
          pre.push(tool);
        }
      } else if (type === "post_tool") {
        if (isToolAvailable(tool)) {
          post.push(tool);
        }
      } else if (type === "tool" || !type) {
        if (isToolAvailable(tool)) {
          other.push(tool);
        }
      } else {
        // All other types (pre_function, post_function, etc.) - no filter
        other.push(tool);
      }
    });
    return { preTools: pre, postTools: post, otherTools: other };
  }, [item?.tools_call_data, flattenTools, isToolAvailable]);

  const preFunctionStripText = useMemo(() => {
    if (!preFunctionEntry) return "";

    if (preFunctionEntry.id) {
      const resolvedName = getToolName(preFunctionEntry.id, allBridgesMap, orgBridges, integrationData);
      if (resolvedName && resolvedName !== preFunctionEntry.id) return resolvedName;
    }

    return preFunctionEntry.name || preFunctionEntry.id || "Pre Function";
  }, [preFunctionEntry, allBridgesMap, orgBridges, integrationData]);

  const handlePreFunctionClick = useCallback(() => {
    if (!preFunctionEntry?.id || !preFunctionEntry?.metadata?.flowHitId) return;

    openViasocket(preFunctionEntry.id, {
      flowHitId: preFunctionEntry.metadata.flowHitId,
      embedToken,
      meta: { type: "pre_function" },
    });
  }, [preFunctionEntry, embedToken]);

  // Helper function to detect if content contains HTML
  const containsHTML = (str) => {
    if (!str) return false;
    const htmlPattern = /<\/?[a-z][\s\S]*>/i;
    return htmlPattern.test(str);
  };

  // Helper function to check if current message is chatbot_message
  const isChatbotMessage = () => {
    return messageType === "chatbot_message" || messageType === 0;
  };

  const selectMessageType = useCallback((type) => {
    setMessageType(type);
    setIsDropupOpen(false);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropupRef.current &&
        !dropupRef.current.contains(event.target) &&
        !event.target.closest("#thread-item-bot-icon")
      ) {
        setIsDropupOpen(false);
      }
    };

    if (isDropupOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropupOpen]);

  const handleCloseToolsDataModal = useCallback(() => {
    setToolsData([]);
    toolsDataModalRef.current?.close();
  }, []);

  const messageId = item.message_id;
  useEffect(() => {
    if (messageId && !threadRefs.current[messageId]) {
      threadRefs.current[messageId] = document.getElementById(`message-${messageId}`);
    }
    const messageElement = document.getElementById(`message-${searchMessageId}`);

    if (messageElement && searchMessageId) {
      messageElement.classList.add("bg-base-300", "rounded-md");
      setTimeout(() => {
        messageElement.classList.remove("bg-base-300", "rounded-md");
      }, 2000);
      setSearchMessageId(null);
    }
  }, [messageId, searchMessageId, threadRefs, setSearchMessageId]);

  useEffect(() => {
    return () => {
      closeSlider();
    };
  }, []);

  const handleToolPrimaryClick = useCallback(
    async (event, tool) => {
      // Check if this is a RAG tool - don't call openViasocket for RAG tools
      if (tool?.data?.metadata?.type === "RAG") {
        // RAG tools are knowledge base tools, handle them separately if needed
        // For now, just return without calling openViasocket
        return;
      }

      // Check if this is a knowledge database tool
      const toolName = typeof tool?.name === "string" ? tool.name.toLowerCase() : "";
      const isKnowledgeDbTool =
        toolName === "get_knowledge_base_data" ||
        toolName.includes("get knowledge database") ||
        toolName.includes("knowledge") ||
        toolName.includes("rag");

      if (isKnowledgeDbTool && tool?.args) {
        try {
          // Extract document ID from tool arguments
          let documentId = null;

          // Check various possible argument structures
          if (typeof tool.args === "string") {
            try {
              const parsedArgs = JSON.parse(tool.args);
              documentId = parsedArgs.document_id || parsedArgs.documentId || parsedArgs.id;
            } catch {
              // If parsing fails, treat as plain text
              documentId = tool.args;
            }
          } else if (typeof tool.args === "object") {
            documentId = tool.args.document_id || tool.args.documentId || tool.args.id;
          }

          if (documentId) {
            // Find the document in knowledge base data
            const document = knowledgeBaseData.find(
              (doc) => doc.id === documentId || doc.document_id === documentId || doc._id === documentId
            );

            if (document && document.url) {
              openSlider({
                title: document.title || `Document ${documentId}`,
                url: document.url,
              });
              return;
            }
          }
        } catch (error) {
          console.error("Error processing knowledge base tool:", error);
        }
      }
      const isAgent = tool?.data?.metadata?.type === "agent" || tool?.type === "AGENT" || Boolean(tool?.bridge_id);
      if (isAgent) {
        const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || "";
        const orgId = params?.org_id;
        const agentId = tool?.data?.metadata?.agent_id || tool?.bridge_id;
        const messageId = tool?.data?.metadata?.message_id || tool?.message_id;

        // 1) Find this bridge/agent in the org list or allBridgesMap
        const bridgeFromOrg = orgBridges.find((b) => b?._id === agentId) || allBridgesMap?.[agentId];
        // 3) Resolve published_version_id
        const publishedVersionId = bridgeFromOrg?.published_version_id;

        const threadId = tool?.data?.metadata?.thread_id || tool?.thread_id;
        const subThreadId = tool?.data?.metadata?.sub_thread_id || tool?.data?.metadata?.thread_id || tool?.thread_id;

        if (orgId && agentId) {
          const searchParams = new URLSearchParams();
          if (publishedVersionId) searchParams.set("version", publishedVersionId);
          if (messageId) searchParams.set("message_id", messageId);
          if (threadId) searchParams.set("thread_id", threadId);
          if (subThreadId) searchParams.set("sub_thread_id", subThreadId);

          const path = `/org/${orgId}/agents/history/${agentId}?${searchParams.toString()}`;
          if (isEmbedUser) {
            router.push(path);
            return;
          }

          if (typeof window !== "undefined") {
            const finalUrl = baseUrl ? `${baseUrl}${path}` : path;
            window.open(finalUrl, "_blank", "noopener,noreferrer");
          }
        }
        return;
      }
      openViasocket(tool?.id, {
        flowHitId: tool?.data?.metadata?.flowHitId,
        embedToken,
        meta: {
          type: "tool",
          bridge_id: params?.id,
        },
      });
    },
    [
      knowledgeBaseData,
      openSlider,
      embedToken,
      params?.id,
      params?.org_id,
      orgBridges,
      allBridgesMap,
      isEmbedUser,
      router,
    ]
  );

  const handleToolDataClick = useCallback((tool) => {
    setToolsData(tool);
    toolsDataModalRef.current?.showModal();
  }, []);

  const _renderToolData = useCallback(
    (tool, index) => (
      <div
        key={index}
        className="bg-base-200 rounded-lg flex gap-4 duration-200 items-center justify-between hover:bg-base-300 p-1"
      >
        <div
          onClick={(event) => handleToolPrimaryClick(event, tool)}
          className="cursor-pointer flex items-center justify-center py-4 pl-2"
        >
          <div className="text-center">{truncate(getToolNameHelper(tool), 20)}</div>
        </div>
        <div className="flex gap-3">
          <div className="tooltip tooltip-top relative text-base-content" data-tip="function logs">
            <SquareFunctionIcon
              size={22}
              onClick={(event) => handleToolPrimaryClick(event, tool)}
              className="opacity-80 cursor-pointer"
            />
          </div>
          <div className="tooltip tooltip-top pr-2 relative text-base-content" data-tip="function data">
            <FileClockIcon
              size={22}
              onClick={() => {
                setToolsData(tool);
                toolsDataModalRef.current?.showModal();
              }}
              className="opacity-80 bg-inherit cursor-pointer"
            />
          </div>
        </div>
      </div>
    ),
    [handleToolPrimaryClick, integrationData, setToolsData]
  );

  const handleUserButtonClick = (value) => {
    threadHandler(item.thread_id, item, value);
  };

  const handleAskAi = async (item) => {
    const aiconfig = handleAddTestCase(item, index, true);
    let variables = { aiconfig, response: item?.chatbot_message ? item?.chatbot_message : item?.llm_message };
    try {
      const systemPromptResponse = item.prompt;
      variables = { "System Prompt": systemPromptResponse, ...variables };
    } catch (error) {
      console.error("Failed to fetch single message:", error);
    }
    if (typeof window.SendDataToChatbot === "function") {
      window.SendDataToChatbot({
        parentId: "",
        bridgeName: "history_page_chabot",
        threadId: String(item?.id),
        variables,
        version_id: "null",
        hideCloseButton: "false",
      });
      setTimeout(() => {
        if (typeof window.openChatbot === "function") window.openChatbot();
        setTimeout(() => {
          if (item?.user && typeof window.Chatbot?.askAi === "function") {
            window.Chatbot.askAi({ message: item.user });
          }
        }, 300);
      }, 1000);
    } else {
      console.warn("Chatbot embed script not loaded. SendDataToChatbot is unavailable.");
    }
  };

  // Render attachments (images / pdf) for a message bubble with simple UI
  const renderAttachments = (attachments = []) => {
    if (!attachments.length) return null;

    return (
      <div className="mb-4">
        <div className="flex flex-wrap gap-3">
          {attachments.map((attachment, index) => {
            const url = resolveAttachmentUrl(attachment.resolvedUrl || attachment.permanent_url || attachment.url);
            if (!url) {
              return (
                <div
                  key={`assistant-img-fallback-${index}`}
                  className="w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-0.75rem)] xl:w-[280px]"
                >
                  <ImageFallback type={attachment?.source === "user" ? "small" : "large"} error="failed_to_load" />
                </div>
              );
            }

            const isPdf = url?.toLowerCase?.().endsWith(".pdf");

            // PDF style chip (same as provided snippet)
            if (isPdf) {
              return (
                <div key={`attachment-pdf-${index}`} className="pr-4">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 p-2 text-primary bg-base-200 rounded-lg hover:bg-base-300 group"
                  >
                    <PdfIcon height={20} width={20} />
                    <span className="text-sm font-medium max-w-[5rem] truncate text-primary">
                      {truncate(url.split("/").pop() || "PDF", 20)}
                    </span>
                    <ExternalLink className="text-primary" size={14} />
                  </a>
                </div>
              );
            }

            // Image thumbnail style (small for user, large for assistant/LLM)
            const isUserSource = attachment.source === "user";
            const type = isUserSource ? "small" : "large";
            const imgWidth = isUserSource ? 64 : 300;
            const imgHeight = isUserSource ? 64 : 300;
            const wrapperClasses = isUserSource
              ? "pr-4 cursor-pointer"
              : "relative w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-0.75rem)] xl:w-[280px] cursor-pointer";

            return (
              <div
                key={`attachment-img-${index}`}
                className={wrapperClasses}
                onClick={() => {
                  if (typeof window !== "undefined" && url) {
                    window.open(url, "_blank", "noopener,noreferrer");
                  }
                }}
              >
                <EnhancedImage
                  src={url}
                  alt={`Assistant attachment ${index + 1}`}
                  width={imgWidth}
                  height={imgHeight}
                  className={`max-w-full ${isUserSource ? "max-h-16" : "max-h-96"} w-auto h-auto object-cover`}
                  type={type}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderHighlightedSystemPrompt = (content) => {
    const variables = item?.variables || {};
    // Build list of {key, value} sorted by value length desc to match longest first
    // Skip values that are too long to be safe for regex (>200 chars)
    const entries = Object.entries(variables)
      .map(([key, val]) => ({ key, value: typeof val === "object" ? JSON.stringify(val) : String(val ?? "") }))
      .filter((e) => e.value.length > 0 && e.value.length <= 200)
      .sort((a, b) => b.value.length - a.value.length);

    if (entries.length === 0) return <span>{content}</span>;

    let parts;
    try {
      const pattern = entries.map((e) => e.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
      const regex = new RegExp(`\\b(${pattern})\\b`, "g");
      parts = content.split(regex);
    } catch {
      return <span>{content}</span>;
    }

    return parts.map((part, i) => {
      const matched = entries.find((e) => e.value === part);
      if (matched) {
        return (
          <span
            key={i}
            className="inline rounded px-1 py-0.5 font-mono bg-primary/15 text-primary border border-primary/30"
            title={`Variable: ${matched.key}`}
          >
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  const hasMultipleMessageTypes =
    [item.chatbot_message, item.llm_message, item.updated_llm_message].filter(Boolean).length > 1;

  const messageTypeDropdown = isDropupOpen ? (
    <div
      ref={dropupRef}
      className="absolute bg-base-100 border border-base-300 rounded-lg shadow-lg min-w-[130px] p-1"
      style={{ zIndex: 9999, top: "28px", left: "0" }}
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-xs font-medium text-base-content/50 px-2 pt-1 pb-1">View as</p>
      <ul className="flex flex-col gap-0.5">
        {item.chatbot_message && (
          <li>
            <button
              data-testid="thread-item-select-chatbot-message"
              id="thread-item-select-chatbot-message"
              className={`w-full text-left px-2 py-1 rounded-md text-xs ${messageType === "chatbot_message" || messageType === 0 ? "bg-primary text-white" : "hover:bg-base-200"}`}
              onClick={() => selectMessageType("chatbot_message")}
            >
              Chatbot
            </button>
          </li>
        )}
        {item.llm_message && (
          <li>
            <button
              data-testid="thread-item-select-llm-message"
              id="thread-item-select-llm-message"
              className={`w-full text-left px-2 py-1 rounded-md text-xs ${messageType === "llm_message" || messageType === 1 ? "bg-primary text-white" : "hover:bg-base-200"}`}
              onClick={() => selectMessageType("llm_message")}
            >
              LLM
            </button>
          </li>
        )}
        {item.updated_llm_message && (
          <li>
            <button
              data-testid="thread-item-select-updated-message"
              id="thread-item-select-updated-message"
              className={`w-full text-left px-2 py-1 rounded-md text-xs ${messageType === "updated_llm_message" || messageType === 2 ? "bg-primary text-white" : "hover:bg-base-200"}`}
              onClick={() => selectMessageType("updated_llm_message")}
            >
              Updated
            </button>
          </li>
        )}
      </ul>
    </div>
  ) : null;

  const responseStatusBadges = (
    <>
      {messageType === "updated_llm_message" && <span className="badge badge-xs badge-outline">Edited</span>}
      {isBatchResponse && (
        <span className={`badge badge-sm gap-1 text-white ${batchStatusMeta.className}`}>
          <BatchStatusIcon size={10} />
          {batchStatusMeta.label}
        </span>
      )}
    </>
  );

  const variableCount = Object.keys(item?.variables || {}).length;

  const renderVariablesPanel = (panelClassName = "max-w-[620px] w-full ml-auto") => {
    if (!isVariablesOpen || variableCount === 0) return null;

    return (
      <ThreadInlinePanel className={panelClassName}>
        <div className="px-4 py-2 border-b border-base-content/10 bg-base-200/50 flex justify-between items-center select-none">
          <span className="text-xs font-semibold text-base-content/70 uppercase tracking-wide">Variables</span>
          <button
            onClick={handleCopyAllVariables}
            className="btn btn-xs btn-ghost gap-1.5 text-xs text-base-content/70 hover:text-base-content flex items-center"
            title="Copy all variables as JSON"
          >
            {copiedAllVariables ? (
              <>
                <CheckCircleIcon size={12} className="text-success" />
                <span className="text-success font-medium">Copied!</span>
              </>
            ) : (
              <>
                <CopyIcon size={12} className="opacity-80" />
                <span>Copy Object</span>
              </>
            )}
          </button>
        </div>
        <div>
          {Object.entries(item?.variables || {})
            .filter(([key]) => key.toLowerCase().includes(variablesFilter.toLowerCase()))
            .map(([key, value]) => {
              const raw =
                typeof value === "object" && value !== null ? JSON.stringify(value, null, 2) : String(value ?? "");
              const isLong = raw.length > 200;
              return (
                <div
                  key={key}
                  className="flex items-start gap-4 border-b border-base-content/10 px-4 py-2.5 last:border-b-0"
                >
                  <span className="min-w-[120px] shrink-0 text-xs font-normal text-trace-gold">{key}</span>
                  <InlineVarValue raw={raw} isLong={isLong} />
                </div>
              );
            })}
        </div>
      </ThreadInlinePanel>
    );
  };

  const renderOptionalDetailsPanel = (panelClassName = "max-w-[620px] w-full ml-auto") => {
    if (!isMoreDetailsExpanded) return null;

    return (
      <ThreadInlinePanel className={panelClassName}>
        <div className="text-left">
          <div className="px-4 py-2 border-b border-base-content/10 bg-base-200/50">
            <span className="text-xs font-semibold text-base-content/70 uppercase tracking-wide">Optional Details</span>
          </div>
          {allowedAttributes.optional
            .filter(([key]) => key !== "tokens")
            .sort((a, b) => a[1].localeCompare(b[1]))
            .map(([key, displayKey]) => {
              const value = item[key] !== undefined ? item[key] : key === "createdAt" ? item.created_at : undefined;
              if (value === undefined || value === null) return null;

              // If the value is an object, render each property as separate rows
              if (typeof value === "object" && key !== "createdAt") {
                return Object.entries(value).map(([objKey, objValue]) => (
                  <div
                    key={`${key}-${objKey}`}
                    className="flex items-start gap-4 border-b border-base-content/10 px-4 py-2.5 last:border-b-0"
                  >
                    <span className="min-w-[120px] shrink-0 text-xs font-normal text-trace-gold font-mono">
                      {objKey.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </span>
                    <div className="flex-1 min-w-0 text-xs break-all text-base-content whitespace-pre-wrap font-mono">
                      {typeof objValue === "object" && objValue !== null ? (
                        <div className="border border-base-content/20 bg-base-200/50 rounded-lg overflow-hidden w-full">
                          <CodeBlock className="language-json" showCopy={false} plain={true}>
                            {JSON.stringify(objValue, null, 2)}
                          </CodeBlock>
                        </div>
                      ) : (
                        objValue?.toString()
                      )}
                    </div>
                  </div>
                ));
              }

              // Regular single value display
              return (
                <div
                  key={key}
                  className="flex items-start gap-4 border-b border-base-content/10 px-4 py-2.5 last:border-b-0"
                >
                  <span className="min-w-[120px] shrink-0 text-xs font-normal text-trace-gold">{displayKey}</span>
                  <span className="text-xs break-all text-base-content whitespace-pre-wrap">
                    {key === "createdAt" || key === "created_at" ? new Date(value).toLocaleString() : value?.toString()}
                  </span>
                </div>
              );
            })}
          {(() => {
            const batchId = item?.batch_data?.batch_id;
            if (!batchId) return null;
            return (
              <div key="batch_id" className="flex items-start gap-4 border-t border-base-content/10 px-4 py-2.5">
                <span className="min-w-[120px] shrink-0 text-xs font-normal text-trace-gold">Batch ID</span>
                <span className="text-xs break-all text-base-content whitespace-pre-wrap font-mono">{batchId}</span>
              </div>
            );
          })()}
          {(() => {
            const tokensVal = item.tokens;
            if (tokensVal !== undefined && tokensVal !== null && typeof tokensVal === "object") {
              const rows = formatTokensTable(tokensVal);
              if (rows && rows.length > 0) {
                return (
                  <div key="tokens" className="flex flex-col gap-2 border-t border-base-content/10 px-4 py-3">
                    <span className="text-xs font-semibold text-trace-gold uppercase tracking-wide">
                      Token and Cost
                    </span>
                    <div className="overflow-x-auto w-full border border-base-content/10 bg-base-200/10 rounded-lg shadow-sm">
                      <table className="table table-xs w-full border-collapse">
                        <thead>
                          <tr className="border-b border-base-content/10 bg-base-200/50">
                            <th className="text-left py-2 px-3 font-semibold text-base-content/70 text-[10px] uppercase tracking-wider">
                              Type
                            </th>
                            <th className="text-left py-2 px-3 font-semibold text-base-content/70 text-[10px] uppercase tracking-wider">
                              Tokens
                            </th>
                            <th className="text-left py-2 px-3 font-semibold text-base-content/70 text-[10px] uppercase tracking-wider">
                              Cost ($)
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-base-content/5">
                          {rows.map((row, idx) => (
                            <tr
                              key={idx}
                              className={`${
                                row.isTotal
                                  ? "font-semibold bg-base-200/40 border-t border-base-content/15"
                                  : "hover:bg-base-200/20"
                              }`}
                            >
                              <td className="py-2 px-3 text-left text-xs font-medium text-base-content/90">
                                {row.label}
                              </td>
                              <td className="py-2 px-3 text-left text-xs font-mono text-base-content/80">
                                {row.token !== undefined && row.token !== null
                                  ? typeof row.token === "number"
                                    ? row.token.toLocaleString()
                                    : row.token
                                  : "-"}
                              </td>
                              <td className="py-2 px-3 text-left text-xs font-mono text-base-content/80">
                                {formatCostValue(row.cost)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              }
            }
            return null;
          })()}
        </div>
      </ThreadInlinePanel>
    );
  };

  const renderSystemPromptPanel = (panelClassName = "max-w-[620px] w-full ml-auto") => {
    const prompt = item?.prompt || (item?.user && thread?.[index + 1]?.prompt);
    if (!isSystemPromptExpanded || !prompt) return null;
    return (
      <ThreadSystemPromptPanel className={panelClassName}>
        {renderHighlightedSystemPrompt(prompt)}
      </ThreadSystemPromptPanel>
    );
  };

  const renderResponseActionButtons = (stateful = false) => {
    const showEdit = !item?.llm_urls?.length && !item?.fromRTLayer;
    if (stateful) {
      return (
        <div className="mt-2 flex flex-wrap items-center justify-start gap-1.5">
          <ThreadActionPill
            id="thread-item-add-test-case-button"
            testId="thread-item-add-test-case-button"
            icon={AddIcon}
            trailing={ChevronRight}
            onClick={() => handleAddTestCase(item, index)}
          >
            Test Case
          </ThreadActionPill>
          <ThreadActionPill
            id="thread-item-debug-agent-button"
            testId="thread-item-debug-agent-button"
            icon={BotMessageIcon}
            trailing={ChevronRight}
            onClick={() => handleAskAi(item)}
          >
            Debug Agent
          </ThreadActionPill>
          {showEdit && (
            <ThreadActionPill
              id="thread-item-edit-message-button"
              testId="thread-item-edit-message-button"
              icon={PencilIcon}
              onClick={handleEdit}
            >
              Edit
            </ThreadActionPill>
          )}
        </div>
      );
    }

    return (
      <div className="mt-2 flex items-center gap-1.5">
        <button
          id="thread-item-add-test-case-button"
          data-testid="thread-item-add-test-case-button"
          className={statelessBtnClass}
          onClick={() => handleAddTestCase(item, index)}
        >
          <AddIcon className="h-3 w-3" />
          <span>Test Case</span>
        </button>
        <button
          id="thread-item-debug-agent-button"
          data-testid="thread-item-debug-agent-button"
          className={statelessBtnClass}
          onClick={() => handleAskAi(item)}
        >
          <BotMessageIcon className="h-3 w-3" />
          <span>Debug Agent</span>
        </button>
        {showEdit && (
          <button
            id="thread-item-edit-message-button"
            data-testid="thread-item-edit-message-button"
            className={statelessBtnClass}
            onClick={handleEdit}
          >
            <PencilIcon className="h-3 w-3" />
            <span>Edit</span>
          </button>
        )}
      </div>
    );
  };

  const renderStatefulMessageActionToolbar = ({
    showTimestamp = true,
    className = "",
    pillsOnly = false,
    panelsOnly = false,
  } = {}) => {
    if (panelsOnly) {
      return (
        <div className="w-full flex flex-col items-end">
          {renderSystemPromptPanel("max-w-[620px] w-full ml-auto")}
          {renderVariablesPanel("max-w-[620px] w-full ml-auto")}
          {renderOptionalDetailsPanel("max-w-[620px] w-full ml-auto")}
        </div>
      );
    }

    const pills = (
      <div className={`flex w-full flex-wrap items-center justify-end gap-1.5 ${className}`}>
        <ThreadActionPill
          testId="thread-item-user-aiconfig-button"
          id="thread-item-user-aiconfig-button"
          icon={SlidersHorizontal}
          trailing={Maximize2}
          onClick={() => handleUserButtonClick("AiConfig")}
        >
          AI Config
        </ThreadActionPill>
        {item?.latency ? (
          <ThreadActionPill
            testId="thread-item-user-latency-button"
            id="thread-item-user-latency-button"
            icon={Clock3}
            trailing={Maximize2}
            onClick={() => handleUserButtonClick("Latency")}
          >
            Latency
          </ThreadActionPill>
        ) : null}
        {(() => {
          const prompt = item?.prompt || (item?.user && thread?.[index + 1]?.prompt);
          return prompt ? (
            <ThreadActionPill
              testId="thread-item-user-system-prompt-button"
              id="thread-item-user-system-prompt-button"
              trailing={ChevronRight}
              trailingClassName={`transition-transform duration-200 ${isSystemPromptExpanded ? "rotate-90" : ""}`}
              active={isSystemPromptExpanded}
              onClick={() => {
                setIsSystemPromptExpanded((v) => {
                  const newVal = !v;
                  if (newVal) {
                    setIsVariablesOpen(false);
                    setIsMoreDetailsExpanded(false);
                  }
                  return newVal;
                });
              }}
            >
              System Prompt
            </ThreadActionPill>
          ) : null;
        })()}
        {variableCount > 0 ? (
          <ThreadActionPill
            testId="thread-item-user-variables-button"
            id="thread-item-user-variables-button"
            trailing={ChevronRight}
            trailingClassName={`transition-transform duration-200 ${isVariablesOpen ? "rotate-90" : ""}`}
            active={isVariablesOpen}
            onClick={() => {
              setIsVariablesOpen((v) => {
                const newVal = !v;
                if (newVal) {
                  setIsSystemPromptExpanded(false);
                  setIsMoreDetailsExpanded(false);
                }
                return newVal;
              });
            }}
          >
            Variables
          </ThreadActionPill>
        ) : null}
        <ThreadActionPill
          testId="thread-item-user-more-button"
          id="thread-item-user-more-button"
          trailing={ChevronRight}
          trailingClassName={`transition-transform duration-200 ${isMoreDetailsExpanded ? "rotate-90" : ""}`}
          active={isMoreDetailsExpanded}
          onClick={() => {
            setIsMoreDetailsExpanded((v) => {
              const newVal = !v;
              if (newVal) {
                setIsSystemPromptExpanded(false);
                setIsVariablesOpen(false);
              }
              return newVal;
            });
          }}
        >
          More
        </ThreadActionPill>
        {showTimestamp ? (
          <time className="shrink-0 text-xs text-base-content/60">{formatDateAndTime(item.created_at)}</time>
        ) : null}
      </div>
    );

    if (pillsOnly) return pills;

    return (
      <div className={`w-full ${className}`}>
        {pills}
        <div className="w-full flex flex-col items-end">
          {renderSystemPromptPanel("max-w-[620px] w-full ml-auto")}
          {renderVariablesPanel("max-w-[620px] w-full ml-auto")}
          {renderOptionalDetailsPanel("max-w-[620px] w-full ml-auto")}
        </div>
      </div>
    );
  };

  const renderStatelessMultiQueryUserActions = (pillsOnly = false, panelsOnly = false) => {
    const pills = (
      <div className="flex items-center justify-end gap-2 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          <button
            data-testid="thread-item-user-aiconfig-button"
            id="thread-item-user-aiconfig-button"
            className={statelessBtnClass}
            onClick={() => handleUserButtonClick("AiConfig")}
          >
            <SquareFunctionIcon className="h-3 w-3" />
            <span>AI Config</span>
          </button>
          {item?.latency ? (
            <button
              data-testid="thread-item-user-latency-button"
              id="thread-item-user-latency-button"
              className={statelessBtnClass}
              onClick={() => handleUserButtonClick("Latency")}
            >
              <Clock3 className="h-3 w-3" />
              <span>Latency</span>
            </button>
          ) : null}
          <button
            data-testid="thread-item-user-system-prompt-button"
            id="thread-item-user-system-prompt-button"
            className={statelessBtnClass}
            onClick={() => handleUserButtonClick("system Prompt")}
          >
            <FileClockIcon className="h-3 w-3" />
            <span>System Prompt</span>
          </button>
          <button
            data-testid="thread-item-user-more-button"
            id="thread-item-user-more-button"
            className={`${statelessBtnClass} ${isMoreDetailsExpanded ? "bg-base-300" : ""}`}
            onClick={() => {
              setIsMoreDetailsExpanded((v) => {
                const newVal = !v;
                if (newVal) {
                  setIsVariablesOpen(false);
                  setIsSystemPromptExpanded(false);
                }
                return newVal;
              });
            }}
          >
            <Plus className={`h-3 w-3 transition-transform duration-200 ${isMoreDetailsExpanded ? "rotate-45" : ""}`} />
            <span>More...</span>
          </button>
        </div>

        {variableCount > 0 ? (
          <button
            data-testid="thread-item-user-variables-button"
            id="thread-item-user-variables-button"
            className={statelessBtnClass}
            onClick={() => {
              setIsVariablesOpen((v) => {
                const newVal = !v;
                if (newVal) {
                  setIsMoreDetailsExpanded(false);
                  setIsSystemPromptExpanded(false);
                }
                return newVal;
              });
            }}
          >
            <Braces className="h-3 w-3" />
            <span>Sent Variables</span>
            <ChevronDown
              className={`h-3 w-3 transition-transform duration-200 ${isVariablesOpen ? "rotate-180" : ""}`}
            />
          </button>
        ) : null}

        <time className="text-xs opacity-40 shrink-0">
          <span className="">{formatDateAndTime(item.created_at)}</span>
        </time>
      </div>
    );

    const panels = (
      <>
        {isVariablesOpen && variableCount > 0 ? (
          <div className="mt-1 rounded-xl overflow-hidden max-w-[620px] w-full ml-auto border border-base-300 bg-base-100">
            <div className="px-4 py-2.5 bg-base-100 border-b border-base-300 flex justify-between items-center select-none">
              <input
                type="text"
                placeholder={`Filter ${variableCount} variables...`}
                value={variablesFilter}
                onChange={(e) => setVariablesFilter(e.target.value)}
                className="w-full text-sm outline-none bg-base-100 text-base-content placeholder:text-base-content/40 mr-2"
              />
              <button
                onClick={handleCopyAllVariables}
                className="btn btn-xs btn-ghost gap-1.5 text-xs text-base-content/70 hover:text-base-content flex items-center shrink-0"
                title="Copy all variables as JSON"
              >
                {copiedAllVariables ? (
                  <>
                    <CheckCircleIcon size={12} className="text-success" />
                    <span className="text-success font-medium">Copied!</span>
                  </>
                ) : (
                  <>
                    <CopyIcon size={12} className="opacity-80" />
                    <span>Copy Object</span>
                  </>
                )}
              </button>
            </div>
            <div>
              {Object.entries(item?.variables || {})
                .filter(([key]) => key.toLowerCase().includes(variablesFilter.toLowerCase()))
                .map(([key, value], i) => (
                  <div
                    key={key}
                    className={`flex items-start gap-4 px-4 py-2.5 border-b border-base-300 ${i % 2 === 0 ? "bg-base-100" : "bg-base-200/50"}`}
                  >
                    <span className="text-xs font-normal min-w-[120px] shrink-0 text-trace-gold">{key}</span>
                    <div className="flex-1 w-full max-w-full overflow-hidden">
                      <InlineVarValue
                        raw={
                          typeof value === "object" && value !== null
                            ? JSON.stringify(value, null, 2)
                            : String(value ?? "")
                        }
                        isLong={
                          typeof value === "object" && value !== null
                            ? JSON.stringify(value).length > 200
                            : String(value ?? "").length > 200
                        }
                      />
                    </div>
                  </div>
                ))}
            </div>
            <div className="px-4 py-2 text-right text-xs text-base-content/40 border-t border-base-300 bg-base-100">
              {formatDateAndTime(item.created_at)}
            </div>
          </div>
        ) : null}

        {isMoreDetailsExpanded ? (
          <div className="mt-1 rounded-xl overflow-hidden max-w-[620px] w-full ml-auto border border-base-300 bg-base-100 p-4 space-y-4 text-left">
            <div className="text-xs font-semibold text-base-content/70 uppercase tracking-wide">Optional Details</div>
            <div className="border border-base-300 rounded-lg overflow-hidden bg-base-100 divide-y divide-base-300">
              {allowedAttributes.optional
                .filter(([key]) => key !== "tokens")
                .sort((a, b) => a[1].localeCompare(b[1]))
                .map(([key, displayKey]) => {
                  const value = item[key] !== undefined ? item[key] : key === "createdAt" ? item.created_at : undefined;
                  if (value === undefined || value === null) return null;

                  // If the value is an object, render each property as separate rows
                  if (typeof value === "object" && key !== "createdAt") {
                    return Object.entries(value).map(([objKey, objValue]) => (
                      <div key={`${key}-${objKey}`} className="bg-base-100 flex px-4 py-3">
                        <div className="text-xs font-normal capitalize w-1/2 text-trace-gold">
                          {objKey.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                        </div>
                        <div className="w-1/2 text-xs text-base-content font-mono">
                          {typeof objValue === "object" && objValue !== null ? (
                            <div className="border border-base-content/20 bg-base-200/50 rounded-lg overflow-hidden w-full">
                              <CodeBlock className="language-json" showCopy={false} plain={true}>
                                {JSON.stringify(objValue, null, 2)}
                              </CodeBlock>
                            </div>
                          ) : (
                            <span className="break-words font-normal text-base-content/80 whitespace-pre-wrap">
                              {objValue?.toString()}
                            </span>
                          )}
                        </div>
                      </div>
                    ));
                  }

                  // Regular single value display
                  return (
                    <div key={key} className="bg-base-100 flex px-4 py-3">
                      <div className="text-xs font-normal capitalize w-1/2 text-trace-gold">{displayKey}</div>
                      <div className="w-1/2 text-xs text-base-content">
                        <span className="break-words font-normal text-base-content/80">
                          {key === "createdAt" || key === "created_at"
                            ? new Date(value).toLocaleString()
                            : value?.toString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              {(() => {
                const tokensVal = item.tokens;
                if (tokensVal !== undefined && tokensVal !== null && typeof tokensVal === "object") {
                  const rows = formatTokensTable(tokensVal);
                  if (rows && rows.length > 0) {
                    return (
                      <div key="tokens" className="bg-base-100 flex flex-col gap-2 px-4 py-3">
                        <div className="text-xs font-normal capitalize text-trace-gold">Token and Cost</div>
                        <div className="overflow-x-auto w-full border border-base-content/10 bg-base-200/10 rounded-lg shadow-sm">
                          <table className="table table-xs w-full border-collapse">
                            <thead>
                              <tr className="border-b border-base-content/10 bg-base-200/50">
                                <th className="text-left py-2 px-3 font-semibold text-base-content/70 text-[10px] uppercase tracking-wider">
                                  Type
                                </th>
                                <th className="text-right py-2 px-3 font-semibold text-base-content/70 text-[10px] uppercase tracking-wider">
                                  Tokens
                                </th>
                                <th className="text-right py-2 px-3 font-semibold text-base-content/70 text-[10px] uppercase tracking-wider">
                                  Cost
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-base-content/5">
                              {rows.map((row, idx) => (
                                <tr
                                  key={idx}
                                  className={`${
                                    row.isTotal
                                      ? "font-semibold bg-base-200/40 border-t border-base-content/15"
                                      : "hover:bg-base-200/20"
                                  }`}
                                >
                                  <td className="py-2 px-3 text-left text-xs font-medium text-base-content/90">
                                    {row.label}
                                  </td>
                                  <td className="py-2 px-3 text-right text-xs font-mono text-base-content/80">
                                    {row.token !== undefined && row.token !== null
                                      ? typeof row.token === "number"
                                        ? row.token.toLocaleString()
                                        : row.token
                                      : "-"}
                                  </td>
                                  <td className="py-2 px-3 text-right text-xs font-mono text-base-content/80">
                                    {formatCostValue(row.cost)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  }
                }
                return null;
              })()}
            </div>
          </div>
        ) : null}
      </>
    );

    if (pillsOnly) return pills;
    if (panelsOnly) return panels;

    return (
      <div className="flex flex-col gap-1 mt-3 pr-12">
        {pills}
        {panels}
      </div>
    );
  };

  const firstAttemptErrorNotice = item?.firstAttemptError ? (
    <div className="w-full mb-2">
      <details className="group/fae rounded-lg border border-warning/30 bg-error/10 text-base-content">
        <summary className="flex justify-between cursor-pointer items-center gap-2 px-3 py-2 text-xs list-none">
          <>
            <span className="font-semibold uppercase tracking-wide text-error shrink-0">
              <AlertTriangle className="w-3.5 h-3.5 inline-block mr-1 mb-1" /> First attempt failed:
            </span>
          </>
          <span className="flex-1 min-w-0 truncate text-error group-open/fae:hidden">
            {extractErrorMessage(item.firstAttemptError)?.substring(0, 200)}
            {extractErrorMessage(item.firstAttemptError)?.length > 200 ? "..." : ""}
          </span>
          <ChevronDown className="w-3.5 h-3.5 shrink-0 transition-transform group-open/fae:rotate-180" />
        </summary>
        <div className="px-3 pb-2 pt-0 text-xs">
          <p className="whitespace-pre-wrap break-words text-error">{extractErrorMessage(item.firstAttemptError)}</p>
        </div>
      </details>
    </div>
  ) : null;

  return (
    <div
      data-testid={`message-${messageId}`}
      key={`item-id-${item?.id}`}
      id={`message-${messageId}`}
      ref={(el) => (threadRefs.current[messageId] = el)}
      className="text-sm"
    >
      {/* Sticky header */}
      {isSingleQuery && (
        <div className="flex sticky top-0 z-20 bg-history-page px-4 py-1 mb-3 items-center justify-between gap-2 border-b border-base-300 flex-col">
          <div className="w-full flex items-center justify-between">
            <div
              className="flex items-center gap-2 overflow-x-auto min-w-0"
              style={{
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
            >
              {item?.service && (
                <span className="flex items-center shrink-0" title={item.service}>
                  {getIconOfService(item.service, 14, 14)}
                </span>
              )}
              {item?.model && <span className="text-xs font-medium text-base-content/60 shrink-0">{item.model}</span>}
              {(item?.tokens?.input_tokens != null || item?.tokens?.output_tokens != null) && (
                <span
                  className="text-xs text-base-content/40 flex items-center gap-1 shrink-0 cursor-help"
                  title={`Tokens: ${(item.tokens.input_tokens ?? 0).toLocaleString()} input • ${(item.tokens.output_tokens ?? 0).toLocaleString()} output • ${(item.tokens.total_tokens ?? (item.tokens.input_tokens ?? 0) + (item.tokens.output_tokens ?? 0)).toLocaleString()} total`}
                >
                  <span className="text-base-content/20">·</span>
                  <span>Tokens:</span>
                  <span className="font-medium text-base-content/60">
                    {(item.tokens.input_tokens ?? 0).toLocaleString()} INPUT
                  </span>
                  <span className="text-base-content/20">/</span>
                  <span className="font-medium text-base-content/60">
                    {(item.tokens.output_tokens ?? 0).toLocaleString()} OUTPUT
                  </span>
                  <span className="text-base-content/20">/</span>
                  <span className="font-medium text-base-content/60">
                    {(
                      item.tokens.total_tokens ?? (item.tokens.input_tokens ?? 0) + (item.tokens.output_tokens ?? 0)
                    ).toLocaleString()}{" "}
                    TOTAL
                  </span>
                </span>
              )}
              {item?.tokens?.expected_cost && (
                <span className="text-xs text-base-content/40 flex items-center gap-1 shrink-0">
                  <span className="text-base-content/20">·</span>
                  <span>Cost:</span>
                  <span className="font-medium text-base-content/60">
                    ${parseFloat(item.tokens.expected_cost).toFixed(4)}
                  </span>
                </span>
              )}
              {item?.version_id && (
                <span className="text-xs text-base-content/40 flex items-center gap-1 shrink-0">
                  <span className="text-base-content/20">·</span>
                  <span>Version:</span>
                  <span className="font-medium text-base-content/60">{item.version_id}</span>
                </span>
              )}
              {item?.message_id && (
                <span className="text-xs text-base-content/40 flex items-center gap-1 shrink-0">
                  <span className="text-base-content/20">·</span>
                  <span>Message ID:</span>
                  <span className="font-medium text-base-content/60">{item.message_id}</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 bg-base-200 rounded-lg p-1 shrink-0">
              <button
                data-testid="thread-item-rerun-button"
                className="btn btn-ghost btn-xs rounded-md gap-1.5 shrink-0"
                onClick={handleRerun}
                disabled={isRerunning || !publishedVersionId}
                title={!publishedVersionId ? "No published version available" : "Rerun this message"}
              >
                <RotateCcw className={`h-3 w-3 ${isRerunning ? "animate-spin" : ""}`} />
                <span>{isRerunning ? "Running..." : "Rerun"}</span>
              </button>
              <div className="w-px h-4 bg-base-300 mx-0.5 shrink-0" />
              <button
                data-testid="thread-item-user-aiconfig-button-sticky"
                className="btn btn-ghost btn-xs rounded-md gap-1.5 shrink-0"
                onClick={() => handleUserButtonClick("AiConfig")}
              >
                <SquareFunctionIcon className="h-3 w-3" />
                <span>AI Config</span>
              </button>
              <div className="w-px h-4 bg-base-300 mx-0.5 shrink-0" />
              <button
                id="thread-item-add-test-case-button-sticky"
                data-testid="thread-item-add-test-case-button-sticky"
                className="btn btn-ghost btn-xs rounded-md gap-1.5 shrink-0"
                onClick={() => handleAddTestCase(item, index)}
              >
                <AddIcon className="h-3 w-3" />
                <span>Test Case</span>
              </button>
              <div className="w-px h-4 bg-base-300 mx-0.5 shrink-0" />
              <button
                data-testid="thread-item-user-variables-button-sticky"
                id="thread-item-user-variables-button-sticky"
                className="btn btn-ghost btn-xs rounded-md gap-1.5 shrink-0"
                onClick={() => {
                  setIsVariablesOpen((v) => {
                    const newVal = !v;
                    if (newVal) {
                      setIsSystemPromptExpanded(false);
                      setIsMoreDetailsExpanded(false);
                    }
                    return newVal;
                  });
                }}
              >
                <Braces className="h-3 w-3" />
                <span>Variables</span>
              </button>
              {item?.latency ? (
                <>
                  <div className="w-px h-4 bg-base-300 mx-0.5 shrink-0" />
                  <button
                    data-testid="thread-item-user-latency-button-sticky"
                    className="btn btn-ghost btn-xs rounded-md gap-1.5 shrink-0"
                    onClick={() => handleUserButtonClick("Latency")}
                  >
                    <Clock3 className="h-3 w-3 text-base-content/60" />
                    <span>Latency</span>
                  </button>
                </>
              ) : null}
            </div>
          </div>

          {/* Variables panel dropdown - appears below the sticky header */}
          {isVariablesOpen && variableCount > 0 && (
            <div className="w-full mt-2 rounded-xl overflow-hidden border border-base-300 bg-base-100">
              <div className="px-4 py-2.5 bg-base-100 border-b border-base-300 flex justify-between items-center select-none">
                <input
                  type="text"
                  placeholder={`Filter ${variableCount} variables...`}
                  value={variablesFilter}
                  onChange={(e) => setVariablesFilter(e.target.value)}
                  className="w-full text-sm outline-none bg-base-100 text-base-content placeholder:text-base-content/40 mr-2"
                />
                <button
                  onClick={handleCopyAllVariables}
                  className="btn btn-xs btn-ghost gap-1.5 text-xs text-base-content/70 hover:text-base-content flex items-center shrink-0"
                  title="Copy all variables as JSON"
                >
                  {copiedAllVariables ? (
                    <>
                      <CheckCircleIcon size={12} className="text-success" />
                      <span className="text-success font-medium">Copied!</span>
                    </>
                  ) : (
                    <>
                      <CopyIcon size={12} className="opacity-80" />
                      <span>Copy Object</span>
                    </>
                  )}
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {Object.entries(item?.variables || {})
                  .filter(([key]) => key.toLowerCase().includes(variablesFilter.toLowerCase()))
                  .map(([key, value], i) => (
                    <div
                      key={key}
                      className={`flex items-start gap-4 px-4 py-2.5 border-b border-base-300 ${i % 2 === 0 ? "bg-base-100" : "bg-base-200/50"}`}
                    >
                      <span className="text-xs font-normal min-w-[120px] shrink-0 text-trace-gold">{key}</span>
                      <div className="flex-1 w-full max-w-full overflow-hidden">
                        <InlineVarValue
                          raw={
                            typeof value === "object" && value !== null
                              ? JSON.stringify(value, null, 2)
                              : String(value ?? "")
                          }
                          isLong={
                            typeof value === "object" && value !== null
                              ? JSON.stringify(value).length > 200
                              : String(value ?? "").length > 200
                          }
                        />
                      </div>
                    </div>
                  ))}
              </div>
              <div className="px-4 py-2 text-right text-xs text-base-content/40 border-t border-base-300 bg-base-100">
                {formatDateAndTime(item.created_at)}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="">
        {isSingleQuery ? (
          /* ── Single-query vertical flow ── */
          <div className="flex flex-col w-full py-2">
            {/* User message — right-aligned bubble + U avatar */}
            <div className={`group relative ${hasAgentsOrTools ? "mb-2" : "mb-10"}`}>
              <div className="flex items-start justify-end gap-3">
                <div
                  onClick={
                    !isUserQueryExpanded && (item.user?.length > 300 || item.user?.split("\n").length > 5)
                      ? () => setIsUserQueryExpanded(true)
                      : undefined
                  }
                  className={`max-w-[75%] rounded-2xl rounded-br-none px-4 py-3 text-sm leading-relaxed break-words relative border ${
                    isDark
                      ? "bg-[#27272a] text-zinc-100 border-[#3f3f46]"
                      : "bg-[#f4f4f5] text-zinc-900 border-[#e4e4e7]"
                  } ${!isUserQueryExpanded && (item.user?.length > 300 || item.user?.split("\n").length > 5) ? "cursor-pointer select-none" : ""}`}
                  style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
                >
                  {renderAttachments(normalizeImageUrls(item?.user_urls, "user"))}
                  <div className="whitespace-pre-line">
                    <ReactMarkdown
                      components={{
                        code: ({ node, inline, className, children, ...props }) => (
                          <CodeBlock className={className} {...props}>
                            {children}
                          </CodeBlock>
                        ),
                      }}
                    >
                      {item.user}
                    </ReactMarkdown>
                  </div>

                  {/* Semi-transparent fade-out overlay when collapsed */}
                  {!isUserQueryExpanded && (item.user?.length > 300 || item.user?.split("\n").length > 5) && (
                    <div
                      className={`absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t ${isDark ? "from-[#27272a]" : "from-[#f4f4f5]"} to-transparent pointer-events-none rounded-b-2xl`}
                    />
                  )}

                  {/* Collapse button inside the bubble, shown only when expanded */}
                  {isUserQueryExpanded && (item.user?.length > 300 || item.user?.split("\n").length > 5) && (
                    <div className="flex justify-center mt-3 select-none">
                      <button
                        type="button"
                        className={`btn btn-xs rounded-full border border-base-content/10 px-4 py-1 flex items-center gap-1.5 transition-colors font-semibold ${
                          isDark
                            ? "bg-base-200 text-base-content hover:bg-base-300"
                            : "bg-base-100/10 text-neutral-content hover:bg-base-100/20"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsUserQueryExpanded(false);
                        }}
                      >
                        <ChevronUp size={12} />
                        <span>Collapse</span>
                      </button>
                    </div>
                  )}
                </div>
                {/* Avatar */}
                <div
                  className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold mt-0.5 ${
                    isDark ? "bg-[#1a1a1a] text-white/50" : "bg-base-100 text-base-content/50"
                  }`}
                >
                  U
                </div>
              </div>
            </div>

            {isSingleQuery && item?.prompt && (
              <div className={`w-full ${hasAgentsOrTools ? "mb-3" : "mb-6"}`}>
                <div className="bg-base-200 border border-base-300 rounded-lg hover:border-base-content/20">
                  <div
                    className="px-3 py-2 flex items-center justify-between gap-2 cursor-pointer hover:bg-base-200/80 rounded-lg"
                    onClick={() => {
                      setIsSystemPromptExpanded(!isSystemPromptExpanded);
                      if (!isSystemPromptExpanded) {
                        setIsVariablesOpen(false);
                        setIsMoreDetailsExpanded(false);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileTextIcon size={14} className="text-base-content/60 shrink-0" />
                      <span className="text-xs font-medium text-base-content/70">System Prompt:</span>
                      {!isSystemPromptExpanded && (
                        <span className="text-xs text-base-content/50 truncate flex-1">{item.prompt}</span>
                      )}
                    </div>
                    <ChevronDown
                      size={16}
                      className={`text-base-content/60 shrink-0 transition-transform ${isSystemPromptExpanded ? "rotate-180" : ""}`}
                    />
                  </div>
                  {isSystemPromptExpanded && (
                    <div className="px-3 pb-3 pt-2 border-t border-base-300">
                      <div className="text-xs text-base-content whitespace-pre-wrap bg-base-100 rounded p-2.5 border border-base-300 leading-relaxed">
                        {renderHighlightedSystemPrompt(item.prompt)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Config between user and agent: pre-tool */}
            {isSingleQuery &&
              item?.tools_call_data?.length > 0 &&
              (() => {
                const preFunction = item.tools_call_data
                  .flatMap((tools) => Object.values(tools || {}))
                  .find((tool) => tool?.type === "pre_tool");
                if (!preFunction) return null;
                return (
                  <div className="w-full max-w-xl mt-3">
                    <div className="inline-flex items-center gap-2 bg-base-200/30 border border-base-300 rounded-xl px-4 py-2">
                      <span className="text-xs font-medium text-base-content/70 shrink-0">Pre Function:</span>
                      <div
                        onClick={(e) => handleToolPrimaryClick(e, preFunction)}
                        className="inline-flex items-center gap-2 bg-base-200 border border-base-300 rounded-md px-4 py-2 text-xs cursor-pointer hover:bg-base-300 transition-colors"
                      >
                        <span className="font-medium truncate max-w-[120px]" title={getToolNameHelper(preFunction)}>
                          {truncate(getToolNameHelper(preFunction), 20)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

            {/* Agent execution trace (replaces old tools UI) */}
            {hasAgentsOrTools && (
              <div className="w-full mt-4">
                <MessageExecutionTrace
                  item={item}
                  bridgeId={params?.id}
                  rootAgentName={rootAgentName}
                  formatDateAndTime={formatDateAndTime}
                  onToolLogsClick={handleToolPrimaryClick}
                  onToolDataClick={handleToolDataClick}
                  onAgentDataClick={handleToolDataClick}
                  onAgentHistoryClick={handleToolPrimaryClick}
                />
              </div>
            )}

            {/* Legacy tools UI — only when no nested agent trace */}
            {!hasAgentsOrTools &&
              (item?.tools_call_data?.length > 0 || item?.function) &&
              (() => {
                // Get all tools from tools_call_data
                const allTools = item?.tools_call_data
                  ? item.tools_call_data.flatMap((toolObj) => Object.entries(toolObj || {}))
                  : [];

                // Handle function_time_logs as both object and array
                let functionTimeLogsArr = [];
                if (Array.isArray(item?.latency?.function_time_logs)) {
                  functionTimeLogsArr = item.latency.function_time_logs;
                } else if (item?.latency?.function_time_logs && typeof item.latency.function_time_logs === "object") {
                  // If it's an object, convert to array
                  functionTimeLogsArr = Object.values(item.latency.function_time_logs);
                }

                // Get tool names from function_time_logs to know which tools should be displayed
                const toolNamesInLogs = new Set();
                functionTimeLogsArr.forEach((logEntry) => {
                  (logEntry.step || "")
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .forEach((name) => toolNamesInLogs.add(name));
                });

                // Filter based on mode
                const allToolEntries = allTools.filter(([, tool]) => {
                  // If tool is in function_time_logs, always include it
                  if (toolNamesInLogs.has(tool?.name)) return true;

                  // Otherwise, filter out tools not available in integration data or bridges
                  if (!isToolAvailable(tool)) return false;

                  // In stateful mode: include ALL tools (including pre_tool)
                  if (!isSingleQuery) return true;
                  // In stateless mode: exclude pre_tool (it's shown separately)
                  return tool?.type !== "pre_tool";
                });

                // Extract execution_time_logs from latency object and filter out retry times
                const executionTimeLogs = (() => {
                  const executionLogs = item?.latency?.execution_time_logs;

                  if (!Array.isArray(executionLogs)) return [];

                  // Filter out retry entries (where step contains "Retry")
                  return executionLogs.filter((log) => log?.step && !log.step.toLowerCase().includes("retry"));
                })();

                const renderToolChip = ([toolKey, tool], chipIndex) => {
                  const isPreTool = tool?.type === "pre_tool";
                  const isRAGTool = tool?.data?.metadata?.type === "RAG";
                  const toolLabel = isPreTool ? `Pre Tool: ${getToolNameHelper(tool)}` : getToolNameHelper(tool);

                  return (
                    <div
                      key={toolKey || chipIndex}
                      data-testid={`thread-item-tool-${toolKey || chipIndex}`}
                      id={`thread-item-tool-${toolKey || chipIndex}`}
                      onClick={(event) => !isRAGTool && handleToolPrimaryClick(event, tool)}
                      className={`flex items-center gap-1.5 border rounded-lg px-3 py-1.5 transition-colors text-sm ${
                        isRAGTool
                          ? "bg-info/10 border-info/30 hover:bg-info/20 cursor-default"
                          : isPreTool
                            ? "bg-warning/10 border-warning/30 hover:bg-warning/20 cursor-pointer"
                            : "bg-base-100 border-base-300 hover:bg-base-300 cursor-pointer"
                      }`}
                    >
                      {isRAGTool && <BookOpen size={14} className="text-info mr-1" title="Knowledge Base" />}
                      <span
                        className={`font-medium truncate max-w-[120px] ${isRAGTool ? "text-info" : ""}`}
                        title={toolLabel}
                      >
                        {truncate(isRAGTool ? "Knowledge Base" : toolLabel, 20)}
                      </span>
                      <div className="flex items-center gap-1 ml-0.5">
                        {!isRAGTool && (
                          <div className="tooltip tooltip-top" data-tip="function logs">
                            <SquareFunctionIcon
                              size={14}
                              onClick={(event) => handleToolPrimaryClick(event, tool)}
                              className="opacity-50 hover:opacity-100 cursor-pointer"
                            />
                          </div>
                        )}
                        <div
                          className="tooltip tooltip-top"
                          data-tip={isRAGTool ? "knowledge base data" : "function data"}
                        >
                          <FileClockIcon
                            data-testid={`thread-item-tool-data-${toolKey || chipIndex}`}
                            id={`thread-item-tool-data-${toolKey || chipIndex}`}
                            size={14}
                            onClick={(e) => {
                              e.stopPropagation();
                              setToolsData(tool);
                              toolsDataModalRef.current?.showModal();
                            }}
                            className="opacity-50 hover:opacity-100 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  );
                };

                if (!item?.tools_call_data) return null;
                // Show tools section if there are tools to display or if there's a function
                if (allToolEntries.length === 0 && !item?.function) return null;

                if (functionTimeLogsArr.length > 0) {
                  /* All steps side by side in one row */
                  // First execution time goes on arrow from User Query to Tools (index 0)
                  const firstExecutionTime = executionTimeLogs[0]?.time_taken;

                  return (
                    <>
                      {/* Arrow above the row of steps with first execution time */}
                      <div className="flex flex-row items-center justify-center my-2 w-full max-w-xl gap-3">
                        <ArrowDown size={20} className="text-base-content/50" />
                        {firstExecutionTime > 0 && (
                          <span className="text-xs px-2.5 py-1 rounded-md bg-base-200 text-base-content border border-base-300 whitespace-nowrap font-medium flex items-center gap-1 w-20 justify-center">
                            <Clock3 size={12} /> {firstExecutionTime.toFixed(2)}s
                          </span>
                        )}
                      </div>

                      {/* Parent container with border around all tools */}
                      <div className="w-fit border border-base-300 rounded-xl px-4 py-4 bg-base-200/30">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-semibold text-base-content/40 uppercase tracking-wide">
                            Functions Executed
                          </span>
                        </div>
                        {/* Step boxes in column with arrows */}
                        <div className="flex flex-col items-center gap-2">
                          {functionTimeLogsArr.map((logEntry, stepIndex) => {
                            const stepNames = (logEntry.step || "")
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean);
                            const isParallel = stepNames.length > 1;
                            const stepTime = parseFloat(logEntry.time_taken) || 0;

                            // Match tools by name - create entries for all step names
                            const displayEntries = stepNames.map((stepName) => {
                              // Find the matching tool entry
                              const matchedEntry = allToolEntries.find(([, tool]) => tool?.name === stepName);
                              // If found, use it; otherwise create a placeholder
                              return matchedEntry || [stepName, { name: stepName }];
                            });

                            const toolChips = displayEntries.map(([toolKey, tool], i) => {
                              const isPreTool = tool?.type === "pre_tool";
                              const isRAGTool = tool?.data?.metadata?.type === "RAG";
                              const toolLabel = getToolNameHelper(tool);
                              return (
                                <div
                                  key={toolKey || i}
                                  data-testid={`thread-item-tool-${toolKey || i}`}
                                  id={`thread-item-tool-${toolKey || i}`}
                                  onClick={(event) => !isRAGTool && handleToolPrimaryClick(event, tool)}
                                  className={`flex items-center gap-1.5 border rounded-lg px-2.5 py-1.5 transition-colors text-sm ${
                                    isRAGTool
                                      ? "bg-info/10 border-info/30 hover:bg-info/20 cursor-default"
                                      : isPreTool
                                        ? "bg-warning/10 border-warning/30 hover:bg-warning/20 cursor-pointer"
                                        : "bg-base-100 border-base-300 hover:bg-base-300 cursor-pointer"
                                  }`}
                                >
                                  {isRAGTool && (
                                    <BookOpen size={13} className="text-info mr-1" title="Knowledge Base" />
                                  )}
                                  <span
                                    className={`font-medium truncate max-w-[120px] ${isRAGTool ? "text-info" : ""}`}
                                    title={toolLabel}
                                  >
                                    {truncate(isRAGTool ? "Knowledge Base" : toolLabel, 20)}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    {!isRAGTool && (
                                      <div className="tooltip tooltip-top" data-tip="function logs">
                                        <SquareFunctionIcon
                                          size={13}
                                          onClick={(event) => handleToolPrimaryClick(event, tool)}
                                          className="opacity-50 hover:opacity-100 cursor-pointer"
                                        />
                                      </div>
                                    )}
                                    <div
                                      className="tooltip tooltip-top"
                                      data-tip={isRAGTool ? "knowledge base data" : "function data"}
                                    >
                                      <FileClockIcon
                                        data-testid={`thread-item-tool-data-${toolKey || i}`}
                                        id={`thread-item-tool-data-${toolKey || i}`}
                                        size={13}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setToolsData(tool);
                                          toolsDataModalRef.current?.showModal();
                                        }}
                                        className="opacity-50 hover:opacity-100 cursor-pointer"
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            });
                            const toolBox = isParallel ? (
                              /* Parallel: bordered box with absolute time badge top-right */
                              <div
                                key={stepIndex}
                                className="relative border border-base-300 rounded-xl px-3 py-2.5 bg-base-200 min-w-0"
                              >
                                {stepTime > 0 && (
                                  <span className="absolute -top-2 -right-2 z-0 text-xs px-2 py-0.5 rounded-full border border-base-content/20 text-base-content/50 bg-base-100 whitespace-nowrap flex items-center gap-1">
                                    <Clock3 size={10} /> {stepTime.toFixed(2)}s
                                  </span>
                                )}
                                <p className="text-xs font-semibold text-base-content/40 uppercase tracking-wide mb-2">
                                  Parallel Tools
                                </p>
                                <div className="flex flex-row flex-wrap gap-1.5">{toolChips}</div>
                              </div>
                            ) : (
                              /* Single: bordered box with time badge absolute top-right */
                              <div
                                key={stepIndex}
                                className="relative border border-base-300 rounded-xl px-3 py-2.5 bg-base-200 min-w-0"
                              >
                                {stepTime > 0 && (
                                  <span className="absolute -top-2 -right-2 z-0 text-xs px-2 py-0.5 rounded-full border border-base-content/20 text-base-content/50 bg-base-100 whitespace-nowrap flex items-center gap-1">
                                    <Clock3 size={10} /> {stepTime.toFixed(2)}s
                                  </span>
                                )}
                                <div className="flex flex-row flex-wrap gap-1.5">{toolChips}</div>
                              </div>
                            );

                            // Execution time for arrow between tools (stepIndex + 1 because index 0 is used for User Query arrow)
                            const arrowExecutionTime = executionTimeLogs[stepIndex + 1]?.time_taken;

                            return (
                              <React.Fragment key={stepIndex}>
                                {toolBox}
                                {/* Arrow between tools with execution time */}
                                {stepIndex < functionTimeLogsArr.length - 1 && (
                                  <div className="shrink-0 flex flex-row items-center justify-center gap-2 w-full">
                                    <ArrowDown size={20} className="text-base-content/50 shrink-0" />
                                    {arrowExecutionTime > 0 && (
                                      <span className="text-xs px-2.5 py-1 rounded-md bg-base-200 text-base-content border border-base-300 whitespace-nowrap font-medium flex items-center gap-1 shrink-0 w-20 justify-center">
                                        <Clock3 size={12} /> {arrowExecutionTime.toFixed(2)}s
                                      </span>
                                    )}
                                  </div>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </div>
                      {/* Show pre_tools separately if they exist and not in function_time_logs */}
                      {(() => {
                        const preToolsNotInLogs = allToolEntries.filter(
                          ([, tool]) =>
                            tool?.type === "pre_tool" &&
                            !functionTimeLogsArr.some((log) =>
                              (log.step || "")
                                .split(",")
                                .map((s) => s.trim())
                                .includes(tool?.name)
                            )
                        );
                        if (preToolsNotInLogs.length === 0) return null;
                        return (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {preToolsNotInLogs.map((entry, i) => renderToolChip(entry, i))}
                          </div>
                        );
                      })()}
                    </>
                  );
                }

                /* Fallback: no function_time_logs — show all tools in one group */
                const firstExecutionTime = executionTimeLogs[0]?.time_taken;

                return (
                  <>
                    <div className="flex flex-row items-center justify-center my-2 w-full max-w-xl gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-px h-4 bg-base-content/20" />
                        <ChevronDown size={12} className="text-base-content/30" />
                      </div>
                      {firstExecutionTime > 0 && (
                        <span className="text-xs px-2.5 py-1 rounded-md bg-base-200 text-base-content border border-base-300 whitespace-nowrap font-medium flex items-center gap-1">
                          <Clock3 size={12} /> {firstExecutionTime.toFixed(2)}s
                        </span>
                      )}
                    </div>
                    <div className="w-full max-w-xl border border-base-300 rounded-xl px-4 py-3 bg-base-200">
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-xs font-semibold text-base-content/40 uppercase tracking-wide">
                          Functions Executed
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {allToolEntries.map((entry, i) => renderToolChip(entry, i))}
                      </div>
                    </div>
                  </>
                );
              })()}

            {!item.error && (
              <div className="w-full relative flex items-end gap-3">
                {/* Left Column: Avatar */}
                <div className="shrink-0 mb-1">
                  <div
                    onClick={
                      hasMultipleMessageTypes
                        ? (e) => {
                            e.stopPropagation();
                            setIsDropupOpen(!isDropupOpen);
                          }
                        : null
                    }
                    className={`shrink-0  rounded-full border border-primary/50 p-1 flex items-center justify-center text-primary relative ${
                      hasMultipleMessageTypes ? "cursor-pointer select-none" : ""
                    }`}
                  >
                    <BotIcon size={16} />
                    {messageTypeDropdown}
                  </div>
                </div>

                {/* Right Column: Assistant Message */}
                <div className="flex-1 min-w-0 relative">
                  {firstAttemptErrorNotice}

                  <FinalResponseCard
                    attachments={renderAttachments(normalizeImageUrls(item?.llm_urls, "llm"))}
                    content={getMessageToDisplay()}
                    isHtml={isChatbotMessage() && containsHTML(getMessageToDisplay())}
                    hasToolCalls={hasAgentsOrTools}
                  />

                  <div
                    className={`transition-opacity duration-200 ${isAnyPanelOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                  >
                    {renderResponseActionButtons(false)}
                  </div>

                  {responseStatusBadges && (
                    <div className="mt-3 flex gap-1.5 items-center select-none">{responseStatusBadges}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── Multi-query chat bubble layout ── */
          <div>
            {/* User message — same dark bubble + U avatar for multi-query; buttons differ by mode */}
            <div className={`group relative ${hasAgentsOrTools ? "mb-2" : "mb-10"}`}>
              <div className="flex items-start justify-end gap-3">
                <div
                  className={`max-w-[75%] rounded-2xl rounded-br-none px-4 py-3 text-sm leading-relaxed break-words border ${
                    isDark
                      ? "bg-[#27272a] text-zinc-100 border-[#3f3f46]"
                      : "bg-[#f4f4f5] text-zinc-900 border-[#e4e4e7]"
                  }`}
                  style={{ wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "pre-line" }}
                >
                  {renderAttachments(normalizeImageUrls(item?.user_urls, "user"))}
                  <ReactMarkdown
                    components={{
                      code: ({ node, inline, className, children, ...props }) => (
                        <CodeBlock className={className} {...props}>
                          {children}
                        </CodeBlock>
                      ),
                    }}
                  >
                    {item.user}
                  </ReactMarkdown>
                </div>
                {/* Avatar */}
                <div className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold mt-0.5 bg-base-100 text-base-content/50">
                  <User size={20} />
                </div>
              </div>
              {isStatelessConversation ? (
                <div
                  className={`absolute right-12 top-[calc(100%+8px)] z-20 transition-opacity duration-200 ${isAnyPanelOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                >
                  {renderStatelessMultiQueryUserActions(true, false)}
                </div>
              ) : (
                <div
                  className={`absolute right-12 top-[calc(100%+8px)] z-20 transition-opacity duration-200 ${isAnyPanelOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                >
                  {renderStatefulMessageActionToolbar({ showTimestamp: true, pillsOnly: true })}
                </div>
              )}
            </div>

            {/* Render panels in relative flow if any panel is open */}
            {isAnyPanelOpen && (
              <div className="w-full mt-[2rem] mb-2">
                {isStatelessConversation
                  ? renderStatelessMultiQueryUserActions(false, true)
                  : renderStatefulMessageActionToolbar({ panelsOnly: true })}
              </div>
            )}

            {/* Agent execution trace (replaces old tools UI in stateful mode) */}
            {hasAgentsOrTools && (
              <div className="w-full px-2 mt-2 mb-2">
                <MessageExecutionTrace
                  item={item}
                  bridgeId={params?.id}
                  rootAgentName={rootAgentName}
                  formatDateAndTime={formatDateAndTime}
                  onToolLogsClick={handleToolPrimaryClick}
                  onToolDataClick={handleToolDataClick}
                  onAgentDataClick={handleToolDataClick}
                  onAgentHistoryClick={handleToolPrimaryClick}
                />
              </div>
            )}

            {/* Legacy tools section for stateful mode */}
            {!hasAgentsOrTools &&
              !isSingleQuery &&
              (item?.tools_call_data?.length > 0 || item?.function) &&
              (() => {
                // Get all tools from tools_call_data
                const allTools = item?.tools_call_data
                  ? item.tools_call_data.flatMap((toolObj) => Object.entries(toolObj || {}))
                  : [];

                // Filter based on mode
                const allToolEntries = allTools.filter(([, tool]) => {
                  // Filter out tools not available in integration data or bridges
                  if (!isToolAvailable(tool)) return false;

                  // In stateful mode: include ALL tools (including pre_tool)
                  if (!isSingleQuery) return true;
                  // In stateless mode: exclude pre_tool (it's shown separately)
                  return tool?.type !== "pre_tool";
                });
                // Handle function_time_logs as both object and array
                let functionTimeLogsArr = [];
                if (Array.isArray(item?.latency?.function_time_logs)) {
                  functionTimeLogsArr = item.latency.function_time_logs;
                } else if (item?.latency?.function_time_logs && typeof item.latency.function_time_logs === "object") {
                  // If it's an object, convert to array
                  functionTimeLogsArr = Object.values(item.latency.function_time_logs);
                }

                const renderToolChip = ([toolKey, tool], chipIndex) => {
                  const isPreTool = tool?.type === "pre_tool";
                  const isRAGTool = tool?.data?.metadata?.type === "RAG";
                  const toolLabel = isPreTool ? `Pre Tool: ${getToolNameHelper(tool)}` : getToolNameHelper(tool);

                  return (
                    <div
                      key={toolKey || chipIndex}
                      data-testid={`thread-item-tool-${toolKey || chipIndex}`}
                      id={`thread-item-tool-${toolKey || chipIndex}`}
                      onClick={(event) => !isRAGTool && handleToolPrimaryClick(event, tool)}
                      className={`flex items-center gap-1.5 border rounded-lg px-3 py-1.5 transition-colors text-sm ${
                        isRAGTool
                          ? "bg-info/10 border-info/30 hover:bg-info/20 cursor-default"
                          : isPreTool
                            ? "bg-warning/10 border-warning/30 hover:bg-warning/20 cursor-pointer"
                            : "bg-base-100 border-base-300 hover:bg-base-300 cursor-pointer"
                      }`}
                    >
                      {isRAGTool && <BookOpen size={14} className="text-info mr-1" title="Knowledge Base" />}
                      <span
                        className={`font-medium truncate max-w-[120px] ${isRAGTool ? "text-info" : ""}`}
                        title={toolLabel}
                      >
                        {truncate(isRAGTool ? "Knowledge Base" : toolLabel, 20)}
                      </span>
                      <div className="flex items-center gap-1 ml-0.5">
                        {!isRAGTool && (
                          <div className="tooltip tooltip-top" data-tip="function logs">
                            <SquareFunctionIcon
                              size={14}
                              onClick={(event) => handleToolPrimaryClick(event, tool)}
                              className="opacity-50 hover:opacity-100 cursor-pointer"
                            />
                          </div>
                        )}
                        <div
                          className="tooltip tooltip-top"
                          data-tip={isRAGTool ? "knowledge base data" : "function data"}
                        >
                          <FileClockIcon
                            data-testid={`thread-item-tool-data-${toolKey || chipIndex}`}
                            id={`thread-item-tool-data-${toolKey || chipIndex}`}
                            size={14}
                            onClick={(e) => {
                              e.stopPropagation();
                              setToolsData(tool);
                              toolsDataModalRef.current?.showModal();
                            }}
                            className="opacity-50 hover:opacity-100 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  );
                };

                if (!item?.tools_call_data) return null;
                // Show tools section if there are tools to display or if there's a function
                if (allToolEntries.length === 0 && !item?.function) return null;

                if (functionTimeLogsArr.length > 0) {
                  return (
                    <div className="mb-4 flex flex-col items-center justify-center w-full gap-2">
                      <h3 className="text-sm font-medium text-base-content/70">Functions Executed</h3>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {allToolEntries.map((entry, i) => renderToolChip(entry, i))}
                      </div>
                    </div>
                  );
                }

                /* Fallback: no function_time_logs — show all tools in one group */
                return (
                  <div className="mb-4 flex flex-col items-center justify-center w-full gap-2">
                    <h3 className="text-sm font-medium text-base-content/70">Functions Executed</h3>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {allToolEntries.map((entry, i) => renderToolChip(entry, i))}
                    </div>
                  </div>
                );
              })()}

            {/* 2a. Pre-tools (executed before LLM call) - only show in stateless mode */}
            {isSingleQuery && preTools.length > 0 && (
              <div className="-mt-2 mb-4 flex flex-wrap gap-2 justify-end items-center pr-12">
                {preTools.map((tool, index) => (
                  <button
                    type="button"
                    data-testid={`thread-item-pre-tool-${tool?.id || tool?.name || index}`}
                    id={`thread-item-pre-tool-${tool?.id || tool?.name || index}`}
                    key={`pre-${tool?.id || tool?.name || index}`}
                    onClick={(event) => handleToolPrimaryClick(event, tool)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setToolsData(tool);
                      toolsDataModalRef.current?.showModal();
                    }}
                    title={`Pre-tool: ${getToolNameHelper(tool)} (right-click for data)`}
                    className="inline-flex items-center gap-2 rounded-lg border border-base-content/15 bg-base-100 px-3 py-1.5 text-xs font-medium text-base-content shadow-sm transition-all duration-200 hover:border-base-content/30 hover:bg-base-200 hover:shadow-md hover:-translate-y-0.5 active:scale-95"
                  >
                    <SquareFunctionIcon size={13} className="shrink-0 opacity-80" />
                    <span className="truncate max-w-[160px]">Pre: {getToolNameHelper(tool)}</span>
                    <ChevronRight size={11} className="shrink-0 opacity-70" />
                  </button>
                ))}
              </div>
            )}

            {/* 2b. Post-tools chips shown above the assistant bubble (only for post_tool type) - only show in stateless mode */}
            {isSingleQuery && postTools.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2 justify-start items-center pl-12">
                {postTools.map((tool, index) => (
                  <button
                    type="button"
                    data-testid={`thread-item-post-tool-${tool?.id || tool?.name || index}`}
                    id={`thread-item-post-tool-${tool?.id || tool?.name || index}`}
                    key={`post-${tool?.id || tool?.name || index}`}
                    onClick={(event) => handleToolPrimaryClick(event, tool)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setToolsData(tool);
                      toolsDataModalRef.current?.showModal();
                    }}
                    title={`Post-tool: ${getToolNameHelper(tool)} (right-click for data)`}
                    className="inline-flex items-center gap-2 rounded-lg border border-base-content/15 bg-base-100 px-3 py-1.5 text-xs font-medium text-base-content shadow-sm transition-all duration-200 hover:border-base-content/30 hover:bg-base-200 hover:shadow-md hover:-translate-y-0.5 active:scale-95"
                  >
                    <SquareFunctionIcon size={13} className="shrink-0 opacity-80" />
                    <span className="truncate max-w-[160px]">Post Tool: {getToolNameHelper(tool)}</span>
                    <ChevronRight size={11} className="shrink-0 opacity-70" />
                  </button>
                ))}
              </div>
            )}

            {/* Other tools (pre_function, post_function, etc.) rendered using renderToolData */}

            {/* 3. Third: Render Assistant Message if exists */}
            {!item.error && (
              <div className="w-full relative flex items-start gap-3 group">
                {/* Left Column: Avatar */}
                <div className="shrink-0 mb-2 self-end">
                  <div
                    onClick={
                      hasMultipleMessageTypes
                        ? (e) => {
                            e.stopPropagation();
                            setIsDropupOpen(!isDropupOpen);
                          }
                        : null
                    }
                    className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center border border-base-content/20 bottom-[26px] relative ${
                      hasMultipleMessageTypes ? "cursor-pointer select-none" : ""
                    }`}
                  >
                    <BotIcon size={16} />
                    {messageTypeDropdown}
                  </div>
                </div>

                {/* Right Column: Assistant Message */}
                <div className="flex-1 min-w-0 relative">
                  {firstAttemptErrorNotice}
                  {preFunctionEntry && (
                    <button
                      type="button"
                      id="thread-item-pre-function-logs-button"
                      data-testid="thread-item-pre-function-logs-button"
                      onClick={handlePreFunctionClick}
                      className="absolute -top-3 left-3 z-20 inline-flex max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-full border border-base-content/30 ring-1 ring-base-content/10 bg-base-100 px-3 py-1 text-xs font-medium shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-base-content/50 hover:ring-base-content/20 hover:bg-base-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-base-content/35"
                      title="Open pre-function logs"
                      aria-label="Open pre-function logs"
                    >
                      <SquareFunctionIcon size={14} className="shrink-0 opacity-80" />
                      <span className="block truncate">Pre-Function Logs: {preFunctionStripText}</span>
                      <ChevronRight size={12} className="shrink-0 opacity-70" />
                    </button>
                  )}
                  {responseStatusBadges && (
                    <div className="flex gap-1.5 items-center select-none">{responseStatusBadges}</div>
                  )}
                  <FinalResponseCard
                    attachments={renderAttachments(normalizeImageUrls(item?.llm_urls, "llm"))}
                    content={getMessageToDisplay()}
                    isHtml={isChatbotMessage() && containsHTML(getMessageToDisplay())}
                    hasToolCalls={hasAgentsOrTools}
                  />

                  {/* Action buttons and badges below FinalResponseCard */}
                  <div className="flex flex-wrap items-center mb-2 gap-2 z-20">
                    {!isSingleQuery && (
                      <div
                        className={`flex items-center gap-2 transition-opacity duration-200 ${isAnyPanelOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                      >
                        {renderResponseActionButtons(!isStatelessConversation)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error message display */}
        {item?.error &&
          (isSingleQuery ? (
            /* Single-query (stateless) — match the AI Response card style */
            <div className="flex flex-col items-center py-2 w-full">
              {firstAttemptErrorNotice}
              {/* Error card — mirrors the AI Response card */}
              <div className="w-full relative">
                <span className="absolute -top-2 right-2 z-10 text-xs px-2 py-0.5 rounded-full border border-error/30 text-error/70 bg-base-100 whitespace-nowrap flex items-center gap-1">
                  <CircleAlertIcon className="w-3 h-3" />
                  Error
                </span>
                <div
                  className="bg-error/10 border border-error/20 rounded-xl px-4 py-3 text-sm text-error relative"
                  style={{ wordBreak: "break-word" }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`grid h-6 w-6 place-items-center rounded-md font-bold text-[10px] shrink-0 ${HUE_THEME["trace-gold"].avatar}`}
                    >
                      <BotIcon className="w-[17px] h-[17px]" />
                    </span>
                    <span className="truncate text-sm font-semibold text-error">{rootAgentName}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{extractErrorMessage(item?.error)}</p>
                </div>
              </div>
            </div>
          ) : (
            /* Multi-query (stateful) — match stateless error card style */
            <div className="w-full relative py-2">
              {firstAttemptErrorNotice}
              <span className="absolute -top-2 right-2 z-10 text-xs px-2 py-0.5 rounded-full border border-error/30 text-error/70 bg-base-100 whitespace-nowrap flex items-center gap-1">
                <CircleAlertIcon className="w-3 h-3" />
                Error
              </span>
              <div
                className="bg-error/10 border border-error/20 rounded-xl px-4 py-3 text-sm text-error relative"
                style={{ wordBreak: "break-word" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`grid h-6 w-6 place-items-center rounded-md font-bold text-[10px] shrink-0 ${HUE_THEME["trace-gold"].avatar}`}
                  >
                    <BotIcon className="w-[17px] h-[17px]" />
                  </span>
                  <span className="truncate text-sm font-semibold text-error">{rootAgentName}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{extractErrorMessage(item?.error)}</p>
              </div>
            </div>
          ))}
      </div>

      <ToolsDataModal
        toolsData={toolsData}
        handleClose={handleCloseToolsDataModal}
        toolsDataModalRef={toolsDataModalRef}
        integrationData={integrationData}
      />

      {/* Generic Slider for Knowledge Base Documents */}
      <GenericSlider
        isOpen={sliderState.isOpen}
        onClose={closeSlider}
        title={sliderState.title}
        url={sliderState.url}
        addSourceParam={false}
      />
    </div>
  );
};

export default ThreadItem;
