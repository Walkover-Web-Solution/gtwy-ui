"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import { Brain, ChevronRight, Clock3, ExternalLink, Maximize2, RotateCcw, SlidersHorizontal } from "lucide-react";
import { AddIcon, BotMessageIcon, CheckCircleIcon, CopyIcon, PencilIcon } from "@/components/Icons";
import { ExpandCollapse } from "@/components/UI/ExpandCollapse";
import { ThreadActionPill, ThreadInlinePanel, ThreadSystemPromptPanel } from "../historyUi/ThreadActionPill";
import { FinalResponseCard } from "../historyUi/FinalResponseCard";
import MessageExecutionTrace from "../historyUi/executionTrace/MessageExecutionTrace";
import ToolsDataModal from "./ToolsDataModal";
import { truncate } from "./AssistFile";
import { useCustomSelector } from "@/customHooks/customSelector";
import {
  allowedAttributes,
  extractErrorMessage,
  formatCostValue,
  formatTokensTable,
  openModal,
  parseNestedJson,
} from "@/utils/utility";
import CodeBlock from "../codeBlock/CodeBlock";
import { MODAL_TYPE } from "@/utils/enums";
import { flattenToolsCallData } from "@/utils/executionTraceTransform";
import { rerunApi } from "@/config/modelApi";
import { getHistoryAction } from "@/store/action/historyAction";
import { getAgentAnalyticsAction } from "@/store/action/analyticsAction";
import { isWordFileUrl } from "@/utils/attachmentUtils";
import { PdfIcon } from "@/icons/pdfIcon";
import GoogleDocIcon from "@/icons/GoogleDocIcon";

const numberOrNull = (value) => (typeof value === "number" && !Number.isNaN(value) ? value : null);

export const formatMoney = (value) => {
  const num = numberOrNull(value);
  if (num === null) return null;
  return `$${num.toFixed(4)}`;
};

export const getAssistantText = (item) => item?.updated_llm_message || item?.chatbot_message || item?.llm_message || "";

const toolCostOf = (tool) => {
  const child = tool?.data?.response || tool?.response;
  const fromChild = numberOrNull(child?.tokens?.cost?.total_cost) ?? numberOrNull(child?.tokens?.expected_cost);
  if (fromChild !== null) return fromChild;
  return numberOrNull(tool?.tokens?.cost?.total_cost) ?? numberOrNull(tool?.tokens?.expected_cost) ?? 0;
};

export const getTurnMetrics = (item) => {
  const tools = flattenToolsCallData(item?.tools_call_data);
  const toolCount = tools.length;
  const toolsCost = tools.reduce((sum, tool) => sum + toolCostOf(tool), 0);
  const aiCost = numberOrNull(item?.tokens?.cost?.total_cost) ?? numberOrNull(item?.tokens?.expected_cost);
  const isError = Boolean(item?.error);
  return {
    toolCount,
    toolsCost: toolCount > 0 ? toolsCost : null,
    aiCost,
    totalCost: (aiCost || 0) + (toolCount > 0 ? toolsCost : 0),
    isError,
    events: 1 + toolCount + 1,
  };
};

const extractJsonSubstring = (content) => {
  if (!content || typeof content !== "string") return null;
  const firstBrace = content.indexOf("{");
  const lastBrace = content.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null;
  return content.slice(firstBrace, lastBrace + 1);
};

const parseMemoryContent = (content) => {
  const jsonString = extractJsonSubstring(content);
  if (!jsonString) return null;
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed && (parsed.protected_memory || parsed.latest_state)) return parsed;
    return null;
  } catch {
    return null;
  }
};

const isMemoryRelatedQuery = (content) =>
  typeof content === "string" &&
  content.toLowerCase().includes("provide the summary of the previous conversation stored in the memory?");

const getAssistantTextFromMessage = (message) => {
  if (!message) return "";
  if (typeof message.content === "string") return message.content;
  if (Array.isArray(message.content)) {
    return message.content.map((part) => (typeof part === "string" ? part : part?.text || "")).join("");
  }
  return "";
};

const extractMemoryFromAiConfigInput = (aiConfig) => {
  const messages = aiConfig?.input;
  if (!Array.isArray(messages)) return null;
  for (let i = 0; i < messages.length - 1; i++) {
    const msg = messages[i];
    if (msg?.role !== "user" || !isMemoryRelatedQuery(msg?.content)) continue;
    const nextMsg = messages[i + 1];
    if (nextMsg?.role !== "assistant") continue;
    const assistantContent = getAssistantTextFromMessage(nextMsg);
    if (!assistantContent) continue;
    return parseMemoryContent(assistantContent) || { response: assistantContent };
  }
  return null;
};

const resolveAttachmentUrl = (rawUrl) => {
  if (!rawUrl) return null;
  if (typeof rawUrl === "string") return rawUrl;
  if (typeof rawUrl === "object") return rawUrl.permanent_url || rawUrl.url || null;
  return null;
};

const Attachments = ({ list = [] }) => {
  const urls = (Array.isArray(list) ? list : [])
    .map((attachment) => resolveAttachmentUrl(attachment?.permanent_url || attachment?.url))
    .filter(Boolean);
  if (!urls.length) return null;

  return (
    <div className="mb-2 flex flex-wrap gap-2">
      {urls.map((url, idx) => {
        const isPdf = url.toLowerCase().endsWith(".pdf");
        const isDoc = isWordFileUrl(url);
        if (isPdf || isDoc) {
          return (
            <a
              key={`att-${idx}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-base-300 bg-base-100 px-2 py-1 text-xs text-primary hover:bg-base-200"
            >
              {isDoc ? <GoogleDocIcon height={14} width={14} /> : <PdfIcon height={14} width={14} />}
              <span className="max-w-[8rem] truncate">{truncate(url.split("/").pop() || "File", 22)}</span>
              <ExternalLink size={11} />
            </a>
          );
        }
        return (
          <button
            key={`att-${idx}`}
            type="button"
            onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
            className="overflow-hidden rounded-md border border-base-300"
          >
            <Image src={url} alt={`attachment ${idx + 1}`} width={72} height={72} className="h-16 w-16 object-cover" />
          </button>
        );
      })}
    </div>
  );
};

const TypeBadge = ({ tone, children }) => {
  const tones = {
    user: "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900",
    tools: "bg-base-300 text-base-content/70",
    ai: "bg-base-300 text-base-content/70",
    error: "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300",
  };
  return (
    <span
      className={`inline-block rounded px-2 py-[3px] font-mono text-[10px] font-bold uppercase leading-none tracking-[0.1em] ${tones[tone] || tones.ai}`}
    >
      {children}
    </span>
  );
};

const EventRow = ({
  accent,
  background,
  cost,
  costTone = "muted",
  showCost = true,
  type,
  badge,
  children,
  footer,
  id,
}) => {
  const costTones = {
    positive: "text-emerald-600 dark:text-emerald-400",
    error: "text-red-500 dark:text-red-400",
    muted: "text-base-content/35",
  };

  return (
    <div id={id} className={`group flex items-stretch border-b border-base-200 dark:border-base-300/40 ${background}`}>
      <div className={`w-[3px] shrink-0 ${accent}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-stretch">
          <div className={`w-[104px] shrink-0 px-4 py-3 font-mono text-[11px] ${costTones[costTone]}`}>
            {showCost ? cost || "—" : ""}
          </div>
          <div className="w-[92px] shrink-0 py-3 pr-2">
            <TypeBadge tone={badge || type}>{type}</TypeBadge>
          </div>
          <div className="min-w-0 flex-1 py-3 pr-2 text-sm leading-relaxed text-base-content">{children}</div>
          <div className="w-8 shrink-0" />
        </div>

        {/* Stacked, and indented by the Cost (104px) + Type (92px) columns so the actions
            and the expandable panels line up with the message text above them. */}
        {footer ? (
          <div className="flex w-full min-w-0 flex-col items-start gap-2 pb-3 pl-[196px] pr-4">{footer}</div>
        ) : null}
      </div>
    </div>
  );
};

// {{variable}} placeholders left unresolved in the stored system prompt.
const PROMPT_PLACEHOLDER_REGEX = /(\{\{\s*[\w.-]+\s*\}\})/g;

// Highlight variable *values* inside a plain prompt segment (same rules as the history page).
const highlightVariableValues = (text, entries, keyPrefix) => {
  if (!text) return text;
  if (!entries.length) return text;

  let parts;
  try {
    const pattern = entries.map((e) => e.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    parts = text.split(new RegExp(`\\b(${pattern})\\b`, "g"));
  } catch {
    return text;
  }

  return parts.map((part, i) => {
    const matched = entries.find((e) => e.value === part);
    if (!matched) return <span key={`${keyPrefix}-t-${i}`}>{part}</span>;
    return (
      <span
        key={`${keyPrefix}-v-${i}`}
        className="inline rounded border border-primary/30 bg-primary/15 px-1 py-0.5 font-mono text-primary"
        title={`Variable: ${matched.key}`}
      >
        {part}
      </span>
    );
  });
};

const hoverActionsClass = (forceVisible = false) =>
  `transition-opacity duration-200 ${forceVisible ? "opacity-100" : "opacity-0 focus-within:opacity-100 group-hover:opacity-100"}`;

const NewThreadItem = ({
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
  keepSearchMessageIdAfterHighlight = false,
  handleAddTestCase,
  setModalInput,
  turnNumber,
  viewFilter = "all",
}) => {
  const dispatch = useDispatch();
  const router = useRouter();

  const { embedToken, orgBridges, publishedVersionId, allBridgesMap, isEmbedUser } = useCustomSelector((state) => ({
    embedToken: state?.bridgeReducer?.org?.[params?.org_id]?.embed_token,
    orgBridges: state?.bridgeReducer?.org?.[params?.org_id]?.orgs || [],
    publishedVersionId: state?.bridgeReducer?.allBridgesMap?.[item?.bridge_id]?.published_version_id,
    allBridgesMap: state?.bridgeReducer?.allBridgesMap || {},
    isEmbedUser: state?.appInfoReducer?.embedUserDetails?.isEmbedUser,
  }));

  const toolsDataModalRef = useRef(null);
  const [toolsData, setToolsData] = useState([]);
  const [isRerunning, setIsRerunning] = useState(false);
  const [copiedVariables, setCopiedVariables] = useState(false);

  const [userPanel, setUserPanel] = useState(null); // "variables" | "prompt" | "more" | null

  const metrics = useMemo(() => getTurnMetrics(item), [item]);
  const { toolCount, aiCost, totalCost, isError } = metrics;

  const messageId = item?.message_id;
  const userText = item?.user || "";
  const assistantText = isError ? extractErrorMessage(item?.error) : getAssistantText(item);
  const systemPrompt = item?.prompt || (item?.user ? thread?.[index + 1]?.prompt : "") || "";
  const variables = item?.variables && typeof item.variables === "object" ? item.variables : {};
  const variableCount = Object.keys(variables).length;

  const memoryContent = useMemo(() => extractMemoryFromAiConfigInput(item?.AiConfig), [item?.AiConfig]);

  const rootAgentName = useMemo(() => {
    const bridge = orgBridges.find((b) => b?._id === params?.id || b?.id === params?.id);
    return bridge?.name || bridge?.agent_name || bridge?.bridge_name || item?.name || "Agent";
  }, [orgBridges, params?.id, item?.name]);

  const latency = numberOrNull(item?.latency?.over_all_time);
  const totalTokens =
    numberOrNull(item?.tokens?.total_tokens) ??
    (numberOrNull(item?.tokens?.input_tokens) !== null || numberOrNull(item?.tokens?.output_tokens) !== null
      ? (item?.tokens?.input_tokens || 0) + (item?.tokens?.output_tokens || 0)
      : null);

  React.useEffect(() => {
    if (messageId && threadRefs?.current && !threadRefs.current[messageId]) {
      threadRefs.current[messageId] = document.getElementById(`message-${messageId}`);
    }
    const messageElement = document.getElementById(`message-${searchMessageId}`);
    if (messageElement && searchMessageId) {
      messageElement.classList.add("bg-base-300", "rounded-md");
      setTimeout(() => {
        messageElement.classList.remove("bg-base-300", "rounded-md");
      }, 2000);
      if (!keepSearchMessageIdAfterHighlight && typeof setSearchMessageId === "function") {
        setSearchMessageId(null);
      }
    }
  }, [messageId, searchMessageId, threadRefs, setSearchMessageId, keepSearchMessageIdAfterHighlight]);

  const handleCopy = useCallback((content) => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    toast.success("Message copied to clipboard");
  }, []);

  const handleCopyVariables = useCallback(() => {
    navigator.clipboard.writeText(JSON.stringify(variables, null, 2));
    setCopiedVariables(true);
    toast.success("Variables copied to clipboard");
    setTimeout(() => setCopiedVariables(false), 2000);
  }, [variables]);

  const handleRerun = useCallback(async () => {
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
      setTimeout(() => {
        dispatch(getHistoryAction(item.bridge_id, 1, "all", false, "all"));
        dispatch(getAgentAnalyticsAction(item.bridge_id, { analytics: true }, params?.org_id));
      }, 2000);
    } catch {
    } finally {
      setIsRerunning(false);
    }
  }, [dispatch, item, params?.org_id]);

  const handleEdit = useCallback(() => {
    setModalInput({
      content: item.updated_llm_message || item.llm_message || item.chatbot_message || "",
      originalContent: item.llm_message || "",
      index,
      Id: item.id || item.Id,
      // Needed by the container to load the "Previous Prompt" and to save against the right version.
      versionId: item?.version_id || "",
      prompt: item?.prompt || "",
    });
    openModal(MODAL_TYPE.EDIT_MESSAGE_MODAL);
  }, [item, index, setModalInput]);

  const handleAskAi = useCallback(async () => {
    const aiconfig = handleAddTestCase(item, index, true);
    const variablesPayload = {
      "System Prompt": item.prompt,
      aiconfig,
      response: item?.chatbot_message ? item?.chatbot_message : item?.llm_message,
    };
    if (typeof window.SendDataToChatbot === "function") {
      window.SendDataToChatbot({
        parentId: "",
        bridgeName: "history_page_chabot",
        threadId: String(item?.id),
        variables: variablesPayload,
        version_id: "null",
        hideCloseButton: "false",
      });
      setTimeout(() => {
        if (typeof window.openChatbot === "function") window.openChatbot();
      }, 1000);
    } else {
      console.warn("Chatbot embed script not loaded. SendDataToChatbot is unavailable.");
    }
  }, [handleAddTestCase, item, index]);

  const handleUserButtonClick = useCallback(
    (value) => {
      if (value === "Memory" && memoryContent) {
        threadHandler(item.thread_id, { ...item, memoryContent }, value);
      } else {
        threadHandler(item.thread_id, item, value);
      }
    },
    [threadHandler, item, memoryContent]
  );

  // Agent calls must open that agent's history page, never the viasocket function embed.
  const handleAgentHistoryClick = useCallback(
    (event, tool) => {
      event?.stopPropagation?.();
      const isAgent = tool?.data?.metadata?.type === "agent" || tool?.type === "AGENT" || Boolean(tool?.bridge_id);
      const agentId = tool?.data?.metadata?.agent_id || tool?.bridge_id;
      const orgId = params?.org_id;
      if (!isAgent || !agentId || !orgId) return false;

      const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || "";
      const toolMessageId = tool?.data?.metadata?.message_id || tool?.message_id;
      const bridgeFromOrg = orgBridges.find((b) => b?._id === agentId) || allBridgesMap?.[agentId];
      const agentPublishedVersionId = bridgeFromOrg?.published_version_id;
      const threadId = tool?.data?.metadata?.thread_id || tool?.thread_id;
      const subThreadId = tool?.data?.metadata?.sub_thread_id || tool?.data?.metadata?.thread_id || tool?.thread_id;

      const search = new URLSearchParams();
      if (agentPublishedVersionId) search.set("version", agentPublishedVersionId);
      if (toolMessageId) search.set("message_id", toolMessageId);
      if (threadId) search.set("thread_id", threadId);
      if (subThreadId) search.set("sub_thread_id", subThreadId);

      const path = `/org/${orgId}/agents/history/${agentId}?${search.toString()}`;
      if (isEmbedUser) {
        router.push(path);
        return true;
      }
      if (typeof window !== "undefined") {
        window.open(baseUrl ? `${baseUrl}${path}` : path, "_blank", "noopener,noreferrer");
      }
      return true;
    },
    [params?.org_id, orgBridges, allBridgesMap, isEmbedUser, router]
  );

  const handleToolLogsClick = useCallback(
    (event, tool) => {
      if (tool?.data?.metadata?.type === "RAG") return;
      if (handleAgentHistoryClick(event, tool)) return;
      if (typeof window !== "undefined" && window.openViasocket) {
        window.openViasocket(tool?.id, {
          flowHitId: tool?.data?.metadata?.flowHitId,
          embedToken,
          meta: { type: "tool", bridge_id: params?.id },
        });
      }
    },
    [embedToken, params?.id, handleAgentHistoryClick]
  );

  const handleToolDataClick = useCallback((tool) => {
    setToolsData(tool);
    toolsDataModalRef.current?.showModal();
  }, []);

  const handleCloseToolsDataModal = useCallback(() => {
    setToolsData([]);
    toolsDataModalRef.current?.close();
  }, []);

  const showMessages = viewFilter === "all" || viewFilter === "messages";
  const showTools = (viewFilter === "all" || viewFilter === "tools") && toolCount > 0;
  if (!showMessages && !showTools) return null;

  const turnEventLabel = `${metrics.events} event${metrics.events === 1 ? "" : "s"}`;
  const turnCostLabel = formatMoney(totalCost);

  // Same highlighting as the history page: variable values get highlighted, and any
  // {{placeholder}} still left in the stored prompt (e.g. the current time block) is
  // marked instead of being shown as raw text.
  const renderHighlightedSystemPrompt = (content) => {
    if (!content || typeof content !== "string") return content || null;

    const entries = Object.entries(variables)
      .map(([key, val]) => ({ key, value: typeof val === "object" ? JSON.stringify(val) : String(val ?? "") }))
      .filter((e) => e.value.length > 0 && e.value.length <= 200)
      .sort((a, b) => b.value.length - a.value.length);

    return content.split(PROMPT_PLACEHOLDER_REGEX).map((segment, idx) => {
      if (!segment) return null;

      // The regex captures its match, so odd indexes are the placeholders themselves.
      if (idx % 2 === 1) {
        const name = segment.replace(/[{}\s]/g, "");
        const resolved = variables?.[name];
        const resolvedText =
          resolved === undefined || resolved === null
            ? ""
            : typeof resolved === "object"
              ? JSON.stringify(resolved)
              : String(resolved);
        const createdAtLabel = formatDateAndTime?.(item?.created_at) || "";
        const title = resolvedText
          ? `Variable: ${name} = ${resolvedText}`
          : name === "current_time_date_and_current_identifier"
            ? `Resolved at request time${createdAtLabel ? ` · ${createdAtLabel}` : ""}`
            : `Variable: ${name} (resolved at request time)`;

        return (
          <span
            key={`prompt-placeholder-${idx}`}
            className="inline rounded border border-dashed border-primary/40 bg-primary/10 px-1 py-0.5 font-mono text-primary"
            title={title}
          >
            {segment}
          </span>
        );
      }

      return (
        <React.Fragment key={`prompt-segment-${idx}`}>
          {highlightVariableValues(segment, entries, `prompt-segment-${idx}`)}
        </React.Fragment>
      );
    });
  };

  const renderMoreDetailsPanel = () => (
    <ThreadInlinePanel className="w-full">
      <div className="text-left">
        <div className="border-b border-base-content/10 bg-base-200/50 px-4 py-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-base-content/70">Optional Details</span>
        </div>
        {allowedAttributes.optional
          .filter(([key]) => key !== "tokens")
          .sort((a, b) => a[1].localeCompare(b[1]))
          .map(([key, displayKey]) => {
            const value = item[key] !== undefined ? item[key] : key === "createdAt" ? item.created_at : undefined;
            if (value === undefined || value === null) return null;

            if (typeof value === "object" && key !== "createdAt") {
              return Object.entries(value).map(([objKey, objValue]) => (
                <div
                  key={`${key}-${objKey}`}
                  className="flex items-start gap-4 border-b border-base-content/10 px-4 py-2.5 last:border-b-0"
                >
                  <span className="min-w-[120px] shrink-0 font-mono text-xs font-normal text-trace-gold">
                    {objKey.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </span>
                  <div className="min-w-0 flex-1 whitespace-pre-wrap break-all font-mono text-xs text-base-content">
                    {typeof objValue === "object" && objValue !== null ? (
                      <div className="w-full overflow-hidden rounded-lg border border-base-content/20 bg-base-200/50">
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

            return (
              <div
                key={key}
                className="flex items-start gap-4 border-b border-base-content/10 px-4 py-2.5 last:border-b-0"
              >
                <span className="min-w-[120px] shrink-0 text-xs font-normal text-trace-gold">{displayKey}</span>
                <span className="whitespace-pre-wrap break-all text-xs text-base-content">
                  {key === "createdAt" || key === "created_at" ? new Date(value).toLocaleString() : value?.toString()}
                </span>
              </div>
            );
          })}
        {item?.batch_data?.batch_id ? (
          <div className="flex items-start gap-4 px-4 py-2.5">
            <span className="min-w-[120px] shrink-0 text-xs font-normal text-trace-gold">Batch ID</span>
            <span className="whitespace-pre-wrap break-all font-mono text-xs text-base-content">
              {item.batch_data.batch_id}
            </span>
          </div>
        ) : null}
        {(() => {
          const rows = item?.tokens && typeof item.tokens === "object" ? formatTokensTable(item.tokens) : null;
          if (!rows || rows.length === 0) return null;
          return (
            <div className="flex flex-col gap-2 px-4 py-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-trace-gold">Token and Cost</span>
              <div className="w-full overflow-x-auto rounded-lg border border-base-content/10 bg-base-200/10 shadow-sm">
                <table className="table table-xs w-full border-collapse">
                  <thead>
                    <tr className="border-b border-base-content/10 bg-base-200/50">
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-base-content/70">
                        Type
                      </th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-base-content/70">
                        Tokens
                      </th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-base-content/70">
                        Cost ($)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-base-content/5">
                    {rows.map((row, idx) => (
                      <tr
                        key={idx}
                        className={
                          row.isTotal
                            ? "border-t border-base-content/15 bg-base-200/40 font-semibold"
                            : "hover:bg-base-200/20"
                        }
                      >
                        <td className="px-3 py-2 text-left text-xs font-medium text-base-content/90">{row.label}</td>
                        <td className="px-3 py-2 text-left font-mono text-xs text-base-content/80">
                          {row.token !== undefined && row.token !== null
                            ? typeof row.token === "number"
                              ? row.token.toLocaleString()
                              : row.token
                            : "-"}
                        </td>
                        <td className="px-3 py-2 text-left font-mono text-xs text-base-content/80">
                          {formatCostValue(row.cost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}
      </div>
    </ThreadInlinePanel>
  );

  const userFooter = (
    <>
      <div className={`flex flex-wrap items-center gap-1.5 ${hoverActionsClass(Boolean(userPanel))}`}>
        <ThreadActionPill icon={CopyIcon} onClick={() => handleCopy(userText)}>
          Copy
        </ThreadActionPill>
        <ThreadActionPill
          icon={SlidersHorizontal}
          trailing={Maximize2}
          onClick={() => handleUserButtonClick("AiConfig")}
        >
          AI Config
        </ThreadActionPill>
        {memoryContent ? (
          <ThreadActionPill icon={Brain} trailing={Maximize2} onClick={() => handleUserButtonClick("Memory")}>
            Memory
          </ThreadActionPill>
        ) : null}
        {item?.latency ? (
          <ThreadActionPill icon={Clock3} trailing={Maximize2} onClick={() => handleUserButtonClick("Latency")}>
            Latency
          </ThreadActionPill>
        ) : null}
        {systemPrompt ? (
          <ThreadActionPill
            trailing={ChevronRight}
            trailingClassName={`transition-transform duration-200 ${userPanel === "prompt" ? "rotate-90" : ""}`}
            active={userPanel === "prompt"}
            onClick={() => setUserPanel((p) => (p === "prompt" ? null : "prompt"))}
          >
            System Prompt
          </ThreadActionPill>
        ) : null}
        {variableCount > 0 ? (
          <ThreadActionPill
            trailing={ChevronRight}
            trailingClassName={`transition-transform duration-200 ${userPanel === "variables" ? "rotate-90" : ""}`}
            active={userPanel === "variables"}
            onClick={() => setUserPanel((p) => (p === "variables" ? null : "variables"))}
          >
            Variables
          </ThreadActionPill>
        ) : null}
        <ThreadActionPill
          trailing={ChevronRight}
          trailingClassName={`transition-transform duration-200 ${userPanel === "more" ? "rotate-90" : ""}`}
          active={userPanel === "more"}
          onClick={() => setUserPanel((p) => (p === "more" ? null : "more"))}
        >
          More
        </ThreadActionPill>
        <time className="ml-1 shrink-0 text-[11px] text-base-content/45">{formatDateAndTime?.(item?.created_at)}</time>
      </div>

      {userPanel === "prompt" && systemPrompt ? (
        <ThreadSystemPromptPanel className="w-full">
          {renderHighlightedSystemPrompt(systemPrompt)}
        </ThreadSystemPromptPanel>
      ) : null}

      {userPanel === "more" ? renderMoreDetailsPanel() : null}

      {userPanel === "variables" && variableCount > 0 ? (
        <ThreadInlinePanel className="w-full">
          <div className="flex items-center justify-between border-b border-base-content/10 bg-base-200/50 px-4 py-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-base-content/70">Variables</span>
            <button type="button" onClick={handleCopyVariables} className="btn btn-ghost btn-xs gap-1.5 text-xs">
              {copiedVariables ? (
                <>
                  <CheckCircleIcon size={12} className="text-success" />
                  <span className="font-medium text-success">Copied!</span>
                </>
              ) : (
                <>
                  <CopyIcon size={12} />
                  <span>Copy Object</span>
                </>
              )}
            </button>
          </div>
          <div>
            {Object.entries(variables).map(([key, value]) => {
              const raw =
                typeof value === "object" && value !== null
                  ? JSON.stringify(parseNestedJson(value), null, 2)
                  : String(value ?? "");
              return (
                <div
                  key={key}
                  className="flex items-start gap-4 border-b border-base-content/10 px-4 py-2.5 last:border-b-0"
                >
                  <span className="min-w-[120px] shrink-0 font-mono text-xs text-trace-gold">{key}</span>
                  {/* Same show more / collapse treatment long variable values get on the history page. */}
                  <span className="block whitespace-pre-wrap break-all text-xs text-base-content">
                    <ExpandCollapse collapsedHeight={150} fadeHeight={40}>
                      {raw}
                    </ExpandCollapse>
                  </span>
                </div>
              );
            })}
          </div>
        </ThreadInlinePanel>
      ) : null}
    </>
  );

  const aiFooter = (
    <>
      <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-base-content/45">
        {latency !== null ? (
          <span className="inline-flex items-center gap-1">
            <Clock3 size={11} />
            {latency}s
          </span>
        ) : null}
        {item?.model ? <span>{item.model}</span> : null}
        {totalTokens !== null ? <span>{totalTokens} tok</span> : null}
        {/* Cost intentionally omitted here — it is already shown in the Cost column of this row. */}
      </div>

      <div className={`flex flex-wrap items-center gap-1.5 ${hoverActionsClass()}`}>
        <ThreadActionPill
          icon={RotateCcw}
          onClick={handleRerun}
          disabled={isRerunning || !publishedVersionId}
          title={!publishedVersionId ? "No published version available" : "Rerun this message"}
        >
          {isRerunning ? "Running..." : "Rerun"}
        </ThreadActionPill>
        <ThreadActionPill icon={CopyIcon} onClick={() => handleCopy(assistantText)}>
          Copy
        </ThreadActionPill>
        {!isError && !item?.llm_urls?.length ? (
          <ThreadActionPill icon={AddIcon} trailing={ChevronRight} onClick={() => handleAddTestCase(item, index)}>
            Test Case
          </ThreadActionPill>
        ) : null}
        <ThreadActionPill icon={BotMessageIcon} trailing={ChevronRight} onClick={handleAskAi}>
          Debug Agent
        </ThreadActionPill>
        {!isError && !item?.llm_urls?.length && !item?.fromRTLayer ? (
          <ThreadActionPill icon={PencilIcon} onClick={handleEdit}>
            Edit
          </ThreadActionPill>
        ) : null}
      </div>
    </>
  );

  return (
    <div
      data-testid={`message-${messageId}`}
      id={`message-${messageId}`}
      ref={(el) => {
        if (threadRefs?.current) threadRefs.current[messageId] = el;
      }}
      className={`${searchMessageId && searchMessageId === messageId ? "ring-1 ring-primary/40" : ""}`}
    >
      <div className="flex items-center gap-3 bg-base-100 px-4 pb-1.5 pt-4">
        <span className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-base-content/45">
          Turn {turnNumber}
        </span>
        <div className="h-px flex-1 bg-base-200 dark:bg-base-300/50" />
        <span className="shrink-0 text-[11px] text-base-content/45">
          {turnEventLabel}
          {turnCostLabel ? ` · ${turnCostLabel} total` : ""}
        </span>
      </div>

      {showMessages && (
        <EventRow
          id={`event-user-${messageId}`}
          accent="bg-neutral-900 dark:bg-neutral-100"
          background="bg-base-100"
          showCost={false}
          type="User"
          badge="user"
          footer={userFooter}
        >
          <Attachments list={item?.user_urls} />
          <ExpandCollapse collapsedHeight={300} fadeHeight={90} expandLabel="Show more" collapseLabel="Collapse">
            <div className="whitespace-pre-wrap break-words">{userText}</div>
          </ExpandCollapse>
        </EventRow>
      )}

      {showTools && (
        <EventRow
          id={`event-tools-${messageId}`}
          accent="bg-transparent"
          background="bg-base-100"
          showCost={false}
          type="Tools"
          badge="tools"
        >
          <MessageExecutionTrace
            item={item}
            bridgeId={params?.id}
            rootAgentName={rootAgentName}
            formatDateAndTime={formatDateAndTime}
            onToolLogsClick={handleToolLogsClick}
            onToolDataClick={handleToolDataClick}
            onAgentDataClick={handleToolDataClick}
            onAgentHistoryClick={handleAgentHistoryClick}
          />
        </EventRow>
      )}

      {/* ── AI event ────────────────────────────────────────────────── */}
      {showMessages && (
        <EventRow
          id={`event-ai-${messageId}`}
          accent={isError ? "bg-red-400" : "bg-blue-500"}
          // The show-more gradient fades to --expand-collapse-fade, so point it at this row's
          // tint — otherwise it fades to white and the fade edge shows against the AI background.
          background={
            isError
              ? "bg-red-50/70 dark:bg-red-500/[0.07]"
              : "bg-[#EDF0FC] dark:bg-blue-400/[0.10] [--expand-collapse-fade:#EDF0FC]"
          }
          cost={formatMoney(aiCost)}
          costTone={isError ? "error" : "positive"}
          type="AI"
          badge="ai"
          footer={aiFooter}
        >
          <Attachments list={item?.llm_urls} />

          {isError ? (
            <div className="whitespace-pre-wrap break-words text-red-600 dark:text-red-300">{assistantText}</div>
          ) : (
            <FinalResponseCard content={assistantText} hasToolCalls={false} />
          )}
        </EventRow>
      )}

      <ToolsDataModal
        toolsData={toolsData}
        handleClose={handleCloseToolsDataModal}
        toolsDataModalRef={toolsDataModalRef}
        integrationData={integrationData}
      />
    </div>
  );
};

export default NewThreadItem;
