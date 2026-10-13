// Direct (agentless) completions: POST /api/v2/model/ai/completion takes the whole
// configuration in the body. The backend runs it under a hidden per-org agent
// (bridgeType "direct") so billing, thread memory and history keep working.
import { DIRECT_COMPLETION_PATH } from "@/config/index";
import { getErrorMessage } from "@/utils/errorHandler";

// Model groups whose reply the playground can render as text.
export const DIRECT_MODEL_GROUPS = ["chat", "reasoning"];

export const EMPTY_DIRECT_CONFIG = {
  service: "",
  model: "",
  modelType: "chat",
  prompt: "",
  params: {},
  tools: [],
};

// Flattens the store's serviceModels[service] into [{ group, name, cfg }] for the model picker.
export const getDirectModelOptions = (serviceModelGroups) =>
  DIRECT_MODEL_GROUPS.flatMap((group) =>
    Object.values(serviceModelGroups?.[group] || {})
      .map((cfg) => ({ group, name: cfg?.configuration?.model?.default, cfg }))
      .filter((option) => option.name)
  );

// Parameters left out are filled with the model defaults by the backend, so only values
// the user changed are sent.
export const buildDirectPayload = ({ config, message, threadId, apikey }) => {
  const configuration = { model: config.model, type: config.modelType, ...config.params };
  if (config.prompt.trim()) configuration.prompt = config.prompt;
  return {
    service: config.service,
    configuration,
    user: message,
    ...(threadId ? { thread_id: threadId } : {}),
    ...(config.tools.length ? { extra_tools: config.tools } : {}),
    ...(apikey ? { apikey } : {}),
  };
};

// cURL for the API tab, with placeholders in place of real secrets.
export const buildDirectCurlSnippet = ({ config, hasApikey }) => {
  const payload = buildDirectPayload({
    config,
    message: "Hello!",
    threadId: "my-thread-id",
    apikey: hasApikey ? "YOUR_PROVIDER_API_KEY" : "",
  });
  const body = JSON.stringify(payload, null, 2).replace(/'/g, "'\\''");
  return `curl -X POST '${process.env.NEXT_PUBLIC_PYTHON_SERVER_URL}${DIRECT_COMPLETION_PATH}' \\
  -H 'pauthkey: YOUR_PAUTH_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '${body}'`;
};

// Request validation failures only say "Validation error" in detail; the useful text is
// in the msg of each item of the errors list.
export const getDirectErrorMessage = (error) => {
  const validationErrors = error?.response?.data?.errors;
  if (Array.isArray(validationErrors) && validationErrors.length) {
    return validationErrors.map((e) => e?.msg || JSON.stringify(e)).join(", ");
  }
  return getErrorMessage(error);
};

export const toDirectAssistantMessage = (result, { model, elapsedMs }) => {
  const data = result?.response?.data || {};
  const usage = result?.response?.usage || {};
  const toolCallCount = Object.keys(data.tools_data || {}).length;
  const content =
    typeof data.content === "string" && data.content
      ? data.content
      : JSON.stringify(data.content ?? result?.response ?? result, null, 2);
  const meta = [
    model,
    `${(elapsedMs / 1000).toFixed(1)}s`,
    usage.total_tokens ? `${usage.total_tokens} tokens` : null,
    toolCallCount ? `${toolCallCount} tool call${toolCallCount > 1 ? "s" : ""}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return { role: "assistant", content, meta };
};

// ---- Runtime tools ----
// Each tool is an HTTP endpoint sent as an extra_tools item, in the shape the Python
// service reads in process_extra_tool: { name, description, url, method, headers, fields, required }.

export const TOOL_METHODS = ["POST", "GET", "PUT", "PATCH", "DELETE"];
export const TOOL_PARAM_TYPES = ["string", "number", "integer", "boolean", "array", "object"];

const TOOL_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;
const TOOL_URL_PATTERN = /^https?:\/\/\S+$/;

const isPlainObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);

export const createToolParam = () => ({ name: "", type: "string", description: "", required: false });

export const createToolDraft = () => ({
  name: "",
  description: "",
  url: "",
  method: "POST",
  headers: "",
  params: [createToolParam()],
});

// Form state -> extra_tools item. Call only after validateToolDraft passed.
export const draftToTool = (draft) => {
  const fields = {};
  const required = [];
  draft.params
    .filter((p) => p.name.trim())
    .forEach((p) => {
      const name = p.name.trim();
      fields[name] = { type: p.type, description: p.description.trim() };
      if (p.type === "array") fields[name].items = { type: "string" };
      if (p.required) required.push(name);
    });
  return {
    name: draft.name.trim(),
    description: draft.description.trim(),
    url: draft.url.trim(),
    method: draft.method,
    headers: draft.headers.trim() ? JSON.parse(draft.headers) : {},
    fields,
    required,
  };
};

export const toolToDraft = (tool) => ({
  name: tool.name || "",
  description: tool.description || "",
  url: tool.url || "",
  method: (tool.method || "POST").toUpperCase(),
  headers: isPlainObject(tool.headers) && Object.keys(tool.headers).length ? JSON.stringify(tool.headers, null, 2) : "",
  params: Object.entries(tool.fields || {}).map(([name, def]) => ({
    name,
    type: def?.type || "string",
    description: def?.description || "",
    required: (tool.required || []).includes(name),
  })),
});

// Shared by the form and the JSON editor. Returns an error message, or null when valid.
const validateTool = (tool, otherNames) => {
  const name = (tool?.name || "").trim();
  if (!name) return "Tool name is required";
  if (!TOOL_NAME_PATTERN.test(name)) return `Tool "${name}": name can only use letters, numbers, _ and -`;
  if (otherNames.includes(name)) return `Tool "${name}": a tool with this name already exists`;
  if (!(tool.description || "").trim())
    return `Tool "${name}": description is required, the model uses it to decide when to call the tool`;
  if (!TOOL_URL_PATTERN.test((tool.url || "").trim())) return `Tool "${name}": url must start with http:// or https://`;
  if (tool.method && !TOOL_METHODS.includes(String(tool.method).toUpperCase()))
    return `Tool "${name}": method must be one of ${TOOL_METHODS.join(", ")}`;
  return null;
};

export const validateToolDraft = (draft, tools, editingIndex) => {
  if (draft.headers.trim()) {
    try {
      if (!isPlainObject(JSON.parse(draft.headers))) return "Headers must be a JSON object";
    } catch {
      return "Headers must be valid JSON";
    }
  }
  const otherNames = tools.filter((_, i) => i !== editingIndex).map((t) => t.name);
  return validateTool(draft, otherNames);
};

// Parses the JSON editor's text. Returns { tools } or { error }.
export const parseToolsJson = (text) => {
  let parsed;
  try {
    parsed = JSON.parse(text.trim() || "[]");
  } catch {
    return { error: "Invalid JSON" };
  }
  if (!Array.isArray(parsed)) return { error: "Tools must be a JSON array" };

  for (let i = 0; i < parsed.length; i++) {
    const tool = parsed[i];
    if (!isPlainObject(tool)) return { error: `Item ${i + 1} must be an object` };
    if (tool.headers !== undefined && !isPlainObject(tool.headers))
      return { error: `Tool "${tool.name}": headers must be an object` };
    if (tool.fields !== undefined && !isPlainObject(tool.fields))
      return { error: `Tool "${tool.name}": fields must be an object` };
    if (tool.required !== undefined && !Array.isArray(tool.required))
      return { error: `Tool "${tool.name}": required must be an array` };
    const error = validateTool(
      tool,
      parsed.slice(0, i).map((t) => t.name)
    );
    if (error) return { error };
  }
  return { tools: parsed };
};

// ---- Persistence ----
// The config is kept per org in the browser. Storage can be unavailable (private mode,
// blocked site data), so reads fall back to the empty config and writes fail quietly.

const directConfigStorageKey = (orgId) => `directCompletionConfig:${orgId}`;

export const readDirectConfig = (orgId) => {
  try {
    const saved = JSON.parse(localStorage.getItem(directConfigStorageKey(orgId)) || "null");
    return isPlainObject(saved) ? { ...EMPTY_DIRECT_CONFIG, ...saved } : EMPTY_DIRECT_CONFIG;
  } catch {
    return EMPTY_DIRECT_CONFIG;
  }
};

export const writeDirectConfig = (orgId, config) => {
  try {
    localStorage.setItem(directConfigStorageKey(orgId), JSON.stringify(config));
  } catch {
    // Not persisting is acceptable; the config still works for this session.
  }
};
