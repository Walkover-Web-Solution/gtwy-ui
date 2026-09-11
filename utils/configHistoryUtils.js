import { isEqual } from "lodash";
import { DIFFERNCE_DATA_DISPLAY_NAME } from "@/jsonFiles/bridgeParameter";

const SYSTEM_HISTORY_TYPES = new Set(["Version created", "Agent created", "Version deleted"]);
const CONFIG_KEYS = new Set([
  "prompt",
  "model",
  "type",
  "fall_back",
  "response_type",
  "json_schema",
  "temperature",
  "max_tokens",
  "top_p",
  "is_rich_text",
  "is_enable",
  "fine_tune_model",
]);

const PROMPT_LABELS = { role: "Role", goal: "Goal", instruction: "Instruction" };
const PROMPT_TYPES = new Set(["prompt", "role", "goal", "instruction"]);
const SETTINGS_KEYS = new Set([
  "tone",
  "responseStyle",
  "reviewer_agent",
  "fall_back",
  "response_format",
  "maximum_iterations",
  "stateless_conversation",
  "editAccess",
  "publicUsers",
  "guardrails",
]);

// --- value helpers (config can be string, object, or { mode, value }) ---

export function isModeValue(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) && "mode" in value;
}

/** Read stored value: direct value; revert rows use { value, reverted_from_id } */
export function readHistoryValue(stored, type) {
  if (stored === null || stored === undefined) return stored;
  if (typeof stored !== "object" || Array.isArray(stored)) return stored;

  if (stored?.reverted_from_id != null && "value" in stored) return stored.value;

  // Old wrapped format
  if (type && type in stored && Object.keys(stored).length === 1) return stored[type];
  if (type === "agents" && stored.connected_agents !== undefined) return stored.connected_agents;
  if (type === "pre_tools" && stored.pre_tools !== undefined) return stored.pre_tools;

  return stored;
}

export function isReverted(item) {
  return item?.current_value?.reverted_from_id != null;
}

export function formatValue(value) {
  if (value === null || value === undefined) return "—";

  if (isModeValue(value)) {
    if (value.mode === "default") return "—";
    if (value.mode === "min") return "min";
    if (value.mode === "max") return "max";
    const inner = value.value;
    return typeof inner === "object" ? JSON.stringify(inner, null, 2) : String(inner);
  }

  if (typeof value === "string") return `"${value}"`;
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

/** For AdvancedParamenter sliders */
export function resolveConfigParam(value, meta = null) {
  if (value === undefined || value === null) {
    return { isDefault: true, display: null, numeric: null };
  }

  if (isModeValue(value)) {
    if (value.mode === "default") return { isDefault: true, display: null, numeric: null };
    if (value.mode === "min") return { isDefault: false, display: meta?.min ?? "min", numeric: meta?.min ?? null };
    if (value.mode === "max") return { isDefault: false, display: meta?.max ?? "max", numeric: meta?.max ?? null };
    return {
      isDefault: false,
      display: value.value,
      numeric: typeof value.value === "number" ? value.value : null,
    };
  }

  if (value === "default" || value === undefined) return { isDefault: true, display: null, numeric: null };
  if (value === "min" || value === "max") {
    const display = meta?.[value] ?? value;
    return { isDefault: false, display, numeric: typeof display === "number" ? display : null };
  }

  return {
    isDefault: false,
    display: value,
    numeric: typeof value === "number" ? value : null,
  };
}

function toLines(type, value) {
  const v = readHistoryValue(value, type);
  const lines = [];

  if (v === null || v === undefined) return [{ key: type, text: "—" }];

  // Grouped model row: { service, model, type }
  if (
    type === "model" &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    !isModeValue(v) &&
    ("service" in v || "model" in v)
  ) {
    if (v.service !== undefined) lines.push({ key: "service", text: formatValue(v.service) });
    if (v.model !== undefined) lines.push({ key: "model", text: formatValue(v.model) });
    if (v.type !== undefined) lines.push({ key: "type", text: formatValue(v.type) });
    return lines.length ? lines : [{ key: type, text: formatValue(v) }];
  }

  if (type === "prompt" && typeof v === "object" && !Array.isArray(v)) {
    Object.entries(v).forEach(([k, part]) => {
      lines.push({ key: PROMPT_LABELS[k] || k, text: formatValue(part) });
    });
    return lines.length ? lines : [{ key: type, text: formatValue(v) }];
  }

  if (typeof v === "object" && !Array.isArray(v) && !isModeValue(v)) {
    Object.entries(v).forEach(([k, part]) => lines.push({ key: k, text: formatValue(part) }));
    return lines.length ? lines : [{ key: type, text: formatValue(v) }];
  }

  return [{ key: type, text: formatValue(v) }];
}

export function getHistoryDiff(item) {
  const type = item?.type;
  const before = readHistoryValue(item?.previous_value, type);
  const after = readHistoryValue(item?.current_value, type);

  if (isEqual(before, after)) {
    return { beforeLines: [], afterLines: [] };
  }

  return {
    beforeLines: toLines(type, before),
    afterLines: toLines(type, after),
  };
}

function normalizeRevertValue(value, currentConfigValue) {
  if (!isModeValue(currentConfigValue)) {
    if (isModeValue(value)) {
      if (value.mode === "default") return "default";
      if (value.mode === "min") return "min";
      if (value.mode === "max") return "max";
      if (value.mode === "custom") return value.value;
    }
    return value;
  }

  if (isModeValue(value)) return value;
  if (value === "default" || value === null || value === undefined) return { mode: "default", value: null };
  if (value === "min") return { mode: "min", value: null };
  if (value === "max") return { mode: "max", value: null };
  return { mode: "custom", value };
}

export function buildRevertPayload(item, currentVersion = null) {
  const type = item?.type;
  const raw = readHistoryValue(item?.previous_value, type);
  if (raw === undefined) return null;

  const config = currentVersion?.configuration || {};

  // Grouped model + service + type in one history row
  if (type === "model" && raw && typeof raw === "object" && !Array.isArray(raw) && !isModeValue(raw)) {
    const payload = {};
    if (raw.service !== undefined) payload.service = raw.service;
    const configuration = {};
    if (raw.model !== undefined) configuration.model = normalizeRevertValue(raw.model, config.model);
    if (raw.type !== undefined) configuration.type = raw.type;
    if (Object.keys(configuration).length > 0) payload.configuration = configuration;
    return Object.keys(payload).length > 0 ? payload : null;
  }

  const value = CONFIG_KEYS.has(type) || type in config ? normalizeRevertValue(raw, config[type]) : raw;

  if (type === "agents") {
    return { agents: { connected_agents: value, agent_status: "1" } };
  }
  if (CONFIG_KEYS.has(type) || type in config) {
    return { configuration: { [type]: value } };
  }
  if (type === "functionData") {
    return { function_ids: value };
  }
  if (currentVersion?.settings && (type in currentVersion.settings || SETTINGS_KEYS.has(type))) {
    return { settings: { [type]: raw } };
  }
  if (currentVersion?.agent_info && type in currentVersion.agent_info) {
    return { agent_info: { [type]: raw } };
  }
  return { [type]: value };
}

// --- labels & grouping ---

export function isSystemHistoryType(type) {
  return SYSTEM_HISTORY_TYPES.has(type);
}

export function getTypeLabel(type, labels = {}, item = null) {
  if (!type) return "Change";
  if (type === "Version published") return "Version published";
  if (type === "Version created") return "Version created";
  if (type === "Version deleted") return "Version deleted";
  if (type === "Agent created") return "Agent created";

  let base;
  if (PROMPT_TYPES.has(type)) base = labels.prompt || "Prompt";
  else if (type === "response_type") base = "Response type";
  else if (type === "model" && item) {
    const before = readHistoryValue(item.previous_value, type);
    const after = readHistoryValue(item.current_value, type);
    base =
      before?.service !== after?.service
        ? "Model & Service"
        : labels[type] || DIFFERNCE_DATA_DISPLAY_NAME(type) || type;
  } else base = labels[type] || DIFFERNCE_DATA_DISPLAY_NAME(type) || type;

  return isReverted(item) ? `Reverted · ${base}` : base;
}

export function formatTime(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

export function formatDateHeader(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }).toUpperCase();
}

export function splitDraftAndHistory(items = [], lastPublishedAt = null) {
  const visible = items.filter((i) => i?.type);

  let publishTime =
    lastPublishedAt != null && !Number.isNaN(new Date(lastPublishedAt).getTime())
      ? new Date(lastPublishedAt).getTime()
      : null;
  if (publishTime === null) {
    const lastPublish = visible.find((i) => i.type === "Version published");
    publishTime = lastPublish?.time ? new Date(lastPublish.time).getTime() : null;
  }

  const draftItems = visible.filter((i) => {
    if (i.type === "Version published") return false;
    if (SYSTEM_HISTORY_TYPES.has(i.type)) return false;
    if (publishTime === null) return true;
    return new Date(i.time).getTime() > publishTime;
  });

  const draftIds = new Set(draftItems.map((i) => i.id));
  return { draftItems, historyItems: visible.filter((i) => !draftIds.has(i.id)) };
}

export function groupByDate(items = []) {
  const groups = [];
  const seen = new Map();

  items.forEach((item) => {
    const label = formatDateHeader(item?.time);
    if (!seen.has(label)) {
      seen.set(label, groups.length);
      groups.push({ label, items: [] });
    }
    groups[seen.get(label)].items.push(item);
  });

  return groups;
}

export function getChangesForPublish(publishItem, allItems = []) {
  const sorted = [...allItems].sort((a, b) => new Date(b.time) - new Date(a.time));
  const idx = sorted.findIndex((i) => i.id === publishItem.id);
  if (idx === -1) return [];

  const prevPub = sorted.slice(idx + 1).find((i) => i.type === "Version published");
  const cutoff = prevPub ? new Date(prevPub.time).getTime() : null;
  const rows = [];

  for (let i = idx + 1; i < sorted.length; i++) {
    const row = sorted[i];
    if (row.type === "Version published") break;
    if (SYSTEM_HISTORY_TYPES.has(row.type)) continue;
    if (cutoff && new Date(row.time).getTime() <= cutoff) continue;
    if (publishItem.version_id && row.version_id && row.version_id !== publishItem.version_id) continue;
    rows.push(row);
  }

  return rows.reverse();
}
