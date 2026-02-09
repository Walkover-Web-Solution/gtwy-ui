import React from "react";
import { MODAL_TYPE } from "@/utils/enums";
import Modal from "../UI/Modal";
import { Zap, Eye } from "lucide-react";

const EditMessageModal = ({
  setModalInput,
  handleClose,
  handleSave,
  modalInput,
  handleImprovePrompt,
  isImprovingPrompt,
  hasGeneratedPrompt,
  handleShowGeneratedPrompt,
}) => {
  return (
    <Modal MODAL_ID={MODAL_TYPE.EDIT_MESSAGE_MODAL} onClose={() => closeModal(MODAL_TYPE.EDIT_MESSAGE_MODAL)}>
      <div
        id="edit-message-modal-container"
        className="bg-base-100 rounded-lg shadow-lg w-11/12 md:w-1/2 lg:w-[50%] p-6"
      >
        <h2 className="text-xl font-semibold mb-4">Improve Your Prompt</h2>

        {/* Instructions */}
        <div className="alert alert-info mb-4">
          <div className="text-sm text-white">
            <strong>🎯 How it works:</strong> Describe the ideal response you want below, then click 'Better Prompt' to
            get an improved version of your original prompt that's more likely to generate your desired output.
          </div>
        </div>

        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">Describe your ideal response:</span>
          </label>
          <textarea
            id="edit-message-textarea"
            className="input input-bordered textarea min-h-[200px]"
            defaultValue={modalInput?.content}
            key={modalInput?.Id}
            onBlur={(e) =>
              setModalInput({
                ...modalInput,
                content: e.target.value,
              })
            }
          />
        </div>

        <div className="flex text-base-content justify-end gap-2">
          <button id="edit-message-cancel-button" className="btn btn-sm" onClick={handleClose}>
            Cancel
          </button>

          {/* Show different buttons based on whether prompt has been generated */}
          {hasGeneratedPrompt ? (
            <>
              {/* Show generated prompt button */}
              <button
                id="edit-message-show-generated-button"
                className="btn btn-secondary btn-sm gap-2"
                onClick={handleShowGeneratedPrompt}
              >
                <Eye className="h-4 w-4" />
                Open Generated Prompt
              </button>

              {/* Regenerate prompt button */}
            </>
          ) : (
            /* First time - show Better Prompt button */
            <button
              id="edit-message-improve-button"
              className="btn btn-primary btn-sm gap-2"
              onClick={handleImprovePrompt}
            >
              {isImprovingPrompt ? (
                <>
                  <span className="loading loading-spinner loading-xs"></span>
                  Improving...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Better Prompt
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default EditMessageModal;
