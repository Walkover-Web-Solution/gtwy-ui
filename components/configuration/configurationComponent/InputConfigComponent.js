import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePromptSelector } from "@/customHooks/useOptimizedSelector";
import { MODAL_TYPE, PROMPT_SECTION_CONFIG, PROMPT_VIEW_MODE } from "@/utils/enums";
import { openModal } from "@/utils/utility";
import PromptSummaryModal from "../../modals/PromptSummaryModal";
import Diff_Modal from "@/components/modals/DiffModal";
import PromptHeader from "./PromptHeader";
import PromptTextarea from "./PromptTextarea";
import DefaultVariablesSection from "./DefaultVariablesSection";
import MigratePromptModal from "../../modals/MigratePromptModal";
import { useCustomSelector } from "@/customHooks/customSelector";
import { promptObjectToString } from "@/utils/promptUtils";
import Protected from "@/components/Protected";

// Ultra-smooth InputConfigComponent with ref-based approach
const InputConfigComponent = memo(
  ({
    params,
    searchParams,
    promptTextAreaRef,
    uiState,
    updateUiState,
    promptState,
    setPromptState,
    handleCloseTextAreaFocus,
    savePrompt,
    isMobileView,
    isPublished,
    isEditor,
    isEmbedUser,
  }) => {
    // Optimized Redux selector with memoization and shallow comparison
    const { prompt: reduxPrompt, oldContent } = usePromptSelector(params, searchParams);
    const { showVariables, embedPromptConfig,bridge_pre_tools } = useCustomSelector((state) => {
      const eu = state.appInfoReducer.embedUserDetails;
      const versionData = state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[searchParams?.version];
      return { showVariables: eu?.showVariables, embedPromptConfig: eu?.prompt, bridge_pre_tools: versionData?.pre_tools || [], };
    });
    // Refs for zero-render typing experience
    const debounceTimerRef = useRef(null);
    const textareaRef = useRef(null);
    const blurTimerRef = useRef(null);

    const [isTextareaFocused, setIsTextareaFocused] = useState(false);
    const [embedFieldValues, setEmbedFieldValues] = useState(null);

    const isStructuredPrompt = typeof reduxPrompt === "object" && reduxPrompt !== null;

    const [viewMode, setViewMode] = useState(
      isStructuredPrompt ? (PROMPT_VIEW_MODE?.SIMPLE ?? "simple") : (PROMPT_VIEW_MODE?.ADVANCED ?? "advanced")
    );
    const [structuredFields, setStructuredFields] = useState(isStructuredPrompt ? reduxPrompt : null);

    useEffect(() => {
      setStructuredFields(isStructuredPrompt ? reduxPrompt : null);
      setViewMode(
        isStructuredPrompt ? (PROMPT_VIEW_MODE?.SIMPLE ?? "simple") : (PROMPT_VIEW_MODE?.ADVANCED ?? "advanced")
      );
      setEmbedFieldValues(null);
    }, [reduxPrompt]);

    const {
      isEmbedCustomPrompt,
      hiddenEmbedFields,
      isOldEmbedFormat,
      visibleEmbedFields,
      activeEmbedFieldValues,
      isEmbedStringPrompt,
    } = useMemo(() => {
      const isCustom =
        isEmbedUser &&
        typeof embedPromptConfig === "object" &&
        embedPromptConfig !== null &&
        embedPromptConfig.useDefaultPrompt === false &&
        Array.isArray(embedPromptConfig.embedFields) &&
        embedPromptConfig.embedFields.length > 0;

      if (!isCustom) {
        return {
          isEmbedCustomPrompt: false,
          hiddenEmbedFields: [],
          isOldEmbedFormat: false,
          visibleEmbedFields: [],
          activeEmbedFieldValues: {},
          isEmbedStringPrompt: false,
        };
      }

      // Agent prompt is still a plain string — needs migration to embed fields format
      const promptIsString = typeof reduxPrompt === "string";
      if (promptIsString) {
        return {
          isEmbedCustomPrompt: false,
          hiddenEmbedFields: [],
          isOldEmbedFormat: false,
          visibleEmbedFields: embedPromptConfig.embedFields,
          activeEmbedFieldValues: {},
          isEmbedStringPrompt: true,
        };
      }

      const dbValues =
        typeof reduxPrompt === "object" && reduxPrompt !== null && !Array.isArray(reduxPrompt) ? reduxPrompt : {};

      const hidden = embedPromptConfig.embedFields.filter((f) => f.hidden);
      const oldFormat =
        typeof reduxPrompt === "object" && reduxPrompt !== null && Array.isArray(reduxPrompt.embedFields);
      const dbKeys = oldFormat ? new Set() : new Set(Object.keys(dbValues));

      const fields = embedPromptConfig.embedFields.filter((f) => !f.hidden).map((f) => ({ ...f, deprecated: false }));
      dbKeys.forEach((key) => {
        const fieldInConfig = embedPromptConfig.embedFields.find((f) => f.name === key);

        // If field exists AND is hidden → ignore completely
        if (fieldInConfig?.hidden) return;

        // If field does NOT exist in config at all → deprecated
        if (!fieldInConfig) {
          fields.push({
            name: key,
            type: "textarea",
            hidden: false,
            deprecated: true,
          });
        }
      });

      const activeValues = embedFieldValues ? { ...dbValues, ...embedFieldValues } : dbValues;

      return {
        isEmbedCustomPrompt: true,
        hiddenEmbedFields: hidden,
        isOldEmbedFormat: oldFormat,
        visibleEmbedFields: fields,
        activeEmbedFieldValues: activeValues,
        isEmbedStringPrompt: false,
      };
    }, [isEmbedUser, embedPromptConfig, reduxPrompt, embedFieldValues]);

    const handleEmbedFieldChange = useCallback((fieldName, value) => {
      setEmbedFieldValues((prev) => ({ ...(prev || {}), [fieldName]: value }));
    }, []);

    const handleSaveEmbedFields = useCallback(() => {
      if (!isEmbedCustomPrompt) return;
      const valueToSave = {};
      visibleEmbedFields.forEach((f) => {
        if (f.deprecated) return;
        valueToSave[f.name] = activeEmbedFieldValues[f.name] ?? "";
      });
      savePrompt(valueToSave);
      setEmbedFieldValues(null);
      setPromptState((prev) => ({ ...prev, prompt: valueToSave, newContent: "" }));
    }, [isEmbedCustomPrompt, visibleEmbedFields, activeEmbedFieldValues, savePrompt, setPromptState]);

    const handleClearDeprecatedField = useCallback(() => {
      if (!isEmbedCustomPrompt) return;
      const valueToSave = {};
      visibleEmbedFields.forEach((f) => {
        if (f.deprecated) return; // exclude all deprecated (including the one being cleared)
        valueToSave[f.name] = activeEmbedFieldValues[f.name] ?? "";
      });
      savePrompt(valueToSave);
      setEmbedFieldValues(null);
      setPromptState((prev) => ({ ...prev, prompt: valueToSave, newContent: "" }));
    }, [isEmbedCustomPrompt, visibleEmbedFields, activeEmbedFieldValues, savePrompt, setPromptState]);

    const handlePromptChange = useCallback(
      (value) => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
          setPromptState((prev) => ({ ...prev, newContent: value }));
        }, 500);
      },
      [setPromptState]
    );

    const handleFieldChange = useCallback(
      (key, value) => {
        setStructuredFields((prev) => {
          const base = prev || (isStructuredPrompt ? reduxPrompt : {});
          const updated = { ...base, [key]: value };
          setPromptState((p) => ({ ...p, newContent: updated }));
          return updated;
        });
      },
      [reduxPrompt, isStructuredPrompt, setPromptState]
    );

    const handleSavePrompt = useCallback(() => {
      let valueToSave;
      if (viewMode === PROMPT_VIEW_MODE.SIMPLE) {
        valueToSave = { ...structuredFields };
      } else {
        valueToSave = (textareaRef.current?.value || "").trim();
      }
      savePrompt(valueToSave);
      setPromptState((prev) => ({ ...prev, prompt: valueToSave, newContent: "" }));
    }, [savePrompt, setPromptState, viewMode, structuredFields]);

    const handleMigrateConfirm = useCallback(
      (fields) => {
        const valueToSave = { ...fields };
        savePrompt(valueToSave);
        setPromptState((prev) => ({ ...prev, prompt: valueToSave, newContent: "" }));
      },
      [savePrompt, setPromptState]
    );

    const handleEmbedMigrateConfirm = useCallback(
      (fields) => {
        const valueToSave = { ...fields };
        savePrompt(valueToSave);
        setPromptState((prev) => ({ ...prev, prompt: valueToSave, newContent: "" }));
      },
      [savePrompt, setPromptState]
    );

    const handleOpenDiffModal = useCallback(() => {
      const currentValue =
        viewMode === PROMPT_VIEW_MODE.SIMPLE
          ? promptObjectToString(structuredFields)
          : textareaRef.current?.value || "";
      setPromptState((prev) => ({ ...prev, newContent: currentValue }));
      openModal(MODAL_TYPE?.DIFF_PROMPT);
    }, [setPromptState, viewMode, structuredFields]);

    const handleOpenPromptHelper = useCallback(() => {
      if (!uiState.isPromptHelperOpen && window.innerWidth > 710) {
        updateUiState({ isPromptHelperOpen: true });
      }
    }, [uiState.isPromptHelperOpen, updateUiState]);

    const handleTextareaFocus = useCallback(() => {
      if (blurTimerRef.current) {
        clearTimeout(blurTimerRef.current);
        blurTimerRef.current = null;
      }
      setIsTextareaFocused(true);
    }, []);
    const handleTextareaBlur = useCallback(() => {
      blurTimerRef.current = setTimeout(() => setIsTextareaFocused(false), 200);
    }, []);

    const showDiffButton = useMemo(() => {
      const old = typeof oldContent === "string" ? oldContent : JSON.stringify(oldContent || "");
      const currentValue =
        viewMode === PROMPT_VIEW_MODE.SIMPLE
          ? JSON.stringify(structuredFields)
          : textareaRef.current?.value || (typeof reduxPrompt === "string" ? reduxPrompt : "");
      return old.trim() !== currentValue.trim();
    }, [oldContent, reduxPrompt, viewMode, structuredFields]);

    const handleKeyDown = useCallback(
      (event) => {
        if (event.key === "Tab" && uiState.isPromptHelperOpen) {
          event.preventDefault();
          return;
        }
        if (event.key === "Escape" && uiState.isPromptHelperOpen) {
          event.preventDefault();
          updateUiState({ isPromptHelperOpen: false });
        }
      },
      [uiState.isPromptHelperOpen, updateUiState]
    );

    const advancedViewValue = useMemo(() => {
      if (!isStructuredPrompt) return reduxPrompt || "";
      return promptObjectToString(reduxPrompt);
    }, [isStructuredPrompt, reduxPrompt]);

    return (
      <div data-testid="input-config-container" id="input-config-container" ref={promptTextAreaRef}>
        <PromptHeader
          isPromptHelperOpen={uiState.isPromptHelperOpen}
          isMobileView={isMobileView}
          onOpenDiff={handleOpenDiffModal}
          onOpenPromptHelper={handleOpenPromptHelper}
          handleCloseTextAreaFocus={handleCloseTextAreaFocus}
          isPublished={isPublished}
          isEditor={isEditor}
          prompt={reduxPrompt}
          setIsTextareaFocused={setIsTextareaFocused}
          isFocused={isTextareaFocused}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          showDiffButton={showDiffButton}
          isEmbedCustomPrompt={isEmbedCustomPrompt}
          onMigratePrompt={() => openModal(MODAL_TYPE.MIGRATE_PROMPT_MODAL)}
        />

        <div className="form-control relative">
          {isEmbedStringPrompt ? (
            /* Embed user with embedFields config but prompt is still a plain string — show textarea + migrate */
            <>
              <PromptTextarea
                textareaRef={textareaRef}
                initialValue={typeof reduxPrompt === "string" ? reduxPrompt : ""}
                onChange={handlePromptChange}
                isPromptHelperOpen={uiState.isPromptHelperOpen}
                onKeyDown={handleKeyDown}
                isPublished={isPublished}
                isEditor={isEditor}
                onSave={handleSavePrompt}
                onFocus={handleTextareaFocus}
                onTextAreaBlur={handleTextareaBlur}
              />
            </>
          ) : isEmbedCustomPrompt ? (
            <div className="flex flex-col gap-3 pb-2">
              {isOldEmbedFormat && !isPublished && isEditor && (
                <div className="alert alert-warning py-2 text-xs flex items-center justify-between gap-2">
                  <span>This prompt uses an older format. Save to migrate to the new format.</span>
                  <button type="button" className="btn btn-xs btn-warning" onClick={handleSaveEmbedFields}>
                    Save &amp; Migrate
                  </button>
                </div>
              )}
              {visibleEmbedFields.map((field) => (
                <div key={field.name} className="form-control">
                  <label className="label py-0 flex items-center gap-2">
                    <span className="label-text text-xs font-medium capitalize text-base-content/70 mb-2">
                      {field.name}
                    </span>
                    {field.deprecated && <span className="badge badge-warning badge-xs text-xs">deprecated</span>}
                  </label>
                  <div className="relative">
                    {field.type === "textarea" ? (
                      <textarea
                        className={`textarea textarea-bordered w-full text-sm leading-relaxed resize-y min-h-32 ${
                          field.deprecated ? "opacity-60 pr-8" : ""
                        }`}
                        value={activeEmbedFieldValues[field.name] || ""}
                        onChange={(e) => !field.deprecated && handleEmbedFieldChange(field.name, e.target.value)}
                        readOnly={field.deprecated}
                        onFocus={handleTextareaFocus}
                        onBlur={(e) => {
                          if (field.deprecated) return;
                          handleTextareaBlur(e);
                          if (!isPublished && isEditor) handleSaveEmbedFields();
                        }}
                        disabled={isPublished || !isEditor}
                        placeholder={field.deprecated ? "(no longer used in prompt)" : `Enter ${field.name}...`}
                      />
                    ) : (
                      <input
                        type="text"
                        className={`input input-bordered w-full text-sm input-sm ${
                          field.deprecated ? "opacity-60 pr-8" : ""
                        }`}
                        value={activeEmbedFieldValues[field.name] || ""}
                        onChange={(e) => !field.deprecated && handleEmbedFieldChange(field.name, e.target.value)}
                        readOnly={field.deprecated}
                        onFocus={handleTextareaFocus}
                        onBlur={(e) => {
                          if (field.deprecated) return;
                          handleTextareaBlur(e);
                          if (!isPublished && isEditor) handleSaveEmbedFields();
                        }}
                        disabled={isPublished || !isEditor}
                        placeholder={field.deprecated ? "(no longer used in prompt)" : `Enter ${field.name}...`}
                      />
                    )}
                    {field.deprecated && !isPublished && isEditor && (
                      <button
                        type="button"
                        className="absolute right-2 top-2 text-base-content/40 hover:text-error"
                        title="Clear deprecated field value"
                        onClick={(event) => {
                          event.stopPropagation();
                          event.preventDefault();
                          handleClearDeprecatedField(field.name);
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : viewMode === PROMPT_VIEW_MODE.SIMPLE ? (
            <div className="flex flex-col gap-3 pb-2">
              {Object.entries(PROMPT_SECTION_CONFIG).map(([key, fieldConfig]) => (
                <div key={key} className="form-control">
                  <label className="label py-0">
                    <span className="label-text text-xs font-medium capitalize text-base-content/70 mb-1">
                      {fieldConfig.label || key}
                    </span>
                  </label>
                  {fieldConfig.type === "textarea" ? (
                    <textarea
                      className="textarea textarea-bordered w-full text-sm leading-relaxed resize-y min-h-72  "
                      value={(structuredFields || {})[key] || ""}
                      onChange={(e) => handleFieldChange(key, e.target.value)}
                      onFocus={handleTextareaFocus}
                      onBlur={(e) => {
                        handleTextareaBlur(e);
                        if (!isPublished && isEditor) handleSavePrompt();
                      }}
                      disabled={isPublished || !isEditor}
                      placeholder={fieldConfig.placeholder || `Enter ${key}...`}
                    />
                  ) : (
                    <input
                      type="text"
                      className="input input-bordered w-full text-sm input-sm"
                      value={(structuredFields || {})[key] || ""}
                      onChange={(e) => handleFieldChange(key, e.target.value)}
                      onFocus={handleTextareaFocus}
                      onBlur={(e) => {
                        handleTextareaBlur(e);
                        if (!isPublished && isEditor) handleSavePrompt();
                      }}
                      disabled={isPublished || !isEditor}
                      placeholder={fieldConfig.placeholder || `Enter ${key}...`}
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* PLAIN STRING or ADVANCED VIEW: single textarea */
            <PromptTextarea
              textareaRef={textareaRef}
              initialValue={isStructuredPrompt ? advancedViewValue : reduxPrompt}
              onChange={handlePromptChange}
              isPromptHelperOpen={uiState.isPromptHelperOpen}
              onKeyDown={handleKeyDown}
              isPublished={isPublished || (isStructuredPrompt && viewMode === PROMPT_VIEW_MODE.ADVANCED)}
              isEditor={isEditor}
              onSave={handleSavePrompt}
              onFocus={handleTextareaFocus}
              onTextAreaBlur={handleTextareaBlur}
              readOnly={isStructuredPrompt && viewMode === PROMPT_VIEW_MODE.ADVANCED}
            />
          )}

          {((isEmbedUser && showVariables) || !isEmbedUser) && (
            <DefaultVariablesSection
              isPublished={isPublished}
              prompt={reduxPrompt}
              isEditor={isEditor}
              isEmbedUser={isEmbedUser}
              hiddenFields={hiddenEmbedFields}
              preTools={bridge_pre_tools}
            />
          )}
        </div>

        <Diff_Modal
          oldContent={oldContent}
          newContent={
            isEmbedCustomPrompt
              ? activeEmbedFieldValues
              : viewMode === PROMPT_VIEW_MODE.SIMPLE
                ? structuredFields
                : textareaRef.current?.value || reduxPrompt
          }
          isEmbedCustomPrompt={isEmbedCustomPrompt}
        />
        <PromptSummaryModal modalType={MODAL_TYPE.PROMPT_SUMMARY} params={params} searchParams={searchParams} />

        <MigratePromptModal
          currentPrompt={typeof reduxPrompt === "string" ? reduxPrompt : ""}
          onConfirm={isEmbedStringPrompt ? handleEmbedMigrateConfirm : handleMigrateConfirm}
          embedFields={isEmbedStringPrompt ? visibleEmbedFields : null}
        />
      </div>
    );
  }
);

InputConfigComponent.displayName = "InputConfigComponent";

export default Protected(InputConfigComponent);
