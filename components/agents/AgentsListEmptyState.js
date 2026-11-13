"use client";

import { MODAL_TYPE } from "@/utils/enums";
import { openModal } from "@/utils/utility";

const AgentsListEmptyState = ({ isEmbedUser = false, isBlocked = false, onCreateAgent }) => {
  const handleCreate = () => {
    if (isBlocked) return;
    if (onCreateAgent) {
      onCreateAgent();
      return;
    }
    openModal(MODAL_TYPE.CREATE_BRIDGE_MODAL);
  };

  const description = isEmbedUser
    ? "Build an AI agent to automate workflows and assist your users from this workspace."
    : "This workspace does not have any agents yet. Create your first agent to configure prompts, tools, and integrations.";

  return (
    <div className="w-full flex justify-center px-4 py-8" data-testid="agents-list-empty-state">
      <div
        className="w-full max-w-2xl flex flex-col items-center justify-center text-center px-6 py-12 mx-auto"
        style={{
          border: "2px dashed color-mix(in oklch, var(--color-base-content) 25%, transparent)",
          borderRadius: 6,
          background: "var(--color-base-100)",
        }}
      >
        <h2
          className="text-base-content"
          style={{ fontWeight: 700, fontSize: 28, letterSpacing: "-0.02em", marginBottom: 8 }}
        >
          {isEmbedUser ? "No agents yet" : "Create your first agent"}
        </h2>
        <p className="text-base-content/70 max-w-md" style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 16 }}>
          {description}
        </p>
        <button
          type="button"
          data-testid="agents-list-empty-create-agent-button"
          id="agents-list-empty-create-agent-button"
          onClick={handleCreate}
          className="btn btn-primary inline-flex items-center gap-2 px-6"
          style={{ borderRadius: 6, fontWeight: 600, letterSpacing: "0.04em" }}
          disabled={isBlocked}
          title={isBlocked ? "Your org is blocked. Contact support@gtwy.ai for assistance." : undefined}
        >
          Create agent
        </button>
      </div>
    </div>
  );
};

export default AgentsListEmptyState;
