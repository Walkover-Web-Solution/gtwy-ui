import {
  CircleAlertIcon,
  BotIcon,
  FileClockIcon,
  PencilIcon,
  AddIcon,
  SquareFunctionIcon,
  UserIcon,
  CodeMessageIcon,
  BotMessageIcon,
  FileTextIcon,
} from "@/components/Icons";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { truncate } from "./AssistFile";
import ToolsDataModal from "./ToolsDataModal";
import { useCustomSelector } from "@/customHooks/customSelector";
import { formatRelativeTime, getIconOfService, getToolName, openModal } from "@/utils/utility";
import { BATCH_PROCESSING_STATUSES, MODAL_TYPE } from "@/utils/enums";
import { PdfIcon } from "@/icons/pdfIcon";
import {
  AlertTriangle,
  Braces,
  CheckCircle2,
  ChevronDown,
  Clock3,
  ExternalLink,
  RotateCcw,
  ChevronRight,
  BookOpen,
  ArrowDown,
} from "lucide-react";
import { rerunApi } from "@/config/modelApi";
import { toast } from "react-toastify";
import { GenericSlider, useSlider } from "@/utils/sliderUtility";
import CodeBlock from "../codeBlock/CodeBlock";

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

// Enhanced image component with loading states
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

  const [isUserQueryExpanded, setIsUserQueryExpanded] = useState(false);
  const [isAiResponseExpanded, setIsAiResponseExpanded] = useState(false);
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
  const handleVisualizeClick = () => {
    if (!params?.org_id || !params?.id) return;
    const searchParams = new URLSearchParams();
    if (item?.message_id) searchParams.set("message_id", item.message_id);
    if (item?.thread_id) searchParams.set("thread_id", item.thread_id);
    if (item?.sub_thread_id || item?.thread_id) {
      searchParams.set("subThread_id", item?.sub_thread_id || item?.thread_id);
    }
    router.push(`/org/${params.org_id}/agents/history/${params.id}/visualize?${searchParams.toString()}`);
  };

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

  // Check if this is the last message of the same role (assistant, user, or tools_call)
  const isLastMessage = () => {
    const currentRole = getMessageRole();
    if (!currentRole || currentRole === "unknown") return false;

    // For simplicity, just return true for now since role detection is now dynamic
    return true;
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
    [integrationData, allBridgesMap, orgBridges]
  );

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
      if (dropupRef.current && !dropupRef.current.contains(event.target) && !event.target.closest(".bot-icon")) {
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
      if (tool?.data?.metadata?.type === "agent") {
        const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || "";
        const orgId = params?.org_id;
        const agentId = tool?.data?.metadata?.agent_id;
        const messageId = tool?.data?.metadata?.message_id;

        // 1) Find this bridge/agent in the org list
        const bridgeFromOrg = orgBridges.find((b) => b?._id === agentId);
        // 2) Also look it up in allBridgesMap
        // 3) Resolve published_version_id
        const publishedVersionId = bridgeFromOrg?.published_version_id;

        // If the agent bridge does not exist in org data, do not navigate
        if (!bridgeFromOrg) {
          console.warn("Agent bridge not found for org", { orgId, agentId });
          return;
        }
        const threadId = tool?.data?.metadata?.thread_id;
        const subThreadId = tool?.data?.metadata?.sub_thread_id || tool?.data?.metadata?.thread_id;
        if (baseUrl && orgId && agentId) {
          const searchParams = new URLSearchParams();
          if (publishedVersionId) searchParams.set("version", publishedVersionId);
          if (messageId) searchParams.set("message_id", messageId);
          if (threadId) searchParams.set("thread_id", threadId);
          if (subThreadId) searchParams.set("sub_thread_id", subThreadId);
          const url = `${baseUrl}/org/${orgId}/agents/history/${agentId}?${searchParams.toString()}`;
          if (isEmbedUser) {
            router.push(`/org/${orgId}/agents/history/${agentId}?${searchParams.toString()}`);
            return;
          }

          if (typeof window !== "undefined") {
            window.open(url, "_blank", "noopener,noreferrer");
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
    [knowledgeBaseData, openSlider, embedToken, params?.id, params?.org_id, orgBridges, allBridgesMap]
  );

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
            window.Chatbot.askAi({ message: debugQuery });
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
            {item.firstAttemptError?.substring(0, 200)}
            {item.firstAttemptError?.length > 200 ? "..." : ""}
          </span>
          <ChevronDown className="w-3.5 h-3.5 shrink-0 transition-transform group-open/fae:rotate-180" />
        </summary>
        <div className="px-3 pb-2 pt-0 text-xs">
          <p className="whitespace-pre-wrap break-words text-error">{item.firstAttemptError}</p>
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
      className="text-sm overflow-x-hidden"
    >
      {/* Sticky header */}
      {isSingleQuery && (
        <div className="flex sticky top-0 z-20 bg-base-100 px-4 py-1 mb-3 items-center justify-between gap-2 border-b border-base-300">
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
              <span className="text-xs text-base-content/40 flex items-center gap-1 shrink-0">
                <span className="text-base-content/20">·</span>
                <span>Tokens:</span>
                <span className="font-medium text-base-content/60">{item.tokens.input_tokens ?? 0} input</span>
                <span className="text-base-content/20">/</span>
                <span className="font-medium text-base-content/60">{item.tokens.output_tokens ?? 0} output</span>
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
          <div className="flex items-center gap-0.5 bg-base-200 rounded-lg p-1 shrink-0">
            <button
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
              onClick={() => handleUserButtonClick("variables")}
            >
              <Braces className="h-3 w-3" />
              <span>Variables</span>
            </button>
          </div>
        </div>
      )}

      {/* Pre Tool Banner - Above System Prompt */}
      {isSingleQuery &&
        item?.tools_call_data?.length > 0 &&
        (() => {
          // Find the pre_tool from tools_call_data
          const preFunction = item.tools_call_data
            .flatMap((tools) => Object.values(tools || {}))
            .find((tool) => tool?.type === "pre_tool");

          if (!preFunction) return null;
          return (
            <div className="mb-2 px-4">
              <div className="inline-flex items-center gap-2 bg-base-200/30 border border-base-300 rounded-xl px-4 py-2">
                <span className="text-xs font-medium text-base-content/70 shrink-0">Pre Function:</span>
                <div
                  onClick={(e) => handleToolPrimaryClick(e, preFunction)}
                  className="inline-flex items-center gap-2 bg-base-200 border border-base-300 rounded-md px-4 py-2 text-xs cursor-pointer hover:bg-base-300 transition-colors"
                >
                  <span className="font-medium truncate max-w-[120px]" title={getToolNameHelper(preFunction)}>
                    {truncate(getToolNameHelper(preFunction), 20)}
                  </span>
                  <div className="flex gap-1.5">
                    <div className="tooltip tooltip-top" data-tip="function logs">
                      <SquareFunctionIcon
                        size={14}
                        onClick={(e) => handleToolPrimaryClick(e, preFunction)}
                        className="opacity-80 cursor-pointer"
                      />
                    </div>
                    <div className="tooltip tooltip-top" data-tip="function data">
                      <FileClockIcon
                        size={14}
                        onClick={(e) => {
                          e.stopPropagation();
                          setToolsData(preFunction);
                          toolsDataModalRef.current?.showModal();
                        }}
                        className="opacity-80 bg-inherit cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      {/* System Prompt Banner - Below Header */}
      {isSingleQuery && item?.prompt && (
        <div className="mb-3 px-4">
          <div className="bg-base-200 border border-base-300 rounded-lg hover:border-base-content/20 hover:shadow-sm">
            <div
              className="px-3 py-2 flex items-center justify-between gap-2 cursor-pointer hover:bg-base-200/80 rounded-lg"
              onClick={() => setIsSystemPromptExpanded(!isSystemPromptExpanded)}
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
                className={`text-base-content/60 shrink-0 transition-transform duration-0 ${isSystemPromptExpanded ? "rotate-180" : ""}`}
              />
            </div>
            <div
              className={`overflow-hidden transition-[max-height] duration-200 ease-in-out ${
                isSystemPromptExpanded ? "max-h-[500px]" : "max-h-0"
              }`}
            >
              <div className="px-3 pb-3 pt-2 border-t border-base-300">
                <div className="text-xs text-base-content whitespace-pre-wrap max-h-64 overflow-y-auto bg-base-100 rounded p-2.5 border border-base-300 leading-relaxed">
                  {renderHighlightedSystemPrompt(item.prompt)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={isSingleQuery ? "" : "show-on-hover"}>
        {isSingleQuery ? (
          /* ── Single-query vertical flow ── */
          <div className="flex flex-col items-center py-2">
            {/* User Query card */}
            <div className="w-full bg-primary rounded-xl px-4 py-3 text-base-200" style={{ wordBreak: "break-word" }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-base-300 flex items-center justify-center shrink-0">
                  <UserIcon size={13} className="text-base-content" />
                </div>
                <span className="text-xs font-semibold text-base-200 uppercase tracking-wide">User Query</span>
              </div>
              {renderAttachments(normalizeImageUrls(item?.user_urls, "user"))}
              <div className={!isUserQueryExpanded ? "line-clamp-5 overflow-hidden" : "whitespace-pre-line"}>
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
              {item.user?.split("\n").length > 7 || item.user?.length > 400 ? (
                <button
                  className="mt-1 text-xs text-base-200/70 hover:text-base-200 flex items-center gap-1"
                  onClick={() => setIsUserQueryExpanded(!isUserQueryExpanded)}
                >
                  <ChevronDown
                    size={12}
                    className={`transition-transform duration-150 ${isUserQueryExpanded ? "rotate-180" : ""}`}
                  />
                  {isUserQueryExpanded ? "Show less" : "Show more"}
                </button>
              ) : null}
            </div>

            {/* Tools — sequential steps from function_time_logs, parallel within each step */}
            {(item?.tools_call_data?.length > 0 || item?.function) &&
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

            {/* Arrow connector to AI response with final execution time */}
            {!item.error &&
              (() => {
                // Model execution time goes on arrow from Tools to AI Response
                const modelExecutionTime = parseFloat(item?.latency?.model_execution_time) || 0;

                return (
                  <div className="flex flex-row items-center justify-center my-2 w-full max-w-xl gap-3">
                    <ArrowDown size={20} className="text-base-content/50" />
                    {modelExecutionTime > 0 && (
                      <span className="text-xs px-2.5 py-1 rounded-md bg-base-200 text-base-content border border-base-300 whitespace-nowrap font-medium flex items-center gap-1 w-20 justify-center">
                        <Clock3 size={12} /> {modelExecutionTime.toFixed(2)}s
                      </span>
                    )}
                  </div>
                );
              })()}

            {!item.error && (
              <div className="w-full relative">
                {/* Total time badge — top right outside card */}
                {firstAttemptErrorNotice}
                <span className="absolute -top-2 right-2 z-10 text-xs px-2 py-0.5 rounded-full border border-base-content/20 text-base-content/50 bg-base-100 whitespace-nowrap flex items-center gap-1">
                  <Clock3 size={10} /> {(parseFloat(item?.latency?.over_all_time) || 0).toFixed(2)}s total
                </span>

                <div
                  className="bg-base-200 rounded-xl px-4 py-3 text-sm text-base-content relative group"
                  style={{ wordBreak: "break-word" }}
                >
                  {/* Header row */}
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-6 h-6 rounded-full bg-base-300 flex items-center justify-center cursor-pointer relative shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsDropupOpen(!isDropupOpen);
                      }}
                    >
                      <BotIcon
                        data-testid="thread-item-bot-icon"
                        id="thread-item-bot-icon"
                        size={13}
                        className="text-base-content"
                      />
                      {isDropupOpen && (
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
                      )}
                    </div>
                    <span className="text-xs font-semibold text-base-content/40 uppercase tracking-wide">
                      AI Response
                    </span>
                    {messageType === "updated_llm_message" && (
                      <span className="badge badge-xs badge-outline">Edited</span>
                    )}
                    {isBatchResponse && (
                      <span className={`badge badge-xs gap-1 text-white ${batchStatusMeta.className}`}>
                        <BatchStatusIcon size={10} />
                        {batchStatusMeta.label}
                      </span>
                    )}
                  </div>
                  {renderAttachments(normalizeImageUrls(item?.llm_urls, "llm"))}
                  <div className={!isAiResponseExpanded ? "line-clamp-5 overflow-hidden" : "whitespace-pre-line"}>
                    {isChatbotMessage() && containsHTML(getMessageToDisplay()) ? (
                      <div dangerouslySetInnerHTML={{ __html: getMessageToDisplay() }} />
                    ) : (
                      <ReactMarkdown
                        components={{
                          code: ({ node, inline, className, children, ...props }) => (
                            <CodeBlock className={className} {...props}>
                              {children}
                            </CodeBlock>
                          ),
                        }}
                      >
                        {getMessageToDisplay()}
                      </ReactMarkdown>
                    )}
                  </div>
                  {(() => {
                    const msg = getMessageToDisplay();
                    return msg?.split("\n").length > 7 || msg?.length > 400;
                  })() && (
                    <button
                      className="mt-1 text-xs text-primary/70 hover:text-primary flex items-center gap-1"
                      onClick={() => setIsAiResponseExpanded(!isAiResponseExpanded)}
                    >
                      <ChevronDown
                        size={12}
                        className={`transition-transform duration-150 ${isAiResponseExpanded ? "rotate-180" : ""}`}
                      />
                      {isAiResponseExpanded ? "Show less" : "Show more"}
                    </button>
                  )}
                  {!item?.llm_urls?.length && !item?.fromRTLayer && (
                    <div
                      className="tooltip absolute"
                      style={{ top: "-0.5rem", right: "7.5rem" }}
                      data-tip="Edit message"
                    >
                      <button
                        id="thread-item-edit-message-button"
                        className="btn btn-xs btn-circle btn-ghost opacity-0 group-hover:opacity-100"
                        onClick={handleEdit}
                      >
                        <PencilIcon size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── Multi-query chat bubble layout ── */
          <div>
            {/* User message */}
            <div className="chat group chat-end mb-4">
              <div className="chat-image avatar flex justify-center items-center">
                <div className="p-2 rounded-full bg-base-300 flex justify-center items-center hover:bg-base-300/80 transition-colors">
                  <div className="relative rounded-full bg-base-300 flex justify-center items-center">
                    <UserIcon size={20} className="text-base-content" />
                  </div>
                </div>
              </div>
              <div
                className="flex justify-start flex-row-reverse items-center gap-1"
                style={{ width: "-webkit-fill-available" }}
              >
                <div
                  className="chat-bubble-primary chat-bubble transition-all ease-in-out duration-300 relative group break-words"
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
              </div>
              <div className="flex flex-row-reverse gap-2 m-1 items-center justify-between">
                <time className="text-xs opacity-50 chat-end relative w-[140px] inline-block text-right">
                  <span className="group-hover:hidden">{formatRelativeTime(item.created_at)}</span>
                  <span className="hidden group-hover:inline absolute right-0 top-0">
                    {formatDateAndTime(item.created_at)}
                  </span>
                </time>
                <div className="flex gap-1 opacity-70 hover:opacity-100 transition-opacity see-on-hover">
                  <button
                    className={`btn text-xs font-normal btn-sm hover:btn-primary ${isLastMessage() ? "" : "see-on-hover"}`}
                    onClick={handleVisualizeClick}
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>Visualize</span>
                  </button>
                  <button
                    data-testid="thread-item-user-aiconfig-button"
                    id="thread-item-user-aiconfig-button"
                    className={`btn text-xs font-normal btn-sm hover:btn-primary ${isLastMessage() ? "" : "see-on-hover"}`}
                    onClick={() => handleUserButtonClick("AiConfig")}
                  >
                    <SquareFunctionIcon className="h-3 w-3" />
                    <span>AI Config</span>
                  </button>
                  <button
                    data-testid="thread-item-user-variables-button"
                    id="thread-item-user-variables-button"
                    className={`btn text-xs font-normal btn-sm hover:btn-primary ${isLastMessage() ? "" : "see-on-hover"}`}
                    onClick={() => handleUserButtonClick("variables")}
                  >
                    <Braces className="h-3 w-3" />
                    <span>Variables</span>
                  </button>
                  <button
                    data-testid="thread-item-user-system-prompt-button"
                    id="thread-item-user-system-prompt-button"
                    className={`btn text-xs font-normal btn-sm hover:btn-primary ${isLastMessage() ? "" : "see-on-hover"}`}
                    onClick={() => handleUserButtonClick("system Prompt")}
                  >
                    <FileClockIcon className="h-3 w-3" />
                    <span>System Prompt</span>
                  </button>
                  <button
                    data-testid="thread-item-user-more-button"
                    id="thread-item-user-more-button"
                    className={`btn text-xs font-normal btn-sm hover:btn-primary ${isLastMessage() ? "" : "see-on-hover"}`}
                    onClick={() => handleUserButtonClick("more")}
                  >
                    <AddIcon className="h-3 w-3" />
                    <span>More...</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Tools section for stateful mode */}
            {!isSingleQuery &&
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
            {!item.error && firstAttemptErrorNotice}
            {!item.error && (
              <div className="chat group chat-start">
                <div className="chat-image avatar flex justify-center items-center">
                  <div className="p-2 rounded-full bg-base-300 flex justify-center items-center hover:bg-base-300/80 transition-colors mb-7">
                    <div className="relative rounded-full bg-base-300 flex justify-center items-center">
                      <BotIcon
                        data-testid="thread-item-bot-icon"
                        id="thread-item-bot-icon"
                        className="cursor-pointer bot-icon text-base-content"
                        size={20}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsDropupOpen(!isDropupOpen);
                        }}
                      />
                      {isDropupOpen && (
                        <div
                          ref={dropupRef}
                          className="absolute bg-base-100 border border-base-300 rounded-lg shadow-lg min-w-[140px] p-1"
                          style={{ zIndex: 9999, top: "-130px", left: "-50px" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <p className="text-xs font-medium text-base-content/50 px-2 pt-1 pb-1">View as</p>
                          <ul className="flex flex-col gap-0.5">
                            {item.chatbot_message && (
                              <li>
                                <button
                                  data-testid="thread-item-select-chatbot-message"
                                  id="thread-item-select-chatbot-message"
                                  className={`px-2 py-1 rounded-md ${
                                    messageType === "chatbot_message" || messageType === 0
                                      ? "bg-primary text-white"
                                      : "hover:bg-base-200"
                                  }`}
                                  onClick={() => selectMessageType("chatbot_message")}
                                >
                                  <div className="tooltip tooltip-right" data-tip="Chatbot Response">
                                    <BotIcon
                                      className={`${messageType !== "chatbot_message" && messageType !== 0 ? "text-base-content" : "text-white"}`}
                                      size={16}
                                    />
                                  </div>
                                </button>
                              </li>
                            )}
                            {item.llm_message && (
                              <li>
                                <button
                                  data-testid="thread-item-select-llm-message"
                                  id="thread-item-select-llm-message"
                                  className={`px-2 py-1 rounded-md ${
                                    messageType === "llm_message" || messageType === 1
                                      ? "bg-primary text-white"
                                      : "hover:bg-base-200"
                                  }`}
                                  onClick={() => selectMessageType("llm_message")}
                                >
                                  <div className="tooltip tooltip-right" data-tip="LLM Response">
                                    <CodeMessageIcon
                                      className={`${messageType !== "llm_message" && messageType !== 1 ? "text-base-content" : "text-white"}`}
                                      size={16}
                                    />
                                  </div>
                                </button>
                              </li>
                            )}
                            {item.updated_llm_message && (
                              <li>
                                <button
                                  data-testid="thread-item-select-updated-message"
                                  id="thread-item-select-updated-message"
                                  className={`px-2 py-1 rounded-md ${
                                    messageType === "updated_llm_message" || messageType === 2
                                      ? "bg-primary text-white"
                                      : "hover:bg-base-200"
                                  }`}
                                  onClick={() => selectMessageType("updated_llm_message")}
                                >
                                  <div className="tooltip tooltip-right" data-tip="Updated Message">
                                    <PencilIcon
                                      className={`${messageType !== "updated_llm_message" && messageType !== 2 ? "text-base-content" : "text-white"}`}
                                      size={16}
                                    />
                                  </div>
                                </button>
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="chat-header flex gap-4 items-center mb-1">
                  {messageType === "updated_llm_message" && (
                    <p className="text-xs opacity-50 badge badge-sm badge-outline">Edited</p>
                  )}
                  {isBatchResponse && (
                    <span className={`badge badge-sm gap-1 text-white ${batchStatusMeta.className}`}>
                      <BatchStatusIcon size={12} />
                      Batch: {batchStatusMeta.label}
                    </span>
                  )}
                </div>
                <div
                  className="flex justify-start items-center gap-1 show-on-hover"
                  style={{ width: "-webkit-fill-available" }}
                >
                  <div
                    className={`bg-base-200 text-base-content pr-10 chat-bubble transition-all ease-in-out duration-300 relative group break-words overflow-visible border border-base-300 ${
                      preFunctionEntry ? "min-w-[16rem]" : ""
                    }`}
                    style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
                  >
                    {preFunctionEntry && (
                      <button
                        type="button"
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

                    {/* Assistant attachments */}
                    {renderAttachments(normalizeImageUrls(item?.llm_urls, "llm"))}

                    {/* Message content */}
                    {isChatbotMessage() && containsHTML(getMessageToDisplay()) ? (
                      <div dangerouslySetInnerHTML={{ __html: getMessageToDisplay() }} />
                    ) : (
                      <ReactMarkdown
                        components={{
                          code: ({ node, inline, className, children, ...props }) => (
                            <CodeBlock className={className} {...props}>
                              {children}
                            </CodeBlock>
                          ),
                        }}
                      >
                        {getMessageToDisplay()}
                      </ReactMarkdown>
                    )}

                    {/* Edit button for assistant messages */}
                    {!item?.llm_urls?.length && !item?.fromRTLayer && (
                      <div
                        className={`absolute top-2 right-2 flex items-center gap-1 transition-opacity ${isLastMessage() ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                      >
                        <div className="tooltip" data-tip="Edit message">
                          <button
                            id="thread-item-edit-message-button"
                            className="btn btn-sm btn-circle btn-ghost hover:btn-primary text-base-content"
                            onClick={handleEdit}
                          >
                            <PencilIcon size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {/* Action buttons below AI response — visible on hover */}
                {!item.error && (
                  <div className="chat-footer opacity-0 group-hover:opacity-100 transition-opacity mt-1 flex items-center gap-1">
                    <button
                      id="thread-item-add-test-case-button"
                      className="btn text-xs font-normal btn-sm hover:btn-primary"
                      onClick={() => handleAddTestCase(item, index)}
                      title="Add Test Case"
                    >
                      <AddIcon className="h-3 w-3" />
                      <span>Test Case</span>
                    </button>
                    <button
                      id="thread-item-debug-agent-button"
                      className="btn text-xs font-normal btn-sm hover:btn-primary"
                      onClick={() => handleAskAi(item)}
                      title="Debug Agent"
                    >
                      <BotMessageIcon className="h-3 w-3" />
                      <span>Debug Agent</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Error message display */}
        {item?.error &&
          (isSingleQuery ? (
            /* Single-query (stateless) — match the AI Response card style */
            <div className="flex flex-col items-center py-2 w-full">
              {/* Arrow connector — same as the non-error path */}
              <div className="flex flex-row items-center justify-center my-2 w-full max-w-xl gap-3">
                <ArrowDown size={20} className="text-base-content/50" />
              </div>
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
                    <div className="w-6 h-6 rounded-full bg-error/20 flex items-center justify-center shrink-0">
                      <BotIcon size={13} className="text-error" />
                    </div>
                    <span className="text-xs font-semibold text-error/70 uppercase tracking-wide">AI Response</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{item?.error}</p>
                </div>
              </div>
            </div>
          ) : (
            /* Multi-query (stateful) — keep the original chat-bubble style */
            <div className="chat chat-start break-all break-words">
              <div>
                <div className="flex flex-row-reverse items-end justify-end gap-1">
                  <div className="bg-error/10 text-error border border-error/20 pr-10 chat-bubble transition-all ease-in-out duration-300">
                    {firstAttemptErrorNotice}
                    <div className="flex items-center gap-2 mb-2">
                      <CircleAlertIcon className="w-4 h-4" />
                      <span className="font-bold">Error</span>
                    </div>
                    <p className="text-sm">{item?.error}</p>
                  </div>
                  <div className="p-2 rounded-full bg-error/20 flex justify-center items-center">
                    <BotIcon className="text-base-content" size={18} />
                  </div>
                </div>
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
