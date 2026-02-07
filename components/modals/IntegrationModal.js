import { createIntegrationAction } from "@/store/action/integrationAction";
import { MODAL_TYPE } from "@/utils/enums";
import { closeModal, RequiredItem } from "@/utils/utility";
import React from "react";
import { useDispatch } from "react-redux";
import Modal from "@/components/UI/Modal";
import { toast } from "react-toastify";

const IntegrationModal = ({ params, type = "embed" }) => {
  const integrationNameRef = React.useRef("");
  const dispatch = useDispatch();
  const handleCreateNewIntegration = () => {
    if (integrationNameRef?.current?.value?.trim() === "") {
      toast.error("Embed name should not be empty");
      return;
    }

    // Build the payload object
    const payload = {
      name: integrationNameRef?.current?.value,
      orgId: params.org_id,
      type: type, // Pass type from props ("embed" or "rag_embed")
    };

    // Only add config if type is not "rag_embed"
    if (type !== "rag_embed") {
      payload.config = {
        hideHomeButton: false,
        showGuide: true,
        showHistory: false,
        showConfigType: false,
        slide: "right",
        defaultOpen: true,
        hideFullScreenButton: false,
        hideCloseButton: false,
        hideHeader: false,
        hideAdvancedParameters: false,
        hideAdvancedConfigurations: false,
        hidePreTool: false,
        hideCreateManuallyButton: false,
      };
    }

    dispatch(createIntegrationAction(payload));
    closeModal(MODAL_TYPE.INTEGRATION_MODAL);
    integrationNameRef.current.value = "";
  };
  return (
    <Modal MODAL_ID={MODAL_TYPE.INTEGRATION_MODAL} onClose={() => closeModal(MODAL_TYPE.INTEGRATION_MODAL)}>
      <div id="integration-modal-container" className="modal-box">
        <h3 className="font-bold text-lg mb-4">Enter Embed Name{RequiredItem()}</h3>
        <input
          id="integration-name-input"
          type="text"
          placeholder="Enter embed name"
          className="input input-bordered input-sm w-full mb-2 placeholder-opacity-50"
          maxLength={50}
          ref={integrationNameRef}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleCreateNewIntegration();
            }
          }}
        />
        <div className="modal-action">
          <form method="dialog">
            <button
              id="integration-close-button"
              className="btn btn-sm"
              onClick={() => {
                closeModal(MODAL_TYPE.INTEGRATION_MODAL);
                integrationNameRef.current.value = "";
              }}
            >
              Close
            </button>
            <button
              id="integration-create-button"
              className="btn btn-sm btn-primary ml-2"
              onClick={handleCreateNewIntegration}
            >
              Create
            </button>
          </form>
        </div>
      </div>
    </Modal>
  );
};

export default IntegrationModal;
