import React, { useState } from "react";
import { Trash2 } from "lucide-react";
import Modal from "./Modal";
import { MODAL_TYPE } from "@/utils/enums";
import { closeModal } from "@/utils/utility";
import { ClipboardXIcon } from "../Icons";

const DeleteModal = ({
  onConfirm = () => {},
  onCancel,
  item,
  name,
  title = "Are you sure?",
  description = "This action cannot be undone. This will permanently delete selected file.",
  buttonTitle = "Delete",
  modalType = MODAL_TYPE.DELETE_MODAL,
  loading = false,
  isAsync = false, // New prop to indicate if onConfirm is async
}) => {
  const [internalLoading, setInternalLoading] = useState(false);

  // Use external loading prop or internal loading state
  const isLoading = loading || internalLoading;

  const handleClose = () => {
    if (isLoading) return; // Prevent closing while loading

    if (onCancel) {
      onCancel();
    } else {
      closeModal(modalType);
    }
  };

  const handleConfirm = async () => {
    if (isLoading) return; // Prevent multiple clicks

    try {
      if (isAsync) {
        setInternalLoading(true);
        await onConfirm(item, name);
        // Modal will be closed by the parent component or useDeleteOperation hook
      } else {
        onConfirm(item, name);
      }
    } catch (error) {
      console.error("Delete operation failed:", error);
      // Keep modal open to show error or let parent handle
    } finally {
      if (isAsync) {
        setInternalLoading(false);
      }
    }
  };

  return (
    <Modal MODAL_ID={modalType}>
      <div className=" flex items-center justify-center ">
        <div
          id="delete-modal-content"
          className="w-full max-w-lg bg-base-100 border border-base-300 rounded-lg  p-6 mx-4 "
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col space-y-2 text-center sm:text-left">
            <h2 className="text-lg font-semibold text-base-content">{title}</h2>
            <p className="text-sm text-base-content">{description}</p>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6">
            <button
              id="delete-modal-cancel-button"
              type="button"
              onClick={handleClose}
              className="btn btn-sm"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              id="delete-modal-confirm-button"
              type="button"
              onClick={handleConfirm}
              className="btn btn-error text-white btn-sm"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="loading loading-spinner loading-xs mr-1"></span>
              ) : buttonTitle ? (
                <ClipboardXIcon size={14} className="text-white" />
              ) : (
                <Trash2 className="mr-1 h-4 w-4 text-white" />
              )}
              {isLoading
                ? (() => {
                    const words = buttonTitle.split(" ");
                    const firstWord = words[0];
                    const restWords = words.slice(1).join(" ");
                    const loadingFirstWord = firstWord.endsWith("e")
                      ? firstWord.slice(0, -1) + "ing"
                      : firstWord + "ing";
                    return restWords ? `${loadingFirstWord} ${restWords}...` : `${loadingFirstWord}...`;
                  })()
                : buttonTitle}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
export default DeleteModal;
