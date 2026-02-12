import React, { memo, useMemo } from "react";
import PromptTextarea from "./PromptTextarea";
import StructuredPromptInput from "./StructuredPromptInput";
import EmbedPromptFields from "./EmbedPromptFields";
import DefaultVariablesSection from "./DefaultVariablesSection";
import { extractVariablesFromPrompt, convertPromptToAdvancedView } from "@/utils/promptUtils";

/**
 * PromptRenderer Component
 * Handles the rendering logic for different prompt views (Simple/Advanced) for both Main and Embed users
 */
const PromptRenderer = memo(
  ({
    isEmbedUser,
    viewMode,
    currentPromptValue,
    showVariables,
    isPublished,
    isEditor,
    handlePromptChange,
    handleSavePrompt,
    handleTextareaFocus,
    handleTextareaBlur,
    uiState,
    handleKeyDown,
    textareaRef,
  }) => {
    // Extract embed fields for embed users
    const { hiddenFields, allEmbedFieldNames } = useMemo(() => {
      let hiddenFields = [];
      let allEmbedFieldNames = [];

      if (isEmbedUser && typeof currentPromptValue === "object" && currentPromptValue !== null) {
        if (Array.isArray(currentPromptValue.embedFields)) {
          // Get all embed field names to filter them out from custom variables
          allEmbedFieldNames = currentPromptValue.embedFields.map((field) => field.name);
          // Get only hidden fields to display separately
          hiddenFields = currentPromptValue.embedFields.filter((field) => field.hidden === true);
        }
      }

      return { hiddenFields, allEmbedFieldNames };
    }, [isEmbedUser, currentPromptValue]);

    // Extract variables from prompt and filter out embed fields
    const customVariables = useMemo(() => {
      const allVariables = extractVariablesFromPrompt(currentPromptValue);
      return allVariables.filter((varName) => !allEmbedFieldNames.includes(varName));
    }, [currentPromptValue, allEmbedFieldNames]);

    // Conditionally render variables section based on user type and showVariables setting
    // Main users: always show
    // Embed users: only show if showVariables is enabled
    const shouldShowVariables = (isEmbedUser && showVariables) || !isEmbedUser;

    const variablesSection = shouldShowVariables ? (
      <DefaultVariablesSection
        isPublished={isPublished}
        prompt={currentPromptValue}
        isEditor={isEditor}
        customVariables={customVariables}
        hiddenFields={hiddenFields}
        isEmbedUser={isEmbedUser}
      />
    ) : null;

    // MAIN USER - SIMPLE VIEW: Show structured fields (Role, Goal, Instruction)
    if (!isEmbedUser && viewMode === "simple") {
      return (
        <StructuredPromptInput
          key="main-simple"
          prompt={currentPromptValue}
          onChange={handlePromptChange}
          onSave={handleSavePrompt}
          isPublished={isPublished}
          isEditor={isEditor}
          onFocus={handleTextareaFocus}
          onBlur={handleTextareaBlur}
          isPromptHelperOpen={uiState.isPromptHelperOpen}
          variablesSection={variablesSection}
        />
      );
    }

    // MAIN USER - ADVANCED VIEW: Show single textarea with compiled prompt
    if (!isEmbedUser && viewMode === "advanced") {
      const advancedPromptValue = convertPromptToAdvancedView(currentPromptValue);
      return (
        <>
          <PromptTextarea
            key="main-advanced"
            textareaRef={textareaRef}
            initialValue={advancedPromptValue}
            onChange={handlePromptChange}
            isPromptHelperOpen={uiState.isPromptHelperOpen}
            onKeyDown={handleKeyDown}
            isPublished={isPublished}
            isEditor={isEditor}
            onSave={handleSavePrompt}
            onFocus={handleTextareaFocus}
            onTextAreaBlur={handleTextareaBlur}
            variablesSection={variablesSection}
            readOnly={true}
          />
        </>
      );
    }

    // EMBED USER - SIMPLE VIEW: Show custom fields
    if (isEmbedUser && viewMode === "simple") {
      const promptToUse = currentPromptValue;

      // If prompt is a string, show single textarea (useDefaultPrompt = true)
      if (typeof promptToUse === "string") {
        return (
          <PromptTextarea
            key="embed-simple-string"
            textareaRef={textareaRef}
            initialValue={promptToUse}
            onChange={handlePromptChange}
            isPromptHelperOpen={uiState.isPromptHelperOpen}
            onKeyDown={handleKeyDown}
            isPublished={isPublished}
            isEditor={isEditor}
            onSave={handleSavePrompt}
            onFocus={handleTextareaFocus}
            onTextAreaBlur={handleTextareaBlur}
            variablesSection={variablesSection}
          />
        );
      }

      // If prompt is an object with embedFields, show custom fields
      if (typeof promptToUse === "object" && promptToUse !== null && promptToUse.embedFields) {
        return (
          <EmbedPromptFields
            key="embed-simple-fields"
            prompt={promptToUse}
            onChange={handlePromptChange}
            onSave={handleSavePrompt}
            isPublished={isPublished}
            isEditor={isEditor}
            onFocus={handleTextareaFocus}
            onBlur={handleTextareaBlur}
            variablesSection={variablesSection}
          />
        );
      }

      // If prompt is an object with role/goal/instruction (structured format)
      if (
        typeof promptToUse === "object" &&
        promptToUse !== null &&
        (promptToUse.role !== undefined || promptToUse.goal !== undefined || promptToUse.instruction !== undefined)
      ) {
        return (
          <StructuredPromptInput
            key="embed-simple-structured"
            prompt={promptToUse}
            onChange={handlePromptChange}
            onSave={handleSavePrompt}
            isPublished={isPublished}
            isEditor={isEditor}
            onFocus={handleTextareaFocus}
            onBlur={handleTextareaBlur}
            isPromptHelperOpen={uiState.isPromptHelperOpen}
            variablesSection={variablesSection}
          />
        );
      }

      // Fallback for embed user simple view
      return (
        <PromptTextarea
          key="embed-simple-fallback"
          textareaRef={textareaRef}
          initialValue={typeof promptToUse === "string" ? promptToUse : ""}
          onChange={handlePromptChange}
          isPromptHelperOpen={uiState.isPromptHelperOpen}
          onKeyDown={handleKeyDown}
          isPublished={isPublished}
          isEditor={isEditor}
          onSave={handleSavePrompt}
          onFocus={handleTextareaFocus}
          onTextAreaBlur={handleTextareaBlur}
          variablesSection={variablesSection}
        />
      );
    }

    // EMBED USER - ADVANCED VIEW: Show compiled textarea
    if (isEmbedUser && viewMode === "advanced") {
      const advancedPromptValue = convertPromptToAdvancedView(currentPromptValue, isEmbedUser);
      return (
        <>
          <PromptTextarea
            key="embed-advanced"
            textareaRef={textareaRef}
            initialValue={advancedPromptValue}
            onChange={handlePromptChange}
            isPromptHelperOpen={uiState.isPromptHelperOpen}
            onKeyDown={handleKeyDown}
            isPublished={isPublished}
            isEditor={isEditor}
            onSave={handleSavePrompt}
            onFocus={handleTextareaFocus}
            onTextAreaBlur={handleTextareaBlur}
            variablesSection={variablesSection}
            readOnly={true}
          />
        </>
      );
    }

    // Fallback
    return null;
  }
);

PromptRenderer.displayName = "PromptRenderer";

export default PromptRenderer;
