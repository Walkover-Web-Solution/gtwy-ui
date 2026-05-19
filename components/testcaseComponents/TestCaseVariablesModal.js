import React, { useState, useEffect, useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { MODAL_TYPE } from "@/utils/enums";
import { closeModal } from "@/utils/utility";
import Modal from "@/components/UI/Modal";

const TestCaseVariablesModal = ({
  testCaseId,
  testCaseVariables = {},
  versionVariables = {},
  showAlert = false,
  onSave,
}) => {
  const [editableVariables, setEditableVariables] = useState({});

  // Compute merged source variables (stable as long as inputs don't change)
  const mergedSource = useMemo(() => {
    const merged = {};
    Object.entries(versionVariables || {}).forEach(([, versionVars]) => {
      if (typeof versionVars === "object" && versionVars !== null) {
        Object.entries(versionVars).forEach(([key, varData]) => {
          if (!(key in merged)) {
            merged[key] = varData?.value || "";
          }
        });
      }
    });
    Object.entries(testCaseVariables || {}).forEach(([key, value]) => {
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

  const handleSave = () => {
    onSave(editableVariables);
    closeModal(MODAL_TYPE.TEST_CASE_VARIABLES_MODAL);
  };

  const handleClose = () => {
    // Reset to source on close so reopening shows fresh state
    setEditableVariables(mergedSource);
    closeModal(MODAL_TYPE.TEST_CASE_VARIABLES_MODAL);
  };

  return (
    <Modal MODAL_ID={MODAL_TYPE.TEST_CASE_VARIABLES_MODAL} onClose={handleClose}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
        <div className="bg-base-100 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-base-300 sticky top-0 bg-base-100">
            <h3 className="text-xl font-semibold">Test Case Variables</h3>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {showAlert && (
              <div className="alert alert-warning bg-warning/10 border border-warning/30 rounded-lg p-4">
                <div className="flex gap-3">
                  <div className="text-warning">
                    <AlertTriangle className="shrink-0 h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-warning">Missing Variable Values</h3>
                    <p className="text-sm text-warning/80 mt-1">
                      Please fill in all variable values before running the test case.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {Object.keys(editableVariables).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(editableVariables).map(([key, value]) => (
                  <div key={key} className="bg-base-50 rounded-lg p-4 border border-base-200">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-base-content mb-2 block">Key</label>
                        <div className="text-sm font-mono bg-base-200 px-3 py-2 rounded text-base-content">{key}</div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-base-content mb-2 block">Value</label>
                        <input
                          type="text"
                          value={typeof value === "string" ? value : JSON.stringify(value)}
                          onChange={(e) => handleVariableChange(key, e.target.value)}
                          className="input input-bordered input-sm bg-base-100 text-sm w-full"
                          placeholder="Enter value"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-base-content/60">No variables available</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 p-6 border-t border-base-300 sticky bottom-0 bg-base-100">
            <button onClick={handleClose} className="btn btn-outline btn-sm">
              Cancel
            </button>
            {showAlert &&
              Object.values(editableVariables).some((value) => !value || value.toString().trim() === "") && (
                <button onClick={handleSave} className="btn btn-warning btn-sm">
                  Run Anyway
                </button>
              )}
            {Object.keys(editableVariables).length > 0 && (
              <button onClick={handleSave} className="btn btn-primary btn-sm">
                Save Variables
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default TestCaseVariablesModal;
