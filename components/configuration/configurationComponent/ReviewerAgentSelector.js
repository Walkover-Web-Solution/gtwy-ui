import React, { useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import { useCustomSelector } from "@/customHooks/customSelector";
import { updateBridgeVersionAction } from "@/store/action/bridgeAction";
import { getStatusClass } from "@/utils/utility";
import { ShieldCheck, Edit2, Trash2 } from "lucide-react";
import ConnectedAgentListSuggestion from "./ConnectAgentListSuggestion";
import ReviewerToolSelector from "./ReviewerToolSelector";
import { AddIcon } from "@/components/Icons";
import { useConfigurationContext } from "../ConfigurationContext";

function ReviewerAgentSelector({ params, searchParams, isPublished, isEditor }) {
  const dispatch = useDispatch();
  const router = useRouter();
  const isReadOnly = isPublished || !isEditor;
  const { isEmbedUser } = useConfigurationContext();

  const { bridges, reviewAgent, reviewerAgentId, reviewerPrompt, reviewerTools, reviewerEnabled, isLoaded } =
    useCustomSelector((state) => {
      const versionData = state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[searchParams?.version];
      const reviewAgent = versionData?.settings?.review_agent || {};
      return {
        bridges: state?.bridgeReducer?.org?.[params?.org_id]?.orgs || [],
        reviewAgent,
        reviewerAgentId: reviewAgent?.reviewer_agent ?? null,
        reviewerPrompt: reviewAgent?.reviewer_prompt ?? "",
        reviewerTools: reviewAgent?.reviewer_tools ?? [],
        reviewerEnabled: reviewAgent?.reviewer_enabled ?? false,
        isLoaded: !!versionData,
      };
    });

  const isEnabled = useMemo(() => {
    if (reviewerAgentId || reviewerPrompt || reviewerTools?.length > 0) {
      return reviewerEnabled !== false;
    }
    return reviewerEnabled === true;
  }, [reviewerAgentId, reviewerPrompt, reviewerTools, reviewerEnabled]);

  const [reviewerType, setReviewerType] = useState(
    reviewerPrompt ? "prompt" : reviewerTools?.length > 0 && !reviewerAgentId ? "tool" : "agent"
  );

  const versionKey = `${params?.id}-${searchParams?.version}`;
  const [prevVersionKey, setPrevVersionKey] = useState(versionKey);
  const [prevIsLoaded, setPrevIsLoaded] = useState(isLoaded);

  if (versionKey !== prevVersionKey || (isLoaded && !prevIsLoaded)) {
    setPrevVersionKey(versionKey);
    setPrevIsLoaded(isLoaded);
    setReviewerType(reviewerPrompt ? "prompt" : reviewerTools?.length > 0 && !reviewerAgentId ? "tool" : "agent");
  }

  const reviewerAgent = useMemo(
    () => bridges.find((b) => b._id === reviewerAgentId) || null,
    [bridges, reviewerAgentId]
  );

  const handleToggleChange = (e) => {
    const checked = e.target.checked;
    dispatch(
      updateBridgeVersionAction({
        bridgeId: params?.id,
        versionId: searchParams?.version,
        dataToSend: {
          settings: {
            review_agent: {
              ...(reviewAgent || {}),
              reviewer_enabled: checked,
            },
          },
        },
      })
    );
  };

  const handleSelect = (bridge) => {
    dispatch(
      updateBridgeVersionAction({
        bridgeId: params?.id,
        versionId: searchParams?.version,
        dataToSend: {
          settings: {
            review_agent: {
              ...(reviewAgent || {}),
              reviewer_agent: bridge._id,
            },
          },
        },
      })
    );
  };

  const handleClear = () => {
    dispatch(
      updateBridgeVersionAction({
        bridgeId: params?.id,
        versionId: searchParams?.version,
        dataToSend: {
          settings: {
            review_agent: {
              ...(reviewAgent || {}),
              reviewer_agent: null,
            },
          },
        },
      })
    );
  };

  return (
    <div
      data-testid="reviewer-agent-selector-container"
      id="reviewer-agent-selector-container"
      className="border border-base-200 p-3 flex flex-col items-stretch gap-3 w-full"
    >
      {/* Top Toggle Row */}
      <div className="flex items-center justify-between gap-4 w-full">
        <div className="flex items-start gap-1.5 min-w-0">
          <ShieldCheck size={14} className="text-base-content/60 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-base-content">Reviewer Validation</p>
            <p className="text-xs text-base-content/60 break-words">
              Validate and correct responses using an agent or custom prompt rules.
            </p>
          </div>
        </div>
        <label className="label cursor-pointer gap-2 shrink-0 select-none">
          <span className="text-xs font-semibold">{isEnabled ? "On" : "Off"}</span>
          <input
            autoComplete="off"
            type="checkbox"
            disabled={isReadOnly}
            className="toggle toggle-sm"
            checked={isEnabled}
            onChange={handleToggleChange}
          />
        </label>
      </div>

      {/* Configurations Panel - only visible when enabled */}
      {isEnabled && (
        <div className="flex flex-col gap-4 mt-1 border-t border-base-200 pt-3 transition-all duration-200">
          {/* Reviewer Type Selector */}
          <div className="flex items-center gap-4 bg-base-100 border border-base-200 p-2 rounded-lg justify-around">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-base-content/80 select-none">
              <input
                type="radio"
                name="reviewer_type"
                className="radio radio-xs"
                checked={reviewerType === "agent"}
                disabled={isReadOnly}
                onChange={() => {
                  setReviewerType("agent");
                  dispatch(
                    updateBridgeVersionAction({
                      bridgeId: params?.id,
                      versionId: searchParams?.version,
                      dataToSend: {
                        settings: {
                          review_agent: {
                            ...(reviewAgent || {}),
                            reviewer_prompt: "",
                            reviewer_tools: [],
                          },
                        },
                      },
                    })
                  );
                }}
              />
              <span>Reviewer Agent</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-base-content/88 select-none">
              <input
                type="radio"
                name="reviewer_type"
                className="radio radio-xs"
                checked={reviewerType === "prompt"}
                disabled={isReadOnly}
                onChange={() => {
                  setReviewerType("prompt");
                  dispatch(
                    updateBridgeVersionAction({
                      bridgeId: params?.id,
                      versionId: searchParams?.version,
                      dataToSend: {
                        settings: {
                          review_agent: {
                            ...(reviewAgent || {}),
                            reviewer_agent: null,
                            reviewer_tools: [],
                          },
                        },
                      },
                    })
                  );
                }}
              />
              <span>Custom Prompt</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-base-content/88 select-none">
              <input
                type="radio"
                name="reviewer_type"
                className="radio radio-xs"
                checked={reviewerType === "tool"}
                disabled={isReadOnly}
                onChange={() => {
                  setReviewerType("tool");
                  dispatch(
                    updateBridgeVersionAction({
                      bridgeId: params?.id,
                      versionId: searchParams?.version,
                      dataToSend: {
                        settings: {
                          review_agent: {
                            ...(reviewAgent || {}),
                            reviewer_agent: null,
                            reviewer_prompt: "",
                          },
                        },
                      },
                    })
                  );
                }}
              />
              <span>Reviewer Tool</span>
            </label>
          </div>
          <p className="text-[10px] text-base-content/50 text-center -mt-2.5">
            Note: Only one validation mode can be active. Switching modes will clear other validation settings.
          </p>

          {reviewerType === "agent" && (
            /* Option 1: Reviewer Agent Selector */
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-base-content/85">Reviewer Agent</label>
              <div className="flex items-center justify-between border border-base-200 rounded-lg p-2 bg-base-100/50 min-h-[46px] w-full">
                {reviewerAgent ? (
                  <div className="flex items-center justify-between w-full">
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
                      <span className="text-xs font-medium truncate max-w-[150px]">
                        {reviewerAgent.name || "Untitled"}
                      </span>
                      <span
                        className={`rounded-full capitalize px-1.5 py-0.5 text-[9px] font-semibold text-black ${getStatusClass(
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
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs text-base-content/50 italic p-1">No agent selected</span>
                    {!isReadOnly && (
                      <div className="dropdown dropdown-end shrink-0" data-testid="reviewer-agent-dropdown">
                        <button
                          data-testid="reviewer-agent-dropdown-toggle"
                          id="reviewer-agent-dropdown-toggle"
                          tabIndex={0}
                          className="btn btn-xs btn-outline font-normal gap-1"
                          onClick={() => {
                            setTimeout(() => {
                              document.getElementById("connect-agent-suggestion-search-input")?.focus();
                            }, 50);
                          }}
                        >
                          <AddIcon size={12} />
                          <span>Select Agent</span>
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
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {reviewerType === "prompt" && (
            /* Option 2: Reviewer Prompt */
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-base-content/85">Reviewer Prompt</label>
                <span className="text-[10px] text-base-content/50">Overrides or defines review guidelines</span>
              </div>
              <textarea
                className="textarea textarea-bordered textarea-sm w-full text-xs font-mono leading-relaxed"
                placeholder="Enter custom prompt rules for reviewer agent evaluation..."
                defaultValue={reviewerPrompt}
                disabled={isReadOnly}
                onBlur={(e) => {
                  const newValue = e.target.value.trim();
                  if (newValue !== reviewerPrompt) {
                    dispatch(
                      updateBridgeVersionAction({
                        bridgeId: params?.id,
                        versionId: searchParams?.version,
                        dataToSend: {
                          settings: {
                            review_agent: {
                              ...(reviewAgent || {}),
                              reviewer_prompt: newValue,
                            },
                          },
                        },
                      })
                    );
                  }
                }}
                rows={4}
              />
            </div>
          )}

          {reviewerType === "tool" && (
            /* Option 3: Reviewer Tool Selector */
            <ReviewerToolSelector
              params={params}
              searchParams={searchParams}
              isPublished={isPublished}
              isEditor={isEditor}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default ReviewerAgentSelector;
