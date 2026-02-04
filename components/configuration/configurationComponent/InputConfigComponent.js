import React, { memo, useCallback, useMemo, useRef, useState } from "react";
import { usePromptSelector } from "@/customHooks/useOptimizedSelector";
import { MODAL_TYPE } from "@/utils/enums";
import { openModal } from "@/utils/utility";
import PromptSummaryModal from "../../modals/PromptSummaryModal";
import Diff_Modal from "@/components/modals/DiffModal";
import PromptHeader from "./PromptHeader";
import PromptTextarea from "./PromptTextarea";
import DefaultVariablesSection from "./DefaultVariablesSection";
import { useCustomSelector } from "@/customHooks/customSelector";

// Ultra-smooth InputConfigComponent with ref-based approach
const InputConfigComponent = memo(
  ({
    params,
    searchParams,
    promptTextAreaRef,
    // Consolidated state props
    uiState,
    updateUiState,
    promptState,
    setPromptState,
    handleCloseTextAreaFocus,
    savePrompt,
    isMobileView,
    closeHelperButtonLocation,
    isPublished,
    isEditor,
    isEmbedUser,
  }) => {
    const { showVariables } = useCustomSelector((state) => state.appInfoReducer.embedUserDetails);
    // Optimized Redux selector with memoization and shallow comparison
    const { prompt: reduxPrompt, oldContent } = usePromptSelector(params, searchParams);
    // Refs for zero-render typing experience
    const debounceTimerRef = useRef(null);
    const oldContentRef = useRef(oldContent);
    const hasUnsavedChangesRef = useRef(false);
    const textareaRef = useRef(null);

    // Focus state for textarea
    const [isTextareaFocused, setIsTextareaFocused] = useState(false);
    // Update refs when redux prompt changes (external updates)
    if (oldContentRef.current !== reduxPrompt) {
      oldContentRef.current = oldContent || reduxPrompt;
      hasUnsavedChangesRef.current = false;
    }
    // Zero-render prompt change handler using refs only
    const handlePromptChange = useCallback(
      (value) => {
        // Update refs immediately - no re-render
        const hasChanges = value.trim() !== reduxPrompt.trim();
        hasUnsavedChangesRef.current = hasChanges;
        // Update save button state only when needed
        if (hasChanges !== promptState.hasUnsavedChanges) {
          setPromptState((prev) => ({
            ...prev,
            hasUnsavedChanges: hasChanges,
          }));
        }

        // Debounced updates for diff modal only
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
          setPromptState((prev) => ({
            ...prev,
            newContent: value,
          }));
        }, 500); // Longer debounce since it's just for diff modal
      },
      [reduxPrompt, promptState.hasUnsavedChanges, setPromptState]
    );

    // Optimized save handler using current editor text (contentEditable div)
    const handleSavePrompt = useCallback(() => {
      const currentValue = (textareaRef.current?.value || "").trim();
      savePrompt(currentValue);
      oldContentRef.current = currentValue;
      hasUnsavedChangesRef.current = false;

      // Update state only for UI elements that need it
      setPromptState((prev) => ({
        ...prev,
        prompt: currentValue,
        newContent: "",
        hasUnsavedChanges: false,
      }));
      // Don't close Prompt Helper when saving
      // handleCloseTextAreaFocus();
    }, [savePrompt, setPromptState]);

    // Memoized handlers to prevent unnecessary re-renders
    const handleOpenDiffModal = useCallback(() => {
      // Get the current value from the textarea before opening the modal
      const currentValue = textareaRef.current?.value || "";
      // Update the newContent in promptState
      setPromptState((prev) => ({
        ...prev,
        newContent: currentValue,
      }));
      openModal(MODAL_TYPE?.DIFF_PROMPT);
    }, [setPromptState]);

    const handleOpenPromptHelper = useCallback(() => {
      if (!uiState.isPromptHelperOpen && window.innerWidth > 710) {
        updateUiState({ isPromptHelperOpen: true });
        if (typeof window.closeTechDoc === "function") {
          window.closeTechDoc();
        }
      }
    }, [uiState.isPromptHelperOpen, updateUiState]);

    const handleClosePromptHelper = useCallback(() => {
      updateUiState({ isPromptHelperOpen: false });
    }, [updateUiState]);

    // Handle textarea focus
    const handleTextareaFocus = useCallback(() => {
      setIsTextareaFocused(true);
    }, []);

    // Handle textarea blur with delay to allow button clicks
    const handleTextareaBlur = useCallback(() => {
      // Delay to allow button clicks to register before hiding
      setTimeout(() => {
        setIsTextareaFocused(false);
      }, 200);
    }, []);

    // Memoized values to prevent recalculation
    const isDisabled = useMemo(() => !promptState.hasUnsavedChanges, [promptState.hasUnsavedChanges]);

    // Early return for unsupported service types
    const handleKeyDown = useCallback(
      (event) => {
        // Disable Tab key when PromptHelper is open
        if (event.key === "Tab" && uiState.isPromptHelperOpen) {
          event.preventDefault();
          return;
        }

        // Close PromptHelper on Escape key
        if (event.key === "Escape" && uiState.isPromptHelperOpen) {
          event.preventDefault();
          updateUiState({ isPromptHelperOpen: false });
          return;
        }
      },
      [uiState.isPromptHelperOpen, updateUiState]
    );

    return (
      <div id="input-config-container" ref={promptTextAreaRef}>
        <PromptHeader
          hasUnsavedChanges={promptState.hasUnsavedChanges}
          onSave={handleSavePrompt}
          isPromptHelperOpen={uiState.isPromptHelperOpen}
          isMobileView={isMobileView}
          onOpenDiff={handleOpenDiffModal}
          onOpenPromptHelper={handleOpenPromptHelper}
          onClosePromptHelper={handleClosePromptHelper}
          disabled={isDisabled}
          handleCloseTextAreaFocus={handleCloseTextAreaFocus}
          isPublished={isPublished}
          isEditor={isEditor}
          prompt={reduxPrompt}
          setIsTextareaFocused={setIsTextareaFocused}
          isFocused={isTextareaFocused}
        />

        <div className="form-control relative">
          <PromptTextarea
            textareaRef={textareaRef}
            initialValue={reduxPrompt}
            onChange={handlePromptChange}
            isPromptHelperOpen={uiState.isPromptHelperOpen}
            onKeyDown={handleKeyDown}
            isPublished={isPublished}
            isEditor={isEditor}
            onSave={handleSavePrompt}
            onFocus={handleTextareaFocus}
            onTextAreaBlur={handleTextareaBlur}
          />
          {((isEmbedUser && showVariables) || !isEmbedUser) && (
            <DefaultVariablesSection isPublished={isPublished} prompt={reduxPrompt} isEditor={isEditor} />
          )}
        </div>

        <Diff_Modal oldContent={oldContentRef.current} newContent={textareaRef.current?.value || reduxPrompt} />
        <PromptSummaryModal modalType={MODAL_TYPE.PROMPT_SUMMARY} params={params} searchParams={searchParams} />
      </div>
    );
  }
);

InputConfigComponent.displayName = "InputConfigComponent";

export default InputConfigComponent;
