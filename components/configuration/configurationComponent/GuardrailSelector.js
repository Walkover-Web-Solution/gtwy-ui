import React, { useState, useEffect, useCallback } from "react";
import { CirclePlusIcon, CloseCircleIcon } from "@/components/Icons";
import InfoTooltip from "@/components/InfoTooltip";
import { updateBridgeVersionAction } from "@/store/action/bridgeAction";
import { useDispatch } from "react-redux";
import { useCustomSelector } from "@/customHooks/customSelector";
import { CircleQuestionMark } from "lucide-react";

const GuardrailSelector = ({ params, searchParams, isPublished, isEditor = true }) => {
  // Determine if content is read-only (either published or user is not an editor)
  const isReadOnly = isPublished || !isEditor;
  const { guardrailsData, GUARDRAILS_TEMPLATES } = useCustomSelector((state) => {
    const versionData = state.bridgeReducer?.bridgeVersionMapping[params?.id]?.[searchParams?.version];
    const bridgeDataFromState = state.bridgeReducer?.allBridgesMap?.[params?.id];

    return {
      guardrailsData: isPublished ? bridgeDataFromState?.guardrails || {} : versionData?.guardrails || {},
      GUARDRAILS_TEMPLATES: state.flowDataReducer?.flowData?.guardrailsTemplatesData || {},
    };
  });
  const [customPrompt, setCustomPrompt] = useState(guardrailsData?.guardrails_custom_prompt || "");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [selectedGuardrails, setSelectedGuardrails] = useState([]);
  const [guardrailsEnabled, setGuardrailsEnabled] = useState(guardrailsData?.is_enabled);
  const [showOptions, setShowOptions] = useState(false);
  const dispatch = useDispatch();

  // Memoized function to update store with specific values
  const updateGuardrailsInStore = useCallback(
    (enabled, selected, customPromptValue) => {
      // Build guardrails configuration object with all options
      const guardrails_configuration = {};

      // Set all guardrail options to false by default
      Object.keys(GUARDRAILS_TEMPLATES)?.forEach((key) => {
        guardrails_configuration[key] = false;
      });

      // Set selected guardrails to true
      selected?.forEach((key) => {
        if (key !== "custom" && guardrails_configuration.hasOwnProperty(key)) {
          guardrails_configuration[key] = true;
        }
      });

      const dataToSend = {
        guardrails: {
          is_enabled: enabled,
          guardrails_configuration,
          guardrails_custom_prompt: selected?.includes("custom") ? customPromptValue : "",
        },
      };

      dispatch(
        updateBridgeVersionAction({
          versionId: searchParams?.version,
          dataToSend: dataToSend,
        })
      );
    },
    [dispatch, searchParams?.version]
  );

  useEffect(() => {
    if (guardrailsData) {
      setGuardrailsEnabled(guardrailsData?.is_enabled || false);

      // Set selected guardrails from guardrails_configuration
      const selected = Object.entries(guardrailsData?.guardrails_configuration || {})
        .filter(([_, isEnabled]) => isEnabled)
        .map(([key]) => key);
      setSelectedGuardrails(selected);

      // Set custom prompt if available
      if (guardrailsData?.guardrails_custom_prompt) {
        setCustomPrompt(guardrailsData.guardrails_custom_prompt);

        // Show custom input if we have a custom prompt
        if (guardrailsData?.guardrails_custom_prompt?.trim() !== "") {
          setShowCustomInput(true);
          // Add custom to selected if not already there
          if (!selected?.includes("custom")) {
            setSelectedGuardrails((prev) => [...prev, "custom"]);
          }
        }
      }
    }
  }, [guardrailsData]);

  const handleGuardrailChange = (guardrailKey) => {
    if (guardrailKey === "custom") {
      // Toggle custom input visibility
      const newShowCustomInput = !showCustomInput;
      setShowCustomInput(newShowCustomInput);

      let newSelectedGuardrails;
      if (newShowCustomInput) {
        // Add custom to selected guardrails if not already there
        newSelectedGuardrails = selectedGuardrails?.includes("custom")
          ? selectedGuardrails
          : [...selectedGuardrails, "custom"];
      } else {
        // Remove custom from selected guardrails
        newSelectedGuardrails = selectedGuardrails?.filter((key) => key !== "custom");
        // Clear custom prompt when removing custom
        setCustomPrompt("");
      }

      setSelectedGuardrails(newSelectedGuardrails);
      // Update store immediately with new values
      {
        customPrompt.trim() !== "" &&
          updateGuardrailsInStore(guardrailsEnabled, newSelectedGuardrails, newShowCustomInput ? customPrompt : "");
      }
    } else {
      // Toggle regular guardrail selection
      let newSelectedGuardrails;
      if (selectedGuardrails?.includes(guardrailKey)) {
        newSelectedGuardrails = selectedGuardrails?.filter((key) => key !== guardrailKey);
      } else {
        newSelectedGuardrails = [...selectedGuardrails, guardrailKey];
      }

      setSelectedGuardrails(newSelectedGuardrails);
      // Update store immediately with new values
      updateGuardrailsInStore(guardrailsEnabled, newSelectedGuardrails, customPrompt);
    }
  };

  // Toggle guardrails enable/disable
  const handleToggleGuardrails = () => {
    const newEnabledState = !guardrailsEnabled;
    setGuardrailsEnabled(newEnabledState);

    if (!newEnabledState) {
      setShowOptions(false);
    }

    // Update store with new enabled state immediately
    updateGuardrailsInStore(newEnabledState, selectedGuardrails, customPrompt);
  };

  // Toggle showing options panel
  const handleToggleOptions = () => {
    setShowOptions(!showOptions);
  };

  // Handle custom guardrail prompt change with debounce
  const handleCustomPromptChange = (e) => {
    const newPromptValue = e.target.value;
    setCustomPrompt(newPromptValue);

    // Delay updating the store to avoid too many updates while typing
    updateGuardrailsInStore(guardrailsEnabled, selectedGuardrails, newPromptValue);
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Always visible header with toggle */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <span className="label-text capitalize font-medium">Prompt Guards</span>
          <InfoTooltip tooltipContent="Guardrails help ensure that the AI responses adhere to specific guidelines or restrictions.">
            <CircleQuestionMark size={14} className="text-gray-500 hover:text-gray-700 cursor-help" />
          </InfoTooltip>
        </div>
        <label className="swap">
          <input
            id="guardrails-toggle"
            disabled={isReadOnly}
            type="checkbox"
            checked={guardrailsEnabled}
            onChange={handleToggleGuardrails}
            className="toggle toggle-sm"
          />
        </label>
      </div>

      {/* Only visible when guardrails enabled */}
      {guardrailsEnabled && (
        <>
          {/* Selected guardrails */}
          <div className="mt-2 mb-2 ml-2">
            <div className="text-sm">
              {selectedGuardrails.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  <span className="font-medium">Selected: </span>
                  {selectedGuardrails.map((key) => (
                    <span key={key} className="badge badge-sm badge-outline">
                      {key === "custom" ? "Custom" : GUARDRAILS_TEMPLATES[key]?.name}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-gray-500">No guardrails selected</span>
              )}
            </div>
          </div>

          {/* Button to show options or close options */}
          <div className="m-2 mb-4">
            {!showOptions ? (
              <button
                id="guardrails-add-button"
                disabled={isReadOnly}
                onClick={handleToggleOptions}
                className="btn btn-sm btn-outline w-full flex items-center gap-2"
              >
                <CirclePlusIcon size={16} />
                <span>Add Guardrail Types</span>
              </button>
            ) : (
              <div className="bg-base-100 border border-base-300 rounded-md">
                <div className="p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Available Guards</span>
                    <button
                      id="guardrails-close-button"
                      disabled={isReadOnly}
                      onClick={handleToggleOptions}
                      className="btn btn-ghost btn-sm btn-circle"
                    >
                      <CloseCircleIcon size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-2">
                    {/* Predefined Guardrails */}
                    {Object.entries(GUARDRAILS_TEMPLATES || {}).map(([key, { name, description }]) => (
                      <div key={key} className="form-control">
                        <div className="label cursor-pointer justify-start gap-2">
                          <input
                            id={`guardrail-checkbox-${key}`}
                            disabled={isReadOnly}
                            type="checkbox"
                            className="checkbox checkbox-sm"
                            checked={selectedGuardrails.includes(key)}
                            onChange={() => handleGuardrailChange(key)}
                          />
                          <InfoTooltip tooltipContent={description}>
                            <span className="label-text">{name}</span>
                          </InfoTooltip>
                        </div>
                      </div>
                    ))}

                    {/* Custom Guardrail */}
                    <div className="form-control col-span-full">
                      <div className="label cursor-pointer justify-start gap-2">
                        <input
                          id="guardrail-checkbox-custom"
                          disabled={isReadOnly}
                          type="checkbox"
                          className="checkbox checkbox-sm"
                          checked={showCustomInput || customPrompt.trim() !== ""}
                          onChange={() => handleGuardrailChange("custom")}
                        />
                        <InfoTooltip tooltipContent="Add your own custom guardrail specification">
                          <span className="label-text">Custom Guard</span>
                        </InfoTooltip>
                      </div>

                      {showCustomInput && (
                        <div className="mt-2">
                          <textarea
                            id="guardrail-custom-prompt-textarea"
                            disabled={isReadOnly}
                            placeholder="Write your custom guardrail prompt here..."
                            className="textarea textarea-sm bg-white dark:bg-black/15 textarea-bordered w-full h-24 text-sm"
                            onBlur={handleCustomPromptChange}
                            onChange={(e) => setCustomPrompt(e.target.value)}
                            value={customPrompt}
                          ></textarea>
                          <p className="text-xs text-gray-500 mt-1">Specify instructions for your custom guardrail</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
export default GuardrailSelector;
