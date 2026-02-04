import InfoTooltip from "@/components/InfoTooltip";
import { useCustomSelector } from "@/customHooks/customSelector";
import { updateBridgeVersionAction } from "@/store/action/bridgeAction";
import { AVAILABLE_MODEL_TYPES, PROMPT_SUPPORTED_REASIONING_MODELS } from "@/utils/enums";
import React from "react";
import { useDispatch } from "react-redux";
import { CircleQuestionMark } from "lucide-react";

function ToolCallCount({ params, searchParams, isPublished, isEditor = true }) {
  // Determine if content is read-only (either published or user is not an editor)
  const isReadOnly = isPublished || !isEditor;
  const dispatch = useDispatch();
  const { tool_call_count, modelType, model } = useCustomSelector((state) => {
    const versionData = state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[searchParams?.version];
    const bridgeDataFromState = state?.bridgeReducer?.allBridgesMap?.[params?.id];

    return {
      tool_call_count: isPublished ? bridgeDataFromState?.tool_call_count : versionData?.tool_call_count,
      modelType: isPublished
        ? bridgeDataFromState?.configuration?.type?.toLowerCase()
        : versionData?.configuration?.type?.toLowerCase(),
      model: isPublished ? bridgeDataFromState?.configuration?.model : versionData?.configuration?.model,
    };
  });

  const handleFunctionCountChange = (e) => {
    const new_value = parseInt(e.target.value, 10);
    dispatch(
      updateBridgeVersionAction({
        bridgeId: params.id,
        versionId: searchParams.version,
        dataToSend: { tool_call_count: new_value },
      })
    );
  };

  if (modelType === AVAILABLE_MODEL_TYPES.REASONING && !PROMPT_SUPPORTED_REASIONING_MODELS?.includes(model)) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex items-center gap-1">
        <span className="label-text font-medium">Maximum Function Call Limit</span>
        <InfoTooltip
          tooltipContent={
            "This feature sets a limit on function calls. By default, functions are called one at a time, but with 'Parallel Tools' enabled, multiple functions can be called simultaneously within a single function call."
          }
        >
          <CircleQuestionMark size={14} className="text-gray-500 hover:text-gray-700 cursor-help" />
        </InfoTooltip>
      </div>
      <input
        id="tool-call-count-input"
        disabled={isReadOnly}
        type="number"
        placeholder="Type here"
        className="input input-sm input-bordered w-full"
        min={1}
        max={30}
        key={tool_call_count}
        defaultValue={tool_call_count || 3}
        onInput={(e) => {
          const value = parseInt(e.target.value, 10);
          if (value > 30) e.target.value = 30;
        }}
        onBlur={(e) => {
          const value = parseInt(e.target.value, 10);
          if (isNaN(value) || value < 2) {
            e.target.value = 2;
          } else if (value > 30) {
            e.target.value = 30;
          }
          handleFunctionCountChange(e);
        }}
      />
    </div>
  );
}

export default ToolCallCount;
