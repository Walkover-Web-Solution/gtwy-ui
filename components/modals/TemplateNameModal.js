import { MODAL_TYPE } from "@/utils/enums";
import { closeModal } from "@/utils/utility";
import React from "react";
import Modal from "../UI/Modal";

const TemplateNameModal = ({ templateNameRef, handleConvertToTemplate }) => {
  return (
    <Modal MODAL_ID={MODAL_TYPE.TEMPLATE_NAME_MODAL}>
      <div id="template-name-modal-container" className="modal-box">
        <h3 className="font-bold text-lg mb-4">Convert to Template</h3>
        <input
          id="template-name-input"
          type="text"
          placeholder="Enter template name"
          className="input input-bordered input-md w-full mb-2 placeholder-opacity-50"
          ref={templateNameRef}
        />
        <div className="modal-action">
          <form method="dialog">
            <button
              id="template-name-close-button"
              className="btn btn-sm"
              onClick={() => {
                closeModal(MODAL_TYPE.TEMPLATE_NAME_MODAL);
                templateNameRef.current.value = "";
              }}
            >
              Close
            </button>
            <button
              id="template-name-create-button"
              className="btn btn-sm btn-primary ml-2"
              onClick={handleConvertToTemplate}
            >
              Convert
            </button>
          </form>
        </div>
      </div>
    </Modal>
  );
};

export default TemplateNameModal;
