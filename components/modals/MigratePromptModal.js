import React, { useEffect, useState } from "react";
import Modal from "../UI/Modal";
import { MODAL_TYPE, PROMPT_SECTIONS } from "@/utils/enums";
import { closeModal } from "@/utils/utility";
import { isValidJsonPrompt, parsePromptObject } from "@/utils/promptUtils";
import { ArrowUpRight } from "lucide-react";

const MigratePromptModal = ({ currentPrompt = "", onConfirm, embedFields = null }) => {
  const isEmbedMode = Array.isArray(embedFields) && embedFields.length > 0;

  const getInitialFields = (prompt) => {
    if (isEmbedMode) {
      return embedFields.reduce((acc, f) => ({ ...acc, [f.name]: "" }), {});
    }
    if (isValidJsonPrompt(prompt)) {
      const parsed = parsePromptObject(prompt);
      return {
        [PROMPT_SECTIONS.ROLE]: parsed.role || "",
        [PROMPT_SECTIONS.GOAL]: parsed.goal || "",
        [PROMPT_SECTIONS.INSTRUCTION]: parsed.instruction || "",
      };
    }
    return {
      [PROMPT_SECTIONS.ROLE]: "",
      [PROMPT_SECTIONS.GOAL]: "",
      [PROMPT_SECTIONS.INSTRUCTION]: "",
    };
  };

  const [fields, setFields] = useState(() => getInitialFields(currentPrompt));

  useEffect(() => {
    setFields(getInitialFields(currentPrompt));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPrompt, isEmbedMode]);

  const handleChange = (key, value) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const handleConfirm = () => {
    onConfirm?.(fields);
    closeModal(MODAL_TYPE.MIGRATE_PROMPT_MODAL);
  };

  const handleCancel = () => {
    closeModal(MODAL_TYPE.MIGRATE_PROMPT_MODAL);
  };

  const footerContent = (
    <div className="flex justify-end gap-2">
      <button
        data-testid="migrate-prompt-cancel-button"
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={handleCancel}
      >
        Cancel
      </button>
      <button
        data-testid="migrate-prompt-save-button"
        type="button"
        className="btn btn-primary btn-sm"
        onClick={handleConfirm}
      >
        Migrate &amp; Save
      </button>
    </div>
  );

  return (
    <Modal
      MODAL_ID={MODAL_TYPE.MIGRATE_PROMPT_MODAL}
      onClose={handleCancel}
      title="Migrate Prompt to Structured Format"
      description="Convert your current prompt into structured role/goal/instruction fields"
      icon={<ArrowUpRight size={16} className="text-trace-gold" />}
      widthClass="w-[min(900px,96vw)]"
      footer={footerContent}
    >
      <div data-testid="migrate-prompt-modal" className="flex flex-col gap-4">
        {/* Side-by-side layout */}
        <div className="grid grid-cols-2 gap-4 min-h-0">
          {/* Left: Current prompt */}
          <div className="flex flex-col gap-1">
            <label className="label py-0">
              <span className="font-medium text-base-content/70">Current Prompt</span>
            </label>
            <textarea
              className="textarea bg-base-200 w-full flex-1 text-sm leading-relaxed resize-none"
              style={{ minHeight: "320px" }}
              value={currentPrompt}
              readOnly
            />
          </div>

          {/* Right: Structured fields */}
          <div className="flex flex-col gap-3 overflow-y-auto" style={{ maxHeight: "420px" }}>
            <label className="label py-0">
              <span className="font-medium text-base-content/70">Structured Fields</span>
            </label>

            {isEmbedMode ? (
              embedFields
                .filter((f) => !f.hidden)
                .map((field) => (
                  <div key={field.name} className="form-control gap-1">
                    <span className="font-medium capitalize">{field.name}</span>
                    {field.type === "textarea" ? (
                      <textarea
                        className="textarea w-full text-sm leading-relaxed"
                        style={{ minHeight: "120px" }}
                        placeholder={`Enter ${field.name}...`}
                        value={fields[field.name] || ""}
                        onChange={(e) => handleChange(field.name, e.target.value)}
                      />
                    ) : (
                      <input
                        autoComplete="off"
                        type="text"
                        className="input w-full text-sm input-sm"
                        placeholder={`Enter ${field.name}...`}
                        value={fields[field.name] || ""}
                        onChange={(e) => handleChange(field.name, e.target.value)}
                      />
                    )}
                  </div>
                ))
            ) : (
              <div className="p-2">
                <div className="form-control gap-1">
                  <span className="font-medium capitalize">{PROMPT_SECTIONS.ROLE}</span>
                  <input
                    autoComplete="off"
                    data-testid="migrate-prompt-role-input"
                    type="text"
                    className="input w-full text-sm input-sm"
                    placeholder="e.g. You are a helpful customer support assistant"
                    value={fields[PROMPT_SECTIONS.ROLE]}
                    onChange={(e) => handleChange(PROMPT_SECTIONS.ROLE, e.target.value)}
                  />
                </div>

                <div className="form-control gap-1 mt-3">
                  <span className="font-medium capitalize">{PROMPT_SECTIONS.GOAL}</span>
                  <input
                    autoComplete="off"
                    data-testid="migrate-prompt-goal-input"
                    type="text"
                    className="input w-full text-sm input-sm"
                    placeholder="e.g. Help users resolve their issues quickly and accurately"
                    value={fields[PROMPT_SECTIONS.GOAL]}
                    onChange={(e) => handleChange(PROMPT_SECTIONS.GOAL, e.target.value)}
                  />
                </div>

                <div className="form-control gap-1 flex-1 flex flex-col mt-3">
                  <span className="font-medium capitalize">{PROMPT_SECTIONS.INSTRUCTION}</span>
                  <textarea
                    data-testid="migrate-prompt-instruction-textarea"
                    className="textarea w-full flex-1 text-sm leading-relaxed"
                    style={{ minHeight: "260px" }}
                    placeholder="e.g. Always be polite. Ask clarifying questions if needed..."
                    value={fields[PROMPT_SECTIONS.INSTRUCTION]}
                    onChange={(e) => handleChange(PROMPT_SECTIONS.INSTRUCTION, e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

MigratePromptModal.displayName = "MigratePromptModal";

export default MigratePromptModal;
