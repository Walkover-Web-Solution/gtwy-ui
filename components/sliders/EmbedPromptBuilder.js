"use client";
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { extractVariablesFromPrompt } from "@/utils/promptUtils";

/**
 * Embed Prompt Builder Component
 * Allows embed users to create custom prompts with dynamic field generation
 */
// Default prompt constant (matches backend default from agentConfig.controller.js)
const DEFAULT_PROMPT =
  "Role: AI Bot\nObjective: Respond logically and clearly, maintaining a neutral, automated tone.\nGuidelines:\nIdentify the task or question first.\nProvide brief reasoning before the answer or action.\nKeep responses concise and contextually relevant.\nAvoid emotion, filler, or self-reference.\nUse examples or placeholders only when helpful.";

const EmbedPromptBuilder = ({ configuration, onChange, onValidate }) => {
  // Track if we're making an internal update to prevent sync loop
  const isInternalUpdateRef = useRef(false);

  // Initialize prompt structure
  const [promptConfig, setPromptConfig] = useState(() => {
    const configPrompt = configuration?.prompt;

    // If prompt is a string, it means useDefaultPrompt is true
    if (typeof configPrompt === "string") {
      return {
        useDefaultPrompt: true,
        defaultPromptText: configPrompt || DEFAULT_PROMPT,
        customPrompt: "",
        embedFields: [
          { name: "role", value: "", type: "input", hidden: true },
          { name: "goal", value: "", type: "input", hidden: true },
          { name: "instruction", value: "", type: "textarea", hidden: true },
        ],
      };
    }

    // If prompt is an object
    if (typeof configPrompt === "object" && configPrompt !== null) {
      // Prioritize explicit useDefaultPrompt flag if present
      const isDefault =
        configPrompt.useDefaultPrompt === true ||
        (configPrompt.useDefaultPrompt === undefined && !configPrompt.customPrompt && !configPrompt.role);

      // If it has useDefaultPrompt and it's true, or if it's just a string-like object
      if (isDefault) {
        return {
          useDefaultPrompt: true,
          defaultPromptText: configPrompt.defaultPromptText || DEFAULT_PROMPT,
          customPrompt: "",
          embedFields: configPrompt.embedFields || [
            { name: "role", value: "", type: "input", hidden: true },
            { name: "goal", value: "", type: "input", hidden: true },
            { name: "instruction", value: "", type: "textarea", hidden: true },
          ],
        };
      }

      // Custom prompt mode
      return {
        useDefaultPrompt: false,
        defaultPromptText: "",
        customPrompt: configPrompt.customPrompt || "",
        embedFields: configPrompt.embedFields || [
          { name: "role", value: "", type: "input", hidden: true },
          { name: "goal", value: "", type: "input", hidden: true },
          { name: "instruction", value: "", type: "textarea", hidden: true },
        ],
      };
    }

    // Default
    return {
      useDefaultPrompt: true,
      defaultPromptText: DEFAULT_PROMPT,
      customPrompt: "",
      embedFields: [
        { name: "role", value: "", type: "input", hidden: true },
        { name: "goal", value: "", type: "input", hidden: true },
        { name: "instruction", value: "", type: "textarea", hidden: true },
      ],
    };
  });

  // Extract variables from custom prompt
  const detectedVariables = useMemo(() => {
    if (!promptConfig.customPrompt || promptConfig.useDefaultPrompt) {
      return [];
    }
    return extractVariablesFromPrompt(promptConfig.customPrompt);
  }, [promptConfig.customPrompt, promptConfig.useDefaultPrompt]);

  // Update embedFields when variables are detected
  useEffect(() => {
    if (promptConfig.useDefaultPrompt) return;

    const currentFieldNames = new Set(promptConfig.embedFields.map((f) => f.name));
    const defaultFieldNames = new Set(["role", "goal", "instruction"]);

    // Add detected variables as fields if they don't exist
    const newFields = [...promptConfig.embedFields];
    detectedVariables.forEach((varName) => {
      if (!currentFieldNames.has(varName) && !defaultFieldNames.has(varName)) {
        // Check if field already exists with a value (preserve existing values)
        const existingField = promptConfig.embedFields.find((f) => f.name === varName);
        newFields.push({
          name: varName,
          value: existingField?.value || "",
          type: existingField?.type || "input",
          hidden: existingField?.hidden !== undefined ? existingField.hidden : false,
        });
      }
    });

    // Remove fields that are no longer in the prompt (except default fields)
    const fieldsToKeep = newFields.filter((field) => {
      if (defaultFieldNames.has(field.name)) return true; // Always keep default fields
      return detectedVariables.includes(field.name);
    });

    if (JSON.stringify(fieldsToKeep) !== JSON.stringify(promptConfig.embedFields)) {
      setPromptConfig((prev) => {
        const updated = {
          ...prev,
          embedFields: fieldsToKeep,
        };

        // Notify parent component of the field changes
        onChange({
          useDefaultPrompt: false,
          customPrompt: updated.customPrompt || "",
          embedFields: fieldsToKeep,
        });

        return updated;
      });
    }
  }, [detectedVariables, promptConfig.useDefaultPrompt, promptConfig.embedFields, onChange]);

  // Handle toggle for "Use default prompt"
  const handleUseDefaultToggle = useCallback(
    (checked) => {
      isInternalUpdateRef.current = true;
      setPromptConfig((prev) => {
        const updated = {
          ...prev,
          useDefaultPrompt: checked,
        };

        // When toggling to default mode, send string; when toggling to custom, send object
        if (checked) {
          // Default mode: send default prompt from backend as string
          // Use existing defaultPromptText if available, otherwise use the constant
          const defaultPromptValue = updated.defaultPromptText || DEFAULT_PROMPT;
          // Update defaultPromptText if it's empty
          updated.defaultPromptText = defaultPromptValue;
          onChange(defaultPromptValue);
        } else {
          // Custom mode: send as object
          onChange({
            useDefaultPrompt: false,
            customPrompt: updated.customPrompt || "",
            embedFields: updated.embedFields || [],
          });
        }

        // Reset flag after a short delay to allow state to update
        setTimeout(() => {
          isInternalUpdateRef.current = false;
        }, 100);

        return updated;
      });
    },
    [onChange]
  );

  // Validation function
  const validatePromptConfig = (config) => {
    if (config.useDefaultPrompt) return { isValid: true, error: "" };

    if (!config.customPrompt || config.customPrompt.trim() === "") {
      return { isValid: false, error: "Custom prompt cannot be empty." };
    }

    const hiddenFieldsWithoutDescription = (config.embedFields || []).filter(
      (f) => f.hidden && (!f.description || f.description.trim() === "")
    );

    if (hiddenFieldsWithoutDescription.length > 0) {
      return {
        isValid: false,
        error: `Description is required for hidden fields: ${hiddenFieldsWithoutDescription.map((f) => f.name).join(", ")}`,
      };
    }

    return { isValid: true, error: "" };
  };

  // Error state
  const [validationError, setValidationError] = useState("");

  // Update validation on changes
  useEffect(() => {
    if (isInternalUpdateRef.current) return;
    const { isValid, error } = validatePromptConfig(promptConfig);
    setValidationError(error);
    if (onValidate) onValidate(isValid);
  }, [promptConfig, onValidate]);

  // Handle custom prompt change
  const handleCustomPromptChange = useCallback(
    (value) => {
      const updated = {
        ...promptConfig,
        customPrompt: value,
      };
      setPromptConfig(updated);
      // Always send as object when in custom mode
      onChange({
        useDefaultPrompt: false,
        customPrompt: value,
        embedFields: updated.embedFields || [],
      });
    },
    [promptConfig, onChange]
  );

  // Handle field visibility toggle
  const handleFieldVisibilityToggle = useCallback(
    (fieldName, hidden) => {
      const updatedFields = promptConfig.embedFields.map((field) =>
        field.name === fieldName ? { ...field, hidden } : field
      );
      const updated = {
        ...promptConfig,
        embedFields: updatedFields,
      };
      setPromptConfig(updated);
      onChange(updated);
    },
    [promptConfig, onChange]
  );

  // Handle field type change
  const handleFieldTypeChange = useCallback(
    (fieldName, type) => {
      const updatedFields = promptConfig.embedFields.map((field) =>
        field.name === fieldName ? { ...field, type } : field
      );
      const updated = {
        ...promptConfig,
        embedFields: updatedFields,
      };
      setPromptConfig(updated);
      onChange(updated);
    },
    [promptConfig, onChange]
  );

  // Handle field description change
  const handleFieldDescriptionChange = useCallback(
    (fieldName, description) => {
      const updatedFields = promptConfig.embedFields.map((field) =>
        field.name === fieldName ? { ...field, description } : field
      );
      const updated = {
        ...promptConfig,
        embedFields: updatedFields,
      };
      setPromptConfig(updated);
      onChange(updated);
    },
    [promptConfig, onChange]
  );

  // Sync with external configuration changes
  useEffect(() => {
    // Skip sync if we're making an internal update
    if (isInternalUpdateRef.current) {
      return;
    }

    const configPrompt = configuration?.prompt;

    // Check if it's different from current state
    let shouldUpdate = false;
    let newConfig = {};

    setPromptConfig((prev) => {
      if (typeof configPrompt === "string") {
        // String means default prompt mode
        newConfig = {
          useDefaultPrompt: true,
          defaultPromptText: configPrompt || DEFAULT_PROMPT,
          customPrompt: "",
          embedFields: prev.embedFields || [
            { name: "role", value: "", type: "input", hidden: true },
            { name: "goal", value: "", type: "input", hidden: true },
            { name: "instruction", value: "", type: "textarea", hidden: true },
          ],
        };
        shouldUpdate =
          newConfig.defaultPromptText !== prev.defaultPromptText ||
          newConfig.useDefaultPrompt !== prev.useDefaultPrompt;
      } else if (typeof configPrompt === "object" && configPrompt !== null) {
        // Prioritize explicit useDefaultPrompt flag if present
        const isDefault =
          configPrompt.useDefaultPrompt === true ||
          (configPrompt.useDefaultPrompt === undefined && !configPrompt.customPrompt && !configPrompt.role);

        if (isDefault) {
          // Default mode
          newConfig = {
            useDefaultPrompt: true,
            defaultPromptText: configPrompt.defaultPromptText || DEFAULT_PROMPT,
            customPrompt: "",
            embedFields: configPrompt.embedFields ||
              prev.embedFields || [
                { name: "role", value: "", type: "input", hidden: true },
                { name: "goal", value: "", type: "input", hidden: true },
                { name: "instruction", value: "", type: "textarea", hidden: true },
              ],
          };
        } else {
          // Custom mode
          newConfig = {
            useDefaultPrompt: false,
            defaultPromptText: "",
            customPrompt: configPrompt.customPrompt || "",
            embedFields: configPrompt.embedFields || [
              { name: "role", value: "", type: "input", hidden: true },
              { name: "goal", value: "", type: "input", hidden: true },
              { name: "instruction", value: "", type: "textarea", hidden: true },
            ],
          };
        }
        shouldUpdate = JSON.stringify(newConfig) !== JSON.stringify(prev);
      } else if (!configPrompt) {
        // No prompt config, use defaults
        newConfig = {
          useDefaultPrompt: true,
          defaultPromptText: DEFAULT_PROMPT,
          customPrompt: "",
          embedFields: [
            { name: "role", value: "", type: "input", hidden: true },
            { name: "goal", value: "", type: "input", hidden: true },
            { name: "instruction", value: "", type: "textarea", hidden: true },
          ],
        };
        shouldUpdate = JSON.stringify(newConfig) !== JSON.stringify(prev);
      }

      if (shouldUpdate) {
        return newConfig;
      }
      return prev;
    });
  }, [configuration?.prompt]);

  return (
    <div className="space-y-4 p-4 bg-base-200 rounded-lg border border-base-300">
      <h5 className="text-sm font-semibold text-primary border-b border-base-300 pb-2">Prompt Configuration</h5>

      {/* Toggle: Use Default Prompt */}
      <div className="form-control">
        <label className="label cursor-pointer justify-start gap-2">
          <input
            type="checkbox"
            className="toggle toggle-primary"
            checked={promptConfig.useDefaultPrompt}
            onChange={(e) => handleUseDefaultToggle(e.target.checked)}
          />
          <span className="label-text">Use default prompt</span>
        </label>
        <span className="text-xs text-base-content/60 ml-12">
          When enabled, uses the default system prompt from backend (no textarea shown). When disabled, shows custom
          prompt builder.
        </span>
      </div>

      {/* Default Prompt Info (shown when useDefaultPrompt is true) */}
      {promptConfig.useDefaultPrompt && (
        <div className="alert alert-info mt-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            className="stroke-current shrink-0 w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
          <span className="text-sm">
            Using default system prompt from backend. The prompt will be automatically applied when creating agents.
          </span>
        </div>
      )}

      {/* Custom Prompt Builder (shown when useDefaultPrompt is false) */}
      {!promptConfig.useDefaultPrompt && (
        <div className="space-y-4 mt-4">
          {/* Custom Prompt Textarea */}
          <div className="form-control">
            <label className="label">
              <span className="label-text text-sm font-medium">Custom Prompt Template</span>
            </label>
            <textarea
              className="textarea textarea-bordered w-full h-32 font-mono text-sm"
              placeholder='e.g., "You are a {{role}} and your context is {{context}}"'
              value={promptConfig.customPrompt}
              onChange={(e) => handleCustomPromptChange(e.target.value)}
            />
            <label className="label">
              <span className="label-text-alt text-base-content/60">
                Use {`{{variable}}`} syntax to create dynamic fields
              </span>
            </label>
          </div>

          {/* Detected Fields List */}
          {promptConfig.embedFields.length > 0 && (
            <div className="space-y-2">
              <label className="label">
                <span className="label-text text-sm font-medium">Dynamic Fields</span>
              </label>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {promptConfig.embedFields.map((field) => (
                  <div key={field.name} className="p-3 bg-base-100 rounded border border-base-300 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-base-200 px-2 py-1 rounded font-mono">{`{{${field.name}}}`}</code>
                        <span className="text-xs text-base-content/70">
                          {["role", "goal", "instruction"].includes(field.name) ? "(Default)" : "(Custom)"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Show/Hide Toggle */}
                        <label className="label cursor-pointer gap-1">
                          <input
                            type="checkbox"
                            className="toggle toggle-xs"
                            checked={field.hidden}
                            onChange={(e) => handleFieldVisibilityToggle(field.name, e.target.checked)}
                          />
                          <span className="label-text text-xs">Hide</span>
                        </label>
                        {/* Field Type Selector (shown when visible) */}
                        {/* {!field.hidden && ( */}
                        <div className="space-y-1">
                          {!field.hidden ? (
                            <div className="flex items-center gap-2">
                              <select
                                className="select select-xs select-bordered"
                                value={field.type}
                                onChange={(e) => handleFieldTypeChange(field.name, e.target.value)}
                              >
                                <option value="input">Input</option>
                                <option value="textarea">Textarea</option>
                              </select>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                className="input input-xs input-bordered w-full min-w-[150px]"
                                placeholder="Description"
                                value={field.description || ""}
                                onChange={(e) => handleFieldDescriptionChange(field.name, e.target.value)}
                              />
                            </div>
                          )}
                        </div>
                        {/* )} */}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Validation Error */}
          {validationError && (
            <div className="alert alert-error text-sm py-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="stroke-current shrink-0 h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{validationError}</span>
            </div>
          )}

          {/* Info Message */}
          <div className="alert alert-info">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              className="stroke-current shrink-0 w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            <span className="text-xs">
              Default fields (role, goal, instruction) are always available but hidden by default. You can enable them
              manually.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmbedPromptBuilder;
