import { useCustomSelector } from "@/customHooks/customSelector";
import { MODAL_TYPE } from "@/utils/enums";
import { closeModal } from "@/utils/utility";
import React, { useMemo } from "react";
import Modal from "../UI/Modal";
import { BotIcon } from "../Icons";
import { Network } from "lucide-react";

const ConnectedAgentsModal = ({ apiKey, orgId }) => {
  // Get all bridges/agents from the store
  const { bridges, apikeyData } = useCustomSelector((state) => ({
    bridges: state?.bridgeReducer?.org?.[orgId]?.orgs || {},
    apikeyData: state?.apiKeysReducer?.apikeys?.[orgId] || [],
  }));

  // Find bridges/agents that use this API key
  const connectedAgents = useMemo(() => {
    if (!apiKey?._id) return [];

    // Get version IDs associated with this API key
    const currentApiKey = apikeyData?.find((item) => item._id === apiKey._id);
    const connectedVersionIds = currentApiKey?.version_ids || [];
    const publishedVersionIds = currentApiKey?.published_version_ids || [];

    if (!connectedVersionIds.length) return [];

    // Create Sets for O(1) lookup
    const versionIdSet = new Set(connectedVersionIds);
    const publishedVersionIdSet = new Set(publishedVersionIds);

    // Transform bridges to connected agents
    return Object.values(bridges)
      .map((bridge) => {
        const matchingVersions = bridge?.versions
          .map((versionId, index) =>
            versionIdSet.has(versionId)
              ? { id: versionId, versionIndex: index, isPublished: publishedVersionIdSet.has(versionId) }
              : null
          )
          .filter(Boolean);

        return matchingVersions.length > 0
          ? {
              name: bridge?.name,
              bridgeId: bridge?._id,
              versions: matchingVersions,
            }
          : null;
      })
      .filter(Boolean);
  }, [bridges, apiKey?._id, apikeyData]);

  if (!apiKey) return null;

  const handleClose = () => closeModal(MODAL_TYPE.CONNECTED_AGENTS_MODAL);

  const footerContent = (
    <button
      data-testid="connected-agents-close-button"
      id="connected-agents-close-button"
      className="btn btn-sm focus:outline-none focus:ring-0"
      onClick={handleClose}
    >
      Close
    </button>
  );

  return (
    <Modal
      MODAL_ID={MODAL_TYPE.CONNECTED_AGENTS_MODAL}
      onClose={handleClose}
      title={`Connected Agents for API Key: ${apiKey.name}`}
      icon={<Network size={16} className="text-trace-gold" />}
      widthClass="w-[min(500px,92vw)]"
      footer={footerContent}
    >
      <div id="connected-agents-modal-container" className="focus:outline-none" tabIndex="-1">
        {connectedAgents.length > 0 ? (
          <div id="connected-agents-list" data-testid="connected-agents-list" className="overflow-y-auto max-h-96">
            {connectedAgents.map((agent) => (
              <AgentCard key={agent.bridgeId} agent={agent} />
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </div>
    </Modal>
  );
};

// Fixed AgentCard component to prevent scrolling text displacement
const AgentCard = ({ agent }) => (
  <div
    data-testid={`connected-agent-card-${agent.bridgeId}`}
    id={`connected-agent-card-${agent.bridgeId}`}
    className="mb-4 p-4 border rounded-lg bg-base-200"
    style={{
      transform: "translateZ(0)", // Force hardware acceleration
      backfaceVisibility: "hidden", // Prevent subpixel rendering issues
      perspective: "1000px", // Establish 3D rendering context
    }}
  >
    <div className="flex items-center gap-2 mb-2">
      <BotIcon className="text-primary" />
      <h4 className="font-semibold text-base-content">
        {agent.name} <span className="inline text-xs font-mono bg-base-300 p-1 rounded w-fit">{agent.bridgeId}</span>
      </h4>
    </div>
    <div className="grid grid-cols-1 gap-2 text-sm text-base-content/80">
      {agent.versions?.length > 0 && (
        <div className="flex flex-row gap-2 mt-2">
          <div className="font-medium mb-1">Versions:</div>
          <div className="flex flex-col gap-1">
            {agent.versions.map((version) => (
              <div key={version.id} className="flex items-center gap-2">
                <span className="inline text-xs font-mono bg-base-300 p-1 rounded w-fit">
                  V{version.versionIndex + 1}:({version.id})
                </span>
                {version.isPublished && (
                  <span className="inline text-xs font-semibold bg-green-500/20 text-green-600 px-2 py-0.5 rounded border border-green-500/30">
                    Published
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  </div>
);

// Extracted empty state component
const EmptyState = () => (
  <div
    data-testid="connected-agents-empty-state"
    id="connected-agents-empty-state"
    className="flex flex-col items-center justify-center py-8 text-base-content/70"
  >
    <BotIcon className="w-12 h-12 mb-2 opacity-50" />
    <p>No agents are connected to this API key.</p>
  </div>
);

export default ConnectedAgentsModal;
