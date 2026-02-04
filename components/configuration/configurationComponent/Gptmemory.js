import React, { useEffect, useState } from "react";
import { useCustomSelector } from "@/customHooks/customSelector";
import { updateBridgeVersionAction } from "@/store/action/bridgeAction";
import { useDispatch } from "react-redux";
import { Brain } from "lucide-react";

const GptMemory = ({ params, searchParams, isPublished, isEditor = true }) => {
  // Determine if content is read-only (either published or user is not an editor)
  const isReadOnly = isPublished || !isEditor;
  const dispatch = useDispatch();

  const { gpt_memory_context, gpt_memory } = useCustomSelector((state) => {
    const versionData = state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[searchParams?.version];
    const bridgeDataFromState = state?.bridgeReducer?.allBridgesMap?.[params?.id];

    return {
      gpt_memory_context: isPublished
        ? bridgeDataFromState?.gpt_memory_context || ""
        : versionData?.gpt_memory_context || "",
      gpt_memory: isPublished ? bridgeDataFromState?.gpt_memory || false : versionData?.gpt_memory || false,
    };
  });
  const [, setShowInput] = useState(gpt_memory_context?.length > 0);

  const handleCheckboxChange = (e) => {
    const newValue = e.target.checked;
    dispatch(
      updateBridgeVersionAction({
        bridgeId: params.id,
        versionId: searchParams?.version,
        dataToSend: { gpt_memory: newValue },
      })
    );
  };

  const handleUserReferenceChange = (e) => {
    const newValue = e.target.value;
    if (newValue !== gpt_memory_context) {
      dispatch(
        updateBridgeVersionAction({
          bridgeId: params.id,
          versionId: searchParams?.version,
          dataToSend: { gpt_memory_context: newValue },
        })
      );
    }
  };

  useEffect(() => {
    setShowInput(gpt_memory_context?.length > 0);
  }, [gpt_memory_context]);

  return (
    <div className="mt-4">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-base-content text-sm text-base-content/60">
          Configure conversation memory and context retention
        </span>

        <label className="label cursor-pointer gap-2">
          <input
            id="gpt-memory-toggle"
            type="checkbox"
            checked={gpt_memory}
            onChange={handleCheckboxChange}
            className="toggle toggle-sm"
            disabled={isReadOnly}
          />
        </label>
      </div>

      {/* Centered empty state when memory is off */}
      {!gpt_memory && (
        <div className="flex flex-col items-center justify-center py-20">
          <Brain size={48} className="text-base-content/30 mb-4" strokeWidth={1.5} />
          <p className="text-sm text-base-content/50">Enable memory to configure settings</p>
        </div>
      )}

      {/* Context Input when memory is on */}
      {gpt_memory && (
        <div>
          <div className="mb-3">
            <label className="text-sm font-medium text-base-content mb-1 block">Memory Context</label>
            <p className="text-xs text-base-content/60 leading-relaxed">
              Define what the AI should remember about your preferences and conversation style.
            </p>
          </div>
          <textarea
            id="gpt-memory-context-textarea"
            disabled={isReadOnly}
            className="textarea textarea-bordered w-full min-h-[400px] "
            defaultValue={gpt_memory_context}
            onBlur={handleUserReferenceChange}
            key={gpt_memory_context}
          />
        </div>
      )}
    </div>
  );
};

export default GptMemory;
