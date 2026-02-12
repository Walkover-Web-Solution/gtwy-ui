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
    viewMode = "simple",
    onViewModeChange = () => {},
    showDiffButton = true,
    isEmbedUser = false,
  }) => {
    const handleOpenDiff = useCallback(() => {
      onOpenDiff?.();
    }, [onOpenDiff]);

    // Conditional styling based on isPromptHelperOpen
    if (isPromptHelperOpen && !isMobileView) {
      return (
        <div
          data-testid="prompt-header-helper-open"
          id="prompt-header-helper-open"
          className={`flex z-very-high items-center justify-between p-3 border-b border-base-300 bg-base-50 ${!isEditor ? "mt-8" : ""}`}
        >
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-base-content">System Prompt</h3>
          </div>

          <div className="flex items-center gap-4">
            {prompt && showDiffButton && (
              <span
                data-testid="prompt-header-diff-button-open"
                id="prompt-header-diff-button-open"
                className="text-sm text-base-content hover:text-base-content/80 hover:bg-base-200 cursor-pointer px-2 py-1 rounded transition-colors"
                onClick={handleOpenDiff}
                title="View Diff"
              >
                Diff
              </span>
            )}
            <span
              data-testid="prompt-header-close-helper-button"
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
      <div data-testid="prompt-header-default" id="prompt-header-default" className="flex justify-between items-center">
        <div className="label flex items-center gap-2">
          <span className="label-text capitalize font-medium">System Prompt</span>
        </div>

        <div className="label gap-6 sm:gap-4">
          {prompt && !isPromptHelperOpen && showDiffButton && (
            <span
              data-testid="prompt-header-diff-button"
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
              data-testid="prompt-header-open-helper-button"
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
          {/* View Mode Selector */}
          <div className="flex items-center bg-base-200 rounded-lg p-0.5">
            <button
              type="button"
              className={`px-3 py-1 text-xs rounded-md transition-all ${
                viewMode === "simple"
                  ? "bg-base-100 shadow-sm text-base-content font-medium"
                  : "text-base-content/60 hover:text-base-content"
              } ${isPublished || !isEditor ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              onMouseDown={(e) => {
                if (isPublished || !isEditor) return;
                e.preventDefault();
                onViewModeChange("simple");
              }}
            >
              Simple
            </button>
            <button
              type="button"
              className={`px-3 py-1 text-xs rounded-md transition-all ${
                viewMode === "advanced"
                  ? "bg-base-100 shadow-sm text-base-content font-medium"
                  : "text-base-content/60 hover:text-base-content"
              } ${isPublished || !isEditor ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              onMouseDown={(e) => {
                if (isPublished || !isEditor) return;
                e.preventDefault();
                onViewModeChange("advanced");
              }}
            >
              Advanced
            </button>
          </div>
        </div>
      </div>
    );
  }
);

PromptHeader.displayName = "PromptHeader";

export default PromptHeader;
