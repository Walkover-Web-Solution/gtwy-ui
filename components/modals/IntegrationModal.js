import { createIntegrationAction } from "@/store/action/integrationAction";
import { MODAL_TYPE } from "@/utils/enums";
import { closeModal } from "@/utils/utility";
import React from "react";
import { useDispatch } from "react-redux";
import Modal from "@/components/UI/Modal";
import { toast } from "react-toastify";
import { Blocks } from "lucide-react";

const IntegrationModal = ({ params, type = "embed" }) => {
  const integrationNameRef = React.useRef("");
  const dispatch = useDispatch();
  const handleCreateNewIntegration = () => {
    if (integrationNameRef?.current?.value?.trim() === "") {
      toast.error("Embed name should not be empty");
      return;
    }

    const payload = {
      name: integrationNameRef?.current?.value,
      orgId: params.org_id,
      type: type,
    };

    if (type !== "rag_embed") {
      payload.config = {
        showHomeButton: true,
        showGuide: true,
        showHistory: false,
        showConfigType: false,
        slide: "right",
        defaultOpen: true,
        showFullScreenButton: true,
        showCloseButton: true,
        showHeader: true,
        showAdvancedParameters: true,
        showAdvancedConfigurations: true,
        showPreTool: true,
        showCreateManuallyButton: true,
        showPromptHelper: true,
        showMcp: false,
        prompt: {
          useDefaultPrompt: true,
          customPrompt: "",
          embedFields: [
            { name: "role", value: "", type: "input", hidden: true },
            { name: "goal", value: "", type: "input", hidden: true },
            { name: "instruction", value: "", type: "textarea", hidden: true },
          ],
        },
      };
    }

    dispatch(createIntegrationAction(payload));
    closeModal(MODAL_TYPE.INTEGRATION_MODAL);
    integrationNameRef.current.value = "";
  };

  const handleClose = () => {
    closeModal(MODAL_TYPE.INTEGRATION_MODAL);
    integrationNameRef.current.value = "";
  };

  return (
    <Modal
      MODAL_ID={MODAL_TYPE.INTEGRATION_MODAL}
      onClose={handleClose}
      title="Create Integration"
      description={`Enter a name for your ${type === "rag_embed" ? "RAG embed" : "embed"} integration`}
      icon={<Blocks size={16} className="text-trace-gold" />}
      widthClass="w-[min(480px,92vw)]"
    >
      <div id="integration-modal-container" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <input
            autoComplete="off"
            data-testid="integration-name-input"
            id="integration-name-input"
            type="text"
            placeholder="Enter embed name"
            className="input input-bordered input-sm w-full placeholder-opacity-50"
            maxLength={50}
            ref={integrationNameRef}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCreateNewIntegration();
              }
            }}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            data-testid="integration-close-button"
            id="integration-close-button"
            className="btn btn-sm"
            onClick={handleClose}
          >
            Close
          </button>
          <button
            data-testid="integration-create-button"
            id="integration-create-button"
            className="btn btn-sm btn-primary"
            onClick={handleCreateNewIntegration}
          >
            Create
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default IntegrationModal;
