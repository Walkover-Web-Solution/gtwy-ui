"use client";
import React, { useState } from "react";
import { AlertCircle, Braces, Pencil, Plus, Trash2, Wrench, X } from "lucide-react";
import DirectCard from "./DirectCard";
import {
  TOOL_METHODS,
  TOOL_PARAM_TYPES,
  draftToTool,
  createToolDraft,
  createToolParam,
  parseToolsJson,
  toolToDraft,
  validateToolDraft,
} from "@/utils/directCompletion";

const MethodBadge = ({ method }) => (
  <span className="shrink-0 border border-base-content/20 bg-base-200 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-base-content/80">
    {(method || "POST").toUpperCase()}
  </span>
);

const FormLabel = ({ children, hint }) => (
  <span className="mb-1 flex items-baseline justify-between text-xs font-medium text-base-content/70">
    {children}
    {hint && <span className="font-normal text-base-content/45">{hint}</span>}
  </span>
);

const ErrorText = ({ children }) => (
  <p className="flex items-start gap-1.5 text-xs text-error">
    <AlertCircle size={13} className="mt-px shrink-0" />
    {children}
  </p>
);

const ToolForm = ({ initial, onSave, onCancel, tools, editingIndex }) => {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState(null);

  const setField = (key, value) => setDraft((d) => ({ ...d, [key]: value }));
  const setParam = (index, key, value) =>
    setDraft((d) => ({ ...d, params: d.params.map((p, i) => (i === index ? { ...p, [key]: value } : p)) }));

  const handleSave = () => {
    const validationError = validateToolDraft(draft, tools, editingIndex);
    if (validationError) {
      setError(validationError);
      return;
    }
    onSave(draftToTool(draft));
  };

  return (
    <div className="flex flex-col gap-3 border border-base-content/20 bg-base-200/50 p-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-base-content/60">
        {editingIndex === null ? "New tool" : "Edit tool"}
      </span>

      <label className="block">
        <FormLabel>Name</FormLabel>
        <input
          data-testid="direct-tool-name-input"
          className="input input-sm w-full font-mono"
          placeholder="get_weather"
          value={draft.name}
          onChange={(e) => setField("name", e.target.value)}
        />
      </label>

      <div className="block">
        <FormLabel>Endpoint</FormLabel>
        <div className="flex gap-2">
          <select
            data-testid="direct-tool-method-select"
            className="select select-sm w-28 font-mono"
            value={draft.method}
            onChange={(e) => setField("method", e.target.value)}
          >
            {TOOL_METHODS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <input
            data-testid="direct-tool-url-input"
            className="input input-sm w-full font-mono"
            placeholder="https://api.example.com/weather"
            value={draft.url}
            onChange={(e) => setField("url", e.target.value)}
          />
        </div>
      </div>

      <label className="block">
        <FormLabel hint="The model reads this to decide when to call it">Description</FormLabel>
        <textarea
          data-testid="direct-tool-description-input"
          className="textarea textarea-sm w-full"
          rows={2}
          placeholder="Get the current weather for a city"
          value={draft.description}
          onChange={(e) => setField("description", e.target.value)}
        />
      </label>

      <div>
        <FormLabel>Parameters</FormLabel>
        <div className="flex flex-col gap-1.5">
          {draft.params.map((param, index) => (
            <div key={index} className="flex flex-col gap-1.5 border border-base-content/10 bg-base-100 p-2">
              <div className="flex items-center gap-1.5">
                <input
                  data-testid={`direct-tool-param-name-${index}`}
                  className="input input-xs min-w-0 flex-1 font-mono"
                  placeholder="name"
                  value={param.name}
                  onChange={(e) => setParam(index, "name", e.target.value)}
                />
                <select
                  data-testid={`direct-tool-param-type-${index}`}
                  className="select select-xs w-24 shrink-0"
                  value={param.type}
                  onChange={(e) => setParam(index, "type", e.target.value)}
                >
                  {TOOL_PARAM_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs btn-square shrink-0"
                  onClick={() => setDraft((d) => ({ ...d, params: d.params.filter((_, i) => i !== index) }))}
                  aria-label="Remove parameter"
                >
                  <X size={12} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  className="input input-xs min-w-0 flex-1"
                  placeholder="What the model should pass here"
                  value={param.description}
                  onChange={(e) => setParam(index, "description", e.target.value)}
                />
                <label className="flex shrink-0 cursor-pointer items-center gap-1 text-[11px] text-base-content/70">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-xs"
                    checked={param.required}
                    onChange={(e) => setParam(index, "required", e.target.checked)}
                  />
                  Required
                </label>
              </div>
            </div>
          ))}
          <button
            type="button"
            data-testid="direct-tool-add-param-button"
            className="btn btn-ghost btn-xs self-start gap-1 text-base-content/70"
            onClick={() => setDraft((d) => ({ ...d, params: [...d.params, createToolParam()] }))}
          >
            <Plus size={12} /> Add parameter
          </button>
        </div>
      </div>

      <label className="block">
        <FormLabel hint="Optional JSON object">Headers</FormLabel>
        <textarea
          data-testid="direct-tool-headers-input"
          className="textarea textarea-sm w-full font-mono text-xs"
          rows={2}
          placeholder='{ "Authorization": "Bearer …" }'
          value={draft.headers}
          onChange={(e) => setField("headers", e.target.value)}
        />
      </label>

      {error && <ErrorText>{error}</ErrorText>}

      <div className="flex justify-end gap-2 border-t border-base-content/10 pt-3">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          data-testid="direct-tool-save-button"
          className="btn btn-primary btn-sm"
          onClick={handleSave}
        >
          {editingIndex === null ? "Add tool" : "Save changes"}
        </button>
      </div>
    </div>
  );
};

const JsonToolsEditor = ({ tools, onChange, onClose }) => {
  const [text, setText] = useState(JSON.stringify(tools, null, 2));
  const [error, setError] = useState(null);

  const apply = () => {
    const { tools: parsed, error: parseError } = parseToolsJson(text);
    if (parseError) {
      setError(parseError);
      return;
    }
    onChange(parsed);
    onClose();
  };

  return (
    <div className="flex flex-col gap-2">
      <textarea
        data-testid="direct-tools-json-input"
        className="textarea w-full bg-base-200/50 font-mono text-xs leading-relaxed"
        rows={14}
        spellCheck={false}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <p className="text-[11px] leading-relaxed text-base-content/55">
        An array of <code className="font-mono">{"{ name, description, url, method, headers, fields, required }"}</code>
        , where <code className="font-mono">fields</code> is a JSON-schema properties object.
      </p>
      {error && <ErrorText>{error}</ErrorText>}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
          Cancel
        </button>
        <button type="button" data-testid="direct-tools-json-apply" className="btn btn-primary btn-sm" onClick={apply}>
          Apply
        </button>
      </div>
    </div>
  );
};

const ToolRow = ({ tool, onEdit, onDelete, disabled }) => {
  const fields = Object.keys(tool.fields || {});
  const required = tool.required || [];
  return (
    <div className="group flex items-start gap-3 border border-base-content/10 px-3 py-2.5 transition-colors hover:border-base-content/25">
      <MethodBadge method={tool.method} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-mono text-sm font-medium text-base-content">{tool.name}</div>
        <div className="truncate font-mono text-[11px] text-base-content/50">{tool.url}</div>
        {tool.description && <div className="mt-1 line-clamp-2 text-xs text-base-content/70">{tool.description}</div>}
        {fields.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {fields.map((field) => (
              <span
                key={field}
                className="border border-base-content/10 bg-base-200 px-1.5 py-px font-mono text-[10px] text-base-content/70"
              >
                {field}
                {required.includes(field) && <span className="text-error">*</span>}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex shrink-0 gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          className="btn btn-ghost btn-xs btn-square"
          onClick={onEdit}
          disabled={disabled}
          aria-label={`Edit ${tool.name}`}
        >
          <Pencil size={12} />
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-xs btn-square hover:text-error"
          onClick={onDelete}
          disabled={disabled}
          aria-label={`Delete ${tool.name}`}
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
};

// Tools defined here are sent with each request as extra_tools; nothing is saved to an agent
// or fetched from viaSocket.
const RuntimeToolsEditor = ({ tools, onChange }) => {
  const [editingIndex, setEditingIndex] = useState(null); // number | "new" | null
  const [jsonMode, setJsonMode] = useState(false);
  const isIdle = !jsonMode && editingIndex === null;

  const saveTool = (tool) => {
    if (editingIndex === "new") onChange([...tools, tool]);
    else onChange(tools.map((t, i) => (i === editingIndex ? tool : t)));
    setEditingIndex(null);
  };

  const actions = isIdle && (
    <>
      <button
        type="button"
        data-testid="direct-tools-json-toggle"
        className="btn btn-ghost btn-xs gap-1 text-base-content/70"
        onClick={() => setJsonMode(true)}
      >
        <Braces size={12} /> JSON
      </button>
      {tools.length > 0 && (
        <button
          type="button"
          data-testid="direct-tools-add-button"
          className="btn btn-outline btn-xs gap-1"
          onClick={() => setEditingIndex("new")}
        >
          <Plus size={12} /> Add
        </button>
      )}
    </>
  );

  return (
    <DirectCard
      icon={Wrench}
      title={
        <span className="flex items-center gap-2">
          Tools
          {tools.length > 0 && (
            <span className="bg-base-content/10 px-1.5 text-[10px] font-semibold tabular-nums">{tools.length}</span>
          )}
        </span>
      }
      description="HTTP endpoints the model can call"
      actions={actions}
      testId="direct-tools-card"
    >
      {jsonMode ? (
        <JsonToolsEditor tools={tools} onChange={onChange} onClose={() => setJsonMode(false)} />
      ) : (
        <div className="flex flex-col gap-2">
          {tools.length === 0 && editingIndex === null && (
            <div className="flex flex-col items-center gap-2 border border-dashed border-base-content/20 px-4 py-6 text-center">
              <Wrench size={18} className="text-base-content/35" />
              <p className="text-xs text-base-content/60">
                No tools yet. Give the model an API it can call while answering.
              </p>
              <button
                type="button"
                data-testid="direct-tools-add-button"
                className="btn btn-outline btn-xs mt-1 gap-1"
                onClick={() => setEditingIndex("new")}
              >
                <Plus size={12} /> Add a tool
              </button>
            </div>
          )}
          {tools.map((tool, index) =>
            editingIndex === index ? (
              <ToolForm
                key={index}
                initial={toolToDraft(tool)}
                tools={tools}
                editingIndex={index}
                onSave={saveTool}
                onCancel={() => setEditingIndex(null)}
              />
            ) : (
              <ToolRow
                key={index}
                tool={tool}
                disabled={editingIndex !== null}
                onEdit={() => setEditingIndex(index)}
                onDelete={() => onChange(tools.filter((_, i) => i !== index))}
              />
            )
          )}
          {editingIndex === "new" && (
            <ToolForm
              initial={createToolDraft()}
              tools={tools}
              editingIndex={null}
              onSave={saveTool}
              onCancel={() => setEditingIndex(null)}
            />
          )}
        </div>
      )}
    </DirectCard>
  );
};

export default RuntimeToolsEditor;
