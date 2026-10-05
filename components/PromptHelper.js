import React, { useState, useEffect, useCallback } from "react";
import Canvas from "@/components/Canvas";
import { useCustomSelector } from "@/customHooks/customSelector";
import { optimizePromptApi } from "@/config/index";
import { PROMPT_SECTION_CONFIG } from "@/utils/enums";
import Protected from "./Protected";

const PromptHelper = ({
  isVisible,
  params,
  searchParams,
  onClose,
  setPrompt,
  messages,
  setMessages,
  thread_id,
  onResetThreadId,
  showCloseButton = false,
  autoCloseOnBlur,
  setNewContent,
  savePrompt,
  isEmbedUser,
  variable_key,
  draftPrompt,
}) => {
  const { embedPromptConfig, reduxPrompt } = useCustomSelector((state) => {
    const eu = state.appInfoReducer.embedUserDetails;
    const versionData = state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[searchParams?.version];
    const bridgeDataFromState = state?.bridgeReducer?.allBridgesMap?.[params?.id];
    const isPublished = searchParams?.isPublished === "true";
    return {
      embedPromptConfig: eu?.prompt,
      reduxPrompt: isPublished
        ? bridgeDataFromState?.configuration?.prompt || ""
        : versionData?.configuration?.prompt || "",
    };
  });
  const [optimizedPrompt, setOptimizedPrompt] = useState("");

  const handleOptimizePrompt = useCallback(
    async (instructionText) => {
      try {
        const response = await optimizePromptApi({
          query: instructionText,
          thread_id,
          bridge_id: params.id,
          version_id: searchParams.version,
          variables: { variable_key },
        });

        if (response?.isAxiosError || response?.response) {
          return { description: "Failed to optimize prompt. Please try again." };
        }

        // The API wrapper (`optimizePromptApi`) returns `response.data.result` directly,
        // which may be:
        //   - a stringified JSON object: `{"role": "..."}`            (shapes C/D)
        //   - a Python-style dict string: `{'field': 'value'}`        (single embed field)
        //   - a plain non-JSON string                                  (shape E – single textarea)
        // Try to parse as JSON, normalizing Python-style quoting first.
        const tryParseLoose = (s) => {
          try {
            return JSON.parse(s);
          } catch {
            const trimmed = String(s).trim();
            if (trimmed.startsWith("{") && trimmed.includes("'")) {
              try {
                return JSON.parse(
                  trimmed
                    .replace(/'/g, '"')
                    .replace(/\bNone\b/g, "null")
                    .replace(/\bTrue\b/g, "true")
                    .replace(/\bFalse\b/g, "false")
                );
              } catch {
                return undefined;
              }
            }
            return undefined;
          }
        };

        let result;
        if (typeof response === "string") {
          const parsed = tryParseLoose(response);
          result = parsed && typeof parsed === "object" ? parsed : { updated: response };
        } else {
          result = response?.data ?? response;
        }

        if (result && typeof result === "object" && result.updated === undefined) {
          if (variable_key && result[variable_key] !== undefined) {
            result.updated = result[variable_key];
          } else {
            const { reason, description, ...rest } = result;
            const keys = Object.keys(rest);
            if (keys.length === 1) {
              result.updated = rest[keys[0]];
            } else if (keys.length > 0) {
              result.updated = rest;
            }
          }
        }

        if (result?.updated) {
          setOptimizedPrompt(result.updated);
        }

        return result;
      } catch (error) {
        console.error("Error optimizing prompt:", error);
        return { description: "Failed to optimize prompt. Please try again." };
      }
    },
    [params.id, searchParams.version, thread_id, variable_key]
  );

  // Apply optimized prompt and save immediately
  const handleApplyOptimizedPrompt = (promptToApply) => {
    const promptContent = promptToApply || optimizedPrompt;
    if (!promptContent) return;

    // Merge on top of the values currently in the editor (including edits the user
    // has typed but not saved yet) rather than the last saved prompt, so applying a
    // result for one field does not discard the other fields' unsaved values.
    const basePrompt =
      draftPrompt && typeof draftPrompt === "object" && !Array.isArray(draftPrompt) ? draftPrompt : reduxPrompt;

    // Per-field apply: if a variable_key is targeted and we got a plain string
    // value (from the normalized per-field response), update only that field.
    if (variable_key && typeof promptContent === "string") {
      const isEmbedCustomPromptField =
        isEmbedUser &&
        typeof embedPromptConfig === "object" &&
        embedPromptConfig !== null &&
        embedPromptConfig.useDefaultPrompt === false &&
        Array.isArray(embedPromptConfig.embedFields) &&
        embedPromptConfig.embedFields.length > 0;

      if (isEmbedCustomPromptField) {
        const currentEmbedValues =
          typeof basePrompt === "object" && basePrompt !== null && !Array.isArray(basePrompt) ? { ...basePrompt } : {};
        const merged = { ...currentEmbedValues, [variable_key]: promptContent };
        if (savePrompt) savePrompt(merged);
        if (setNewContent) setNewContent(merged);
      } else {
        let toSave;
        if (basePrompt && typeof basePrompt === "object" && !Array.isArray(basePrompt)) {
          toSave = { ...basePrompt, [variable_key]: promptContent };
        } else {
          toSave = { [variable_key]: promptContent };
        }
        if (savePrompt) savePrompt(toSave);
        if (setNewContent) setNewContent(toSave);
        if (setPrompt) setPrompt(toSave);
      }
      return;
    }

    // Try to parse the optimized content as JSON
    let parsedOptimized = null;
    try {
      let toParse = promptContent;
      if (typeof toParse === "string") {
        // Normalize Python-style single-quoted dicts to valid JSON
        // e.g. "{'key': 'value'}" → '{"key": "value"}'
        const trimmed = toParse.trim();
        if (trimmed.startsWith("{") && trimmed.includes("'")) {
          toParse = trimmed
            .replace(/'/g, '"')
            .replace(/\bNone\b/g, "null")
            .replace(/\bTrue\b/g, "true")
            .replace(/\bFalse\b/g, "false");
        }
      }
      const parsed = typeof toParse === "string" ? JSON.parse(toParse) : toParse;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        parsedOptimized = parsed;
      }
    } catch (e) {
      console.error("[PromptHelper] JSON parse failed:", e.message, "raw:", promptContent);
    }

    // Check if this is an embed user with custom embed fields configured
    const isEmbedCustomPrompt =
      isEmbedUser &&
      typeof embedPromptConfig === "object" &&
      embedPromptConfig !== null &&
      embedPromptConfig.useDefaultPrompt === false &&
      Array.isArray(embedPromptConfig.embedFields) &&
      embedPromptConfig.embedFields.length > 0;

    // Normalize a key for loose matching: lowercase, trimmed, optional trailing `s` removed.
    // Handles API responses that may return "Instructions" while the local field is "instruction".
    const normalizeKey = (k) =>
      String(k || "")
        .trim()
        .toLowerCase()
        .replace(/s$/, "");

    if (parsedOptimized && isEmbedCustomPrompt) {
      // Embed user: merge optimized fields into existing embed prompt object
      const currentEmbedValues =
        typeof basePrompt === "object" && basePrompt !== null && !Array.isArray(basePrompt) ? { ...basePrompt } : {};
      const visibleFieldNames = embedPromptConfig.embedFields.filter((f) => !f.hidden).map((f) => f.name);
      // Build a normalized -> canonical name map (handles case + trailing `s` mismatch).
      const embedFieldLookup = {};
      visibleFieldNames.forEach((n) => {
        embedFieldLookup[normalizeKey(n)] = n;
      });
      const merged = { ...currentEmbedValues };
      Object.keys(parsedOptimized).forEach((key) => {
        if (key === "reason") return;
        const canonical = embedFieldLookup[normalizeKey(key)] ?? (visibleFieldNames.includes(key) ? key : null);
        if (canonical) {
          merged[canonical] = parsedOptimized[key];
        }
      });
      if (savePrompt) savePrompt(merged);
      if (setNewContent) setNewContent(merged);
    } else if (parsedOptimized) {
      // Non-embed: merge into existing reduxPrompt if it's an object, else save parsedOptimized directly
      let toSave;
      if (basePrompt && typeof basePrompt === "object" && !Array.isArray(basePrompt)) {
        // Merge matching keys from optimized into existing object. Loose matching
        // so responses like "Instructions" map to the local "instruction" key.
        toSave = { ...basePrompt };
        const keyLookup = {};
        Object.keys(toSave).forEach((k) => {
          keyLookup[normalizeKey(k)] = k;
        });
        Object.keys(parsedOptimized).forEach((key) => {
          if (key === "reason") return;
          const canonical = keyLookup[normalizeKey(key)] ?? (key in toSave ? key : null);
          if (canonical) {
            toSave[canonical] = parsedOptimized[key];
          }
        });
      } else {
        // reduxPrompt is a string — converting to a structured prompt object.
        // Normalize keys against PROMPT_SECTION_CONFIG so e.g. "Instructions"
        // becomes "instruction" and the structured-prompt UI renders the value.
        const { reason: _r, description: _d, ...rest } = parsedOptimized;
        const sectionLookup = {};
        Object.keys(PROMPT_SECTION_CONFIG).forEach((k) => {
          sectionLookup[normalizeKey(k)] = k;
        });
        toSave = {};
        Object.keys(rest).forEach((key) => {
          const canonical = sectionLookup[normalizeKey(key)] ?? key;
          toSave[canonical] = rest[key];
        });
      }
      if (savePrompt) savePrompt(toSave);
      if (setNewContent) setNewContent(toSave);
      if (setPrompt) setPrompt(toSave);
    } else if (setPrompt) {
      setPrompt(promptContent);
      if (setNewContent) setNewContent(promptContent);
      if (savePrompt) savePrompt(promptContent);
    }
  };

  // Reset chat when the active field changes
  const prevVariableKeyRef = React.useRef(variable_key);
  useEffect(() => {
    if (prevVariableKeyRef.current !== variable_key) {
      prevVariableKeyRef.current = variable_key;
      if (setMessages) setMessages([]);
      if (onResetThreadId) onResetThreadId();
    }
  }, [variable_key]);

  const modalRef = React.createRef();

  useEffect(() => {
    if (!autoCloseOnBlur) return;

    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        const isBackdrop = event.target.classList.contains("modal-backdrop") || event.target.closest(".modal-backdrop");

        if (isBackdrop) {
          onClose();
        }
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [autoCloseOnBlur, onClose]);

  // Handle modal blur
  const handleModalBlur = (e) => {
    // Only trigger if we're not focusing something inside the modal
    if (autoCloseOnBlur && modalRef.current && !modalRef.current.contains(document.activeElement)) {
      // Small delay to ensure we're not closing during normal navigation within the modal
      setTimeout(() => {
        if (!modalRef.current.contains(document.activeElement)) {
          onClose();
        }
      }, 100);
    }
  };

  if (!isVisible) return null;

  return (
    <div
      data-testid="prompt-helper-container"
      id="prompt-helper-container"
      ref={modalRef}
      className=" z-very-high w-full bottom-2 bg-base-100 h-full rounded-l-md shadow-lg transition-all duration-300 ease-in-out z-30"
      onBlur={handleModalBlur}
      tabIndex={-1}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-base-300 bg-base-50">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-base-content">Prompt Helper</h3>
        </div>

        {showCloseButton && (
          <button
            data-testid="prompt-helper-close-button"
            id="prompt-helper-close-button"
            onClick={onClose}
            className="btn btn-xs btn-error"
            title="Close Prompt Helper"
          >
            Close Helper
          </button>
        )}
      </div>

      {/* Content Area - Prompt Builder Only */}
      <div className="w-full h-full">
        <div className="p-3 h-full flex flex-col">
          {/* Prompt Builder layout */}
          <div className="flex flex-row h-full gap-2">
            {/* Canvas for chat interactions */}
            <div className="flex-1 mb-12 flex flex-col max-h-full">
              <Canvas
                OptimizePrompt={handleOptimizePrompt}
                messages={(() => {
                  return messages || [];
                })()}
                setMessages={(value) => {
                  setMessages(value);
                }}
                width="100%"
                height="100%"
                handleApplyOptimizedPrompt={handleApplyOptimizedPrompt}
                onResetThreadId={onResetThreadId}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Protected(PromptHelper);
