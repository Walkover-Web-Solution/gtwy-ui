import { MODAL_TYPE } from "@/utils/enums";
import { closeModal } from "@/utils/utility";
import React, { useState } from "react";
import Modal from "../UI/Modal";
import { GitBranch } from "lucide-react";

const VersionDescriptionModal = ({ versionDescriptionRef, handleCreateNewVersion }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = () => {
    closeModal(MODAL_TYPE.VERSION_DESCRIPTION_MODAL);
    if (versionDescriptionRef?.current) {
      versionDescriptionRef.current.value = "";
    }
    setIsLoading(false);
  };

  const handleCreateClick = async () => {
    setIsLoading(true);
    try {
      await handleCreateNewVersion();
      // Close modal after creating version
      setTimeout(() => {
        handleClose();
      }, 100);
    } catch (error) {
      console.error("Error creating version:", error);
      setIsLoading(false);
    }
  };

  const footerContent = (
    <div className="flex justify-end gap-2">
      <button
        data-testid="version-description-close-button"
        id="version-description-close-button"
        className="btn btn-sm"
        onClick={handleClose}
        disabled={isLoading}
      >
        Close
      </button>
      <button
        data-testid="version-description-create-button"
        id="version-description-create-button"
        className="btn btn-sm btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={handleCreateClick}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <span className="loading loading-spinner loading-sm"></span>
            Creating...
          </>
        ) : (
          "Create"
        )}
      </button>
    </div>
  );

  return (
    <Modal
      MODAL_ID={MODAL_TYPE.VERSION_DESCRIPTION_MODAL}
      onClose={handleClose}
      title="Create New Version"
      description="Add a description for this version"
      icon={<GitBranch size={16} className="text-trace-gold" />}
      widthClass="w-[min(480px,92vw)]"
      footer={footerContent}
    >
      <div
        id="version-description-modal-container"
        data-testid="version-description-modal-container"
        className="flex flex-col gap-4"
      >
        <input
          autoComplete="off"
          data-testid="version-description-input"
          id="version-description-input"
          type="text"
          placeholder="Enter version description"
          className="input input-md w-full placeholder-opacity-50"
          ref={versionDescriptionRef}
          disabled={isLoading}
        />
      </div>
    </Modal>
  );
};

export default VersionDescriptionModal;
