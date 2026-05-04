import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePromptSelector } from "@/customHooks/useOptimizedSelector";
import { MODAL_TYPE, PROMPT_SECTION_CONFIG } from "@/utils/enums";
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
import FullscreenEditorModal, { FullscreenEditorButton } from "../../modals/FullscreenEditorModal";
import { BrainIcon } from "@/components/Icons";

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
    const { showVariables, embedPromptConfig, bridge_pre_tools } = useCustomSelector((state) => {
      const eu = state.appInfoReducer.embedUserDetails;
      const versionData = state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[searchParams?.version];
      return {
        showVariables: eu?.showVariables,
        embedPromptConfig: eu?.prompt,
        bridge_pre_tools: versionData?.pre_tools || [],
      };
    });
    // Refs for zero-render typing experience
    const debounceTimerRef = useRef(null);
    const textareaRef = useRef(null);
    const blurTimerRef = useRef(null);

    const [isTextareaFocused, setIsTextareaFocused] = useState(false);
    const [focusedField, setFocusedField] = useState(null);
    const [fieldDiffState, setFieldDiffState] = useState(null);
    const [embedFieldValues, setEmbedFieldValues] = useState(null);
    const [fullscreenEditor, setFullscreenEditor] = useState({
      isOpen: false,
      title: "Prompt",
      value: "",
      fieldKey: null,
      fieldType: null,
    });

    const isStructuredPrompt = typeof reduxPrompt === "object" && reduxPrompt !== null;
    const [structuredFields, setStructuredFields] = useState(isStructuredPrompt ? reduxPrompt : null);

    useEffect(() => {
      setStructuredFields(isStructuredPrompt ? reduxPrompt : null);
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
          visibleEmbedFields: Array.isArray(embedPromptConfig.embedFields) ? embedPromptConfig.embedFields : [],
          activeEmbedFieldValues: {},
          isEmbedStringPrompt: true,
        };
      }

      const dbValues =
        typeof reduxPrompt === "object" && reduxPrompt !== null && !Array.isArray(reduxPrompt) ? reduxPrompt : {};

      const embedFields = Array.isArray(embedPromptConfig.embedFields) ? embedPromptConfig.embedFields : [];
      const hidden = embedFields.filter((f) => f.hidden);
      const oldFormat =
        typeof reduxPrompt === "object" && reduxPrompt !== null && Array.isArray(reduxPrompt.embedFields);
      const dbKeys = oldFormat ? new Set() : new Set(Object.keys(dbValues));

      const fields = embedFields.filter((f) => !f.hidden).map((f) => ({ ...f, deprecated: false }));
      dbKeys.forEach((key) => {
        const fieldInConfig = embedFields.find((f) => f.name === key);

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
        valueToSave[f.name] = activeEmbedFieldValues[f.name] ?? "";
      });
      savePrompt(valueToSave);
      setEmbedFieldValues(null);
      setPromptState((prev) => ({ ...prev, prompt: valueToSave, newContent: "" }));
    }, [isEmbedCustomPrompt, visibleEmbedFields, activeEmbedFieldValues, savePrompt, setPromptState]);

    const filteredEmbedFields = useMemo(
      () => visibleEmbedFields.filter((field) => !(field.deprecated && !activeEmbedFieldValues[field.name])),
      [visibleEmbedFields, activeEmbedFieldValues]
    );

    const handleClearDeprecatedField = useCallback(
      (fieldName) => {
        if (!isEmbedCustomPrompt) return;
        const valueToSave = {};
        visibleEmbedFields.forEach((f) => {
          if (f.name === fieldName) return; // exclude only the one being cleared
          valueToSave[f.name] = activeEmbedFieldValues[f.name] ?? "";
        });
        savePrompt(valueToSave);
        setEmbedFieldValues(null);
        setPromptState((prev) => ({ ...prev, prompt: valueToSave, newContent: "" }));
      },
      [isEmbedCustomPrompt, visibleEmbedFields, activeEmbedFieldValues, savePrompt, setPromptState]
    );

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
      if (isStructuredPrompt) {
        valueToSave = { ...structuredFields };
      } else {
        valueToSave = (textareaRef.current?.value || "").trim();
      }
      savePrompt(valueToSave);
      setPromptState((prev) => ({ ...prev, prompt: valueToSave, newContent: "" }));
    }, [savePrompt, setPromptState, isStructuredPrompt, structuredFields]);

    const handleMigrateConfirm = useCallback(
      (fields) => {
        const valueToSave = { ...fields };
        savePrompt(valueToSave);
        setPromptState((prev) => ({ ...prev, prompt: valueToSave, newContent: "", messages: [] }));
      },
      [savePrompt, setPromptState]
    );

    const handleEmbedMigrateConfirm = useCallback(
      (fields) => {
        const valueToSave = { ...fields };
        savePrompt(valueToSave);
        setPromptState((prev) => ({ ...prev, prompt: valueToSave, newContent: "", messages: [] }));
      },
      [savePrompt, setPromptState]
    );

    const handleOpenDiffModal = useCallback(() => {
      const currentValue = isStructuredPrompt
        ? promptObjectToString(structuredFields)
        : textareaRef.current?.value || "";
      setPromptState((prev) => ({ ...prev, newContent: currentValue }));
      setFieldDiffState(null);
      openModal(MODAL_TYPE?.DIFF_PROMPT);
    }, [setPromptState, isStructuredPrompt, structuredFields]);

    const handleOpenPromptHelper = useCallback(() => {
      if (!uiState.isPromptHelperOpen && window.innerWidth > 710) {
        updateUiState({ isPromptHelperOpen: true });
      }
    }, [uiState.isPromptHelperOpen, updateUiState]);

    const handleOpenPromptHelperForField = useCallback(
      (fieldName) => {
        setPromptState((prev) => ({ ...prev, activeHelperField: fieldName }));
        if (window.innerWidth > 710) {
          updateUiState({ isPromptHelperOpen: true });
        }
      },
      [updateUiState, setPromptState]
    );

    // When PromptHelper applies a result and activeHelperField is set,
    // route the new content into that specific embed field instead of the main prompt.
    useEffect(() => {
      if (!promptState.activeHelperField || !promptState.newContent) return;
      const value =
        typeof promptState.newContent === "object"
          ? (promptState.newContent[promptState.activeHelperField] ?? JSON.stringify(promptState.newContent))
          : String(promptState.newContent);
      handleEmbedFieldChange(promptState.activeHelperField, value);
      setPromptState((prev) => ({ ...prev, newContent: "" }));
    }, [promptState.newContent, promptState.activeHelperField, handleEmbedFieldChange, setPromptState]);

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
      const currentValue = isStructuredPrompt
        ? JSON.stringify(structuredFields)
        : textareaRef.current?.value || (typeof reduxPrompt === "string" ? reduxPrompt : "");
      return old.trim() !== currentValue.trim();
    }, [oldContent, reduxPrompt, isStructuredPrompt, structuredFields]);

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
                fullscreenButton={
                  !uiState.isPromptHelperOpen ? (
                    <FullscreenEditorButton
                      tooltip="Open prompt in fullscreen"
                      className="opacity-50 hover:opacity-100"
                      onClick={() => {
                        const currentVal =
                          textareaRef.current?.value || (typeof reduxPrompt === "string" ? reduxPrompt : "");
                        setFullscreenEditor({
                          isOpen: true,
                          title: "Prompt",
                          value: currentVal,
                          fieldKey: null,
                          fieldType: null,
                        });
                      }}
                    />
                  ) : null
                }
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
              {filteredEmbedFields.map((field) => (
                <div key={field.name} className="form-control">
                  <div className="flex items-center justify-between mb-2">
                    <label className="label py-0">
                      <span className="label-text text-xs font-medium capitalize text-base-content/70">
                        {field.displayValue || field.name}
                      </span>
                      {field.deprecated && (
                        <span className="badge badge-warning badge-xs text-xs ml-2">deprecated</span>
                      )}
                    </label>
                    {focusedField === field.name && (
                      <div className="flex items-center gap-1">
                        {!field.deprecated &&
                          !isPublished &&
                          isEditor &&
                          (activeEmbedFieldValues[field.name] ?? "") !==
                            ((typeof oldContent === "object" && oldContent !== null ? oldContent[field.name] : "") ??
                              "") && (
                            <button
                              type="button"
                              className="btn btn-xs btn-ghost border border-base-300"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                const savedVal =
                                  typeof oldContent === "object" && oldContent !== null
                                    ? (oldContent[field.name] ?? "")
                                    : "";
                                setFieldDiffState({
                                  old: { [field.name]: savedVal },
                                  new: { [field.name]: activeEmbedFieldValues[field.name] ?? "" },
                                  label: field.displayValue || field.name,
                                });
                                openModal(MODAL_TYPE.DIFF_PROMPT);
                              }}
                              title={`Compare changes for ${field.displayValue || field.name}`}
                            >
                              Diff
                            </button>
                          )}
                        {field.showPromptHelper && !field.deprecated && !isPublished && isEditor && (
                          <button
                            type="button"
                            className={`btn btn-xs gap-1 ${
                              promptState.activeHelperField === field.name && uiState.isPromptHelperOpen
                                ? "btn-primary"
                                : "btn-ghost border border-base-300"
                            }`}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              if (promptState.activeHelperField === field.name && uiState.isPromptHelperOpen) {
                                updateUiState({ isPromptHelperOpen: false });
                              } else {
                                handleOpenPromptHelperForField(field.name);
                              }
                            }}
                            title={
                              promptState.activeHelperField === field.name && uiState.isPromptHelperOpen
                                ? `Close Prompt Helper`
                                : `Open Prompt Helper for ${field.displayValue || field.name}`
                            }
                          >
                            <BrainIcon size={12} />
                            <span>
                              {promptState.activeHelperField === field.name && uiState.isPromptHelperOpen
                                ? "Close Helper"
                                : "Prompt Helper"}
                            </span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    {field.type === "textarea" ? (
                      <textarea
                        className={`textarea textarea-bordered w-full text-sm leading-relaxed resize-y min-h-32 pr-8 ${
                          field.deprecated ? "opacity-60" : ""
                        }`}
                        value={activeEmbedFieldValues[field.name] || ""}
                        onChange={(e) => !field.deprecated && handleEmbedFieldChange(field.name, e.target.value)}
                        readOnly={field.deprecated}
                        onFocus={(e) => {
                          handleTextareaFocus(e);
                          setFocusedField(field.name);
                        }}
                        onBlur={(e) => {
                          if (field.deprecated) return;
                          handleTextareaBlur(e);
                          setFocusedField(null);
                          if (!isPublished && isEditor) handleSaveEmbedFields();
                        }}
                        disabled={isPublished || !isEditor}
                        placeholder={
                          field.deprecated
                            ? "(no longer used in prompt)"
                            : `Enter ${field.displayValue || field.name}...`
                        }
                      />
                    ) : (
                      <input
                        autoComplete="off"
                        type="text"
                        className={`input input-bordered w-full text-sm input-sm pr-8 ${
                          field.deprecated ? "opacity-60" : ""
                        }`}
                        value={activeEmbedFieldValues[field.name] || ""}
                        onChange={(e) => !field.deprecated && handleEmbedFieldChange(field.name, e.target.value)}
                        readOnly={field.deprecated}
                        onFocus={(e) => {
                          handleTextareaFocus(e);
                          setFocusedField(field.name);
                        }}
                        onBlur={(e) => {
                          if (field.deprecated) return;
                          handleTextareaBlur(e);
                          setFocusedField(null);
                          if (!isPublished && isEditor) handleSaveEmbedFields();
                        }}
                        disabled={isPublished || !isEditor}
                        placeholder={
                          field.deprecated
                            ? "(no longer used in prompt)"
                            : `Enter ${field.displayValue || field.name}...`
                        }
                      />
                    )}
                    {!field.deprecated && (
                      <FullscreenEditorButton
                        tooltip={`Open ${field.name} in fullscreen`}
                        className="absolute top-1 right-1 opacity-50 hover:opacity-100 z-10"
                        onClick={() => {
                          setFullscreenEditor({
                            isOpen: true,
                            title: `Prompt — ${field.name}`,
                            value: activeEmbedFieldValues[field.name] || "",
                            fieldKey: field.name,
                            fieldType: "embed",
                          });
                        }}
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
          ) : isStructuredPrompt ? (
            <div className="flex flex-col gap-3 pb-2">
              {Object.entries(PROMPT_SECTION_CONFIG).map(([key, fieldConfig]) => (
                <div key={key} className="form-control">
                  <label className="label py-0">
                    <span className="label-text text-xs font-medium capitalize text-base-content/70 mb-1">
                      {fieldConfig.label || key}
                    </span>
                  </label>
                  <div className="relative">
                    {fieldConfig.type === "textarea" ? (
                      <textarea
                        className="textarea textarea-bordered w-full text-sm leading-relaxed resize-y min-h-72 pr-8"
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
                        autoComplete="off"
                        type="text"
                        className="input input-bordered w-full text-sm input-sm pr-8"
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
                    <FullscreenEditorButton
                      tooltip={`Open ${fieldConfig.label || key} in fullscreen`}
                      className="absolute top-1 right-1 opacity-50 hover:opacity-100"
                      onClick={() => {
                        setFullscreenEditor({
                          isOpen: true,
                          title: `Prompt — ${fieldConfig.label || key}`,
                          value: (structuredFields || {})[key] || "",
                          fieldKey: key,
                          fieldType: "structured",
                        });
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* PLAIN STRING or ADVANCED VIEW: single textarea */
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
              readOnly={false}
              fullscreenButton={
                !uiState.isPromptHelperOpen ? (
                  <FullscreenEditorButton
                    tooltip="Open prompt in fullscreen"
                    className="opacity-50 hover:opacity-100"
                    onClick={() => {
                      const currentVal =
                        textareaRef.current?.value ||
                        (typeof reduxPrompt === "string" ? reduxPrompt : promptObjectToString(reduxPrompt));
                      setFullscreenEditor({
                        isOpen: true,
                        title: "Prompt",
                        value: currentVal,
                        fieldKey: null,
                        fieldType: null,
                      });
                    }}
                  />
                ) : null
              }
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
          oldContent={fieldDiffState ? fieldDiffState.old : oldContent}
          newContent={
            fieldDiffState
              ? fieldDiffState.new
              : isEmbedCustomPrompt
                ? activeEmbedFieldValues
                : isStructuredPrompt
                  ? structuredFields
                  : textareaRef.current?.value || reduxPrompt
          }
          isEmbedCustomPrompt={fieldDiffState ? true : isEmbedCustomPrompt}
        />
        <PromptSummaryModal modalType={MODAL_TYPE.PROMPT_SUMMARY} params={params} searchParams={searchParams} />

        <MigratePromptModal
          currentPrompt={typeof reduxPrompt === "string" ? reduxPrompt : ""}
          onConfirm={isEmbedStringPrompt ? handleEmbedMigrateConfirm : handleMigrateConfirm}
          embedFields={isEmbedStringPrompt ? visibleEmbedFields : null}
        />

        <FullscreenEditorModal
          modalId={MODAL_TYPE.FULLSCREEN_PROMPT}
          title={fullscreenEditor.title}
          value={fullscreenEditor.value}
          isOpen={fullscreenEditor.isOpen}
          onClose={() => setFullscreenEditor((prev) => ({ ...prev, isOpen: false }))}
          onSave={(finalVal) => {
            if (fullscreenEditor.fieldType === "embed") {
              const updatedValues = { ...activeEmbedFieldValues, [fullscreenEditor.fieldKey]: finalVal };
              const valueToSave = {};
              visibleEmbedFields.forEach((f) => {
                if (f.deprecated) return;
                valueToSave[f.name] = updatedValues[f.name] ?? "";
              });
              savePrompt(valueToSave);
              setEmbedFieldValues(null);
              setPromptState((prev) => ({ ...prev, prompt: valueToSave, newContent: "" }));
            } else if (fullscreenEditor.fieldType === "structured") {
              const updatedStructuredFields = {
                ...(structuredFields || {}),
                [fullscreenEditor.fieldKey]: finalVal,
              };
              handleFieldChange(fullscreenEditor.fieldKey, finalVal);
              savePrompt(updatedStructuredFields);
              setPromptState((prev) => ({ ...prev, prompt: updatedStructuredFields, newContent: "" }));
            } else {
              if (textareaRef.current) {
                textareaRef.current.value = finalVal;
              }
              savePrompt(finalVal);
              setPromptState((prev) => ({ ...prev, prompt: finalVal, newContent: "" }));
            }
          }}
          placeholder="Enter your prompt..."
          disabled={isPublished || !isEditor}
        />
      </div>
    );
  }
);

InputConfigComponent.displayName = "InputConfigComponent";

export default Protected(InputConfigComponent);
