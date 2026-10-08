import { MODAL_TYPE } from "@/utils/enums";
import { closeModal } from "@/utils/utility";
import React, { useEffect, useState } from "react";
import Modal from "../UI/Modal";
import useDeleteOperation from "@/customHooks/useDeleteOperation";
import { Bot } from "lucide-react";

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

  const footerContent = (
    <div className="flex gap-2 justify-end">
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
  );

  return (
    <Modal
      MODAL_ID={MODAL_TYPE?.AGENT_DESCRIPTION_MODAL}
      onClose={() => closeModal(MODAL_TYPE.AGENT_DESCRIPTION_MODAL)}
      title={isAgentToAgentConnect ? "Review Agent Description" : "Add Agent Description"}
      icon={<Bot size={16} className="text-trace-gold" />}
      widthClass="w-[min(42rem,92vw)]"
      footer={footerContent}
    >
      <div className="py-2">
        <label className="label">
          <span className="">Description</span>
        </label>
        <textarea
          autoFocus
          data-testid="agent-description-textarea"
          id="agent-description-textarea"
          className="textarea bg-base-100 w-full h-32"
          placeholder="Enter description for the agent..."
          value={draftDescription}
          required
          onChange={(e) => handleDescriptionChange(e.target.value)}
        />
      </div>
    </Modal>
  );
};

export default AgentDescriptionModal;
