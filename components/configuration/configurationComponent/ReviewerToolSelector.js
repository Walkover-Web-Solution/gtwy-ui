import React, { useMemo } from "react";
import { useDispatch } from "react-redux";
import { useCustomSelector } from "@/customHooks/customSelector";
import { updateBridgeVersionAction } from "@/store/action/bridgeAction";
import { Edit2, Trash2 } from "lucide-react";
import EmbedListSuggestionDropdownMenu from "./EmbedListSuggestionDropdownMenu";
import { AddIcon } from "@/components/Icons";
import { getSelectedVariablesPath } from "@/utils/variableValidation";

function ReviewerToolSelector({ params, searchParams, isPublished, isEditor }) {
  const dispatch = useDispatch();
  const isReadOnly = isPublished || !isEditor;

  const { reviewAgent, reviewerTools, functionData, integrationData, embedToken, variablesPath } = useCustomSelector(
    (state) => {
      const versionData = state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[searchParams?.version];
      const reviewAgent = versionData?.settings?.review_agent || {};
      return {
        reviewAgent,
        reviewerTools: reviewAgent?.reviewer_tools ?? [],
        functionData: state?.bridgeReducer?.org?.[params?.org_id]?.functionData || {},
        integrationData: state?.bridgeReducer?.org?.[params?.org_id]?.integrationData || {},
        embedToken: state?.bridgeReducer?.org?.[params?.org_id]?.embed_token || "",
        variablesPath: versionData?.variables_path || {},
      };
    }
  );

  const selectedToolId = reviewerTools?.[0] || null;
  const selectedTool = useMemo(() => {
    return selectedToolId ? functionData[selectedToolId] : null;
  }, [functionData, selectedToolId]);

  const handleSelectTool = (functionId) => {
    dispatch(
      updateBridgeVersionAction({
        bridgeId: params?.id,
        versionId: searchParams?.version,
        dataToSend: {
          settings: {
            review_agent: {
              ...(reviewAgent || {}),
              reviewer_tools: [functionId],
            },
          },
        },
      })
    );
  };

  const handleClearTool = () => {
    dispatch(
      updateBridgeVersionAction({
        bridgeId: params?.id,
        versionId: searchParams?.version,
        dataToSend: {
          settings: {
            review_agent: {
              ...(reviewAgent || {}),
              reviewer_tools: [],
            },
          },
        },
      })
    );
  };

  const handleOpenTool = () => {
    if (typeof window !== "undefined" && window.openViasocket && selectedTool?.script_id) {
      const selectedVariablesPath = getSelectedVariablesPath(variablesPath, selectedTool.script_id);
      window.openViasocket(selectedTool.script_id, {
        embedToken,
        meta: {
          createFrom: "reviewer",
          type: "tool",
          bridge_id: params?.id,
        },
        dummy_payload: {
          ...selectedVariablesPath,
        },
      });
    }
  };

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-xs font-semibold text-base-content/85">Reviewer Tool</label>
      <div className="flex items-center justify-between border border-base-200 rounded-lg p-2 bg-base-100/50 min-h-[46px] w-full">
        {selectedTool ? (
          <div className="flex items-center justify-between w-full">
            <div
              className="flex items-center gap-2 bg-base-200/60 border border-base-300 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-base-300/60 transition-colors"
              title="Click to open/edit tool"
              onClick={handleOpenTool}
            >
              <span className="text-xs font-medium truncate max-w-[150px]">
                {selectedTool.title ||
                  integrationData?.[selectedTool.script_id]?.title ||
                  selectedTool.script_id ||
                  "Untitled"}
              </span>
            </div>
            {!isReadOnly && (
              <div className="flex items-center gap-1">
                <div className="dropdown dropdown-end">
                  <button
                    tabIndex={0}
                    className="btn btn-ghost btn-xs btn-circle"
                    title="Change reviewer tool"
                    onClick={() => {
                      setTimeout(() => {
                        document.getElementById("embed-suggestion-search-input")?.focus();
                      }, 50);
                    }}
                  >
                    <Edit2 size={12} />
                  </button>
                  <EmbedListSuggestionDropdownMenu
                    params={params}
                    searchParams={searchParams}
                    onSelect={handleSelectTool}
                    isPublished={isPublished}
                    isEditor={isEditor}
                    connectedFunctions={reviewerTools}
                    hideCreateFunction
                  />
                </div>
                <button
                  onClick={handleClearTool}
                  className="btn btn-ghost btn-xs btn-circle hover:bg-red-100 hover:text-error"
                  title="Remove reviewer tool"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-base-content/50 italic p-1">No tool selected</span>
            {!isReadOnly && (
              <div className="dropdown dropdown-end shrink-0">
                <button
                  tabIndex={0}
                  className="btn btn-xs btn-outline font-normal gap-1"
                  onClick={() => {
                    setTimeout(() => {
                      document.getElementById("embed-suggestion-search-input")?.focus();
                    }, 50);
                  }}
                >
                  <AddIcon size={12} />
                  <span>Select Tool</span>
                </button>
                <EmbedListSuggestionDropdownMenu
                  params={params}
                  searchParams={searchParams}
                  onSelect={handleSelectTool}
                  isPublished={isPublished}
                  isEditor={isEditor}
                  connectedFunctions={reviewerTools}
                  hideCreateFunction
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ReviewerToolSelector;
