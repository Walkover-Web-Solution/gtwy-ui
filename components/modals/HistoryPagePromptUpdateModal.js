import { updateBridgeVersionAction } from "@/store/action/bridgeAction";
import { MODAL_TYPE } from "@/utils/enums";
import { closeModal } from "@/utils/utility";
import React from "react";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import Modal from "../UI/Modal";
import { AlertTriangle, History, RotateCcw } from "lucide-react";
import { promptObjectToString, parsePromptObject } from "@/utils/promptUtils";

const HistoryPagePromptUpdateModal = ({
  searchParams,
  previousPrompt,
  promotToUpdate,
  onSave,
  handleRegenerate,
  isRegenerating,
  onPromptSaved,
  notice,
}) => {
  const dispatch = useDispatch();

  const handleClose = () => {
    closeModal(MODAL_TYPE.HISTORY_PAGE_PROMPT_UPDATE_MODAL);
    closeModal(MODAL_TYPE.EDIT_MESSAGE_MODAL);
  };

  const handleSave = async (e) => {
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
      const versionId = searchParams?.version;
      if (!versionId) {
        toast.error("Could not update the prompt: no agent version to save it to.");
        return;
      }

      // The update can fail without throwing (deleted version, no parent agent in the store), so
      // report the outcome instead of closing on a silent no-op.
      const result = await dispatch(
        updateBridgeVersionAction({
          versionId,
          dataToSend: { configuration: { prompt: newValue } },
        })
      );

      if (!result?.success) {
        toast.error(result?.error || "Could not update the prompt. Please try again.");
        return;
      }
      toast.success("Prompt updated successfully");
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
        {notice ? (
          <div
            data-testid="history-prompt-update-notice"
            id="history-prompt-update-notice"
            className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-base-content"
          >
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" />
            <span>{notice}</span>
          </div>
        ) : null}
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
              <span className="label-text">Previous Prompt</span>
            </div>
            <textarea
              data-testid="history-prompt-previous-textarea"
              id="history-prompt-previous-textarea"
              className="textarea bg-base-100 textarea-bordered border border-base-300 w-full min-h-96 focus:border-primary caret-base-content p-2"
              key={typeof previousPrompt === "object" ? JSON.stringify(previousPrompt) : previousPrompt}
              defaultValue={typeof previousPrompt === "string" ? previousPrompt : promptObjectToString(previousPrompt)}
              readOnly
            />
          </div>
          <div className="w-full">
            <div className="label">
              <span className="label-text">Updated Prompt</span>
            </div>
            <textarea
              data-testid="history-prompt-updated-textarea"
              id="history-prompt-updated-textarea"
              className="textarea bg-base-100 textarea-bordered border border-base-300 w-full min-h-96 focus:border-primary caret-base-content p-2"
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
