import { MODAL_TYPE } from "@/utils/enums";
import { closeModal } from "@/utils/utility";
import React from "react";
import Modal from "../UI/Modal";

const VersionDescriptionModal = ({ versionDescriptionRef, handleCreateNewVersion }) => {
  return (
    <Modal
      MODAL_ID={MODAL_TYPE.VERSION_DESCRIPTION_MODAL}
      onClose={() => closeModal(MODAL_TYPE.VERSION_DESCRIPTION_MODAL)}
    >
      <div id="version-description-modal-container" className="modal-box">
        <h3 className="font-bold text-lg mb-4">Create New Version</h3>
        <input
          id="version-description-input"
          type="text"
          placeholder="Enter version description"
          className="input input-bordered input-md w-full mb-2 placeholder-opacity-50"
          ref={versionDescriptionRef}
        />
        <div className="modal-action">
          <form method="dialog">
            <button
              id="version-description-close-button"
              className="btn btn-sm"
              onClick={() => {
                closeModal(MODAL_TYPE.VERSION_DESCRIPTION_MODAL);
                versionDescriptionRef.current.value = "";
              }}
            >
              Close
            </button>
            <button
              id="version-description-create-button"
              className="btn btn-sm btn-primary ml-2"
              onClick={handleCreateNewVersion}
            >
              Create
            </button>
          </form>
        </div>
      </div>
    </Modal>
  );
};

export default VersionDescriptionModal;
