import { useCustomSelector } from "@/customHooks/customSelector";
import { ADVANCED_BRIDGE_PARAMETERS, KEYS_NOT_TO_DISPLAY } from "@/jsonFiles/bridgeParameter";
import { updateBridgeVersionAction } from "@/store/action/bridgeAction";
import { MODAL_TYPE } from "@/utils/enums";
import useTutorialVideos from "@/hooks/useTutorialVideos";
import { generateRandomID, openModal } from "@/utils/utility";
import { ChevronDownIcon, ChevronUpIcon } from "@/components/Icons";
import JsonSchemaModal from "@/components/modals/JsonSchemaModal";
import JsonSchemaBuilderModal from "@/components/modals/JsonSchemaBuilderModal";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import OnBoarding from "@/components/OnBoarding";
import TutorialSuggestionToast from "@/components/TutorialSuggestoinToast";
import InfoTooltip from "@/components/InfoTooltip";
import { setThreadIdForVersionReducer } from "@/store/reducer/bridgeReducer";
import { CircleQuestionMark } from "lucide-react";

const AdvancedParameters = ({
  params,
  searchParams,
  isEmbedUser,
  hideAdvancedParameters,
  className = "",
  level = 1,
  compact = false,
  isPublished = false,
  isEditor = true,
}) => {
  const isReadOnly = isPublished || !isEditor;
  // Use the tutorial videos hook
  const { getAdvanceParameterVideo } = useTutorialVideos();

  const [objectFieldValue, setObjectFieldValue] = useState();
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [tutorialState, setTutorialState] = useState({
    showTutorial: false,
    showSuggestion: false,
  });
  const [messages, setMessages] = useState([]);
  const dropdownContainerRef = useRef(null);
  const dispatch = useDispatch();

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownContainerRef.current && !dropdownContainerRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

  const {
    service,
    version_function_data,
    configuration,
    integrationData,
    connected_agents,
    modelInfoData,
    bridge,
    showResponseType,
  } = useCustomSelector((state) => {
    const versionData = state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[searchParams?.version];
    const bridgeDataFromState = state?.bridgeReducer?.allBridgesMap?.[params?.id];
    const integrationData = state?.bridgeReducer?.org?.[params?.org_id]?.integrationData || {};

    // Use bridgeData when isPublished=true, otherwise use versionData
    const activeData = isPublished ? bridgeDataFromState : versionData;
    const service = activeData?.service;
    const configuration = activeData?.configuration;
    const type = configuration?.type;
    const model = configuration?.model;
    const modelInfoData =
      state?.modelReducer?.serviceModels?.[service]?.[type]?.[model]?.configuration?.additional_parameters;

    return {
      version_function_data: isPublished ? bridgeDataFromState?.apiCalls : versionData?.apiCalls,
      integrationData,
      service,
      configuration,
      connected_agents: isPublished ? bridgeDataFromState?.connected_agents : versionData?.connected_agents,
      modelInfoData,
      bridge: activeData,
      showResponseType: state.appInfoReducer.embedUserDetails.showResponseType,
    };
  });
  const [inputConfiguration, setInputConfiguration] = useState(configuration);
  const { tool_choice: tool_choice_data, model } = configuration || {};
  const initialThreadId = bridge?.thread_id || generateRandomID();
  const [thread_id, setThreadId] = useState(initialThreadId);

  useEffect(() => {
    if (!bridge?.thread_id && initialThreadId) {
      setThreadIdForVersionReducer &&
        dispatch(
          setThreadIdForVersionReducer({
            bridgeId: params?.id,
            versionId: searchParams?.version,
            thread_id: initialThreadId,
          })
        );
    }
  }, []);
  useEffect(() => {
    setInputConfiguration(configuration);
  }, [configuration]);

  // Filter parameters by level
  const getParametersByLevel = (level) => {
    if (!modelInfoData) return [];

    return Object.entries(modelInfoData || {}).filter(([key, paramConfig]) => {
      // Skip keys that shouldn't be displayed
      if (KEYS_NOT_TO_DISPLAY?.includes(key)) return false;

      // Get level from ADVANCED_BRIDGE_PARAMETERS or default to 1
      const paramLevel = paramConfig?.level ?? 1;
      return paramLevel === level;
    });
  };

  const level1Parameters = getParametersByLevel(1); // Regular parameters (not in accordion)
  const level2Parameters = getParametersByLevel(2); // Outside accordion parameters

  useEffect(() => {
    setObjectFieldValue(
      configuration?.response_type?.json_schema
        ? JSON.stringify(configuration?.response_type?.json_schema, undefined, 4)
        : null
    );
  }, [configuration?.response_type?.json_schema]);

  useEffect(() => {
    if (
      tool_choice_data === "auto" ||
      tool_choice_data === "none" ||
      tool_choice_data === "default" ||
      tool_choice_data === "required"
    ) {
      setSelectedOptions([
        {
          name: tool_choice_data === "default" ? "auto" : tool_choice_data,
          id: tool_choice_data === "default" ? "auto" : tool_choice_data,
        },
      ]);
      return;
    }
    const selectedFunctiondata =
      version_function_data && typeof version_function_data === "object"
        ? Object.values(version_function_data)
            .filter((value) => {
              const toolChoice = typeof tool_choice_data === "string" ? tool_choice_data : "";
              return toolChoice === value?._id;
            })
            .map((value) => ({
              name: value?.script_id || value?.title,
              id: value?._id,
            }))
        : [];
    const selectedAgentData =
      connected_agents && typeof connected_agents === "object"
        ? Object.entries(connected_agents)
            .filter(([name, item]) => {
              const toolChoice = typeof tool_choice_data === "string" ? tool_choice_data : "";
              return toolChoice === item.bridge_id;
            })
            .map(([name, item]) => ({
              name,
              id: item.bridge_id,
            }))
        : [];
    setSelectedOptions(selectedAgentData?.length > 0 ? selectedAgentData : selectedFunctiondata);
  }, [tool_choice_data]);

  const debounce = (func, delay) => {
    let timeoutId;
    return function (...args) {
      const context = this;
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(context, args);
      }, delay);
    };
  };

  const handleInputChange = (e, key, isSlider = false) => {
    let newValue = e.target.value;
    let newCheckedValue = e.target.checked;
    if (e.target.type === "number" || isSlider) {
      newValue = String(newValue)?.includes(".") ? parseFloat(newValue) : parseInt(newValue, 10);
    }
    let updatedDataToSend = {
      configuration: {
        [key]: isSlider ? newValue : e.target.type === "checkbox" ? newCheckedValue : newValue,
      },
    };
    if ((isSlider ? newValue : e.target.type === "checkbox" ? newCheckedValue : newValue) !== configuration?.[key]) {
      dispatch(
        updateBridgeVersionAction({
          bridgeId: params?.id,
          versionId: searchParams?.version,
          dataToSend: { ...updatedDataToSend },
        })
      );
    }
  };

  const debouncedInputChange = useCallback(
    (e, paramKey, isSlider = false) => {
      const delay = paramKey === "stop" ? 2000 : 500;
      const debouncedFn = debounce(handleInputChange, delay);
      return debouncedFn(e, paramKey, isSlider);
    },
    [configuration, params?.id, params?.version]
  );

  const handleSelectChange = (e, key, defaultValue, Objectvalue = {}, isDeafaultObject = true) => {
    let newValue;
    try {
      // Check if Objectvalue is already an object or needs parsing
      if (typeof Objectvalue === "string") {
        newValue = Objectvalue ? JSON.parse(Objectvalue) : {};
      } else {
        newValue = Objectvalue || {};
      }
      setObjectFieldValue(JSON.stringify(newValue, undefined, 4));
    } catch {
      toast.error("Invalid JSON provided");
      return;
    }
    let updatedDataToSend = isDeafaultObject
      ? {
          configuration: {
            [key]: {
              [defaultValue?.key]: e.target.value,
            },
          },
        }
      : {
          configuration: {
            [key]: e.target.value,
          },
        };
    if (Object.entries(newValue).length > 0) {
      updatedDataToSend = {
        configuration: {
          [key]: {
            [defaultValue?.key]: e.target.value,
            [e.target.value]: typeof newValue === "string" ? JSON.parse(newValue) : newValue,
          },
        },
      };
    }
    if (e.target.value !== configuration?.[key]) {
      dispatch(
        updateBridgeVersionAction({
          bridgeId: params?.id,
          versionId: searchParams?.version,
          dataToSend: { ...updatedDataToSend },
        })
      );
    }
  };
  const setSliderValue = (value, key, isDeafaultObject = false) => {
    const numericValue =
      typeof value === "string" && value !== "default" && value !== "min" && value !== "max"
        ? String(value)?.includes(".")
          ? parseFloat(value)
          : parseInt(value, 10)
        : value;

    setInputConfiguration((prev) => ({
      ...prev,
      [key]: numericValue,
    }));
    let updatedDataToSend =
      isDeafaultObject && numericValue !== "default"
        ? {
            configuration: {
              [key]: {
                [numericValue?.key]: numericValue[numericValue?.key],
              },
            },
          }
        : {
            configuration: {
              [key]: numericValue,
            },
          };
    if (numericValue !== configuration?.[key]) {
      dispatch(
        updateBridgeVersionAction({
          bridgeId: params?.id,
          versionId: searchParams?.version,
          dataToSend: updatedDataToSend,
        })
      );
    }
  };

  const handleDropdownChange = useCallback(
    (value, key) => {
      const newValue = value ? value : null;
      const updatedDataToSend = {
        configuration: {
          [key]: newValue,
        },
      };
      dispatch(
        updateBridgeVersionAction({
          bridgeId: params?.id,
          versionId: searchParams?.version,
          dataToSend: updatedDataToSend,
        })
      );
    },
    [dispatch, params?.id, searchParams?.version]
  );

  // Helper function to render parameter fields
  const renderParameterField = (key, { field, min = 0, max, step, default: defaultValue, options }) => {
    const isDeafaultObject = typeof modelInfoData?.[key]?.default === "object";
    if (KEYS_NOT_TO_DISPLAY?.includes(key)) return null;
    if (key === "response_type" && isEmbedUser && !showResponseType) {
      return null;
    }

    const name = ADVANCED_BRIDGE_PARAMETERS?.[key]?.name || key;
    const description = ADVANCED_BRIDGE_PARAMETERS?.[key]?.description || "";
    const isDefaultValue = configuration?.[key] === "default";
    const inputSizeClass = "input-sm h-8";
    const selectSizeClass = "select-sm h-8";
    const buttonSizeClass = "btn-sm h-8";
    const rangeSizeClass = "range-xs";
    const labelTextClass = "text-sm font-medium text-base-content/70";
    const sliderValueId = `sliderValue-${key} h-2`;

    let error = false;
    if (field === "slider" && !isDefaultValue) {
      error =
        !(min <= configuration?.[key] && configuration?.[key] <= max) && configuration?.["key"]?.type === "string";
    }

    const sliderDisplayValue =
      field === "slider" && !isDefaultValue
        ? configuration?.[key] === "min" || configuration?.[key] === "max" || configuration?.[key] === "default"
          ? modelInfoData?.[key]?.[configuration?.[key]]
          : configuration?.[key]
        : null;

    const sliderValueNode =
      !isDefaultValue && sliderDisplayValue !== null ? (
        <span className={`text-xs ${error ? "text-error" : "text-base-content/70"}`} id={sliderValueId}>
          {sliderDisplayValue}
        </span>
      ) : null;

    // Detect if this is level 2 by checking if we're in compact mode or level 2 context
    const isLevel2 = level === 2 || compact;

    return (
      <div
        key={key}
        id={`advanced-param-field-${key}`}
        className={`group w-full max-w-md ${isLevel2 ? "space-y-1" : "space-y-2"}`}
      >
        <div className="flex items-center justify-between gap-2 mb-1 min-h-[32px]">
          <div className="flex items-center gap-2">
            <span className={labelTextClass}>{name || key}</span>
            {description && (
              <InfoTooltip tooltipContent={description}>
                <CircleQuestionMark size={14} className="text-gray-500 hover:text-gray-700 cursor-help" />
              </InfoTooltip>
            )}
            {field === "boolean" && (
              <input
                id={`advanced-param-checkbox-${key}`}
                name={key}
                type="checkbox"
                className="checkbox checkbox-xs"
                checked={isDefaultValue ? true : inputConfiguration?.[key] || false}
                onChange={(e) => {
                  if (isDefaultValue) {
                    setSliderValue(e.target.checked, key, isDeafaultObject);
                  }
                  handleInputChange(e, key);
                }}
                disabled={isReadOnly}
              />
            )}
          </div>
          <div className="w-[110px] flex justify-end flex-shrink-0 min-h-[32px]">
            {!isDefaultValue && (
              <button
                id={`advanced-param-reset-${key}`}
                type="button"
                className="text-xs text-base-content/60 hover:text-base-content cursor-pointer px-3 py-1 rounded hover:bg-base-200 transition-colors whitespace-nowrap inline-block"
                onClick={() => setSliderValue("default", key, isDeafaultObject)}
                disabled={isReadOnly}
                title="Reset to default value"
              >
                Set Default
              </button>
            )}
          </div>
        </div>

        {field !== "boolean" && (
          <div className="flex items-center gap-2 w-full">
            {/* Text input */}
            {field === "text" && (
              <input
                id={`advanced-param-text-${key}`}
                type="text"
                value={isDefaultValue ? "default" : inputConfiguration?.[key] || ""}
                onFocus={(e) => {
                  if (isDefaultValue) {
                    setSliderValue("", key, isDeafaultObject);
                  }
                }}
                onChange={(e) => {
                  setInputConfiguration((prev) => ({
                    ...prev,
                    [key]: e.target.value,
                  }));
                }}
                onBlur={(e) => {
                  handleInputChange(e, key);
                }}
                className={`input border-base-200 ${inputSizeClass} w-full bg-base-300 text-base-content/70 text-sm`}
                name={key}
                disabled={isReadOnly}
                placeholder=""
              />
            )}

            {/* Number input */}
            {field === "number" && (
              <input
                id={`advanced-param-number-${key}`}
                type="number"
                min={min}
                max={max}
                step={step}
                value={isDefaultValue ? "default" : inputConfiguration?.[key] || 0}
                onChange={(e) => {
                  setInputConfiguration((prev) => ({
                    ...prev,
                    [key]: e.target.value,
                  }));
                }}
                onBlur={(e) => {
                  handleInputChange(e, key);
                }}
                className={`input border-base-200 ${inputSizeClass} w-full bg-base-300 text-base-content/70 text-sm`}
                name={key}
                disabled={isReadOnly}
              />
            )}

            {/* Select input */}
            {field === "select" && (
              <select
                id={`advanced-param-select-${key}`}
                value={isDefaultValue ? "default" : configuration?.[key]?.[defaultValue?.key] || configuration?.[key]}
                onChange={(e) => handleSelectChange(e, key, defaultValue, "{}", isDeafaultObject)}
                className={`select ${selectSizeClass} w-full bg-base-300 border-base-200 text-base-content/70 text-sm`}
                name={key}
                disabled={isReadOnly}
              >
                {isDefaultValue && <option value="default">default</option>}
                {options?.map((option) => (
                  <option
                    key={typeof option === "object" ? option?.value || option?.type : option}
                    value={typeof option === "object" ? option?.value || option?.type : option}
                  >
                    {typeof option === "object" ? option?.displayName || option?.type || option?.value : option}
                  </option>
                ))}
              </select>
            )}
            {/* Slider input */}
            {field === "slider" && (
              <div className="flex items-center gap-2 w-full">
                <button
                  id={`advanced-param-slider-min-btn-${key}`}
                  type="button"
                  className={`btn ${buttonSizeClass} btn-ghost border border-base-content/20`}
                  disabled={isReadOnly}
                  onClick={() => {
                    if (isDefaultValue) {
                      setSliderValue(min || 0, key, isDeafaultObject);
                    } else {
                      setSliderValue("min", key);
                    }
                  }}
                >
                  Min
                </button>
                {sliderValueNode}
                <input
                  id={`advanced-param-slider-${key}`}
                  type="range"
                  min={min || 0}
                  max={max || 100}
                  step={step || 1}
                  key={`${key}-${configuration?.[key]}-${service}-${model}`}
                  defaultValue={isDefaultValue ? "default" : (sliderDisplayValue ?? "")}
                  onChange={(e) => {
                    // Only update the display value and local state, don't trigger API call
                    const numValue = String(e.target.value)?.includes(".")
                      ? parseFloat(e.target.value)
                      : parseInt(e.target.value, 10);
                    setInputConfiguration((prev) => ({
                      ...prev,
                      [key]: numValue,
                    }));
                    const el = document.getElementById(sliderValueId);
                    if (el) el.innerText = e.target.value;
                  }}
                  onMouseUp={(e) => {
                    // Trigger API call when user releases mouse
                    debouncedInputChange(e, key, true);
                  }}
                  onTouchEnd={(e) => {
                    // Trigger API call when user releases touch
                    debouncedInputChange(e, key, true);
                  }}
                  className={`range range-accent h-2 rounded-full ${rangeSizeClass} flex-1`}
                  name={key}
                  disabled={isReadOnly}
                />
                <button
                  id={`advanced-param-slider-max-btn-${key}`}
                  type="button"
                  className={`btn ${buttonSizeClass} btn-ghost border border-base-content/20 text-sm`}
                  disabled={isReadOnly}
                  onClick={() => {
                    if (isDefaultValue) {
                      setSliderValue(max || 100, key, isDeafaultObject);
                    } else {
                      setSliderValue("max", key);
                    }
                  }}
                >
                  Max
                </button>
              </div>
            )}

            {/* Dropdown input */}
            {field === "dropdown" && (
              <div id={`advanced-param-dropdown-wrapper-${key}`} className="relative w-full" ref={dropdownContainerRef}>
                <div
                  id={`advanced-param-dropdown-trigger-${key}`}
                  className={`flex items-center gap-2 input input-bordered ${inputSizeClass} w-full min-h-[2rem] cursor-pointer`}
                  disabled={isReadOnly}
                  onClick={() => !isReadOnly && setShowDropdown(!showDropdown)}
                >
                  <span className="truncate text-sm">
                    {isDefaultValue
                      ? "default"
                      : selectedOptions?.length > 0
                        ? integrationData?.[selectedOptions?.[0]?.name]?.title || selectedOptions?.[0]?.name
                        : "Select a tool choice option..."}
                  </span>
                  <div className="ml-auto">
                    {showDropdown ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />}
                  </div>
                </div>

                {showDropdown && (
                  <div
                    id={`advanced-param-dropdown-menu-${key}`}
                    className="absolute top-full left-0 right-0 bg-base-300 border border-base-200 rounded-md shadow-lg z-50 max-h-[200px] overflow-y-auto mt-1 p-2"
                  >
                    <div className="p-2 top-0 bg-base-100">
                      <input
                        id={`advanced-param-dropdown-search-${key}`}
                        type="text"
                        placeholder="Search functions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`input input-bordered ${inputSizeClass} w-full`}
                        disabled={isReadOnly}
                      />
                    </div>
                    {/* Static options (auto, none, required) */}
                    {options &&
                      options.map((option) => (
                        <div
                          id={`advanced-param-dropdown-option-${key}-${option}`}
                          key={option}
                          className="p-2 hover:bg-base-200 cursor-pointer max-h-[80px] overflow-y-auto"
                          onClick={() => {
                            setSelectedOptions([{ name: option, id: option }]);
                            handleDropdownChange(option, key);
                            setShowDropdown(false);
                          }}
                        >
                          <label className="flex items-center gap-2">
                            <input
                              id={`advanced-param-dropdown-option-radio-${key}-${option}`}
                              type="radio"
                              name="function-select"
                              checked={selectedOptions?.some((opt) => opt?.name === option)}
                              className="radio radio-xs"
                              disabled={isReadOnly}
                            />
                            <span className="font-medium text-xs">{option}</span>
                            <span className="text-gray-500 text-xs">
                              {option === "none"
                                ? "Model won't call a function; it will generate a message."
                                : option === "auto"
                                  ? "Model can generate a response or call a function."
                                  : "One or more specific functions must be called"}
                            </span>
                          </label>
                        </div>
                      ))}

                    {/* Tools Section */}
                    {version_function_data && Object.values(version_function_data).length > 0 && (
                      <>
                        <div className="px-2 py-1 top-0 z-10">
                          <span className="text-xs font-semibold text-base-content/70">TOOLS</span>
                        </div>
                        {Object.values(version_function_data)
                          .filter((func) => {
                            const funcName = func?.script_id || func?.title || "";
                            return funcName.toLowerCase().includes(searchQuery.toLowerCase());
                          })
                          .map((func) => (
                            <div
                              key={func?._id}
                              className="p-2 hover:bg-base-200 cursor-pointer"
                              onClick={() => {
                                setSelectedOptions([{ name: func?.title, id: func?._id }]);
                                handleDropdownChange(func?._id, key);
                                setShowDropdown(false);
                              }}
                            >
                              <label
                                id={`advanced-param-dropdown-tool-label-${key}-${func?._id}`}
                                className="flex items-center gap-2"
                              >
                                <input
                                  id={`advanced-param-dropdown-tool-radio-${key}-${func?._id}`}
                                  type="radio"
                                  name="function-select"
                                  checked={selectedOptions?.some((opt) => opt?.id === func?._id)}
                                  className="radio radio-xs"
                                  disabled={isReadOnly}
                                />
                                <span className="font-medium text-xs">
                                  {integrationData?.[func?.script_id]?.title || func?.title}
                                </span>
                              </label>
                            </div>
                          ))}
                      </>
                    )}

                    {/* Agents Section */}
                    {connected_agents && Object.keys(connected_agents).length > 0 && (
                      <>
                        <div className="px-2 py-1 top-0 z-10">
                          <span className="text-xs font-semibold text-base-content/70">AGENTS</span>
                        </div>
                        {Object.entries(connected_agents)
                          .filter(([name, agent]) => {
                            return name.toLowerCase().includes(searchQuery.toLowerCase());
                          })
                          .map(([name, agent]) => (
                            <div
                              key={agent.bridge_id}
                              className="p-2 hover:bg-base-200 cursor-pointer"
                              onClick={() => {
                                setSelectedOptions([{ name, id: agent.bridge_id }]);
                                handleDropdownChange(agent.bridge_id, key);
                                setShowDropdown(false);
                              }}
                            >
                              <label
                                id={`advanced-param-dropdown-agent-label-${key}-${agent.bridge_id}`}
                                className="flex items-center gap-2"
                              >
                                <input
                                  id={`advanced-param-dropdown-agent-radio-${key}-${agent.bridge_id}`}
                                  type="radio"
                                  name="function-select"
                                  checked={selectedOptions?.some((opt) => opt?.id === agent.bridge_id)}
                                  className="radio radio-xs"
                                  disabled={isReadOnly}
                                />
                                <span className="font-medium text-xs">{name}</span>
                              </label>
                            </div>
                          ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* JSON Schema textarea and modal - positioned below the key/label */}
        {field === "select" && !isDefaultValue && configuration?.[key]?.type === "json_schema" && (
          <div id={`advanced-param-json-schema-${key}`} className="mt-3 space-y-2">
            <div id={`advanced-param-json-schema-header-${key}`} className="flex justify-between items-center">
              <div className="flex gap-2 mt-4 ml-auto">
                <span
                  className="label-text capitalize font-medium bg-gradient-to-r from-blue-800 to-orange-600 text-transparent bg-clip-text cursor-pointer hover:opacity-80 transition-opacity text-xs"
                  onClick={() => {
                    openModal(MODAL_TYPE.JSON_SCHEMA_BUILDER);
                  }}
                >
                  Build Visually
                </span>
                <span className="text-xs text-base-content/50">|</span>
                <span
                  className="label-text capitalize font-medium bg-gradient-to-r from-blue-800 to-orange-600 text-transparent bg-clip-text cursor-pointer hover:opacity-80 transition-opacity text-xs"
                  onClick={() => {
                    openModal(MODAL_TYPE.JSON_SCHEMA);
                  }}
                >
                  Build with AI
                </span>
              </div>
            </div>

            <textarea
              id={`advanced-param-json-schema-textarea-${key}`}
              key={`${key}-${configuration?.[key]}-${objectFieldValue}-${configuration}`}
              type="input"
              defaultValue={objectFieldValue || JSON.stringify(configuration?.[key]?.value || {}, null, 2)}
              onBlur={(e) => {
                setObjectFieldValue(e.target.value);
                try {
                  const parsedValue = JSON.parse(e.target.value);
                  handleSelectChange({ target: { value: "json_schema" } }, key, defaultValue, parsedValue, true);
                } catch (error) {
                  console.error(error);
                  toast.error("Invalid JSON schema");
                }
              }}
              className="textarea textarea-bordered w-full h-32 font-mono text-xs"
              placeholder="Enter JSON schema..."
              disabled={isReadOnly}
            />
            <JsonSchemaBuilderModal params={params} searchParams={searchParams} isReadOnly={isReadOnly} />
            <JsonSchemaModal
              params={params}
              searchParams={searchParams}
              messages={messages}
              setMessages={setMessages}
              thread_id={thread_id}
              onResetThreadId={() => {
                const newId = generateRandomID();
                setThreadId(newId);
                setThreadIdForVersionReducer &&
                  dispatch(
                    setThreadIdForVersionReducer({
                      bridgeId: params?.id,
                      versionId: searchParams?.version,
                      thread_id: newId,
                    })
                  );
              }}
            />
          </div>
        )}
      </div>
    );
  };

  const shouldShowLevel1 = level1Parameters.length > 0 && (!isEmbedUser || (isEmbedUser && !hideAdvancedParameters));

  if (level === 2) {
    if (level2Parameters.length === 0) {
      return null;
    }

    return (
      <div
        id="advanced-param-level2-container"
        className={`z-very-low mt-2 text-base-content w-full ${className}`}
        tabIndex={0}
      >
        {/* Level 2 Parameters - Displayed Outside Accordion */}
        {level2Parameters.length > 0 && (
          <div className="w-full gap-4 flex flex-col px-2 py-2 cursor-default items-start">
            {level2Parameters.map(([key, paramConfig]) => (
              <div key={key} className="compact-parameter w-full">
                {renderParameterField(key, paramConfig)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (level === 1) {
    if (!shouldShowLevel1) {
      return null;
    }

    // Level 1 parameters now render without accordion
    return (
      <div
        id="advanced-param-level1-container"
        className={`z-very-low mt-4 text-base-content w-full ${className}`}
        tabIndex={0}
      >
        {tutorialState.showSuggestion && (
          <TutorialSuggestionToast
            id="advanced-param-tutorial-suggestion"
            setTutorialState={setTutorialState}
            flagKey={"AdvanceParameter"}
            TutorialDetails={"Advanced Parameters"}
          />
        )}
        {tutorialState.showTutorial && (
          <OnBoarding
            setShowTutorial={() => setTutorialState((prev) => ({ ...prev, showTutorial: false }))}
            video={getAdvanceParameterVideo()}
            flagKey={"AdvanceParameter"}
          />
        )}
        <div className={`w-full flex flex-col ${compact ? "gap-3" : "gap-4"} items-start`}>
          {level1Parameters.map(([key, paramConfig]) => (
            <div key={key} className="w-full">
              {renderParameterField(key, paramConfig)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
};

export default AdvancedParameters;
