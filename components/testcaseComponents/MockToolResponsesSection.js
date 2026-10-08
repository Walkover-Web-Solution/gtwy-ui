import React, { useState, useMemo, useRef, forwardRef, useImperativeHandle, useEffect } from "react";
import { ChevronDown, Trash2, Info } from "lucide-react";
import AutoResizeTextarea from "@/components/UI/AutoResizeTextarea";
import InfoTooltip from "@/components/InfoTooltip";

// Pulls the list of tool names (script_id) actually attached to a bridge, across
// every version plus the published snapshot, from the same redux slices the
// bridge/agent tool configuration screen (EmbedList) already reads.
export function computeBridgeToolOptions({ functionData, versionMapping, publishedFunctionIds }) {
  const idSet = new Set(publishedFunctionIds || []);
  Object.values(versionMapping || {}).forEach((v) => {
    (v?.function_ids || []).forEach((id) => idSet.add(id));
  });
  const seen = new Set();
  const tools = [];
  idSet.forEach((id) => {
    const fn = functionData?.[id];
    if (fn?.script_id && !seen.has(fn.script_id)) {
      seen.add(fn.script_id);
      tools.push({ name: fn.script_id, title: fn.title || fn.script_id });
    }
  });
  return tools;
}

function jsonToText(value, fallback) {
  if (value === undefined) return fallback;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return fallback;
  }
}

function validateJson(text) {
  try {
    JSON.parse(text);
    return "";
  } catch {
    return "Invalid JSON";
  }
}

function createEmptyToolState(existingEntry) {
  const recordings = Array.isArray(existingEntry?.recordings)
    ? existingEntry.recordings.map((r) => ({
        argsText: jsonToText(r?.args, "{}"),
        responseText: jsonToText(r?.response, "null"),
        argsError: "",
        responseError: "",
      }))
    : [];
  return { recordings };
}

function buildInitialState(tools, initialValue) {
  const state = {};
  (tools || []).forEach((t) => {
    state[t.name] = createEmptyToolState(initialValue?.[t.name]);
  });
  // Preserve mocks configured for a tool that's no longer attached to the bridge
  // (e.g. removed from the version since) rather than silently dropping them.
  Object.keys(initialValue || {}).forEach((toolName) => {
    if (!state[toolName]) {
      state[toolName] = createEmptyToolState(initialValue[toolName]);
    }
  });
  return state;
}

// Assembles the `tools_response` shape the backend expects, skipping any tool
// with no recordings (it just runs live). No UI for default_response/ignore_fields
// currently, so neither key is stored.
export function buildToolsResponsePayload(toolStates) {
  const toolsResponse = {};
  const errors = [];
  Object.entries(toolStates || {}).forEach(([toolName, state]) => {
    const recordings = [];
    (state?.recordings || []).forEach((rec, idx) => {
      let args;
      let response;
      let ok = true;
      try {
        args = JSON.parse(rec.argsText ?? "");
      } catch {
        errors.push(`${toolName} · recording #${idx + 1}: args is not valid JSON`);
        ok = false;
      }
      try {
        response = JSON.parse(rec.responseText ?? "");
      } catch {
        errors.push(`${toolName} · recording #${idx + 1}: response is not valid JSON`);
        ok = false;
      }
      if (ok) recordings.push({ args, response });
    });

    if (recordings.length === 0) return; // nothing configured — omit, runs live

    toolsResponse[toolName] = { recordings };
  });
  return { toolsResponse, errors };
}

/**
 * Per-testcase "Preset Tool Response" editor. Fully self-contained state.
 * Two ways the parent gets the assembled payload:
 *  - `ref.current.getPayload()` — pull-based, for a form that saves everything at submit time.
 *  - `onBlurSave(toolsResponse)` — push-based, fired automatically after a JSON field is blurred
 *    or a recording/tool is added/removed, for a screen that autosaves (no explicit Save button).
 */
const MockToolResponsesSection = forwardRef(function MockToolResponsesSection(
  { tools = [], initialValue, resetKey, onBlurSave },
  ref
) {
  const [toolStates, setToolStates] = useState(() => buildInitialState(tools, initialValue));
  const [isSectionOpen, setIsSectionOpen] = useState(false);
  const [expandedTools, setExpandedTools] = useState({});
  // Set right before a button-driven mutation (remove recording) so the
  // effect below fires the autosave once React commits the resulting state — reading
  // `onBlurSave` synchronously after `setToolStates` would still see the pre-update state.
  const pendingSaveRef = useRef(false);

  // Full reset when switching to a different testcase (or opening the create form fresh).
  // Everything starts collapsed — the section itself and every tool row.
  useEffect(() => {
    setToolStates(buildInitialState(tools, initialValue));
    setExpandedTools({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  // Additive merge when the bridge's tool list loads/changes without wiping edits in progress.
  useEffect(() => {
    setToolStates((prev) => {
      let changed = false;
      const next = { ...prev };
      (tools || []).forEach((t) => {
        if (!next[t.name]) {
          next[t.name] = createEmptyToolState(initialValue?.[t.name]);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tools]);

  useImperativeHandle(ref, () => ({ getPayload: () => buildToolsResponsePayload(toolStates) }), [toolStates]);

  // Fires only when a button-driven mutation flagged `pendingSaveRef` — a plain keystroke
  // (onChange) also changes toolStates but leaves the flag false, so it's a no-op here.
  useEffect(() => {
    if (!pendingSaveRef.current) return;
    pendingSaveRef.current = false;
    const { toolsResponse, errors } = buildToolsResponsePayload(toolStates);
    if (errors.length === 0) onBlurSave?.(toolsResponse);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolStates]);

  // Used directly on JSON field blur — by the time blur fires, toolStates already
  // reflects every prior onChange for that field, so no staleness concern here.
  const commitSave = () => {
    const { toolsResponse, errors } = buildToolsResponsePayload(toolStates);
    if (errors.length === 0) onBlurSave?.(toolsResponse);
  };

  // Only show tools that already have at least one recorded response; a tool with none has nothing to show.
  const displayTools = useMemo(() => {
    const known = new Map((tools || []).map((t) => [t.name, t]));
    const names = new Set([...(tools || []).map((t) => t.name), ...Object.keys(toolStates)]);
    return Array.from(names)
      .filter((name) => (toolStates[name]?.recordings?.length || 0) > 0)
      .map((name) => ({
        name,
        title: known.get(name)?.title || name,
      }));
  }, [tools, toolStates]);

  const updateToolState = (toolName, updater) => {
    setToolStates((prev) => ({ ...prev, [toolName]: updater(prev[toolName] || createEmptyToolState()) }));
  };

  const removeRecording = (toolName, idx) => {
    pendingSaveRef.current = true;
    updateToolState(toolName, (s) => ({ ...s, recordings: s.recordings.filter((_, i) => i !== idx) }));
  };

  const updateRecordingField = (toolName, idx, field, text) =>
    updateToolState(toolName, (s) => {
      const recordings = [...s.recordings];
      const errorField = field === "argsText" ? "argsError" : "responseError";
      recordings[idx] = { ...recordings[idx], [field]: text, [errorField]: validateJson(text) };
      return { ...s, recordings };
    });

  return (
    <div
      className="bg-base-50 rounded-lg border border-base-200 overflow-hidden"
      data-testid="mock-tool-responses-section"
    >
      <button
        type="button"
        onClick={() => setIsSectionOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-base-100 transition-colors"
        data-testid="mock-tool-responses-toggle"
      >
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-base-content">Preset Tool Response</span>
          <InfoTooltip tooltipContent="Configure the response returned by the tool when running a test case.">
            <Info size={13} className="text-base-content/40" />
          </InfoTooltip>
        </div>
        <ChevronDown
          size={16}
          className={`text-base-content/40 transition-transform ${isSectionOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isSectionOpen && (
        <div className="px-4 pb-4 pt-1 border-t border-base-200 space-y-2">
          {displayTools.length === 0 ? (
            <div className="text-xs text-base-content/50 italic" data-testid="mock-tool-responses-empty">
              {(tools || []).length === 0
                ? "No tools are configured on this bridge yet."
                : "No response configured yet for any tool."}
            </div>
          ) : (
            displayTools.map((tool) => {
              const state = toolStates[tool.name] || createEmptyToolState();
              const expanded = !!expandedTools[tool.name];
              return (
                <div
                  key={tool.name}
                  className="border border-base-200 rounded-lg bg-base-100 overflow-hidden"
                  data-testid={`mock-tool-row-${tool.name}`}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedTools((prev) => ({ ...prev, [tool.name]: !prev[tool.name] }))}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-base-50 transition-colors"
                    data-testid={`mock-tool-toggle-${tool.name}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-xs font-semibold text-base-content truncate">{tool.name}</span>
                      {tool.title && tool.title !== tool.name && (
                        <span className="text-xs text-base-content/50 truncate">({tool.title})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <ChevronDown
                        size={14}
                        className={`text-base-content/40 transition-transform ${expanded ? "rotate-180" : ""}`}
                      />
                    </div>
                  </button>

                  {expanded && (
                    <div className="px-3 pb-3 pt-1 border-t border-base-200 space-y-3">
                      {state.recordings.map((rec, idx) => (
                        <div
                          key={idx}
                          className="border border-base-200 rounded-md p-2 bg-base-50 space-y-2"
                          data-testid={`mock-tool-recording-${tool.name}-${idx}`}
                        >
                          <div className="flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => removeRecording(tool.name, idx)}
                              className="p-1 rounded hover:bg-error/10 text-error"
                              title="Remove"
                              data-testid={`mock-tool-remove-recording-${tool.name}-${idx}`}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                          <div>
                            <label className="text-[10px] uppercase tracking-wide text-base-content/50">
                              Args (JSON)
                            </label>
                            <AutoResizeTextarea
                              value={rec.argsText}
                              onChange={(e) => updateRecordingField(tool.name, idx, "argsText", e.target.value)}
                              onBlur={commitSave}
                              className="w-full font-mono text-xs textarea textarea-xs bg-base-100 leading-relaxed"
                              data-testid={`mock-tool-args-${tool.name}-${idx}`}
                            />
                            {rec.argsError && <div className="text-error text-[11px] mt-0.5">{rec.argsError}</div>}
                          </div>
                          <div>
                            <label className="text-[10px] uppercase tracking-wide text-base-content/50">
                              Response (JSON)
                            </label>
                            <AutoResizeTextarea
                              value={rec.responseText}
                              onChange={(e) => updateRecordingField(tool.name, idx, "responseText", e.target.value)}
                              onBlur={commitSave}
                              className="w-full font-mono text-xs textarea textarea-xs bg-base-100 leading-relaxed"
                              data-testid={`mock-tool-response-${tool.name}-${idx}`}
                            />
                            {rec.responseError && (
                              <div className="text-error text-[11px] mt-0.5">{rec.responseError}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
});

export default MockToolResponsesSection;
