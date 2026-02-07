"use client";
import React from "react";
import Modal from "./Modal";

/**
 * A reusable confirmation modal component that displays above all other UI elements
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Controls modal visibility
 * @param {Function} props.onClose - Function called when modal is closed
 * @param {Function} props.onConfirm - Function called when primary action button is clicked
 * @param {Function} props.onCancel - Function called when cancel button is clicked (defaults to onClose)
 * @param {string} props.title - Modal title
 * @param {string|React.ReactNode} props.message - Modal content/message
 * @param {string} props.confirmText - Text for confirm button (default: "Confirm")
 * @param {string} props.cancelText - Text for cancel button (default: "Cancel")
 * @param {string} props.confirmButtonClass - Additional classes for confirm button
 * @param {React.ReactNode} props.icon - Optional icon to display next to title
 * @param {string} props.iconClass - Class for the icon wrapper
 */
const ConfirmationModal = ({
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmButtonClass = "btn-primary",
  icon,
  iconClass = "bg-warning/20 text-warning",
  modalType,
}) => {
  // If modal is not open, don't render anything
  // Use onClose as default onCancel if not provided
  const handleCancel = onCancel || onClose;

  return (
    <Modal MODAL_ID={modalType}>
      <div
        id="confirmation-modal-container"
        className="modal-box bg-base-100 rounded-lg shadow-xl max-w-md w-full relative animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          {icon && <div className={`p-2 rounded-full ${iconClass}`}>{icon}</div>}
          <h3 className="font-semibold text-lg">{title}</h3>
        </div>

        {/* Message/Content */}
        <div className="text-base-content mb-6">{typeof message === "string" ? <p>{message}</p> : message}</div>

        {/* Actions */}
        <div className="modal-action flex justify-end gap-2">
          <button id="confirmation-modal-cancel-button" className="btn btn-sm" onClick={handleCancel}>
            {cancelText}
          </button>
          <button
            id="confirmation-modal-confirm-button"
            className={`btn btn-sm ${confirmButtonClass}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;
