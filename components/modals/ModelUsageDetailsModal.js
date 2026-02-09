import React from "react";
import { MODAL_TYPE } from "@/utils/enums";
import Modal from "../UI/Modal";
import { closeModal } from "@/utils/utility";
import { useCustomSelector } from "@/customHooks/customSelector";

const ModelUsageDetailsModal = ({ usageDetailsData, params }) => {
  const { allBridgesMap } = useCustomSelector((state) => ({
    allBridgesMap: state.bridgeReducer.org?.[params.org_id]?.orgs || {},
  }));

  const handleClose = () => {
    closeModal(MODAL_TYPE.USAGE_DETAILS_MODAL);
  };

  return (
    <Modal MODAL_ID={MODAL_TYPE.USAGE_DETAILS_MODAL} onClose={handleClose}>
      <div className="flex items-center justify-center">
        <div
          id="model-usage-details-modal-container"
          className="w-full max-w-[50rem] bg-base-100 border border-base-300 rounded-lg p-6 mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col space-y-4">
            <h2 className="text-lg font-semibold text-base-content">Model Usage Details</h2>
            <p className="text-sm text-base-content mb-4">This model is currently being used by the following:</p>

            <div className="space-y-4">
              {usageDetailsData?.agents?.length > 0 && (
                <div>
                  <h3 className="font-medium text-base-content mb-2">Agents ({usageDetailsData.agents.length})</h3>
                  <div id="model-usage-agents-list" className="bg-base-200 p-3 rounded">
                    <ul className="list-disc pl-5">
                      {usageDetailsData.agents.map((agent, index) => (
                        <li id={`model-usage-agent-${agent.id}`} key={index} className="text-sm py-1">
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
                  <div id="model-usage-versions-list" className="bg-base-200 p-3 rounded">
                    <ul className="list-disc pl-5">
                      {usageDetailsData.versions.map((version, index) => {
                        const bridge = Object.values(allBridgesMap).find((bridge) =>
                          bridge.versions?.some((v) => v === version.id || v._id === version.id)
                        );
                        return (
                          <li key={index} id={`model-usage-version-${version.id}`} className="text-sm py-1">
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
            <button id="model-usage-close-button" type="button" onClick={handleClose} className="btn btn-sm">
              Close
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ModelUsageDetailsModal;
