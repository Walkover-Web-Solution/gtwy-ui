import React, { useState, useEffect } from "react";
import { ChevronDown, CircleQuestionMark } from "lucide-react";
import Modal from "@/components/UI/Modal";
import { MODAL_TYPE, PRE_TOOL_LABELS } from "@/utils/enums";
import { closeModal } from "@/utils/utility";
import { useCustomSelector } from "@/customHooks/customSelector";
import { useDispatch } from "react-redux";
import { getAllKnowBaseDataAction } from "@/store/action/knowledgeBaseAction";
import InfoTooltip from "@/components/InfoTooltip";

const TOOL_CONFIG_SCHEMA = {
  query_refiner: {
    tooltip: "Rewrites the user's query before it reaches the model, making it more specific and search-friendly.",
    configFields: [
      {
        key: "prompt",
        label: "Refinement Prompt",
        type: "textarea",
        placeholder:
          "e.g. Rewrite the user's query to be more specific and search-engine friendly. Focus on intent and remove ambiguity.",
      },
    ],
    argsFields: [],
  },
  rag_knowledgebase: {
    tooltip: "Searches a knowledge base and injects relevant context into the prompt before the AI call.",
    configFields: [{ key: "knowledgebase", label: "Knowledge Base", type: "knowledgebase_select" }],
    argsFields: [],
  },
  gtwy_web_search: {
    tooltip: "Scrapes a specified domain and passes the content as context to the AI.",
    configFields: [
      {
        key: "formats",
        label: "Output Formats",
        type: "multiselect",
        options: [
          { value: "markdown", label: "Markdown" },
          { value: "html", label: "HTML" },
          { value: "links", label: "Links" },
        ],
      },
    ],
    argsFields: [{ key: "url", label: "URL  to Scrape", placeholder: "example.com" }],
  },
};

export default function PrebuiltPreToolConfigModal({ toolEntry, onSave, isPublished, orgId }) {
  const [config, setConfig] = useState({});
  const [args, setArgs] = useState({});
  const [kbSearch, setKbSearch] = useState("");
  const dispatch = useDispatch();
  const [initialConfig, setInitialConfig] = useState({});
  const [initialArgs, setInitialArgs] = useState({});

  const { knowledgeBaseData } = useCustomSelector((state) => ({
    knowledgeBaseData: state?.knowledgeBaseReducer?.knowledgeBaseData?.[orgId] || [],
  }));

  useEffect(() => {
    if (orgId) dispatch(getAllKnowBaseDataAction(orgId));
  }, [orgId]);

  useEffect(() => {
    if (toolEntry) {
      setConfig(toolEntry.config || {});
      setArgs(toolEntry.args || {});
      setInitialConfig(toolEntry.config || {});
      setInitialArgs(toolEntry.args || {});
    }
  }, [toolEntry]);

  const schema = toolEntry ? TOOL_CONFIG_SCHEMA[toolEntry.type] : null;

  const isValidDomain = (input) => {
    const trimmed = input?.trim() || "";
    if (trimmed.length < 3 || trimmed.includes(" ")) return false;
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return false;
    const domainPattern =
      /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
    return domainPattern.test(trimmed);
  };

  const isUnchanged =
    JSON.stringify(config) === JSON.stringify(initialConfig) && JSON.stringify(args) === JSON.stringify(initialArgs);

  const isSaveDisabled =
    isUnchanged ||
    (toolEntry?.type === "rag_knowledgebase" && !config.resource_id) ||
    (toolEntry?.type === "gtwy_web_search" && !isValidDomain(args.url));

  const disabledHint = isUnchanged
    ? "No changes to save."
    : toolEntry?.type === "rag_knowledgebase"
      ? "Please select a knowledge base to save."
      : toolEntry?.type === "gtwy_web_search" && !args.url?.trim()
        ? "Please enter a domain to save."
        : toolEntry?.type === "gtwy_web_search" && !isValidDomain(args.url)
          ? "Please enter a valid domain (e.g. example.com)."
          : null;

  const handleSave = () => {
    onSave({ ...toolEntry, config, args });
    closeModal(MODAL_TYPE.PREBUILT_PRE_TOOL_CONFIG_MODAL);
  };

  const renderConfigField = (field) => {
    if (field.type === "textarea") {
      return (
        <textarea
          className="textarea textarea-bordered text-xs w-full"
          placeholder={field.placeholder}
          value={config[field.key] || ""}
          disabled={isPublished}
          onChange={(e) => setConfig((prev) => ({ ...prev, [field.key]: e.target.value }))}
          rows={3}
        />
      );
    }

    if (field.type === "multiselect") {
      return (
        <div className="flex gap-3 flex-wrap">
          {field.options.map((opt) => (
            <label key={opt.value} className="flex items-center gap-1 cursor-pointer text-xs">
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={(config[field.key] || []).includes(opt.value)}
                disabled={isPublished}
                onChange={(e) => {
                  const current = config[field.key] || [];
                  const updated = e.target.checked ? [...current, opt.value] : current.filter((v) => v !== opt.value);
                  setConfig((prev) => ({ ...prev, [field.key]: updated }));
                }}
              />
              {opt.label}
            </label>
          ))}
        </div>
      );
    }

    if (field.type === "knowledgebase_select") {
      const selected = knowledgeBaseData.find((kb) => kb._id === config.resource_id);
      const filtered = knowledgeBaseData.filter((kb) => kb.title?.toLowerCase().includes(kbSearch.toLowerCase()));
      return (
        <div className="flex flex-col gap-2 w-full">
          <div className="relative w-full">
            <input
              type="text"
              className="input input-bordered input-sm text-xs w-full pr-6"
              placeholder="Search knowledge bases..."
              value={kbSearch}
              disabled={isPublished}
              onChange={(e) => setKbSearch(e.target.value)}
            />
            <ChevronDown className="h-3 w-3 opacity-50 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <ul className="border border-base-300 rounded-box w-full max-h-48 overflow-y-auto flex flex-col bg-base-100">
            {filtered.length === 0 && (
              <li className="text-xs text-base-content/40 px-3 py-2">No knowledge bases found</li>
            )}
            {filtered.map((kb) => (
              <li
                key={kb._id}
                className={`text-xs px-3 py-2 cursor-pointer hover:bg-base-200 ${config.resource_id === kb._id ? "bg-primary/10 text-primary font-medium" : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setConfig((prev) => ({
                    ...prev,
                    resource_id: kb._id,
                    collection_id: kb.collectionId,
                  }));
                  setKbSearch("");
                }}
              >
                {kb.title}
              </li>
            ))}
          </ul>
          {selected && (
            <p className="text-xs text-base-content/60">
              Selected: <span className="font-medium text-base-content">{selected.title}</span>
            </p>
          )}
        </div>
      );
    }

    return (
      <input
        type="text"
        className="input input-bordered input-sm text-xs w-full"
        placeholder={field.placeholder}
        value={config[field.key] || ""}
        disabled={isPublished}
        onChange={(e) => setConfig((prev) => ({ ...prev, [field.key]: e.target.value }))}
      />
    );
  };

  return (
    <Modal MODAL_ID={MODAL_TYPE.PREBUILT_PRE_TOOL_CONFIG_MODAL}>
      {toolEntry && schema ? (
        <div
          className={`modal-box flex flex-col gap-4 overflow-hidden ${toolEntry.type === "rag_knowledgebase" ? "min-h-[400px]" : ""}`}
        >
          <div className="flex items-center gap-1">
            <h3 className="font-semibold text-base">{PRE_TOOL_LABELS[toolEntry.type] || toolEntry.type} Settings</h3>
            {schema.tooltip && (
              <InfoTooltip tooltipContent={schema.tooltip}>
                <CircleQuestionMark size={14} className="text-base-content/40 cursor-help" />
              </InfoTooltip>
            )}
          </div>
          {schema.argsFields.length > 0 && (
            <div className="flex flex-col gap-3">
              {schema.argsFields.map((field) => (
                <div key={field.key} className="flex flex-col gap-1">
                  <label className="text-xs font-medium">{field.label}</label>
                  <input
                    type="text"
                    className="input input-bordered input-sm text-xs w-full"
                    placeholder={field.placeholder}
                    value={args[field.key] || ""}
                    disabled={isPublished}
                    onChange={(e) => setArgs((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          )}

          {schema.configFields.length > 0 && (
            <div className="flex flex-col gap-3">
              {schema.configFields.map((field) => (
                <div key={field.key} className="flex flex-col gap-1">
                  <label className="text-xs font-medium">{field.label}</label>
                  {renderConfigField(field)}
                </div>
              ))}
            </div>
          )}
          <div className={` ${toolEntry.type === "rag_knowledgebase" ? "mt-auto" : "mt-4"}`}>
            {!isPublished && (
              <div className="modal-action mt-0 items-center">
                <form method="dialog">
                  <button className="btn btn-sm">Close</button>
                </form>
                <div className="relative group">
                  {isSaveDisabled && disabledHint && (
                    <span className="absolute bottom-full right-0 mb-1 text-xs text-base-content/50 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      {disabledHint}
                    </span>
                  )}
                  <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={isSaveDisabled}>
                    Save
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </Modal>
  );
}
