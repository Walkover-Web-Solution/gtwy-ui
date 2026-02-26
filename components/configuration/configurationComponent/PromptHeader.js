import React, { memo, useCallback } from "react";
import { useCustomSelector } from "@/customHooks/customSelector";
import Protected from "@/components/Protected";

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
    onMigratePrompt = () => {},
    migratePrompt = false,
    showEmbedMigratePrompt = false,
  }) => {
    const handleOpenDiff = useCallback(() => {
      onOpenDiff?.();
    }, [onOpenDiff]);

    const hidePromptHelper = useCustomSelector(
      (state) => state.appInfoReducer?.embedUserDetails?.hidePromptHelper || false
    );

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
          {!isPromptHelperOpen && ((isEmbedUser && !hidePromptHelper) || !isEmbedUser) && (
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
          <div className="btn-group">
            {!isEmbedUser && (
              <button
                type="button"
                className={`btn btn-xs ${
                  viewMode === "simple" ? "btn-active" : ""
                } ${isPublished || !isEditor ? "btn-disabled" : ""}`}
                onMouseDown={(e) => {
                  if (isPublished || !isEditor) return;
                  e.preventDefault();
                  onViewModeChange("simple");
                }}
              >
                Simple
              </button>
            )}
            {typeof prompt === "string" || (isEmbedUser && showEmbedMigratePrompt)
              ? (!isEmbedUser || migratePrompt) && (
                  <button
                    type="button"
                    className={`btn btn-xs ${isPublished || !isEditor ? "btn-disabled" : ""}`}
                    onMouseDown={(e) => {
                      if (isPublished || !isEditor) return;
                      e.preventDefault();
                      onMigratePrompt();
                    }}
                    title="Convert simple prompt to structured format (Role, Goal, Instruction)"
                  >
                    Migrate Prompt
                  </button>
                )
              : !isEmbedUser && (
                  <button
                    type="button"
                    className={`btn btn-xs ${
                      viewMode === "advanced" ? "btn-active" : ""
                    } ${isPublished || !isEditor ? "btn-disabled" : ""}`}
                    onMouseDown={(e) => {
                      if (isPublished || !isEditor) return;
                      e.preventDefault();
                      onViewModeChange("advanced");
                    }}
                  >
                    Advanced
                  </button>
                )}
          </div>
        </div>
      </div>
    );
  }
);

PromptHeader.displayName = "PromptHeader";

export default Protected(PromptHeader);
