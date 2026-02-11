import React from "react";
import Modal from "../UI/Modal";
import ComparisonCheck from "@/utils/comparisonCheck";
import { MODAL_TYPE } from "@/utils/enums";
import { closeModal } from "@/utils/utility";
import { preprocessPrompt } from "@/utils/promptUtils";
import { CloseIcon } from "@/components/Icons";

const Diff_Modal = ({ oldContent, newContent }) => {
  const oldProcessed = preprocessPrompt(oldContent);
  const newProcessed = preprocessPrompt(newContent);

  // Collect all unique keys from both objects
  // We want to flatten the structure slightly:
  // - Top level keys (role, goal, instruction, customPrompt)
  // - Nested embedFields keys (if they exist)

  const getAllKeys = (obj) => {
    const keys = [];
    if (!obj) return keys;

    Object.keys(obj).forEach((key) => {
      if (key === "embedFields" && typeof obj[key] === "object" && !Array.isArray(obj[key])) {
        // Add nested embed fields
        Object.keys(obj[key]).forEach((subKey) => keys.push(`embedFields.${subKey}`));
      } else {
        keys.push(key);
      }
    });
    return keys;
  };

  const allKeys = new Set([...getAllKeys(oldProcessed), ...getAllKeys(newProcessed)]);

  // Helper to access nested values
  const getValue = (obj, path) => {
    if (!obj) return "";
    if (path.startsWith("embedFields.")) {
      const fieldName = path.split(".")[1];
      return obj.embedFields?.[fieldName] || "";
    }
    return obj[path];
  };

  // Filter keys we explicitly care about or all if generic
  // Prioritize standard fields
  const standardFields = ["role", "goal", "instruction", "customPrompt", "defaultPromptText"];
  const sortedKeys = Array.from(allKeys).sort((a, b) => {
    // Custom sort: standard fields first
    const aIdx = standardFields.indexOf(a);
    const bIdx = standardFields.indexOf(b);
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
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
          {sortedKeys.map((key) => {
            // Exclude internal keys or empty objects if needed, but ComparisonCheck handles empties efficiently usually.
            // We skip 'embedFields' top key because we processed its children
            if (key === "embedFields") return null;

            const oldVal = getValue(oldProcessed, key);
            const newVal = getValue(newProcessed, key);

            // Skip if both are empty/null to reduce noise
            if (!oldVal && !newVal) return null;

            let displayName = key;
            if (key.startsWith("embedFields.")) displayName = key.split(".")[1];

            return (
              <div key={key} className="mb-6 card bg-base-200 shadow-sm">
                <div className="card-body p-4">
                  <h4 className="font-semibold text-sm mb-2 capitalize">{displayName}</h4>
                  <ComparisonCheck oldContent={oldVal} newContent={newVal} />
                </div>
              </div>
            );
          })}

          {sortedKeys.length === 0 && <div className="alert alert-info">No comparison data available.</div>}
        </div>
      </div>
    </Modal>
  );
};

export default Diff_Modal;
