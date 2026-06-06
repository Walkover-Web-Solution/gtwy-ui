import React, { useState, useEffect } from "react";
import { useCustomSelector } from "@/customHooks/customSelector";
import { updateBridgeVersionAction } from "@/store/action/bridgeAction";
import { useDispatch } from "react-redux";
import InfoTooltip from "@/components/InfoTooltip";
import { CircleQuestionMark } from "lucide-react";

const SuggestionCustomPrompt = ({ params, searchParams, isPublished, isEditor = true }) => {
  const isReadOnly = isPublished || !isEditor;
  const dispatch = useDispatch();
  const [localValue, setLocalValue] = useState("");

  const suggestionCustomPrompt = useCustomSelector((state) => {
    const versionData = state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[searchParams?.version];
    const bridgeDataFromState = state?.bridgeReducer?.allBridgesMap?.[params?.id];

    return isPublished ? bridgeDataFromState?.suggestionCustomPrompt || "" : versionData?.suggestionCustomPrompt || "";
  });

  useEffect(() => {
    setLocalValue(suggestionCustomPrompt);
  }, [suggestionCustomPrompt]);

  const handlePromptChange = (e) => {
    setLocalValue(e.target.value);
  };

  const handleBlur = () => {
    dispatch(
      updateBridgeVersionAction({
        bridgeId: params.id,
        versionId: searchParams?.version,
        dataToSend: { suggestionCustomPrompt: localValue },
      })
    );
  };

  return (
    <div
      data-testid="suggestion-custom-prompt-container"
      id="suggestion-custom-prompt-container"
      className="flex flex-col gap-2 mt-4"
    >
      <div className="flex items-center gap-1">
        <span className="text-sm font-medium">Suggestion Custom Prompt</span>
        <InfoTooltip tooltipContent={"Define custom instructions for how suggestions should work"}>
          <CircleQuestionMark size={14} className="text-gray-500 hover:text-gray-700 cursor-help" />
        </InfoTooltip>
      </div>
      <textarea
        data-testid="suggestion-custom-prompt-textarea"
        id="suggestion-custom-prompt-textarea"
        value={localValue}
        onChange={handlePromptChange}
        onBlur={handleBlur}
        disabled={isReadOnly}
        placeholder="Enter custom prompt for suggestions..."
        className="textarea textarea-bordered w-full max-w-md text-sm"
        rows={4}
      />
    </div>
  );
};

export default SuggestionCustomPrompt;
