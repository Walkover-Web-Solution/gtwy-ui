import { useCustomSelector } from "@/customHooks/customSelector";
import { genrateSummaryAction, updateBridgeAction } from "@/store/action/bridgeAction";
import { closeModal } from "@/utils/utility";
import React, { useCallback, useEffect, useRef, useState, useMemo, memo } from "react";
import { useDispatch } from "react-redux";
import Modal from "../UI/Modal";

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
    showTitle = true,
    showButtons = true,
    onSave = () => {},
    isMandatory = false,
    showValidationError = false,
    prompt,
    versionId,
    isEditor = true,
  }) => {
    const dispatch = useDispatch();
    const { bridge_summary } = useCustomSelector((state) => ({
      bridge_summary: state?.bridgeReducer?.allBridgesMap?.[params?.id]?.bridge_summary,
    }));
    const [displayValue, setDisplayValue] = useState(bridge_summary || ""); // Immediate display value
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const debounceTimerRef = useRef(null);

    useEffect(() => {
      setDisplayValue(bridge_summary || "");
    }, [bridge_summary, params, versionId]);

    // Ultra-fast textarea change handler with minimal processing
    const handleTextareaChange = useCallback((e) => {
      const value = e.target.value || "";
      setDisplayValue(value); // Only update display value immediately

      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    }, []);

    // Cleanup debounce timer
    useEffect(() => {
      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
      };
    }, []);

    // Auto-generate summary when flag is true
    useEffect(() => {
      if (autoGenerateSummary && setAutoGenerateSummary) {
        handleGenerateSummary();
      }
    }, [autoGenerateSummary, setAutoGenerateSummary]);
    const handleGenerateSummary = useCallback(async () => {
      if (prompt.trim() === "") {
        setErrorMessage("Prompt is required");
        return;
      }
      setIsGeneratingSummary(true);
      try {
        const result = await dispatch(genrateSummaryAction({ versionId: versionId }));
        if (result) {
          setDisplayValue(result); // Update display value immediately
          setAutoGenerateSummary(false); // Reset the flag
        }
      } finally {
        setIsGeneratingSummary(false);
      }
    }, [dispatch, params, prompt, versionId]);
    const handleSaveSummary = useCallback(() => {
      // Ensure we save the latest value from displayValue
      const newValue = displayValue || "";
      const dataToSend = { bridge_summary: newValue };
      dispatch(updateBridgeAction({ bridgeId: params.id, dataToSend })).then((data) => {
        if (data.success) {
          onSave(newValue); // Call the callback for external handling
        }
      });
    }, [dispatch, params.id, displayValue, onSave]);

    // Memoized validation values with reduced computation
    const validationProps = useMemo(() => {
      const isEmpty = !displayValue || displayValue.trim() === "";
      return {
        hasValidationError: showValidationError && isEmpty,
        isDisabled: isGeneratingSummary || bridge_summary === displayValue,
        textareaClassName: `textarea bg-white dark:bg-black/15 textarea-bordered w-full min-h-32 resize-y focus:border-primary caret-base-content p-2 ${
          showValidationError && isEmpty ? "border-red-500 focus:border-red-500" : ""
        }`,
      };
    }, [showValidationError, displayValue, isGeneratingSummary, bridge_summary]);

    return (
      <div id="agent-summary-content" className="space-y-4">
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
          <OptimizedTextarea
            value={displayValue}
            onChange={handleTextareaChange}
            className={validationProps.textareaClassName}
            placeholder="Enter agent summary..."
            disabled={isGeneratingSummary}
          />
          <div className="flex gap-2">
            <button
              id="agent-summary-save-button"
              className="btn btn-primary btn-sm"
              onClick={handleSaveSummary}
              disabled={validationProps.isDisabled || !isEditor}
            >
              Save
            </button>
          </div>
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
      <div id="prompt-summary-modal-box" className="modal-box w-11/12 max-w-5xl">
        <AgentSummaryContent
          params={params}
          autoGenerateSummary={autoGenerateSummary}
          setAutoGenerateSummary={setAutoGenerateSummary}
          showTitle={true}
          onSave={() => closeModal(modalType)}
        />
        <div className="modal-action">
          <button id="prompt-summary-close-button" className="btn btn-sm" onClick={handleClose}>
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default PromptSummaryModal;
