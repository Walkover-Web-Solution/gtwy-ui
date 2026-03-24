import React from "react";
import Modal from "../UI/Modal";
import ComparisonCheck from "@/utils/comparisonCheck";
import { MODAL_TYPE, PROMPT_SECTION_CONFIG } from "@/utils/enums";
import { closeModal } from "@/utils/utility";
import { preprocessPrompt } from "@/utils/promptUtils";
import { CloseIcon } from "@/components/Icons";

const Diff_Modal = ({ oldContent, newContent, isEmbedCustomPrompt = false }) => {
  const oldIsObject = oldContent !== null && typeof oldContent === "object" && !Array.isArray(oldContent);
  const newIsObject = newContent !== null && typeof newContent === "object" && !Array.isArray(newContent);

  const oldProcessed = isEmbedCustomPrompt ? (oldIsObject ? oldContent : {}) : preprocessPrompt(oldContent);
  const newProcessed = isEmbedCustomPrompt ? (newIsObject ? newContent : {}) : preprocessPrompt(newContent);

  // Detect type mismatch: one side is plain string, other is object
  const typeMismatch = isEmbedCustomPrompt && oldIsObject !== newIsObject;

  const allKeys = new Set([...Object.keys(oldProcessed || {}), ...Object.keys(newProcessed || {})]);

  const getLabel = (key) => {
    if (!isEmbedCustomPrompt && PROMPT_SECTION_CONFIG[key]?.label) {
      return PROMPT_SECTION_CONFIG[key].label;
    }
    return key.charAt(0).toUpperCase() + key.slice(1);
  };

  const configKeys = Object.keys(PROMPT_SECTION_CONFIG);
  const sortedKeys = Array.from(allKeys).sort((a, b) => {
    if (!isEmbedCustomPrompt) {
      const aIdx = configKeys.indexOf(a);
      const bIdx = configKeys.indexOf(b);
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
    }
    return a.localeCompare(b);
  });

  return (
    <Modal MODAL_ID={MODAL_TYPE.DIFF_PROMPT} onClose={() => closeModal(MODAL_TYPE.DIFF_PROMPT)}>
      <div id="diff-modal-box" className="modal-box max-w-[80%] h-auto max-h-[85vh] flex flex-col">
        <div id="diff-modal-header" className="flex justify-between items-center mb-4 flex-shrink-0">
          <h3 className="text-lg font-bold">Compare Published Prompt and Current Prompt</h3>
          <button
            data-testid="diff-modal-close-button"
            id="diff-modal-close-button"
            onClick={() => closeModal(MODAL_TYPE.DIFF_PROMPT)}
            className="btn btn-sm btn-ghost"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {typeMismatch ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="card bg-base-200 shadow-sm">
                <div className="card-body p-4">
                  <h4 className="font-semibold text-sm mb-2 text-base-content/60">Previous (string)</h4>
                  <pre className="text-sm whitespace-pre-wrap break-words">
                    {typeof oldContent === "string" ? oldContent : JSON.stringify(oldContent, null, 2)}
                  </pre>
                </div>
              </div>
              <div className="card bg-base-200 shadow-sm">
                <div className="card-body p-4">
                  <h4 className="font-semibold text-sm mb-2 text-base-content/60">Current (structured)</h4>
                  {Object.entries(newIsObject ? newContent : oldContent).map(([key, val]) => (
                    <div key={key} className="mb-2">
                      <span className="text-xs font-medium text-base-content/60 capitalize">{key}: </span>
                      <span className="text-sm">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {sortedKeys.map((key) => {
                const oldVal = oldProcessed?.[key] ?? "";
                const newVal = newProcessed?.[key] ?? "";

                if (!oldVal && !newVal) return null;

                return (
                  <div key={key} className="mb-6 card bg-base-200 shadow-sm">
                    <div className="card-body p-4">
                      <h4 className="font-semibold text-sm mb-2">{getLabel(key)}</h4>
                      <ComparisonCheck oldContent={oldVal} newContent={newVal} />
                    </div>
                  </div>
                );
              })}

              {sortedKeys.length === 0 && <div className="alert alert-info">No comparison data available.</div>}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default Diff_Modal;
