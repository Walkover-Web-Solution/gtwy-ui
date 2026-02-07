import React, { memo, useState, useMemo } from "react";
import { ChevronDownIcon, SettingsIcon } from "@/components/Icons";
import { toggleSidebar, extractPromptVariables } from "@/utils/utility";

// Optimized default variables section with accordion
const DefaultVariablesSection = memo(({ prompt = "", customVariables = [], isPublished = false, isEditor = true }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  // Extract variables used in the prompt
  const usedVariables = useMemo(() => {
    return extractPromptVariables(prompt);
  }, [prompt]);

  const defaultVariables = [
    { name: "current_time_date_and_current_identifier", description: "To access the current date and time" },
    { name: "pre_function", description: "Use this variable if you are using the pre_function" },
    { name: "timezone", description: "Access the timezone using a timezone identifier" },
  ];

  return (
    <div
      id="default-variables-section"
      className="bg-gradient-to-r bg-base-1 border-t-0 border border-base-content/10 rounded-t-none"
    >
      {/* Header - Always visible */}
      <div
        className="flex items-center gap-2 p-2 cursor-pointer hover:bg-base-200/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="text-nowrap text-xs font-medium">Instructions</span>
        <div className="flex items-center gap-2 flex-1">
          {/* Default Variables */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-base-content/60">
              Add dynamic values using &#123;&#123;variable&#125;&#125; format.
            </span>{" "}
            {usedVariables.length > 0 && "|"}
          </div>

          {/* Used Variables */}
          {usedVariables.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-base-content/60">Used:</span>
              <p
                role="alert"
                className="label-text-alt p-1 bg-success/20 text-success inline-block w-fit text-xs rounded"
              >
                &#123;&#123;{usedVariables[0]}&#125;&#125;
                {usedVariables.length > 1 && <>...</>}
              </p>
            </div>
          )}

          <button
            id="default-variables-manage-button"
            className="flex items-center btn btn-outline hover:bg-base-200 hover:text-base-content btn-xs gap-1 ml-auto"
            onClick={(e) => {
              e.stopPropagation();
              toggleSidebar("variable-collection-slider", "right");
            }}
            title="Manage Variables"
            disabled={isPublished || !isEditor}
          >
            <div className="flex items-center gap-1">
              <SettingsIcon size={12} />
              <span>Manage Variables</span>
            </div>
          </button>
        </div>
        <ChevronDownIcon
          size={14}
          className={`text-base-content/60 hover:text-base-content transition-transform duration-200 ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="border-t border-base-content/10 p-3 bg-base-50">
          {/* Default Variables Info */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-base-content mb-2">Default Variables:</h4>
            <div className="space-y-2">
              {defaultVariables.map((variable) => (
                <div key={variable.name} className="flex items-start gap-2">
                  <code className="text-xs bg-base-200 px-2 py-1 rounded text-base-content font-mono">
                    {`{{${variable.name}}}`}
                  </code>
                  <span className="text-xs py-1 text-base-content/70">{variable.description}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Variables Info */}
          {customVariables.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-base-content mb-2">Custom Variables:</h4>
              <div className="space-y-2">
                {customVariables.map((variable, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <code className="text-xs bg-base-200 px-2 py-1 rounded text-secondary font-mono">
                      {`{{${variable.name || variable}}}`}
                    </code>
                    <span className="text-xs text-base-content/70">{variable.description || "Custom variable"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Usage Info */}
          <div className="text-xs text-base-content/60 mt-3 p-2 bg-info/10 rounded border-l-2 border-info">
            <strong>Usage:</strong> Use custom variables like {`{{your_custom_variable}}`}, created from Variable
            section, to insert dynamic values into your prompt.
          </div>
        </div>
      )}
    </div>
  );
});

DefaultVariablesSection.displayName = "DefaultVariablesSection";

export default DefaultVariablesSection;
