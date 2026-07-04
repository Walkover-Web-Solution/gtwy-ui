import React, { useMemo } from "react";
import { useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import { useCustomSelector } from "@/customHooks/customSelector";
import { updateBridgeVersionAction } from "@/store/action/bridgeAction";
import { getStatusClass } from "@/utils/utility";
import { ShieldCheck, Edit2, Trash2 } from "lucide-react";
import ConnectedAgentListSuggestion from "./ConnectAgentListSuggestion";
import { AddIcon } from "@/components/Icons";
import { useConfigurationContext } from "../ConfigurationContext";

function ReviewerAgentSelector({ params, searchParams, isPublished, isEditor }) {
  const dispatch = useDispatch();
  const router = useRouter();
  const isReadOnly = isPublished || !isEditor;
  const { isEmbedUser } = useConfigurationContext();

  const { bridges, reviewerAgentId } = useCustomSelector((state) => {
    const versionData = state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[searchParams?.version];
    return {
      bridges: state?.bridgeReducer?.org?.[params?.org_id]?.orgs || [],
      reviewerAgentId: versionData?.settings?.reviewer_agent || null,
    };
  });

  const reviewerAgent = useMemo(
    () => bridges.find((b) => b._id === reviewerAgentId) || null,
    [bridges, reviewerAgentId]
  );

  const handleSelect = (bridge) => {
    dispatch(
      updateBridgeVersionAction({
        bridgeId: params?.id,
        versionId: searchParams?.version,
        dataToSend: { settings: { reviewer_agent: bridge._id } },
      })
    );
  };

  const handleClear = () => {
    dispatch(
      updateBridgeVersionAction({
        bridgeId: params?.id,
        versionId: searchParams?.version,
        dataToSend: { settings: { reviewer_agent: null } },
      })
    );
  };

  return (
    <div
      data-testid="reviewer-agent-selector-container"
      id="reviewer-agent-selector-container"
      className="border border-base-200 p-3 flex items-center justify-between gap-2"
    >
      <div className="flex items-start gap-1.5 min-w-0">
        <ShieldCheck size={14} className="text-base-content/60 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-base-content">Reviewer Agent</p>
          <p className="text-xs text-base-content/60 break-words">Select a agent to review and validate responses.</p>
        </div>
      </div>

      {reviewerAgent ? (
        <div className="flex items-center gap-2 shrink-0">
          <div
            className="flex items-center gap-2 bg-base-200/60 border border-base-300 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-base-300/60 transition-colors"
            title="Open reviewer agent"
            onClick={() => {
              const isCmdOrCtrl = window.event && (window.event.ctrlKey || window.event.metaKey);
              const url = `/org/${params?.org_id}/agents/configure/${reviewerAgent._id}?version=${reviewerAgent?.published_version_id || reviewerAgent?.versions?.[0]}${isEmbedUser ? "&isEmbedUser=true" : ""}&parentAgentId=${params?.id}&parentVersionId=${searchParams?.version}`;
              if (isCmdOrCtrl && !isEmbedUser) window.open(url, "_blank");
              else router.push(url);
            }}
          >
            <span className="text-sm font-medium truncate max-w-[120px]">{reviewerAgent.name || "Untitled"}</span>
            <span
              className={`rounded-full capitalize px-2 py-0.5 text-[10px] font-semibold text-black ${getStatusClass(
                reviewerAgent.bridge_status === 0 ? "paused" : "active"
              )}`}
            >
              {reviewerAgent.bridge_status === 0 ? "paused" : "active"}
            </span>
          </div>
          {!isReadOnly && (
            <div className="flex items-center gap-1">
              <div className="dropdown dropdown-end">
                <button
                  data-testid="reviewer-agent-change-button"
                  id="reviewer-agent-change-button"
                  tabIndex={0}
                  className="btn btn-ghost btn-xs btn-circle"
                  title="Change reviewer agent"
                  onClick={() => {
                    setTimeout(() => {
                      document.getElementById("connect-agent-suggestion-search-input")?.focus();
                    }, 50);
                  }}
                >
                  <Edit2 size={12} />
                </button>
                <ConnectedAgentListSuggestion
                  params={params}
                  handleSelectAgents={handleSelect}
                  connect_agents={{}}
                  bridges={bridges}
                  bridgeData={bridges}
                  excludedAgentIds={[reviewerAgentId]}
                  closeOnSelect
                />
              </div>
              <button
                data-testid="reviewer-agent-clear-button"
                id="reviewer-agent-clear-button"
                onClick={handleClear}
                className="btn btn-ghost btn-xs btn-circle hover:bg-red-100 hover:text-error"
                title="Remove reviewer agent"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )}
        </div>
      ) : (
        !isReadOnly && (
          <div className="dropdown dropdown-end shrink-0" data-testid="reviewer-agent-dropdown">
            <button
              data-testid="reviewer-agent-dropdown-toggle"
              id="reviewer-agent-dropdown-toggle"
              tabIndex={0}
              className="btn btn-sm btn-outline font-normal"
              onClick={() => {
                setTimeout(() => {
                  document.getElementById("connect-agent-suggestion-search-input")?.focus();
                }, 50);
              }}
            >
              <AddIcon size={16} />
            </button>
            <ConnectedAgentListSuggestion
              params={params}
              handleSelectAgents={handleSelect}
              connect_agents={{}}
              bridges={bridges}
              bridgeData={bridges}
              excludedAgentIds={[reviewerAgentId]}
              closeOnSelect
            />
          </div>
        )
      )}
    </div>
  );
}

export default ReviewerAgentSelector;
