import React, { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2 } from "lucide-react";
import Modal from "../UI/Modal";
import { openModal, closeModal } from "@/utils/utility";
import CodeMirror from "@uiw/react-codemirror";
import { json, jsonParseLinter } from "@codemirror/lang-json";
import { useThemeManager } from "@/customHooks/useThemeManager";
import { linter, lintGutter } from "@codemirror/lint";

/**
 * A reusable fullscreen editor modal for textareas (prompt, JSON schema, etc.)
 * Opens via `isOpen` prop, edits a local copy, and calls `onSave` on close.
 */
function FullscreenEditorModal({
  modalId,
  title = "Editor",
  value = "",
  isOpen = false,
  onClose,
  onSave,
  placeholder = "",
  disabled = false,
  mono = false,
  isJson = false,
  onAttemptEdit,
}) {
  const textareaRef = useRef(null);
  const [localValue, setLocalValue] = useState(value);
  const { actualTheme } = useThemeManager();
  const [errorMsg, setErrorMsg] = useState("");
  const hasChanges = localValue !== value;
  const isSaveDisabled = disabled || !hasChanges;

  // Sync local copy when parent opens the modal with a new value
  useEffect(() => {
    if (isOpen) {
      setLocalValue(value);
      setErrorMsg("");
    }
  }, [isOpen, value]);

  // Open the DaisyUI dialog AFTER React has rendered the <dialog> element
  useEffect(() => {
    if (isOpen) {
      openModal(modalId);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const len = textareaRef.current.value.length;
          textareaRef.current.setSelectionRange(len, len);
        }
      }, 50);
    }
  }, [isOpen, modalId]);

  const handleClose = useCallback(() => {
    onClose?.();
    closeModal(modalId);
  }, [onClose, modalId]);

  const handleSave = useCallback(() => {
    if (!hasChanges) return;
    setErrorMsg("");
    if (isJson) {
      try {
        JSON.parse(localValue);
      } catch {
        setErrorMsg("Invalid JSON schema");
        return;
      }
    }

    try {
      const isSuccess = onSave?.(localValue);
      if (isSuccess === false) {
        setErrorMsg("Invalid JSON schema");
        return;
      }
      onClose?.();
      closeModal(modalId);
    } catch (e) {
      console.error(e);
      setErrorMsg("Invalid JSON schema");
    }
  }, [localValue, onSave, onClose, modalId, isJson, hasChanges]);

  if (!isOpen) return null;

  return (
    <Modal
      MODAL_ID={modalId}
      onClose={handleClose}
      title={title}
      description={isJson ? "Edit and validate JSON content" : "Edit content in fullscreen mode"}
      icon={<Maximize2 size={16} className="text-trace-gold" />}
      widthClass="w-[min(1000px,96vw)]"
    >
      <div
        data-testid="fullscreen-editor-modal"
        className="flex flex-col"
        style={{ height: "calc(100dvh - 16rem)", minHeight: "300px" }}
      >
        {errorMsg && (
          <div className="alert alert-error text-sm py-2 mb-4 flex-shrink-0">
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex-1 overflow-hidden overflow-y-auto relative">
          {onAttemptEdit && (
            <div
              className="absolute inset-0 z-10 cursor-text"
              onClick={(e) => {
                e.stopPropagation();
                onAttemptEdit();
              }}
            />
          )}
          {isJson ? (
            <div data-testid="fullscreen-editor-codemirror-wrapper" className="h-full">
              <CodeMirror
                value={localValue}
                height="100%"
                extensions={[json(), linter(jsonParseLinter()), lintGutter()]}
                theme={actualTheme}
                editable={!disabled}
                onChange={(val) => {
                  setLocalValue(val);
                  if (errorMsg) setErrorMsg("");
                }}
                className="h-full border border-base-300 overflow-hidden text-sm"
              />
            </div>
          ) : (
            <textarea
              data-testid="fullscreen-editor-textarea"
              ref={textareaRef}
              value={localValue}
              onChange={(e) => {
                setLocalValue(e.target.value);
                if (errorMsg) setErrorMsg("");
              }}
              placeholder={placeholder}
              disabled={disabled}
              className={`w-full h-full resize-none textarea p-4 min-h-[200px] outline-none ${mono ? "font-mono text-sm" : ""} ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
            />
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-base-content/10">
          <button
            data-testid="fullscreen-editor-close-button"
            onClick={handleClose}
            className="btn btn-sm"
            type="button"
          >
            Close
          </button>
          <button
            data-testid="fullscreen-editor-save-button"
            onClick={handleSave}
            className="btn btn-primary btn-sm"
            type="button"
            disabled={isSaveDisabled}
          >
            Save & Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Small button that opens the fullscreen editor.
 */
export function FullscreenEditorButton({ onClick, tooltip = "Open fullscreen editor", className = "", ...rest }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`btn btn-xs btn-ghost text-base-content/60 hover:text-primary transition-colors ${className}`}
      title={tooltip}
      {...rest}
    >
      <Maximize2 size={14} />
    </button>
  );
}

export default React.memo(FullscreenEditorModal);
