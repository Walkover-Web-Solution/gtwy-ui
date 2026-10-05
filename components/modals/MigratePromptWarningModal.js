import { MODAL_TYPE } from "@/utils/enums";
import { closeModal } from "@/utils/utility";
import Modal from "@/components/UI/Modal";
import React, { useEffect, useState } from "react";
import { AlertTriangle, CircleAlert } from "lucide-react";

/**
 * MigratePromptWarningModal
 * Shows a warning when user tries to migrate from simple string prompt to structured prompt
 */
const MigratePromptWarningModal = ({
  onConfirm,
  isMainMigration = false,
  isEmbedMigration = false,
  sourcePrompt = "",
  onSaveStructured,
  onSaveEmbed,
  embedPromptConfig = {},
  agentPromptConfig = {},
  modalId = MODAL_TYPE.MIGRATE_PROMPT_WARNING_MODAL || "MIGRATE_PROMPT_WARNING_MODAL",
}) => {
  const [role, setRole] = useState("");
  const [goal, setGoal] = useState("");
  const [instruction, setInstruction] = useState("");
  const [embedFieldValues, setEmbedFieldValues] = useState({});
  const isEmbedDefaultPromptMode = !!embedPromptConfig?.useDefaultPrompt;
  const visibleEmbedFields = Array.isArray(embedPromptConfig?.embedFields)
    ? embedPromptConfig.embedFields.filter((field) => !field?.hidden)
    : [];
  const visibleAgentFields = Array.isArray(agentPromptConfig?.embedFields)
    ? agentPromptConfig.embedFields.filter((field) => !field?.hidden)
    : [];
  const hasAgentVisibleFields = visibleAgentFields.length > 0;
  const isSplitMigration = isMainMigration || isEmbedMigration;

  useEffect(() => {
    if (isMainMigration || isEmbedMigration) {
      setRole("");
      setGoal("");
      setInstruction("");

      const initialValues = {};
      const agentFieldValueMap = {};
      visibleAgentFields.forEach((field) => {
        const key = field?.name;
        if (key) {
          agentFieldValueMap[key] = field?.value || "";
        }
      });

      visibleEmbedFields.forEach((field) => {
        const key = field?.name;
        if (key) {
          initialValues[key] = agentFieldValueMap[key] ?? field?.value ?? "";
        }
      });
      setEmbedFieldValues(initialValues);
    }
  }, [isMainMigration, isEmbedMigration, sourcePrompt, embedPromptConfig, agentPromptConfig]);

  const handleClose = () => {
    closeModal(modalId);
  };

  const handleConfirm = () => {
    onConfirm?.();
    handleClose();
  };

  const handleMainSave = () => {
    onSaveStructured?.({
      role,
      goal,
      instruction,
    });
    handleClose();
  };

  const handleEmbedSave = () => {
    if (isEmbedDefaultPromptMode) {
      onSaveEmbed?.({
        role,
        goal,
        instruction,
        useDefaultPrompt: true,
      });
      handleClose();
      return;
    }

    const updatedEmbedFields = (embedPromptConfig?.embedFields || []).map((field) => {
      const name = field?.name;
      if (!name) return field;
      if (field?.hidden) return field;
      return {
        ...field,
        value: embedFieldValues[name] ?? field?.value ?? "",
      };
    });

    onSaveEmbed?.({
      customPrompt: embedPromptConfig?.customPrompt || sourcePrompt || "",
      embedFields: updatedEmbedFields,
      useDefaultPrompt: false,
    });
    handleClose();
  };

  return (
    <Modal
      MODAL_ID={modalId}
      onClose={handleClose}
      title="Migrate Prompt Structure"
      description={
        isSplitMigration
          ? "Copy from your current prompt and paste into the new fields"
          : "Convert your prompt to structured format"
      }
      icon={<AlertTriangle size={16} className="text-amber-400" />}
      widthClass={isSplitMigration ? "w-[min(96vw,1200px)]" : "w-[min(500px,92vw)]"}
    >
      <div id="migrate-prompt-modal-container">
        {isSplitMigration ? (
          <div className="space-y-5 flex flex-col">
            <div
              className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0 overflow-y-auto pr-1"
              style={{ maxHeight: "65vh" }}
            >
              <div className="border border-base-300 p-3 bg-base-200/30 min-w-0">
                <h4 className="text-sm font-semibold mb-2">
                  {isEmbedMigration && !isEmbedDefaultPromptMode && hasAgentVisibleFields
                    ? "Current Agent Fields"
                    : "Current Prompt (String)"}
                </h4>
                {isEmbedMigration && !isEmbedDefaultPromptMode && hasAgentVisibleFields ? (
                  <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                    {visibleAgentFields.length > 0 ? (
                      visibleAgentFields.map((field) => (
                        <div key={field?.name} className="space-y-1 min-w-0">
                          <label className="text-xs font-medium text-base-content/70 break-all">{field?.name}</label>
                          {field?.type === "textarea" ? (
                            <textarea className="textarea w-full h-20" value={field?.value || ""} readOnly />
                          ) : (
                            <input
                              autoComplete="off"
                              type="text"
                              className="input w-full"
                              value={field?.value || ""}
                              readOnly
                            />
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-base-content/60">No existing visible fields on agent.</p>
                    )}
                  </div>
                ) : (
                  <textarea
                    className="textarea w-full h-[50vh] text-sm font-mono"
                    value={sourcePrompt || ""}
                    readOnly
                  />
                )}
              </div>

              <div className="border border-base-300 p-3 bg-base-200/30 space-y-3 min-w-0">
                <h4 className="text-sm font-semibold">
                  {isMainMigration || isEmbedDefaultPromptMode ? "New Structured Prompt" : "Fill Embed Fields"}
                </h4>
                {isMainMigration || isEmbedDefaultPromptMode ? (
                  <>
                    <input
                      autoComplete="off"
                      type="text"
                      className="input w-full"
                      placeholder="Role"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                    />
                    <input
                      autoComplete="off"
                      type="text"
                      className="input w-full"
                      placeholder="Goal"
                      value={goal}
                      onChange={(e) => setGoal(e.target.value)}
                    />
                    <textarea
                      className="textarea w-full h-40"
                      placeholder="Instruction"
                      value={instruction}
                      onChange={(e) => setInstruction(e.target.value)}
                    />
                  </>
                ) : (
                  <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                    {visibleEmbedFields.length > 0 ? (
                      visibleEmbedFields.map((field) => {
                        const fieldName = field?.name || "";
                        const isTextarea = field?.type === "textarea";
                        return (
                          <div key={fieldName} className="space-y-1 min-w-0">
                            <label className="text-xs font-medium text-base-content/70 break-all">{fieldName}</label>
                            {isTextarea ? (
                              <textarea
                                className="textarea w-full h-24"
                                value={embedFieldValues[fieldName] || ""}
                                onChange={(e) =>
                                  setEmbedFieldValues((prev) => ({
                                    ...prev,
                                    [fieldName]: e.target.value,
                                  }))
                                }
                              />
                            ) : (
                              <input
                                autoComplete="off"
                                type="text"
                                className="input w-full"
                                value={embedFieldValues[fieldName] || ""}
                                onChange={(e) =>
                                  setEmbedFieldValues((prev) => ({
                                    ...prev,
                                    [fieldName]: e.target.value,
                                  }))
                                }
                              />
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-base-content/60">No visible fields configured.</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-base-content/10">
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleClose}>
                Cancel
              </button>
              {isMainMigration ? (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleMainSave}
                  disabled={!role.trim() && !goal.trim() && !instruction.trim()}
                >
                  Save Structured Prompt
                </button>
              ) : (
                <button type="button" className="btn btn-primary btn-sm" onClick={handleEmbedSave}>
                  Save Embed Fields
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="alert alert-warning">
              <CircleAlert className="stroke-current shrink-0 h-6 w-6" />
              <span className="text-sm">
                This action will convert your current prompt into a structured format. You can edit the individual
                fields after migration.
              </span>
            </div>

            <p className="text-sm text-base-content/70">
              Are you sure you want to convert your simple prompt to a structured format with Role, Goal, and
              Instruction fields?
            </p>

            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleClose}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={handleConfirm}>
                Migrate Prompt
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default MigratePromptWarningModal;
