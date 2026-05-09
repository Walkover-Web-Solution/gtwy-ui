import {
  CircleAlertIcon,
  BotIcon,
  FileClockIcon,
  ParenthesesIcon,
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
import { mdComponentsDark, mdRemarkPlugins, mdProseClass } from "@/utils/markdownComponents";
import { truncate } from "./AssistFile";
import ToolsDataModal from "./ToolsDataModal";
import { useCustomSelector } from "@/customHooks/customSelector";
import { formatRelativeTime, getToolName, openModal } from "@/utils/utility";
import { BATCH_PROCESSING_STATUSES, MODAL_TYPE } from "@/utils/enums";
import { PdfIcon } from "@/icons/pdfIcon";
import { AlertTriangle, CheckCircle2, Clock3, ExternalLink, ChevronRight } from "lucide-react";
import { GenericSlider, useSlider } from "@/utils/sliderUtility";

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
  const { embedToken, knowledgeBaseData, isEmbedUser, orgBridges, allBridgesMap } = useCustomSelector((state) => ({
    embedToken: state?.bridgeReducer?.org?.[params?.org_id]?.embed_token,
    knowledgeBaseData: state?.knowledgeBaseReducer?.knowledgeBaseData?.[params?.org_id] || [],
    isEmbedUser: state?.appInfoReducer?.embedUserDetails?.isEmbedUser,
    orgBridges: state?.bridgeReducer?.org?.[params?.org_id]?.orgs || [],
    allBridgesMap: state?.bridgeReducer?.allBridgesMap || {},
  }));
  const [isDropupOpen, setIsDropupOpen] = useState(false);
  const { sliderState, openSlider, closeSlider } = useSlider();
  const dropupRef = useRef(null);
  const router = useRouter();
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

  const preFunctionEntry = useMemo(() => {
    const allTools = flattenTools(item?.tools_call_data);
    const found = allTools.find((tool) => tool?.type === "pre_function");
    return found || null;
  }, [item?.tools_call_data, flattenTools]);

  const { preTools, postTools, otherTools } = useMemo(() => {
    const allTools = flattenTools(item?.tools_call_data);
    const pre = [];
    const post = [];
    const other = [];

    allTools.forEach((tool) => {
      if (!tool) return;
      const type = tool.type;
      if (type === "pre_tool") {
        pre.push(tool);
      } else if (type === "post_tool") {
        post.push(tool);
      } else {
        // All other types (pre_function, post_function, etc.) go to otherTools
        other.push(tool);
      }
    });
    return { preTools: pre, postTools: post, otherTools: other };
  }, [item?.tools_call_data, flattenTools]);

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
  }, [preFunctionEntry, openViasocket, embedToken]);

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

  const renderToolData = useCallback(
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
    window.SendDataToChatbot({
      parentId: "",
      bridgeName: "history_page_chabot",
      threadId: String(item?.id),
      variables,
      version_id: "null",
      hideCloseButton: "false",
    });
    setTimeout(() => window.openChatbot(), 100);
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

  return (
    <div
      data-testid={`message-${messageId}`}
      key={`item-id-${item?.id}`}
      id={`message-${messageId}`}
      ref={(el) => (threadRefs.current[messageId] = el)}
      className="text-sm"
    >
      <div className="show-on-hover">
        {/* 1. First: Render User Message if exists */}
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
              {/* User attachments - shown above message text */}
              {renderAttachments(normalizeImageUrls(item?.user_urls, "user"))}
              <div>{item.user}</div>
            </div>
          </div>

          {/* User message footer with timestamp and actions */}
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
                <ParenthesesIcon className="h-3 w-3" />
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

        {/* 2a. Pre-tools (executed before LLM call) - badges shown right below the user bubble (right-aligned) */}
        {preTools.length > 0 && (
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

        {/* 2b. Post-tools chips shown above the assistant bubble (only for post_tool type) */}
        {postTools.length > 0 && (
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
        {otherTools.length > 0 && (
          <div className="mb-6 mt-4 flex flex-col items-center w-full justify-center">
            <h3 className="text-sm font-medium text-base-content/70 mb-4">() Functions Executed Successfully</h3>
            <div
              className={`grid ${otherTools.length === 1 ? "grid-cols-1" : otherTools.length === 2 ? "grid-cols-2" : "grid-cols-3"} gap-2 justify-center`}
            >
              {otherTools.map((tool, index) => renderToolData(tool, index))}
            </div>
          </div>
        )}

        {/* 3. Third: Render Assistant Message if exists */}
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
                      className="absolute bg-red-500 text-white rounded-md shadow-lg border-2 border-black min-w-[150px] min-h-[100px]"
                      style={{
                        zIndex: 9999,
                        top: "-120px",
                        left: "-75px",
                        backgroundColor: "red",
                        border: "2px solid black",
                        padding: "10px",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ color: "white", fontSize: "14px" }}>TEST DROPDOWN VISIBLE</div>
                      <ul className="flex justify-center flex-col items-center gap-2 p-2">
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
                className={`bg-base-200 text-base-content pr-10 pt-6 mb-7 chat-bubble transition-all ease-in-out duration-300 relative group break-words overflow-visible border border-base-300 ${
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
                  <div className={mdProseClass.dark}>
                    <ReactMarkdown components={mdComponentsDark} remarkPlugins={mdRemarkPlugins}>
                      {getMessageToDisplay()}
                    </ReactMarkdown>
                  </div>
                )}

                {/* Edit button for assistant messages */}
                {!item?.llm_urls?.length && !item?.fromRTLayer && (
                  <div
                    className={`tooltip absolute top-2 right-2 text-sm cursor-pointer transition-opacity ${isLastMessage() ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                    data-tip="Edit message"
                  >
                    <button
                      id="thread-item-edit-message-button"
                      className="btn btn-sm btn-circle btn-ghost hover:btn-primary text-base-content"
                      onClick={handleEdit}
                    >
                      <PencilIcon size={14} />
                    </button>
                  </div>
                )}

                {/* Action buttons for assistant messages */}
                <div
                  className={`absolute bottom-[-40px] see-on-hover left-0 flex gap-2 mt-2transition-opacity z-10 ${
                    isLastMessage() ? "opacity-70" : "opacity-0 group-hover:opacity-70"
                  }`}
                >
                  <button
                    id="thread-item-add-test-case-button"
                    className="btn text-xs font-normal btn-sm hover:btn-primary"
                    onClick={() => handleAddTestCase(item, index)}
                  >
                    <AddIcon className="h-3 w-3" />
                    <span>Test Case</span>
                  </button>
                  <button
                    id="thread-item-debug-agent-button"
                    className="btn text-xs font-normal btn-sm hover:btn-primary"
                    onClick={() => handleAskAi(item)}
                  >
                    <BotMessageIcon className="h-3 w-3" />
                    <span>Debug Agent</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error message display */}
        {item?.error && (
          <div className="chat chat-start break-all break-words">
            <div>
              <div className="flex flex-row-reverse items-end justify-end gap-1">
                <div className="bg-error/10 text-error border border-error/20 pr-10 chat-bubble transition-all ease-in-out duration-300">
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
        )}
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
