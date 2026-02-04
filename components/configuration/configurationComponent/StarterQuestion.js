import React from "react";
import { useCustomSelector } from "@/customHooks/customSelector";
import { updateBridgeVersionAction } from "@/store/action/bridgeAction";
import { useDispatch } from "react-redux";
import InfoTooltip from "@/components/InfoTooltip";
import { CircleQuestionMark } from "lucide-react";

const StarterQuestionToggle = ({ params, searchParams, isPublished, isEditor = true }) => {
  // Determine if content is read-only (either published or user is not an editor)
  const isReadOnly = isPublished || !isEditor;
  const dispatch = useDispatch();
  const IsstarterQuestionEnable = useCustomSelector((state) => {
    const versionData = state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[searchParams?.version];
    const bridgeDataFromState = state?.bridgeReducer?.allBridgesMap?.[params?.id];

    return isPublished
      ? bridgeDataFromState?.IsstarterQuestionEnable || false
      : versionData?.IsstarterQuestionEnable || false;
  });

  const handleToggle = () => {
    dispatch(
      updateBridgeVersionAction({
        bridgeId: params.id,
        versionId: searchParams?.version,
        dataToSend: { IsstarterQuestionEnable: !IsstarterQuestionEnable },
      })
    );
  };

  return (
    <div id="starter-question-container" className="flex items-center gap-2">
      <div className="flex items-center gap-1 cursor-pointer ml-1">
        <span className="text-sm font-medium">Starter Question</span>
        <InfoTooltip tooltipContent={"Toggle to enable/disable starter questions"}>
          <CircleQuestionMark size={14} className="text-gray-500 hover:text-gray-700 cursor-help" />
        </InfoTooltip>
      </div>
      <input
        id="starter-question-toggle"
        type="checkbox"
        checked={IsstarterQuestionEnable}
        onChange={handleToggle}
        className="toggle mr-2 toggle-xs"
        defaultValue={IsstarterQuestionEnable ? "true" : "false"}
        disabled={isReadOnly}
      />
    </div>
  );
};

export default StarterQuestionToggle;
