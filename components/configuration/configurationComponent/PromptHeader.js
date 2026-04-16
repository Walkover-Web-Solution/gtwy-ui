import React, { memo, useCallback } from "react";
import Protected from "@/components/Protected";
import { FileDiff, X, Upload, Sparkles } from "lucide-react";
import { useCustomSelector } from "@/customHooks/customSelector";

// Optimized header component with memoization
const PromptHeader = memo(
  ({
    isPromptHelperOpen,
    isMobileView,
    onOpenDiff,
    onOpenPromptHelper,
    handleCloseTextAreaFocus,
    isPublished = false,
    isEditor = true,
    prompt = "",
    isFocused = false,
    setIsTextareaFocused = () => {},
    showDiffButton = true,
    onMigratePrompt = () => {},
    isEmbedCustomPrompt = false,
    isEmbedUser = false,
  }) => {
    const handleOpenDiff = useCallback(() => {
      onOpenDiff?.();
    }, [onOpenDiff]);

    const hidePromptHelper = useCustomSelector(
      (state) => state.appInfoReducer?.embedUserDetails?.hidePromptHelper || false
    );

    const isStructuredPrompt = typeof prompt === "object" && prompt !== null;
    const canEdit = !isPublished && isEditor;

    if (isPromptHelperOpen && !isMobileView) {
      return (
        <div
          data-testid="prompt-header-helper-open"
          id="prompt-header-helper-open"
          className={`flex items-center justify-end px-4 py-2.5 border-b border-base-300  ${!isEditor ? "mt-8" : ""}`}
        >
          <div className="flex justify-end gap-2">
            {prompt && showDiffButton && (
              <button
                type="button"
                data-testid="prompt-header-diff-button-open"
                className="btn btn-xs btn-ghost gap-1 text-base-content/70 hover:text-base-content"
                onClick={handleOpenDiff}
                title="View changes since last save"
              >
                <FileDiff size={12} />
                Diff
              </button>
            )}
            <button
              type="button"
              data-testid="prompt-header-close-helper-button"
              className="btn btn-xs btn-ghost text-error hover:bg-error/10 hover:text-error gap-1"
              onClick={(e) => {
                e.preventDefault();
                handleCloseTextAreaFocus();
                setIsTextareaFocused(false);
              }}
              title="Close Prompt Helper"
            >
              <X size={12} />
              Close Helper
            </button>
          </div>
        </div>
      );
    }

    // Default header
    return (
      <div
        data-testid="prompt-header-default"
        id="prompt-header-default"
        className="flex items-center justify-between px-0 pb-1 mt-2"
      >
        {/* Left: Title — shown for plain string prompts */}
        <div className="flex items-center gap-2">
          {!isStructuredPrompt && !isEmbedCustomPrompt && (
            <>
              <span className="text-sm font-semibold text-base-content">System Prompt</span>
              {isPublished && (
                <span className="badge badge-xs badge-ghost text-base-content/50 border-base-content/20">
                  Published
                </span>
              )}
            </>
          )}
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-1.5">
          {prompt && showDiffButton && (
            <button
              type="button"
              data-testid="prompt-header-diff-button"
              className={`btn btn-xs btn-ghost gap-1 text-base-content/60 hover:text-base-content transition-all duration-200 ${
                isFocused ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                handleOpenDiff();
              }}
              title="View changes since last save"
            >
              <FileDiff size={12} />
              Diff
            </button>
          )}

          {!isPromptHelperOpen && ((isEmbedUser && !hidePromptHelper) || !isEmbedUser) && (
            <button
              type="button"
              data-testid="prompt-header-open-helper-button"
              className={`btn btn-xs btn-ghost gap-1 text-base-content/60 hover:text-base-content transition-all duration-200 ${
                isFocused ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                onOpenPromptHelper();
              }}
              title={isPublished ? "Cannot use Prompt Helper in published mode" : "Open AI Prompt Helper"}
            >
              <Sparkles size={12} />
              Prompt Helper
            </button>
          )}

          {/* Always-visible: Migrate — only for plain string prompts */}
          {!isStructuredPrompt && canEdit && (
            <button
              type="button"
              data-testid="prompt-header-migrate-button"
              className="btn btn-xs btn-outline"
              onMouseDown={(e) => {
                e.preventDefault();
                onMigratePrompt();
              }}
              title="Convert to structured Role / Goal / Instruction format"
            >
              <Upload size={11} />
              Migrate Prompt
            </button>
          )}
        </div>
      </div>
    );
  }
);

PromptHeader.displayName = "PromptHeader";

export default Protected(PromptHeader);
