import React from "react";
import { MODAL_TYPE } from "@/utils/enums";
import Modal from "../UI/Modal";
import { Zap, Eye, Edit3 } from "lucide-react";
import { closeModal } from "@/utils/utility";

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
  const footerContent = (
    <div className="flex text-base-content justify-end gap-2">
      <button
        data-testid="edit-message-cancel-button"
        id="edit-message-cancel-button"
        className="btn btn-sm"
        onClick={handleClose}
      >
        Cancel
      </button>

      {hasGeneratedPrompt ? (
        <>
          <button
            data-testid="edit-message-show-generated-button"
            id="edit-message-show-generated-button"
            className="btn btn-secondary btn-sm gap-2"
            onClick={handleShowGeneratedPrompt}
          >
            <Eye className="h-4 w-4" />
            Open Generated Prompt
          </button>
        </>
      ) : (
        <button
          data-testid="edit-message-improve-button"
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
  );

  return (
    <Modal
      MODAL_ID={MODAL_TYPE.EDIT_MESSAGE_MODAL}
      onClose={() => closeModal(MODAL_TYPE.EDIT_MESSAGE_MODAL)}
      title="Improve Your Prompt"
      description="Describe the ideal response to get an improved prompt"
      icon={<Edit3 size={16} className="text-trace-gold" />}
      widthClass="w-[min(600px,92vw)]"
      footer={footerContent}
    >
      <div id="edit-message-modal-container" className="flex flex-col gap-4">
        {/* Instructions */}
        <div className="alert alert-info">
          <div className="text-sm text-white">
            <strong>🎯 How it works:</strong> Describe the ideal response you want below, then click 'Better Prompt' to
            get an improved version of your original prompt that's more likely to generate your desired output.
          </div>
        </div>

        <div className="form-control">
          <label className="label">
            <span className="">Describe your ideal response:</span>
          </label>
          <textarea
            data-testid="edit-message-textarea"
            id="edit-message-textarea"
            className="input textarea min-h-[200px]"
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
      </div>
    </Modal>
  );
};

export default EditMessageModal;
