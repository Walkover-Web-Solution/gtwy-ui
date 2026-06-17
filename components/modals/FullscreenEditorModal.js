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
    <Modal MODAL_ID={modalId} onClose={handleClose}>
      <div
        data-testid="fullscreen-editor-modal"
        className="modal-box max-w-screen-lg h-[calc(100dvh-10rem)] min-h-[calc(100dvh-10rem)] !max-h-[calc(100dvh-10rem)] w-[calc(100vw-20rem)] bg-base-100 overflow-hidden flex flex-col p-6"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Maximize2 size={18} className="text-primary" />
            {title}
          </h3>
          <div className="flex gap-2">
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

        {errorMsg && (
          <div className="alert alert-error text-sm py-2 mb-4 rounded-md flex-shrink-0">
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
                className="h-full border border-base-300 rounded overflow-hidden text-sm"
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
              className={`w-full h-full resize-none textarea textarea-bordered p-4 min-h-[200px] outline-none ${mono ? "font-mono text-sm" : ""} ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
            />
          )}
        </div>
      </div>
    </Modal>
  );
}

/**
 * Small button that opens the fullscreen editor.
 */
export function FullscreenEditorButton({ onClick, tooltip = "Open fullscreen editor", className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`btn btn-xs btn-ghost text-base-content/60 hover:text-primary transition-colors ${className}`}
      title={tooltip}
    >
      <Maximize2 size={14} />
    </button>
  );
}

export default React.memo(FullscreenEditorModal);
