import React, { useCallback } from "react";
import { Info } from "lucide-react";

/**
 * Embed Prompt Fields Component
 * Shows fields for embed users when useDefaultPrompt is false
 */
const EmbedPromptFields = ({
  prompt = "",
  onChange,
  onSave,
  isPublished = false,
  isEditor = true,
  onFocus,
  onBlur,
  variablesSection,
}) => {
  // Parse prompt structure
  const promptConfig =
    typeof prompt === "object" && prompt !== null
      ? prompt
      : {
          customPrompt: "",
          embedFields: [],
          useDefaultPrompt: false,
        };

  // Handle field value change
  const handleFieldValueChange = useCallback(
    (fieldName, value) => {
      if (!onChange) return;

      // Always use the current prompt prop to ensure we have the latest state
      const currentConfig =
        typeof prompt === "object" && prompt !== null
          ? prompt
          : {
              customPrompt: "",
              embedFields: [],
              useDefaultPrompt: false,
            };

      // Update the specific field
      const updatedFields = (currentConfig.embedFields || []).map((field) =>
        field.name === fieldName ? { ...field, value } : field
      );

      // Call onChange with the updated config
      onChange({
        ...currentConfig,
        embedFields: updatedFields,
      });
    },
    [onChange, prompt]
  );

  const handleBlur = useCallback(() => {
    // Auto-save immediately when clicking outside (blur event)
    if (onSave) {
      const currentConfig =
        typeof prompt === "object" && prompt !== null
          ? prompt
          : {
              customPrompt: "",
              embedFields: [],
              useDefaultPrompt: false,
            };
      onSave(currentConfig);
    }

    // Call parent's onBlur after a small delay to allow save to complete
    // This matches the pattern in the parent's handleTextareaBlur
    setTimeout(() => {
      onBlur?.();
    }, 100);
  }, [onBlur, onSave, prompt]);

  // Get visible fields (not hidden)
  const visibleFields = (promptConfig.embedFields || []).filter((field) => !field.hidden);

  return (
    <div id="embed-prompt-fields" className="w-full">
      {/* Dynamic Fields */}
      {visibleFields.length > 0 && (
        <div className="space-y-3 mb-0">
          {visibleFields.map((field) => (
            <div key={field.name} className="form-control">
              <label className="label">
                <span className="label-text text-sm font-medium">
                  {field.name.charAt(0).toUpperCase() + field.name.slice(1)}
                </span>
              </label>
              {field.type === "input" ? (
                <input
                  type="text"
                  className="input input-bordered w-full"
                  placeholder={`Enter value for ${field.name}`}
                  value={field.value || ""}
                  onChange={(e) => handleFieldValueChange(field.name, e.target.value)}
                  onFocus={onFocus}
                  onBlur={handleBlur}
                  disabled={isPublished || !isEditor}
                  title={isPublished ? "Cannot edit in published mode" : ""}
                />
              ) : (
                <textarea
                  className="textarea textarea-bordered w-full h-32"
                  placeholder={`Enter value for ${field.name}`}
                  value={field.value || ""}
                  onChange={(e) => handleFieldValueChange(field.name, e.target.value)}
                  onFocus={onFocus}
                  onBlur={handleBlur}
                  disabled={isPublished || !isEditor}
                  title={isPublished ? "Cannot edit in published mode" : ""}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {visibleFields.length === 0 && (
        <div className="alert alert-info">
          <Info className="stroke-current shrink-0 w-6 h-6" />
          <span className="text-xs">No visible fields to fill. All fields are hidden.</span>
        </div>
      )}

      {variablesSection}
    </div>
  );
};

EmbedPromptFields.displayName = "EmbedPromptFields";

export default EmbedPromptFields;
