"use client";
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { XCircle } from "lucide-react";
import { extractVariablesFromPrompt } from "@/utils/promptUtils";

/**
 * Embed Prompt Builder Component
 * Allows embed users to create custom prompts with dynamic field generation
 */
const EmbedPromptBuilder = ({ configuration, onChange, onPromptBlur, onValidate, onConfigChange }) => {
  const lastInternalConfigRef = useRef(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  const handleChange = useCallback((value) => {
    lastInternalConfigRef.current = JSON.stringify(value);
    onChangeRef.current(value);
  }, []);
  // Initialize prompt structure
  const [promptConfig, setPromptConfig] = useState(() => {
    const configPrompt = configuration?.prompt;

    // If prompt is a string, it means useDefaultPrompt is true
    if (typeof configPrompt === "string") {
      return {
        useDefaultPrompt: true,
        customPrompt: "",
        embedFields: [],
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
          customPrompt: configPrompt.customPrompt || "",
          embedFields: configPrompt.embedFields || [],
        };
      }

      // Custom prompt mode
      return {
        useDefaultPrompt: false,
        customPrompt: configPrompt.customPrompt || "",
        embedFields: configPrompt.embedFields || [],
      };
    }

    // Default
    return {
      useDefaultPrompt: true,
      customPrompt: "",
      embedFields: [],
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

    // Build fields ordered exactly as variables appear in the prompt, preserving existing settings
    const existingByName = Object.fromEntries(promptConfig.embedFields.map((f) => [f.name, f]));
    const fieldsToKeep = detectedVariables.map((varName) => {
      const existing = existingByName[varName];
      return (
        existing ?? {
          name: varName,
          value: "",
          type: "input",
          hidden: false,
          displayValue: "",
        }
      );
    });

    if (JSON.stringify(fieldsToKeep) !== JSON.stringify(promptConfig.embedFields)) {
      setPromptConfig((prev) => {
        const updated = {
          ...prev,
          embedFields: fieldsToKeep,
        };

        handleChange({
          useDefaultPrompt: false,
          customPrompt: updated.customPrompt || "",
          embedFields: fieldsToKeep,
        });

        return updated;
      });
    }
  }, [detectedVariables, promptConfig.useDefaultPrompt, promptConfig.embedFields, handleChange]);

  // Handle toggle for "Use default prompt"
  const handleUseDefaultToggle = useCallback(
    (checked) => {
      setPromptConfig((prev) => {
        const updated = { ...prev, useDefaultPrompt: checked };
        handleChange({
          useDefaultPrompt: checked,
          customPrompt: updated.customPrompt || "",
          embedFields: updated.embedFields || [],
        });
        return updated;
      });
    },
    [handleChange]
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
    const { isValid, error } = validatePromptConfig(promptConfig);
    setValidationError(error);
    if (onValidate) onValidate(isValid);
  }, [promptConfig, onValidate]);

  const handleCustomPromptChange = useCallback((value) => {
    setPromptConfig((prev) => ({ ...prev, customPrompt: value }));
  }, []);

  const handleCustomPromptBlur = useCallback(
    (value) => {
      setPromptConfig((prev) => {
        const updated = { ...prev, customPrompt: value };
        handleChange(updated);
        onPromptBlur?.(updated);
        return updated;
      });
    },
    [handleChange, onPromptBlur]
  );

  const configPromptKey = JSON.stringify(configuration?.prompt ?? null);
  useEffect(() => {
    if (lastInternalConfigRef.current === configPromptKey) return;

    const configPrompt = configuration?.prompt;
    setPromptConfig((prev) => {
      let next;
      if (typeof configPrompt === "string") {
        next = { useDefaultPrompt: true, customPrompt: "", embedFields: [] };
      } else if (typeof configPrompt === "object" && configPrompt !== null) {
        const isDefault =
          configPrompt.useDefaultPrompt === true ||
          (configPrompt.useDefaultPrompt === undefined && !configPrompt.customPrompt);
        next = {
          useDefaultPrompt: isDefault,
          customPrompt: configPrompt.customPrompt || "",
          embedFields: configPrompt.embedFields || [],
        };
      } else {
        next = { useDefaultPrompt: true, customPrompt: "", embedFields: [] };
      }
      return JSON.stringify(next) !== JSON.stringify(prev) ? next : prev;
    });
  }, [configPromptKey]);

  // Consolidated field update handler
  const updateField = useCallback(
    (fieldName, updates) => {
      const updatedFields = promptConfig.embedFields.map((field) =>
        field.name === fieldName ? { ...field, ...updates } : field
      );
      const updated = { ...promptConfig, embedFields: updatedFields };
      setPromptConfig(updated);
      handleChange(updated);
    },
    [promptConfig, handleChange]
  );

  const handleFieldVisibilityToggle = useCallback(
    (fieldName, hidden) => updateField(fieldName, { hidden }),
    [updateField]
  );
  const handleFieldTypeChange = useCallback((fieldName, type) => updateField(fieldName, { type }), [updateField]);
  const handleFieldDescriptionChange = useCallback(
    (fieldName, description) => updateField(fieldName, { description }),
    [updateField]
  );
  const handleFieldDisplayValueChange = useCallback(
    (fieldName, displayValue) => updateField(fieldName, { displayValue }),
    [updateField]
  );

  const handleFieldShowPromptHelperChange = useCallback(
    (fieldName, showPromptHelper) => updateField(fieldName, { showPromptHelper }),
    [updateField]
  );

  return (
    <>
      <h5 className="text-sm font-semibold border-b border-base-300 pb-2">Prompt Configuration</h5>
      <div className="space-y-4 p-2 bg-base-200 rounded-lg border border-base-300">
        {/* Toggle: Use Default Prompt */}
        <div className="form-control bg-base-200 rounded flex flex-row items-center justify-between">
          <span data-testid="embed-config-toggle-useDefaultPrompt" className="label-text text-sm ml-1">
            Use default prompt
          </span>
          <input
            autoComplete="off"
            type="checkbox"
            data-testid="use-default-prompt-toggle"
            className="toggle toggle-sm"
            checked={promptConfig.useDefaultPrompt}
            onChange={(e) => handleUseDefaultToggle(e.target.checked)}
          />
        </div>

        {/* Default Prompt Info (shown when useDefaultPrompt is true) */}
        {promptConfig.useDefaultPrompt &&
          (() => {
            const rawPrompt = typeof configuration?.prompt === "string" ? configuration.prompt : "";
            const promptVars = rawPrompt ? extractVariablesFromPrompt(rawPrompt) : [];

            if (!rawPrompt) {
              return (
                <p className="text-xs text-base-content/70 px-1">
                  Using default system prompt from backend. The prompt will be automatically applied when creating
                  agents.
                </p>
              );
            }

            // Split prompt text on {{variable}} tokens for inline rendering
            const parts = rawPrompt.split(/(\{\{[^}]+\}\})/g);

            return (
              <div className="space-y-3">
                <p className="text-xs text-base-content/70 px-1">
                  Using default system prompt. Variables detected below.
                </p>
                {/* Prompt preview with highlighted variables */}
                <div className="text-xs font-mono bg-base-100 border border-base-300 rounded p-2 whitespace-pre-wrap break-words leading-6">
                  {parts.map((part, i) => {
                    const match = part.match(/^\{\{([^}]+)\}\}$/);
                    if (match) {
                      return (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 bg-primary/10 text-primary border border-primary/30 rounded px-1.5 py-0.5 mx-0.5 font-semibold"
                        >
                          <span>{part}</span>
                          <span
                            className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-primary/20 text-primary cursor-default"
                            title={`Variable: ${match[1].trim()} — this value will be filled in at runtime`}
                          >
                            &#x2713;
                          </span>
                        </span>
                      );
                    }
                    return <span key={i}>{part}</span>;
                  })}
                </div>
                {/* Variable summary chips */}
                {promptVars.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 px-1">
                    {promptVars.map((varName) => (
                      <span
                        key={varName}
                        className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary border border-primary/30 rounded-full px-2 py-0.5"
                        title={`Variable: ${varName} — this value will be filled in at runtime`}
                      >
                        <span className="font-mono">{`{{${varName}}}`}</span>
                        <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-primary/20 text-primary font-bold text-xs">
                          &#x2713;
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

        {/* Custom Prompt Builder (shown when useDefaultPrompt is false) */}
        {!promptConfig.useDefaultPrompt && (
          <div className="space-y-4 mt-4 p-2">
            {/* Custom Prompt Textarea */}
            <div className="form-control">
              <label className="label">
                <span className="label-text text-sm font-medium">Custom Prompt Template</span>
              </label>
              <textarea
                data-testid="custom-prompt-textarea"
                className="textarea textarea-bordered w-full h-64 font-mono text-sm"
                placeholder='e.g., "You are a {{role}} and your context is {{context}}"'
                value={promptConfig.customPrompt}
                onChange={(e) => handleCustomPromptChange(e.target.value)}
                onBlur={(e) => handleCustomPromptBlur(e.target.value)}
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
                <div className="space-y-2">
                  {promptConfig.embedFields.map((field) => (
                    <div key={field.name} className="p-3 bg-base-100 rounded border border-base-300 space-y-2">
                      {/* Row 1: variable name + (Custom) */}
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-base-200 px-2 py-1 rounded font-mono">{`{{${field.name}}}`}</code>
                        <span className="text-sm text-base-content/70">(Custom)</span>
                      </div>

                      {/* Row 2: displayValue input (visible) or description input (hidden) */}
                      {!field.hidden ? (
                        <input
                          autoComplete="off"
                          type="text"
                          data-testid={`field-display-value-input-${field.name}`}
                          className="input input-sm input-bordered w-full"
                          placeholder={`Display label (default: ${field.name})`}
                          value={field.displayValue || ""}
                          onChange={(e) => handleFieldDisplayValueChange(field.name, e.target.value)}
                          onBlur={() => onPromptBlur?.(promptConfig)}
                          title="Custom label shown to users for this field"
                        />
                      ) : (
                        <input
                          autoComplete="off"
                          type="text"
                          data-testid={`field-description-input-${field.name}`}
                          className="input input-sm input-bordered w-full"
                          placeholder="Description"
                          value={field.description || ""}
                          onChange={(e) => handleFieldDescriptionChange(field.name, e.target.value)}
                          onBlur={() => onPromptBlur?.(promptConfig)}
                        />
                      )}

                      {/* Row 3: type selector (when visible) + Hide checkbox + Prompt Helper button */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        {!field.hidden ? (
                          <select
                            className="select select-sm select-bordered"
                            value={field.type}
                            onChange={(e) => handleFieldTypeChange(field.name, e.target.value)}
                          >
                            <option value="input">Input</option>
                            <option value="textarea">Textarea</option>
                          </select>
                        ) : (
                          <span />
                        )}
                        <div className="flex items-center gap-3">
                          <label className="label cursor-pointer gap-2 py-0">
                            <span className="label-text text-sm">Hide</span>
                            <input
                              type="checkbox"
                              className="checkbox checkbox-sm"
                              checked={field.hidden}
                              onChange={(e) => handleFieldVisibilityToggle(field.name, e.target.checked)}
                            />
                          </label>
                          <label className="label cursor-pointer gap-2 py-0 items-center">
                            <span className="label-text text-sm">Prompt Helper</span>
                            <input
                              type="checkbox"
                              className="checkbox checkbox-sm"
                              checked={field.showPromptHelper || false}
                              onChange={(e) => handleFieldShowPromptHelperChange(field.name, e.target.checked)}
                            />
                          </label>
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
                <XCircle className="stroke-current shrink-0 h-6 w-6" />
                <span>{validationError}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default EmbedPromptBuilder;
