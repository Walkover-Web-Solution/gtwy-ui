import React, { memo, useCallback } from "react";

// Optimized header component with memoization
const PromptHeader = memo(
  ({
    hasUnsavedChanges,
    onSave,
    isPromptHelperOpen,
    isMobileView,
    onOpenDiff,
    onOpenPromptHelper,
    onClosePromptHelper,
    handleCloseTextAreaFocus,
    showCloseHelperButton = false,
    disabled = false,
    isPublished = false,
    isEditor = true,
    prompt = "",
    isFocused = false,
    setIsTextareaFocused = () => {},
  }) => {
    const handleOpenDiff = useCallback(() => {
      onOpenDiff?.();
    }, [onOpenDiff]);

    // Conditional styling based on isPromptHelperOpen
    if (isPromptHelperOpen && !isMobileView) {
      return (
        <div
          id="prompt-header-helper-open"
          className={`flex z-very-high items-center justify-between p-3 border-b border-base-300 bg-base-50 ${!isEditor ? "mt-8" : ""}`}
        >
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-base-content">System Prompt</h3>
          </div>

          <div className="flex items-center gap-4">
            {prompt && (
              <span
                id="prompt-header-diff-button-open"
                className="text-sm text-base-content hover:text-base-content/80 hover:bg-base-200 cursor-pointer px-2 py-1 rounded transition-colors"
                onClick={handleOpenDiff}
                title="View Diff"
              >
                Diff
              </span>
            )}
            <span
              id="prompt-header-close-helper-button"
              className="text-sm text-error hover:text-error/80 hover:bg-error/10 cursor-pointer px-2 py-1 rounded transition-colors"
              onClick={(e) => {
                e.preventDefault();
                handleCloseTextAreaFocus();
                setIsTextareaFocused(false);
              }}
              title="Close Prompt Helper"
            >
              Close Helper
            </span>
          </div>
        </div>
      );
    }

    // Default styling when isPromptHelperOpen is false
    return (
      <div id="prompt-header-default" className="flex justify-between items-center">
        <div className="label flex items-center gap-2">
          <span className="label-text capitalize font-medium">System Prompt</span>
        </div>

        <div className="label gap-6 sm:gap-4">
          {prompt && !isPromptHelperOpen && (
            <span
              id="prompt-header-diff-button"
              className={`text-sm text-base-content hover:text-base-content/80 hover:bg-base-200 px-2 py-1 rounded transition-opacity duration-500 ease-in-out ${
                isFocused ? "opacity-100 cursor-pointer" : "opacity-0 pointer-events-none cursor-default"
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                handleOpenDiff();
              }}
              title="View Diff"
            >
              Diff
            </span>
          )}
          {!isPromptHelperOpen && (
            <span
              id="prompt-header-open-helper-button"
              className={`text-sm text-base-content hover:text-base-content/80 hover:bg-base-200 px-2 py-1 rounded transition-opacity duration-500 ease-in-out ${
                isFocused ? "opacity-100 cursor-pointer" : "opacity-0 pointer-events-none cursor-default"
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                onOpenPromptHelper();
              }}
              title={isPublished ? "Prompt Helper: Cannot edit in published mode" : "Open Prompt Helper"}
            >
              Prompt Helper
            </span>
          )}
        </div>
      </div>
    );
  }
);

PromptHeader.displayName = "PromptHeader";

export default PromptHeader;
