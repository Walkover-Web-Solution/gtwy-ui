import { extractErrorMessage } from "@/utils/utility";

const slugify = (name) =>
  String(name || "agent")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "") || "agent";

const glyphFromName = (name) => {
  const parts = String(name || "AG")
    .replace(/_/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  const s = parts[0] || "AG";
  return s.slice(0, 2).toUpperCase();
};

export const flattenToolsCallData = (toolsCallData) => {
  if (!toolsCallData) return [];
  if (Array.isArray(toolsCallData)) {
    return toolsCallData.flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      if (entry.type || entry.name) return [entry];
      return Object.values(entry).filter((t) => t && typeof t === "object");
    });
  }
  if (typeof toolsCallData === "object") {
    return Object.values(toolsCallData).filter((t) => t && typeof t === "object");
  }
  return [];
};

const summarizeValue = (value) => {
  if (value == null || value === "") return "no data returned";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "empty response";
    return trimmed.length > 80 ? `${trimmed.slice(0, 80)}…` : trimmed;
  }
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? "" : "s"}`;
  if (typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.length === 0) return "empty object";
    return `{${keys.slice(0, 3).join(", ")}${keys.length > 3 ? ", …" : ""}}`;
  }
  return String(value);
};

const stripHtml = (text) =>
  String(text || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const extractAgentResponse = (message) => {
  if (!message || typeof message !== "object") return "";
  const raw =
    message.updated_llm_message ||
    message.llm_message ||
    message.chatbot_message ||
    message.response?.llm_message ||
    message.response?.chatbot_message ||
    "";
  if (raw) return stripHtml(raw);

  const errorRaw = message.error || message.firstAttemptError || "";
  if (errorRaw) {
    return extractErrorMessage(errorRaw);
  }
  return "";
};

const extractAgentResponseInfo = (message) => {
  if (!message || typeof message !== "object") return { text: "", isError: false };
  const raw =
    message.updated_llm_message ||
    message.llm_message ||
    message.chatbot_message ||
    message.response?.llm_message ||
    message.response?.chatbot_message ||
    "";
  if (raw) return { text: stripHtml(raw), isError: false };

  const errorRaw = message.error || message.firstAttemptError || "";
  if (errorRaw) {
    return { text: extractErrorMessage(errorRaw), isError: true };
  }
  return { text: "", isError: false };
};

const responsePreview = (text, max = 120) => {
  const clean = stripHtml(text);
  if (!clean) return "";
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
};

const getTokens = (message) => {
  const input = message?.tokens?.input_tokens ?? 0;
  const output = message?.tokens?.output_tokens ?? 0;
  const total = input + output;
  return total > 0 ? { input, output, total } : null;
};

const SUB_AGENT_HUES = ["trace-blue", "trace-green", "trace-gold"];

const nextSubAgentHue = (callCounter) => {
  const hue = SUB_AGENT_HUES[callCounter.n % SUB_AGENT_HUES.length];
  callCounter.n += 1;
  return hue;
};

const registerAgent = (registry, key, { name, model, role = "Sub-agent" }) => {
  if (registry[key]) {
    registry[key] = {
      ...registry[key],
      name: name || registry[key].name,
      model: model || registry[key].model,
      role: role || registry[key].role,
    };
    return key;
  }
  registry[key] = {
    name: name || key,
    model: model || "—",
    hue: role === "Orchestrator" ? "trace-gold" : null,
    glyph: glyphFromName(name || key),
    role,
  };
  return key;
};

const resolveAgentKey = (tool, childMessage, registry, rootName) => {
  const rawName = tool?.display_tool_name || tool?.name || childMessage?.name || childMessage?.bridge_id || "agent";
  const key = slugify(rawName);
  registerAgent(registry, key, {
    name: rawName,
    model: childMessage?.model,
    role: tool?.type === "AGENT" ? "Sub-agent" : "Agent",
  });
  return key;
};

const resolveToolKind = (tool) => {
  const type = tool?.type || tool?.data?.metadata?.type;
  if (type === "pre_tool" || type === "pre_function") return "pre_function";
  if (type === "post_tool" || type === "post_function") return "post_function";
  return "tool";
};

const extractToolQueryParams = (tool) => {
  const args = tool?.args && typeof tool.args === "object" ? tool.args : {};
  const configured = Array.isArray(tool?.query_params)
    ? Object.fromEntries(tool.query_params.filter((key) => key in args).map((key) => [key, args[key]]))
    : tool?.query_params || {};
  const queryParams = { ...configured, ...(tool?.data?.query_params || {}) };
  return Object.keys(queryParams).length ? queryParams : null;
};

const toolToStep = (tool) => {
  const metaType = tool?.data?.metadata?.type || tool?.type;
  const displayName = tool?.display_tool_name || tool?.model_tool_name || tool?.name || "tool";
  const response = tool?.data?.response;
  const hasError = tool?.error === true || (tool?.data?.status != null && tool?.data?.status !== 1);
  const toolKind = resolveToolKind(tool);
  const queryParams = extractToolQueryParams(tool);

  if (metaType === "RAG" || displayName === "get_knowledge_base_data") {
    const query = tool?.args?.query || "";
    const empty = response == null || response === "" || response === '""';
    return {
      type: "kb",
      name: displayName,
      query,
      input: tool?.args || {},
      queryParams,
      output: response ?? tool?.data ?? null,
      summary: empty ? "no data returned" : summarizeValue(response),
      latency: null,
      tokens: null,
      rawTool: tool,
      chunks: empty ? [] : [{ source: tool?.args?.resource_id || "knowledge base", score: 1, text: String(response) }],
    };
  }

  if (metaType === "agent" || tool?.type === "AGENT" || tool?.bridge_id) {
    return null; // handled separately
  }

  return {
    type: "tool",
    name: displayName,
    toolKind,
    status: hasError ? "error" : "ok",
    input: tool?.args || {},
    queryParams,
    output: response ?? tool?.data ?? null,
    summary: hasError ? "tool call failed" : summarizeValue(response),
    latency: null,
    tokens: null,
    rawTool: tool,
  };
};

const buildAgentSteps = (message, registry, rootAgentName, callCounter = { n: 0 }) => {
  const tools = flattenToolsCallData(message?.tools_call_data);
  const steps = [];

  tools.forEach((tool) => {
    const metaType = tool?.data?.metadata?.type || tool?.type;

    if (metaType === "agent" || tool?.type === "AGENT" || (tool?.bridge_id && tool?.data?.response)) {
      const childMessage = tool?.data?.response || tool?.response;
      if (!childMessage || typeof childMessage !== "object") return;

      const agentKey = resolveAgentKey(tool, childMessage, registry, rootAgentName);
      const stepHue = nextSubAgentHue(callCounter);
      const nested = messageToRun(childMessage, registry, rootAgentName, false, callCounter);

      const { text: responseText, isError: responseIsError } = extractAgentResponseInfo(childMessage);

      steps.push({
        type: "agent",
        agent: agentKey,
        hue: stepHue,
        question: tool?.args?._query || childMessage?.user || tool?.args?.query || "",
        reason: tool?.args?._query || childMessage?.user || `Called ${tool?.name || "agent"}`,
        vars:
          childMessage?.variables && Object.keys(childMessage.variables).filter((k) => k !== "_user_message").length
            ? Object.fromEntries(Object.entries(childMessage.variables).filter(([k]) => k !== "_user_message"))
            : null,
        latency: childMessage?.latency?.over_all_time ?? null,
        tokens: getTokens(childMessage),
        cost: childMessage?.tokens?.expected_cost ?? null,
        responseText,
        responseIsError,
        responsePreview: responsePreview(responseText),
        rawTool: tool,
        steps: nested.steps,
      });
      return;
    }

    const step = toolToStep(tool);
    if (step) steps.push(step);
  });

  return steps;
};

const messageToRun = (message, registry, rootAgentName, isRoot, callCounter = { n: 0 }) => {
  const agentName = message?.name || (isRoot ? rootAgentName : null) || message?.bridge_id || "Agent";
  const agentKey = slugify(agentName);
  registerAgent(registry, agentKey, {
    name: agentName,
    model: message?.model,
    role: isRoot ? "Orchestrator" : "Sub-agent",
  });

  const { text: responseText, isError: responseIsError } = extractAgentResponseInfo(message);

  return {
    type: "agent",
    agent: agentKey,
    latency: message?.latency?.over_all_time ?? null,
    tokens: getTokens(message),
    cost: message?.tokens?.expected_cost ?? null,
    responseText: isRoot ? responseText : undefined,
    responseIsError: isRoot ? responseIsError : undefined,
    responsePreview: isRoot ? responsePreview(responseText) : undefined,
    rawMessage: isRoot ? message : undefined,
    steps: buildAgentSteps(message, registry, rootAgentName, callCounter),
  };
};

export const historyMessageToTrace = (message, { rootAgentName = "Agent", formatTime } = {}) => {
  if (!message) return { agents: {}, trace: null };

  const agents = {};
  const run = messageToRun(message, agents, rootAgentName, true);
  const finalText = message?.updated_llm_message || message?.llm_message || message?.chatbot_message || "";

  const timeStr =
    typeof formatTime === "function" && message?.created_at
      ? formatTime(message.created_at)
      : message?.created_at
        ? new Date(message.created_at).toLocaleTimeString()
        : "";

  const toolCount = flattenToolsCallData(message?.tools_call_data).length;

  return {
    agents,
    trace: {
      meta: {
        title: message?.user ? String(message.user).slice(0, 80) : "Execution trace",
        started: timeStr,
        totalLatency: message?.latency?.over_all_time ?? null,
        totalTokens: getTokens(message),
        totalCost: message?.tokens?.expected_cost ?? null,
        agentsUsed: Object.keys(agents).length,
        toolCalls: toolCount,
      },
      turns: [
        {
          user: {
            text: message?.user || "",
            time: timeStr,
            vars: message?.variables && Object.keys(message.variables).length ? message.variables : null,
          },
          run,
          finalText,
        },
      ],
    },
    run,
  };
};

/** Embedded in thread: only invoked tools/sub-agents (no root agent shell or final response). */
export const historyMessageToEmbeddedTrace = (message, options = {}) => {
  const { agents, run } = historyMessageToTrace(message, options);
  if (!run) return { agents, run: null };

  return {
    agents,
    run: {
      ...run,
      responseText: undefined,
      responsePreview: undefined,
    },
  };
};
