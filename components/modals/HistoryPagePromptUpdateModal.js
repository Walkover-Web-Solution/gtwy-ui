import { updateBridgeVersionAction } from "@/store/action/bridgeAction";
import { MODAL_TYPE } from "@/utils/enums";
import { closeModal } from "@/utils/utility";
import React from "react";
import { useDispatch } from "react-redux";
import Modal from "../UI/Modal";
import { History, RotateCcw } from "lucide-react";
import { promptObjectToString, parsePromptObject } from "@/utils/promptUtils";

const HistoryPagePromptUpdateModal = ({
  searchParams,
  previousPrompt,
  promotToUpdate,
  onSave,
  handleRegenerate,
  isRegenerating,
  onPromptSaved,
}) => {
  const dispatch = useDispatch();

  const handleClose = () => {
    closeModal(MODAL_TYPE.HISTORY_PAGE_PROMPT_UPDATE_MODAL);
    closeModal(MODAL_TYPE.EDIT_MESSAGE_MODAL);
  };

  const handleSave = (e) => {
    e.preventDefault();

    let newValue;
    if (typeof promotToUpdate === "string") {
      newValue = promotToUpdate?.trim() || "";
    } else if (typeof promotToUpdate === "object") {
      newValue = parsePromptObject(promotToUpdate);
    } else {
      newValue = "";
    }

    const hasChanged =
      typeof newValue === "string"
        ? newValue !== previousPrompt
        : JSON.stringify(newValue) !== JSON.stringify(previousPrompt);

    if (hasChanged) {
      dispatch(
        updateBridgeVersionAction({
          versionId: searchParams?.version,
          dataToSend: { configuration: { prompt: newValue } },
        })
      );
    }

    if (onPromptSaved) {
      onPromptSaved();
    }

    handleClose();
  };

  return (
    <Modal
      MODAL_ID={MODAL_TYPE.HISTORY_PAGE_PROMPT_UPDATE_MODAL}
      onClose={handleClose}
      title="Update Prompt"
      description="Review and save the updated prompt from history"
      icon={<History size={16} className="text-trace-gold" />}
      widthClass="w-[min(1400px,96vw)]"
    >
      <div id="history-prompt-update-modal-container" className="flex flex-col gap-4">
        {handleRegenerate && (
          <div className="flex justify-end">
            <button
              data-testid="history-prompt-regenerate-button"
              id="history-prompt-regenerate-button"
              className="btn btn-xs btn-primary gap-2"
              onClick={handleRegenerate}
              disabled={isRegenerating}
            >
              {isRegenerating ? (
                <>
                  <span className="loading loading-spinner loading-xs"></span>
                  Regenerating...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4" />
                  Regenerate
                </>
              )}
            </button>
          </div>
        )}
        <div className="flex gap-3 w-full">
          <div className="w-full">
            <div className="label">
              <span className="">Previous Prompt</span>
            </div>
            <textarea
              data-testid="history-prompt-previous-textarea"
              id="history-prompt-previous-textarea"
              className="textarea bg-base-100 border border-base-300 w-full min-h-96 focus:border-primary caret-base-content p-2"
              key={typeof previousPrompt === "object" ? JSON.stringify(previousPrompt) : previousPrompt}
              defaultValue={typeof previousPrompt === "string" ? previousPrompt : promptObjectToString(previousPrompt)}
              readOnly
            />
          </div>
          <div className="w-full">
            <div className="label">
              <span className="">Updated Prompt</span>
            </div>
            <textarea
              data-testid="history-prompt-updated-textarea"
              id="history-prompt-updated-textarea"
              className="textarea bg-base-100 border border-base-300 w-full min-h-96 focus:border-primary caret-base-content p-2"
              key={typeof promotToUpdate === "object" ? JSON.stringify(promotToUpdate) : promotToUpdate}
              defaultValue={typeof promotToUpdate === "string" ? promotToUpdate : promptObjectToString(promotToUpdate)}
              readOnly
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            data-testid="history-prompt-cancel-button"
            id="history-prompt-cancel-button"
            className="btn btn-sm"
            onClick={handleClose}
          >
            Cancel
          </button>
          <button
            data-testid="history-prompt-save-button"
            id="history-prompt-save-button"
            className="btn btn-sm btn-primary"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default HistoryPagePromptUpdateModal;
