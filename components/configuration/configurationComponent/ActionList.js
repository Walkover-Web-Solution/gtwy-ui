import { useCustomSelector } from "@/customHooks/customSelector";
import { createOrRemoveActionBridge } from "@/store/action/chatBotAction";
import { TrashIcon } from "@/components/Icons";
import { useState, useCallback } from "react";
import { useDispatch } from "react-redux";
import ActionModel from "./ActionModel";
import { openModal } from "@/utils/utility";
import { MODAL_TYPE } from "@/utils/enums";
import InfoTooltip from "@/components/InfoTooltip";
import { CircleQuestionMark } from "lucide-react";

function ActionList({ params, searchParams, isPublished, isEditor = true }) {
  // Determine if content is read-only (either published or user is not an editor)
  const isReadOnly = isPublished || !isEditor;
  const { action } = useCustomSelector((state) => {
    const versionData = state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[searchParams?.version];
    const bridgeDataFromState = state?.bridgeReducer?.allBridgesMap?.[params?.id];

    return {
      action: isPublished ? bridgeDataFromState?.actions : versionData?.actions,
    };
  });

  const dispatch = useDispatch();
  const [selectedKey, setSelectedKey] = useState(null);

  const handleRemoveAction = useCallback(
    (actionId, type, description, data, e) => {
      e.stopPropagation();
      const dataToSend = {
        actionId,
        actionJson: {
          description,
          type,
          ...(type === "sendDataToFrontend" && { variable: data }),
        },
      };

      dispatch(
        createOrRemoveActionBridge({
          orgId: params?.org_id,
          bridgeId: params?.id,
          versionId: searchParams?.version,
          type: "remove",
          dataToSend,
        })
      );
    },
    [dispatch, params, searchParams]
  );

  return (
    <div id="action-list-container" className="form-control mb-4">
      <div className="flex items-center gap-1">
        <label className="label font-medium whitespace-nowrap">Action</label>
        <InfoTooltip tooltipContent="Action is a task or operation executed in response to a trigger or event, often used to perform a defined outcome such as sending or processing data.">
          <CircleQuestionMark size={14} className="text-gray-500 hover:text-gray-700 cursor-help" />
        </InfoTooltip>
      </div>
      <div id="action-cards-wrapper" className="flex flex-wrap gap-4">
        {action &&
          Object.entries(action)
            .sort()
            .map(([key, value]) => (
              <div
                id={`action-card-${key}`}
                key={key}
                className="flex w-[250px] mb-4 flex-col items-start rounded-md border border-base-300 hover:bg-base-200 md:flex-row cursor-pointer"
                onClick={() => {
                  setSelectedKey(key);
                  openModal(MODAL_TYPE.ACTION_MODAL);
                }}
                disabled={isReadOnly}
              >
                <div className="p-4 w-full">
                  <div className="flex items-center justify-between">
                    <h1 className="inline-flex items-center text-lg font-semibold text-base-content">{key}</h1>
                    <button
                      id={`action-delete-button-${key}`}
                      disabled={isReadOnly}
                      onClick={(e) => handleRemoveAction(key, value?.type, value?.description, value?.variable, e)}
                      className="hover:scale-125 disabled:opacity-50 disabled:cursor-not-allowed transition duration-100 ease-in-out"
                    >
                      <TrashIcon size={16} className="text-error" />
                    </button>
                  </div>
                  <p className="mt-3 text-xs sm:text-sm line-clamp-3">Description: {value?.description}</p>
                  {value?.variable && (
                    <p className="mt-3 text-xs sm:text-sm line-clamp-3">Structure: {value?.variable}</p>
                  )}
                  {value?.type && (
                    <div className="mt-4">
                      <span className="mr-2 inline-block rounded-full capitalize bg-base-300 text-base px-3 py-1 text-[10px] sm:text-xs font-semibold text-base-content">
                        {value.type}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
      </div>
      <ActionModel
        params={params}
        searchParams={searchParams}
        actionId={selectedKey}
        setActionId={setSelectedKey}
        isPublished={isPublished}
        isEditor={isEditor}
      />
    </div>
  );
}
export default ActionList;
