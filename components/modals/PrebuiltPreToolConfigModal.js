import React, { useState, useEffect } from "react";
import Modal from "@/components/UI/Modal";
import { MODAL_TYPE, PRE_TOOL_LABELS } from "@/utils/enums";
import { closeModal } from "@/utils/utility";
import { useCustomSelector } from "@/customHooks/customSelector";
import { useDispatch } from "react-redux";
import { getAllKnowBaseDataAction } from "@/store/action/knowledgeBaseAction";

const TOOL_CONFIG_SCHEMA = {
  query_refiner: {
    configFields: [
      { key: "prompt", label: "Refinement Prompt", type: "textarea", placeholder: "e.g. Rewrite the user's query to be more specific and search-engine friendly. Focus on intent and remove ambiguity." },
    ],
    argsFields: [],
  },
  rag_knowledgebase: {
    configFields: [
      { key: "knowledgebase", label: "Knowledge Base", type: "knowledgebase_select" },
    ],
   argsFields: [],
  },
  gtwy_web_search: {
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
    argsFields: [
      { key: "url", label: "URL  to Scrape", placeholder: "example.com" },
    ],
  },
};


export default function PrebuiltPreToolConfigModal({ toolEntry, onSave, isPublished, orgId }) {
  const [config, setConfig] = useState({});
  const [args, setArgs] = useState({});
  const [kbSearch, setKbSearch] = useState("");
  const dispatch = useDispatch();

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
    }
  }, [toolEntry]);

  const schema = toolEntry ? TOOL_CONFIG_SCHEMA[toolEntry.type] : null;

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
                  const updated = e.target.checked
                    ? [...current, opt.value]
                    : current.filter((v) => v !== opt.value);
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
      const filtered = knowledgeBaseData.filter((kb) =>
        kb.title?.toLowerCase().includes(kbSearch.toLowerCase())
      );
      return (
        <div className="dropdown w-full">
          <div
            tabIndex={0}
            className="input input-bordered input-sm text-xs w-full flex items-center cursor-pointer"
          >
            {selected ? selected.title : <span className="text-base-content/40">Select a knowledge base...</span>}
          </div>
          <ul
            tabIndex={0}
            className="dropdown-content menu shadow bg-base-100 rounded-box w-full max-h-56 overflow-y-auto z-50 p-2"
          >
            <li>
              <input
                type="text"
                className="input input-bordered input-xs w-full mb-1"
                placeholder="Search..."
                value={kbSearch}
                onChange={(e) => setKbSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </li>
            {filtered.length === 0 && (
              <li className="text-xs text-base-content/40 px-2">No knowledge bases found</li>
            )}
            {filtered.map((kb) => (
              <li
                key={kb._id}
                onClick={() => {
                  setConfig((prev) => ({
                    ...prev,
                     resource_id: kb._id,
  collection_id: kb.collectionId,
                  }));
                  setKbSearch("");
                  document.activeElement?.blur?.();
                }}
              >
                <a className={`text-xs ${config.resource_id === kb._id ? "active" : ""}`}>
                  {kb.title}
                </a>
              </li>
            ))}
          </ul>
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
        <div className="modal-box flex flex-col gap-4">
          <h3 className="font-semibold text-base">
            {PRE_TOOL_LABELS[toolEntry.type] || toolEntry.type} Settings
          </h3>

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
              <p className="text-xs font-semibold text-base-content/60 uppercase tracking-wide">Configuration</p>
              {schema.configFields.map((field) => (
                <div key={field.key} className="flex flex-col gap-1">
                  <label className="text-xs font-medium">{field.label}</label>
                  {renderConfigField(field)}
                </div>
              ))}
            </div>
          )}

          {!isPublished && (
            <div className="modal-action">
              <button className="btn btn-primary btn-sm" onClick={handleSave}>Save</button>
              <form method="dialog">
                <button className="btn btn-sm">Cancel</button>
              </form>
            </div>
          )}
        </div>
      ) : null}
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </Modal>
  );
}
