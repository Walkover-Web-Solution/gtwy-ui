import React, { useState, useEffect, useMemo } from "react";
import { AlertTriangle, SlidersHorizontal } from "lucide-react";
import { MODAL_TYPE } from "@/utils/enums";
import { closeModal } from "@/utils/utility";
import Modal from "@/components/UI/Modal";
import AutoResizeTextarea from "@/components/UI/AutoResizeTextarea";

const TestCaseVariablesModal = ({
  testCaseId,
  testCaseVariables = {},
  versionVariables = {},
  showAlert = false,
  onSave,
}) => {
  const [editableVariables, setEditableVariables] = useState({});

  const mergedSource = useMemo(() => {
    const merged = {};
    Object.entries(versionVariables || {}).forEach(([, versionVars]) => {
      if (typeof versionVars === "object" && versionVars !== null) {
        Object.entries(versionVars).forEach(([key, varData]) => {
          if (key === "pre_function") return;
          if (!(key in merged)) {
            merged[key] = varData?.value || "";
          }
        });
      }
    });
    Object.entries(testCaseVariables || {}).forEach(([key, value]) => {
      if (key === "pre_function") return;
      merged[key] = value ?? "";
    });
    return merged;
  }, [testCaseVariables, versionVariables]);

  // Reset editableVariables when test case changes or source variables change
  useEffect(() => {
    setEditableVariables(mergedSource);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testCaseId, mergedSource]);

  const handleVariableChange = (key, newValue) => {
    setEditableVariables((prev) => ({
      ...prev,
      [key]: newValue,
    }));
  };

  const handleVariableBlur = (key) => {
    setEditableVariables((prev) => {
      const current = prev[key];
      if (typeof current !== "string") return prev;
      const trimmed = current.trim();
      if (trimmed === current) return prev;
      return { ...prev, [key]: trimmed };
    });
  };

  // Build the trimmed payload that will be saved
  const trimmedVariables = useMemo(() => {
    const out = {};
    Object.entries(editableVariables).forEach(([key, value]) => {
      out[key] = typeof value === "string" ? value.trim() : value;
    });
    return out;
  }, [editableVariables]);

  // Detect whether anything actually changed vs. the merged source
  const isDirty = useMemo(() => {
    const sourceKeys = Object.keys(mergedSource || {});
    const editedKeys = Object.keys(trimmedVariables || {});
    if (sourceKeys.length !== editedKeys.length) return true;
    return editedKeys.some((key) => {
      const sourceVal = typeof mergedSource[key] === "string" ? mergedSource[key].trim() : mergedSource[key];
      return trimmedVariables[key] !== sourceVal;
    });
  }, [trimmedVariables, mergedSource]);

  const handleSave = () => {
    onSave(trimmedVariables);
    closeModal(MODAL_TYPE.TEST_CASE_VARIABLES_MODAL);
  };

  const handleClose = () => {
    // Reset to source on close so reopening shows fresh state
    setEditableVariables(mergedSource);
    closeModal(MODAL_TYPE.TEST_CASE_VARIABLES_MODAL);
  };

  return (
    <Modal
      MODAL_ID={MODAL_TYPE.TEST_CASE_VARIABLES_MODAL}
      title="Evaluation Variables"
      description="Configure values for the variables used in this test case"
      icon={<SlidersHorizontal size={16} className="text-primary" />}
      widthClass="w-[min(672px,92vw)]"
      onClose={handleClose}
      footer={
        <>
          <button
            onClick={handleClose}
            className="btn btn-sm btn-outline"
            data-testid="testcase-variables-cancel-button"
          >
            Cancel
          </button>
          {showAlert && Object.values(editableVariables).some((value) => !value || value.toString().trim() === "") && (
            <button
              onClick={handleSave}
              className="btn btn-warning btn-sm"
              data-testid="testcase-variables-run-anyway-button"
            >
              Run Anyway
            </button>
          )}
          {Object.keys(editableVariables).length > 0 && (
            <button
              onClick={handleSave}
              disabled={!isDirty}
              className="btn btn-primary btn-sm"
              data-testid="testcase-variables-save-button"
            >
              Save Variables
            </button>
          )}
        </>
      }
    >
      <div className="space-y-4 text-xs" data-testid="testcase-variables-modal-content">
        {showAlert && (
          <div
            className="alert alert-warning bg-warning/10 border border-warning/30 rounded-lg p-3"
            data-testid="testcase-variables-modal-alert"
          >
            <div className="flex gap-3">
              <div className="text-warning">
                <AlertTriangle className="shrink-0 h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-xs text-warning">Missing Variable Values</h3>
                <p className="text-[11px] text-warning/80 mt-0.5">
                  Please fill in all variable values before running the test case.
                </p>
              </div>
            </div>
          </div>
        )}

        {Object.keys(editableVariables).length > 0 ? (
          <div className="space-y-3" data-testid="testcase-variables-list">
            {Object.entries(editableVariables).map(([key, value]) => (
              <div
                key={key}
                className="bg-base-200/40 rounded-lg p-4 border border-base-content/10"
                data-testid={`testcase-variables-item-${key}`}
              >
                <div className="grid grid-cols-2 gap-4 items-start">
                  <div data-testid={`testcase-variables-key-block-${key}`}>
                    <label
                      className="text-xs font-semibold text-base-content mb-1.5 block"
                      data-testid={`testcase-variables-key-label-${key}`}
                    >
                      Key
                    </label>
                    <div
                      className="text-[11px] font-mono bg-base-200 px-3 py-2 rounded text-base-content break-all whitespace-pre-wrap border border-base-content/10 select-all"
                      data-testid={`testcase-variables-key-value-${key}`}
                    >
                      {key}
                    </div>
                  </div>
                  <div data-testid={`testcase-variables-value-block-${key}`}>
                    <label
                      className="text-xs font-semibold text-base-content mb-1.5 block"
                      data-testid={`testcase-variables-value-label-${key}`}
                    >
                      Value
                    </label>
                    <AutoResizeTextarea
                      data-testid={`testcase-variables-value-input-${key}`}
                      value={typeof value === "string" ? value : JSON.stringify(value)}
                      onChange={(e) => handleVariableChange(key, e.target.value)}
                      onBlur={() => handleVariableBlur(key)}
                      placeholder="Enter value"
                      className="textarea textarea-bordered textarea-sm bg-base-100 text-xs w-full leading-relaxed resize-y min-h-[38px]"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8" data-testid="testcase-variables-empty-state">
            <p className="text-base-content/60">No variables available</p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default TestCaseVariablesModal;
