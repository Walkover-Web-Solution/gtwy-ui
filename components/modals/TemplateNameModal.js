import { MODAL_TYPE } from "@/utils/enums";
import { closeModal } from "@/utils/utility";
import React from "react";
import Modal from "../UI/Modal";
import { FolderPlus } from "lucide-react";

const TemplateNameModal = ({ templateNameRef, handleConvertToTemplate }) => {
  const handleClose = () => {
    closeModal(MODAL_TYPE.TEMPLATE_NAME_MODAL);
    templateNameRef.current.value = "";
  };

  return (
    <Modal
      MODAL_ID={MODAL_TYPE.TEMPLATE_NAME_MODAL}
      onClose={handleClose}
      title="Convert to Template"
      description="Give your template a descriptive name"
      icon={<FolderPlus size={16} className="text-trace-gold" />}
      widthClass="w-[min(480px,92vw)]"
    >
      <div id="template-name-modal-container" className="flex flex-col gap-4">
        <input
          autoComplete="off"
          id="template-name-input"
          type="text"
          placeholder="Enter template name"
          className="input input-md w-full placeholder-opacity-50"
          ref={templateNameRef}
        />
        <div className="flex justify-end gap-2">
          <button id="template-name-close-button" className="btn btn-sm" onClick={handleClose}>
            Close
          </button>
          <button id="template-name-create-button" className="btn btn-sm btn-primary" onClick={handleConvertToTemplate}>
            Convert
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default TemplateNameModal;
