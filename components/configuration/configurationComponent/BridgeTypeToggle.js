import { useCustomSelector } from "@/customHooks/customSelector";
import { updateBridgeAction } from "@/store/action/bridgeAction";
import { InfoIcon } from "@/components/Icons";
import React, { useEffect } from "react";
import { useDispatch } from "react-redux";
import Protected from "@/components/Protected";
import InfoTooltip from "@/components/InfoTooltip";
import { CircleQuestionMark } from "lucide-react";

const BridgeTypeToggle = ({ params, searchParams, isEmbedUser, isPublished, isEditor = true }) => {
  // Determine if content is read-only (either published or user is not an editor)
  const isReadOnly = isPublished || !isEditor;
  const dispatch = useDispatch();
  const { bridgeType, modelType, service } = useCustomSelector((state) => ({
    bridgeType: state?.bridgeReducer?.allBridgesMap?.[params?.id]?.bridgeType,
    modelType:
      state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[
        searchParams?.version
      ]?.configuration?.type?.toLowerCase(),
    service: state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[searchParams?.version]?.service,
  }));

  const handleInputChange = (e) => {
    let newCheckedValue;
    if (e.target.type === "checkbox") {
      newCheckedValue = e.target.checked;
    } else {
      newCheckedValue = e.target.value;
    }

    let updatedDataToSend = {
      bridgeType: newCheckedValue,
    };

    dispatch(
      updateBridgeAction({
        bridgeId: params.id,
        dataToSend: { ...updatedDataToSend },
      })
    );
  };

  useEffect(() => {
    if (!service || !bridgeType) return;
    if (service !== "openai" && bridgeType === "batch") {
      dispatch(
        updateBridgeAction({
          bridgeId: params.id,
          dataToSend: { bridgeType: "api" },
        })
      );
    }
  }, [searchParams?.version, service, bridgeType]);

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Agent Type Label */}
      <div className="flex items-center gap-1">
        <span className="label-text font-medium">Agent Type</span>
        <InfoTooltip tooltipContent="Choose how users will interact with your AI agent - through API calls, chatbot interface, batch processing, or automated triggers.">
          <CircleQuestionMark size={14} className="text-gray-500 hover:text-gray-700 cursor-help" />
        </InfoTooltip>
      </div>

      {/* Radio buttons container */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col xs:flex-row xs:flex-wrap sm:flex-row sm:flex-wrap lg:flex-row items-start gap-3 sm:gap-4 w-full">
          <div className="flex items-center gap-2 min-w-0">
            <InfoTooltip tooltipContent="The API allows users to connect with AI models to perform tasks like generating responses or processing information.">
              <label className="flex items-center cursor-pointer min-w-0">
                <input
                  id="bridge-type-api-radio"
                  disabled={isReadOnly}
                  type="radio"
                  name="bridgeType"
                  value="api"
                  className="radio radio-sm sm:radio"
                  checked={bridgeType?.toString()?.toLowerCase() === "api"}
                  onChange={(e) => handleInputChange(e, "bridgeType")}
                />
                <div className="group relative inline-block">
                  <span className="label-text text-sm sm:text-base ml-2 cursor-pointer">API</span>
                </div>
              </label>
            </InfoTooltip>
          </div>
          {!isEmbedUser && (
            <div className="flex items-center gap-2 min-w-0">
              <InfoTooltip tooltipContent="Triggers allows you to create automated workflows that respond to specific events or conditions. Ideal for creating event-driven applications.">
                <label className="flex items-center cursor-pointer min-w-0">
                  <input
                    id="bridge-type-trigger-radio"
                    type="radio"
                    name="bridgeType"
                    value="trigger"
                    className="radio radio-sm sm:radio"
                    checked={bridgeType?.toString()?.toLowerCase() === "trigger"}
                    onChange={(e) => handleInputChange(e, "bridgeType")}
                    disabled={modelType === "embedding" || isReadOnly}
                  />
                  <div className="group relative inline-block">
                    <span className="label-text text-sm sm:text-base ml-2 cursor-pointer">Triggers</span>
                  </div>
                </label>
              </InfoTooltip>
            </div>
          )}
        </div>

        {/* Alert message */}
        {modelType === "embedding" && (
          <div role="alert" className="alert p-2 w-fit">
            <InfoIcon size={16} />
            <span className="label-text-alt">Embedding models do not support ChatBot.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Protected(BridgeTypeToggle);
