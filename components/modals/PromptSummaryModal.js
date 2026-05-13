import { useCustomSelector } from "@/customHooks/customSelector";
import { genrateSummaryAction, updateBridgeAction } from "@/store/action/bridgeAction";
import { closeModal } from "@/utils/utility";
import React, { useCallback, useEffect, useRef, useState, useMemo, memo } from "react";
import { useDispatch } from "react-redux";
import Modal from "../UI/Modal";
import { promptObjectToString } from "@/utils/promptUtils";

// Optimized Textarea Component
const OptimizedTextarea = memo(({ value, onChange, className, disabled, placeholder }) => {
  const divRef = useRef(null);
  const contentRef = useRef(null);

  const handleInput = useCallback(
    (e) => {
      const newValue = e.target.value || "";
      onChange({ target: { value: newValue } });
    },
    [onChange]
  );

  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  }, []);

  useEffect(() => {
    if (contentRef.current && contentRef.current.value !== value) {
      contentRef.current.value = value;
    }
  }, [value]);

  return (
    <div ref={divRef}>
      <textarea
        data-testid="prompt-summary-textarea"
        id="prompt-summary-textarea"
        ref={contentRef}
        disabled={disabled}
        onInput={handleInput}
        onPaste={handlePaste}
        className={className}
        placeholder={placeholder}
        style={{
          minHeight: "8rem",
          maxWidth: "100%",
          width: "100%",
          whiteSpace: "pre-wrap",
          wordWrap: "break-word",
          wordBreak: "break-all",
          overflowWrap: "break-word",
          overflow: "hidden",
          overflowY: "auto",
          overflowX: "hidden",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
});

OptimizedTextarea.displayName = "OptimizedTextarea";

// Reusable Agent Summary Content Component
export const AgentSummaryContent = memo(
  ({
    params,
    autoGenerateSummary = false,
    setAutoGenerateSummary = () => {},
    onGeneratingChange = () => {},
    showTitle = true,
    showButtons = true,
    onSave = () => {},
    isMandatory = false,
    showValidationError = false,
    prompt,
    versionId,
    isEditor = true,
    showSaveButton = true,
    autoSave = false,
    autoGenerateOnEmptyTrigger = 0,
  }) => {
    const dispatch = useDispatch();
    const { bridge_summary } = useCustomSelector((state) => ({
      bridge_summary: state?.bridgeReducer?.allBridgesMap?.[params?.id]?.bridge_summary,
    }));
    const [displayValue, setDisplayValue] = useState(bridge_summary || ""); // Immediate display value
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const debounceTimerRef = useRef(null);
    const isGeneratingSummaryRef = useRef(false);
    const lastSavedSummaryRef = useRef(bridge_summary || "");
    const latestDisplayValueRef = useRef(bridge_summary || "");
    const lastAutoGenerateKeyRef = useRef(null);

    useEffect(() => {
      const nextSummary = bridge_summary || "";
      lastSavedSummaryRef.current = nextSummary;
      if (!autoSave || nextSummary === latestDisplayValueRef.current) {
        latestDisplayValueRef.current = nextSummary;
        setDisplayValue(nextSummary);
      }
    }, [autoSave, bridge_summary, params, versionId]);

    const saveSummary = useCallback(
      async (value) => {
        if (!isEditor) return;

        const newValue = value || "";
        if (newValue === lastSavedSummaryRef.current) {
          onSave(newValue);
          return;
        }

        try {
          const dataToSend = { bridge_summary: newValue };
          const data = await dispatch(updateBridgeAction({ bridgeId: params.id, dataToSend }));
          if (data?.success) {
            lastSavedSummaryRef.current = newValue;
            onSave(newValue);
          }
        } catch (error) {
          console.error("Failed to save summary:", error);
        }
      },
      [dispatch, isEditor, onSave, params.id]
    );

    // Ultra-fast textarea change handler with minimal processing
    const handleTextareaChange = useCallback(
      (e) => {
        const value = e.target.value || "";
        latestDisplayValueRef.current = value;
        setDisplayValue(value); // Only update display value immediately

        // Clear existing timer
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        if (autoSave && isEditor) {
          debounceTimerRef.current = setTimeout(() => {
            debounceTimerRef.current = null;
            saveSummary(value);
          }, 800);
        }
      },
      [autoSave, isEditor, saveSummary]
    );

    // Cleanup debounce timer
    useEffect(() => {
      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
      };
    }, []);

    const handleGenerateSummary = useCallback(async () => {
      if (isGeneratingSummaryRef.current) return;

      // Convert prompt to string safely (handles both string and object formats)
      const promptText = typeof prompt === "string" ? prompt : promptObjectToString(prompt);
      if (!promptText || promptText.trim() === "") {
        setErrorMessage("Prompt is required");
        return;
      }
      isGeneratingSummaryRef.current = true;
      setIsGeneratingSummary(true);
      onGeneratingChange(true);
      try {
        const result = await dispatch(genrateSummaryAction({ versionId: versionId }));
        if (result) {
          latestDisplayValueRef.current = result;
          setDisplayValue(result); // Update display value immediately
          if (autoSave) {
            await saveSummary(result);
          }
          setAutoGenerateSummary(false); // Reset the flag
        }
      } finally {
        isGeneratingSummaryRef.current = false;
        setIsGeneratingSummary(false);
        onGeneratingChange(false);
      }
    }, [autoSave, dispatch, onGeneratingChange, prompt, saveSummary, setAutoGenerateSummary, versionId]);

    // Auto-generate summary when flag is true
    useEffect(() => {
      if (autoGenerateSummary && setAutoGenerateSummary) {
        handleGenerateSummary();
      }
    }, [autoGenerateSummary, handleGenerateSummary, setAutoGenerateSummary]);

    // Generate once per explicit trigger when the publish modal opens with an empty summary.
    useEffect(() => {
      const summaryIsEmpty = !bridge_summary || bridge_summary.trim() === "";
      const autoGenerateKey = `${versionId || "unknown"}:${autoGenerateOnEmptyTrigger}`;

      if (
        autoGenerateOnEmptyTrigger &&
        summaryIsEmpty &&
        isEditor &&
        lastAutoGenerateKeyRef.current !== autoGenerateKey
      ) {
        lastAutoGenerateKeyRef.current = autoGenerateKey;
        handleGenerateSummary();
      }
    }, [autoGenerateOnEmptyTrigger, bridge_summary, handleGenerateSummary, isEditor, versionId]);

    const handleSaveSummary = useCallback(() => {
      // Ensure we save the latest value from displayValue
      saveSummary(displayValue);
    }, [displayValue, saveSummary]);

    // Memoized validation values with reduced computation
    const validationProps = useMemo(() => {
      const isEmpty = !displayValue || displayValue.trim() === "";
      return {
        hasValidationError: showValidationError && isEmpty,
        isDisabled: isGeneratingSummary || bridge_summary === displayValue,
        textareaClassName: `textarea bg-base-100 textarea-bordered w-full min-h-32 resize-y focus:border-primary caret-base-content p-2 ${
          showValidationError && isEmpty ? "border-red-500 focus:border-red-500" : ""
        }`,
      };
    }, [showValidationError, displayValue, isGeneratingSummary, bridge_summary]);

    return (
      <div id="agent-summary-content" data-testid="agent-summary-content" className="space-y-4">
        {(showTitle || showButtons) && (
          <div id="agent-summary-header" className="flex justify-between items-center">
            {showTitle && (
              <h3 className="font-bold text-lg flex items-center gap-2">
                Agent Summary
                {isMandatory && <span className="text-red-500">*</span>}
              </h3>
            )}
            {showButtons && (
              <div className="flex gap-2">
                <button
                  data-testid="agent-summary-generate-button"
                  id="agent-summary-generate-button"
                  className={`btn btn-ghost btn-sm ${isGeneratingSummary ? "opacity-50 cursor-not-allowed" : ""}`}
                  onClick={handleGenerateSummary}
                  disabled={isGeneratingSummary}
                >
                  <span className="capitalize font-medium bg-gradient-to-r from-blue-800 to-orange-600 text-transparent bg-clip-text">
                    {isGeneratingSummary ? "Generating Summary..." : "Generate New Summary"}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        {errorMessage && <span className="text-red-500 text-sm block">{errorMessage}</span>}
        {validationProps.hasValidationError && (
          <span className="text-red-500 text-sm block">Summary is required before publishing</span>
        )}

        <div className="space-y-2">
          <div className="relative">
            {isGeneratingSummary ? (
              <div className="flex items-center gap-2 rounded-lg border border-base-300 bg-base-100 px-3 py-2 text-sm text-base-content/70">
                <span className="loading loading-spinner loading-xs text-primary" />
                Generating summary...
              </div>
            ) : (
              <OptimizedTextarea
                value={displayValue}
                onChange={handleTextareaChange}
                className={validationProps.textareaClassName}
                placeholder="Enter agent summary..."
                disabled={false}
              />
            )}
          </div>
          {showSaveButton && (
            <div className="flex gap-2">
              <button
                data-testid="agent-summary-save-button"
                id="agent-summary-save-button"
                className="btn btn-primary btn-sm"
                onClick={handleSaveSummary}
                disabled={validationProps.isDisabled || !isEditor}
              >
                Save
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
);

AgentSummaryContent.displayName = "AgentSummaryContent";

// Original Modal Component
const PromptSummaryModal = ({ modalType, params, autoGenerateSummary = false, setAutoGenerateSummary = () => {} }) => {
  const handleClose = () => {
    closeModal(modalType);
    setAutoGenerateSummary(false);
  };

  return (
    <Modal MODAL_ID={modalType} onClose={handleClose}>
      <div id="prompt-summary-modal-box" data-testid="prompt-summary-modal-box" className="modal-box w-11/12 max-w-5xl">
        <AgentSummaryContent
          params={params}
          autoGenerateSummary={autoGenerateSummary}
          setAutoGenerateSummary={setAutoGenerateSummary}
          showTitle={true}
          onSave={() => closeModal(modalType)}
        />
        <div className="modal-action">
          <button
            id="prompt-summary-close-button"
            data-testid="prompt-summary-close-button"
            className="btn btn-sm"
            onClick={handleClose}
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default PromptSummaryModal;
