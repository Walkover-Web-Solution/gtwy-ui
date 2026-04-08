import React, { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2 } from "lucide-react";
import Modal from "../UI/Modal";
import { openModal, closeModal } from "@/utils/utility";

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
}) {
  const textareaRef = useRef(null);
  const [localValue, setLocalValue] = useState(value);

  // Sync local copy when parent opens the modal with a new value
  useEffect(() => {
    if (isOpen) {
      setLocalValue(value);
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
    onSave?.(localValue);
    onClose?.();
    closeModal(modalId);
  }, [localValue, onSave, onClose, modalId]);

  if (!isOpen) return null;

  return (
    <Modal MODAL_ID={modalId} onClose={handleClose}>
      <div className="modal-box max-w-screen-lg h-[calc(100%-10rem)] w-[calc(100%-20rem)] bg-base-100 overflow-hidden flex flex-col p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Maximize2 size={18} className="text-primary" />
            {title}
          </h3>
          <div className="flex gap-2">
            <button onClick={handleClose} className="btn btn-sm" type="button">
              Close
            </button>
            <button onClick={handleSave} className="btn btn-primary btn-sm" type="button">
              Save & Close
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <textarea
            ref={textareaRef}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className={`w-full h-full resize-none textarea textarea-bordered p-4 min-h-[200px] outline-none ${mono ? "font-mono text-sm" : ""} ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
          />
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
