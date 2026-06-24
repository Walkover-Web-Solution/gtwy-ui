import { MODAL_TYPE } from "@/utils/enums";
import { closeModal } from "@/utils/utility";
import React, { useEffect, useState } from "react";
import Modal from "../UI/Modal";
import useDeleteOperation from "@/customHooks/useDeleteOperation";

const AgentDescriptionModal = ({ setDescription, handleSaveAgent, description, isAgentToAgentConnect = true }) => {
  const [draftDescription, setDraftDescription] = useState(description || "");
  const { isDeleting: isSaving, executeDelete } = useDeleteOperation(MODAL_TYPE.AGENT_DESCRIPTION_MODAL, {
    closeOnSuccess: false,
  });

  useEffect(() => {
    setDraftDescription(description || "");
  }, [description]);

  const handleDescriptionChange = (value) => {
    setDraftDescription(value);
    setDescription(value?.trim());
  };

  const handleSave = async () => {
    const nextDescription = draftDescription.trim();
    setDescription(nextDescription);
    await executeDelete(() => handleSaveAgent(undefined, undefined, nextDescription));
  };

  return (
    <Modal
      MODAL_ID={MODAL_TYPE?.AGENT_DESCRIPTION_MODAL}
      onClose={() => closeModal(MODAL_TYPE.AGENT_DESCRIPTION_MODAL)}
    >
      <div id="agent-description-modal-box" className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg">
          {isAgentToAgentConnect ? "Review Agent Description" : "Add Agent Description"}
        </h3>
        <div className="py-4">
          <label className="label">
            <span className="label-text">Description</span>
          </label>
          <textarea
            autoFocus
            data-testid="agent-description-textarea"
            id="agent-description-textarea"
            className="textarea bg-base-100 textarea-bordered w-full h-32"
            placeholder="Enter description for the agent..."
            value={draftDescription}
            required
            onChange={(e) => handleDescriptionChange(e.target.value)}
          ></textarea>
        </div>
        <div className="modal-action">
          <button
            data-testid="agent-description-cancel-button"
            id="agent-description-cancel-button"
            className="btn btn-sm"
            onClick={() => closeModal(MODAL_TYPE?.AGENT_DESCRIPTION_MODAL)}
          >
            Cancel
          </button>
          <button
            data-testid="agent-description-save-button"
            id="agent-description-save-button"
            className="btn btn-sm btn-primary"
            onClick={handleSave}
            disabled={!draftDescription.trim() || isSaving}
          >
            {isSaving && <span className="loading loading-spinner loading-xs" />}
            {isAgentToAgentConnect ? "Continue" : "Add Agent"}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </Modal>
  );
};

export default AgentDescriptionModal;
