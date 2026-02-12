import React, { memo, useCallback, useEffect, useState } from "react";
import { normalizePromptToStructured } from "@/utils/promptUtils";

/**
 * Structured Prompt Input Component for Main Users
 * Displays 3 fields: Role, Goal, Instruction
 */
const StructuredPromptInput = memo(
  ({
    prompt = "",
    onChange,
    onSave,
    isPublished = false,
    isEditor = true,
    onFocus,
    onBlur,
    isPromptHelperOpen = false,
    variablesSection,
  }) => {
    // Use local state for input values to allow typing
    const [localPrompt, setLocalPrompt] = useState(() => normalizePromptToStructured(prompt));

    // Update local state when prompt prop changes (external updates)
    useEffect(() => {
      const normalized = normalizePromptToStructured(prompt);
      setLocalPrompt(normalized);
    }, [prompt]);

    // Handle field changes
    const handleFieldChange = useCallback(
      (fieldName, value) => {
        setLocalPrompt((prev) => {
          const updated = {
            ...prev,
            [fieldName]: value,
          };
          // Call onChange with the updated structured prompt object
          if (onChange) {
            onChange(updated);
          }
          return updated;
        });
      },
      [onChange]
    );

    // Handle blur - save on blur
    const handleBlur = useCallback(() => {
      if (onBlur) {
        onBlur();
      }
      // Auto-save on blur
      if (onSave) {
        onSave(localPrompt);
      }
    }, [onBlur, onSave, localPrompt]);

    return (
      <div id="structured-prompt-input" className="w-full space-y-4">
        {/* Role Field */}
        <div className="form-control">
          <label className="label">
            <span className="label-text text-sm font-medium">Role</span>
          </label>
          <input
            type="text"
            id="prompt-role-input"
            className="input input-bordered w-full"
            placeholder="e.g., You are a helpful assistant"
            value={localPrompt.role}
            onChange={(e) => handleFieldChange("role", e.target.value)}
            onFocus={onFocus}
            onBlur={handleBlur}
            disabled={isPublished || !isEditor}
            title={isPublished ? "Cannot edit in published mode" : ""}
          />
        </div>

        {/* Goal Field */}
        <div className="form-control">
          <label className="label">
            <span className="label-text text-sm font-medium">Goal</span>
          </label>
          <input
            type="text"
            id="prompt-goal-input"
            className="input input-bordered w-full"
            placeholder="e.g., Help users with their questions"
            value={localPrompt.goal}
            onChange={(e) => handleFieldChange("goal", e.target.value)}
            onFocus={onFocus}
            onBlur={handleBlur}
            disabled={isPublished || !isEditor}
            title={isPublished ? "Cannot edit in published mode" : ""}
          />
        </div>

        {/* Instruction Field */}
        <div className="form-control">
          <label className="label">
            <span className="label-text text-sm font-medium">Instructions</span>
          </label>
          <textarea
            id="prompt-instruction-textarea"
            className={`textarea textarea-bordered w-full ${
              isPromptHelperOpen ? "h-[calc(100vh-400px)] min-h-[400px]" : "h-96 min-h-96"
            } resize-y`}
            placeholder="Enter detailed instructions for the AI agent..."
            value={localPrompt.instruction}
            onChange={(e) => handleFieldChange("instruction", e.target.value)}
            onFocus={onFocus}
            onBlur={handleBlur}
            disabled={isPublished || !isEditor}
            title={isPublished ? "Cannot edit in published mode" : ""}
          />
          {variablesSection}
        </div>
      </div>
    );
  }
);

StructuredPromptInput.displayName = "StructuredPromptInput";

export default StructuredPromptInput;
