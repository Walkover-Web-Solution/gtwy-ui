import React from "react";
import { MODAL_TYPE } from "@/utils/enums";
import Modal from "../UI/Modal";
import { closeModal } from "@/utils/utility";
import { useCustomSelector } from "@/customHooks/customSelector";
import { SlidersHorizontal } from "lucide-react";

const ModelUsageDetailsModal = ({ usageDetailsData, params }) => {
  const { allBridgesMap } = useCustomSelector((state) => ({
    allBridgesMap: state.bridgeReducer.org?.[params.org_id]?.orgs || {},
  }));

  const handleClose = () => {
    closeModal(MODAL_TYPE.USAGE_DETAILS_MODAL);
  };

  return (
    <Modal
      MODAL_ID={MODAL_TYPE.USAGE_DETAILS_MODAL}
      onClose={handleClose}
      title="Model Usage Details"
      description="This model is currently being used by the following resources."
      icon={<SlidersHorizontal size={16} className="text-trace-gold" />}
      widthClass="w-[min(50rem,92vw)]"
    >
      <div className="flex flex-col space-y-4">
        <div className="space-y-4">
          {usageDetailsData?.agents?.length > 0 && (
            <div>
              <h3 className="font-medium text-base-content mb-2">Agents ({usageDetailsData.agents.length})</h3>
              <div id="model-usage-agents-list" data-testid="model-usage-agents-list" className="bg-base-200 p-3">
                <ul className="list-disc pl-5">
                  {usageDetailsData.agents.map((agent, index) => (
                    <li
                      id={`model-usage-agent-${agent.id}`}
                      data-testid={`model-usage-agent-${agent.id}`}
                      key={index}
                      className="text-sm py-1"
                    >
                      {agent.name} <span className="text-base-content">(ID: {agent.id})</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {usageDetailsData?.versions?.length > 0 && (
            <div>
              <h3 className="font-medium text-base-content mb-2">Versions ({usageDetailsData.versions.length})</h3>
              <div id="model-usage-versions-list" data-testid="model-usage-versions-list" className="bg-base-200 p-3">
                <ul className="list-disc pl-5">
                  {usageDetailsData.versions.map((version, index) => {
                    const bridge = Object.values(allBridgesMap).find((bridge) =>
                      bridge.versions?.some((v) => v === version.id || v._id === version.id)
                    );
                    return (
                      <li
                        key={index}
                        id={`model-usage-version-${version.id}`}
                        data-testid={`model-usage-version-${version.id}`}
                        className="text-sm py-1"
                      >
                        {bridge?.name}{" "}
                        <span className="text-base-content">
                          (Version #{index + 1}, ID: {version.id})
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end mt-6">
        <button
          id="model-usage-close-button"
          data-testid="model-usage-close-button"
          type="button"
          onClick={handleClose}
          className="btn btn-sm"
        >
          Close
        </button>
      </div>
    </Modal>
  );
};

export default ModelUsageDetailsModal;
