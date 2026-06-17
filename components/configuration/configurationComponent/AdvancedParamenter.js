import { useCustomSelector } from "@/customHooks/customSelector";
import { updateBridgeVersionAction } from "@/store/action/bridgeAction";
import { MODAL_TYPE } from "@/utils/enums";
import useTutorialVideos from "@/hooks/useTutorialVideos";
import { generateRandomID, getToolName, openModal, closeModal, trimPropertyNames } from "@/utils/utility";
import { buildJsonSchemaResponseType, generateCombinedSchema, isEmptyJsonSchema } from "@/utils/defaultJsonSchemas";
import { ChevronDownIcon, ChevronUpIcon, SettingsIcon } from "@/components/Icons";
import JsonSchemaModal from "@/components/modals/JsonSchemaModal";
import JsonSchemaBuilderModal from "@/components/modals/JsonSchemaBuilderModal";
import React, { useEffect, useState, useCallback, useRef, useSyncExternalStore } from "react";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import OnBoarding from "@/components/OnBoarding";
import TutorialSuggestionToast from "@/components/TutorialSuggestoinToast";
import InfoTooltip from "@/components/InfoTooltip";
import { setThreadIdForVersionReducer } from "@/store/reducer/bridgeReducer";
import { Check, CircleQuestionMark, CircleX, ExternalLink } from "lucide-react";
import RenderNode from "@/components/richUI/RenderNode";
import FullscreenEditorModal, { FullscreenEditorButton } from "@/components/modals/FullscreenEditorModal";
import { useConfigurationContext } from "../ConfigurationContext";
import CodeMirror from "@uiw/react-codemirror";
import { json, jsonParseLinter } from "@codemirror/lang-json";
import { useThemeManager } from "@/customHooks/useThemeManager";
import ConfirmationModal from "@/components/UI/ConfirmationModal";
import unsavedPromptGuard from "@/utils/unsavedPromptGuard";
import { linter, lintGutter } from "@codemirror/lint";

const AdvancedParameters = ({
  params,
  searchParams,
  isEmbedUser,
  showAdvancedParameters,
  className = "",
  level = 1,
  compact = false,
  isPublished = false,
  isEditor = true,
}) => {
  const isReadOnly = isPublished || !isEditor;
  const { discardPromptDraft } = useConfigurationContext();
  const hasUnsavedChanges = useSyncExternalStore(
    unsavedPromptGuard.subscribe.bind(unsavedPromptGuard),
    unsavedPromptGuard.getSnapshot.bind(unsavedPromptGuard)
  );
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
  const [activeWidgetButtons, setActiveWidgetButtons] = useState([]);
  const [jsonSchemaFullscreen, setJsonSchemaFullscreen] = useState(false);
  const [responseTypePickerOpen, setResponseTypePickerOpen] = useState(false);
  const [jsonSchemaError, setJsonSchemaError] = useState(null);
  const [jsonSchemaErrorExpanded, setJsonSchemaErrorExpanded] = useState(false);
  const [isErrorTruncated, setIsErrorTruncated] = useState(false);
  const errorTextRef = useRef(null);
  const lastSubmittedSchemaRef = useRef(null);
  const dropdownContainerRef = useRef(null);
  const responseTypePickerRef = useRef(null);

  useEffect(() => {
    if (!responseTypePickerOpen) return;
    const handleClickOutside = (e) => {
      if (responseTypePickerRef.current && !responseTypePickerRef.current.contains(e.target)) {
        setResponseTypePickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [responseTypePickerOpen]);
  const dispatch = useDispatch();
  const router = useRouter();
  const { actualTheme } = useThemeManager();

  // Pending action ref for unsaved-prompt guard on response_type changes
  const pendingResponseTypeActionRef = useRef(null);

  /** Run `action` immediately, or show the unsaved-prompt guard modal first. */
  const guardedResponseTypeAction = (action) => {
    if (unsavedPromptGuard.hasUnsavedChanges) {
      pendingResponseTypeActionRef.current = action;
      openModal(MODAL_TYPE.UNSAVED_PROMPT_SCHEMA_MODAL);
    } else {
      action();
    }
  };

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
    bridgeType,
    richUiWidgets,
    showResponseType,
    orgBridges,
    allBridgesMap,
  } = useCustomSelector((state) => {
    const versionData = state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[searchParams?.version];
    const bridgeDataFromState = state?.bridgeReducer?.allBridgesMap?.[params?.id];
    const integrationData = state?.bridgeReducer?.org?.[params?.org_id]?.integrationData || {};
    const orgBridges = state?.bridgeReducer?.org?.[params?.org_id]?.orgs || [];
    const allBridgesMap = state?.bridgeReducer?.allBridgesMap || {};

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
      bridgeType: bridgeDataFromState?.bridgeType || "",
      richUiWidgets: state?.richUiTemplateReducer?.templates || [],
      showResponseType: state.appInfoReducer.embedUserDetails.showResponseType,
      orgBridges,
      allBridgesMap,
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
      // Get level from ADVANCED_BRIDGE_PARAMETERS or default to 1
      const paramLevel = paramConfig?.level ?? 1;
      return paramLevel === level;
    });
  };

  const level1Parameters = getParametersByLevel(1); // Regular parameters (not in accordion)
  const level2Parameters = getParametersByLevel(2); // Outside accordion parameters
  useEffect(() => {
    const schema = configuration?.response_type?.json_schema;
    setObjectFieldValue(!isEmptyJsonSchema(schema) ? JSON.stringify(schema, undefined, 4) : null);
    // Reset the last submitted ref when the schema changes externally (e.g. loaded from server)
    lastSubmittedSchemaRef.current = !isEmptyJsonSchema(schema) ? JSON.stringify(schema) : null;
  }, [configuration?.response_type?.json_schema]);

  useEffect(() => {
    if (errorTextRef.current && !jsonSchemaErrorExpanded) {
      const element = errorTextRef.current;
      const isTruncated = element.scrollHeight > element.clientHeight;
      setIsErrorTruncated(isTruncated);
    }
  }, [jsonSchemaError, jsonSchemaErrorExpanded]);

  const getJsonSchemaEditorValue = (paramKey) => {
    if (objectFieldValue != null) return objectFieldValue;
    const schema = configuration?.[paramKey]?.json_schema ?? configuration?.[paramKey]?.value;
    return !isEmptyJsonSchema(schema) ? JSON.stringify(schema, null, 2) : "";
  };

  const dispatchResponseTypeUpdate = async (responseTypePayload, { localOnly = false } = {}) => {
    const result = await dispatch(
      updateBridgeVersionAction({
        bridgeId: params?.id,
        versionId: searchParams?.version,
        dataToSend: {
          configuration: { response_type: responseTypePayload },
        },
        localOnly,
        skipRollback: true,
      })
    );
    return result;
  };

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
              name: integrationData?.[value?.script_id]?.title || value?.title,
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
            .map(([id, item]) => ({
              name: getToolName(item.bridge_id, allBridgesMap, orgBridges, integrationData),
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

  const handleSelectChange = async (e, key, defaultValue, Objectvalue = {}, isDeafaultObject = true) => {
    let newValue;
    try {
      // Check if Objectvalue is already an object or needs parsing
      if (typeof Objectvalue === "string") {
        newValue = Objectvalue ? JSON.parse(Objectvalue) : {};
      } else {
        newValue = Objectvalue || {};
      }
      if (!isEmptyJsonSchema(newValue)) {
        setObjectFieldValue(JSON.stringify(newValue, undefined, 4));
      } else {
        setObjectFieldValue(null);
      }
    } catch (error) {
      console.error("JSON parsing error in handleSelectChange:", error);
      toast.error("Invalid JSON provided");
      return { success: false, error: error?.message || "Invalid JSON provided" };
    }
    const existingValue =
      typeof configuration?.[key] === "object" && configuration?.[key] !== null ? configuration?.[key] : {};

    const parsedObjectValue = typeof newValue === "string" ? JSON.parse(newValue) : newValue;
    const typeKey = defaultValue?.key || "type";
    if (e.target.value === "json_schema") {
      if (isEmptyJsonSchema(parsedObjectValue)) {
        const hadPersistedSchema = !isEmptyJsonSchema(configuration?.response_type?.json_schema);
        return await dispatchResponseTypeUpdate(
          buildJsonSchemaResponseType({
            is_template: existingValue?.is_template ?? false,
            template_id: existingValue?.template_id,
          }),
          { localOnly: !hadPersistedSchema }
        );
      }

      return await dispatchResponseTypeUpdate(
        buildJsonSchemaResponseType({
          json_schema: parsedObjectValue,
          is_template: existingValue?.is_template ?? false,
          template_id: existingValue?.template_id,
        })
      );
    }

    let updatedDataToSend = isDeafaultObject
      ? {
          configuration: {
            [key]: {
              ...existingValue,
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
            ...existingValue,
            [typeKey]: e.target.value,
            [e.target.value]: parsedObjectValue,
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
          dataToSend: { ...updatedDataToSend },
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
          dataToSend: { ...updatedDataToSend },
        })
      );
    },
    [dispatch, params?.id, searchParams?.version]
  );

  // State for selected widgets (indices)
  const [selectedWidgets, setSelectedWidgets] = useState([]);

  useEffect(() => {
    if (configuration?.response_type?.template_id && Array.isArray(configuration.response_type.template_id)) {
      setSelectedWidgets(configuration.response_type.template_id);
    } else {
      setSelectedWidgets([]);
    }
  }, [configuration?.response_type?.template_id]);

  const widgetHasButton = useCallback((widgetObj) => {
    const template = widgetObj?.ui || widgetObj?.template_format;
    if (!template) return false;
    const search = (node) => {
      if (!node || typeof node !== "object") return false;
      if (Array.isArray(node)) return node.some(search);
      if (node.type === "Button") return true;
      if (Array.isArray(node.children)) return node.children.some(search);
      return false;
    };
    return search(template);
  }, []);

  // filterWidgetId: when provided, only returns actionData nodes from the anyOf entry
  // whose widget_id.enum[0] matches this id (i.e. only this widget's nodes).
  const extractActionDataNodesFromSchema = useCallback((schemaNode, filterWidgetId = null) => {
    const nodes = [];

    const search = (node, path = []) => {
      if (!node || typeof node !== "object") return;

      // Traverse anyOf / oneOf / allOf so combined schemas are handled
      for (const combinator of ["anyOf", "oneOf", "allOf"]) {
        if (Array.isArray(node[combinator])) {
          node[combinator].forEach((subNode, index) => {
            // If filtering by widget, skip anyOf entries that belong to a different widget
            if (
              filterWidgetId &&
              subNode?.properties?.widget_id?.enum?.[0] !== undefined &&
              subNode.properties.widget_id.enum[0] !== filterWidgetId
            ) {
              return;
            }
            search(subNode, [...path, combinator, index]);
          });
        }
      }

      if (node.type === "object" && node.properties) {
        const actionKey = node.properties.actionData
          ? "actionData"
          : node.properties.action_data
            ? "action_data"
            : null;

        if (actionKey && node.properties[actionKey].properties?.data) {
          let label = "action";
          for (let i = path.length - 1; i >= 0; i--) {
            const seg = path[i];
            if (typeof seg === "string" && !["properties", "items", "anyOf", "oneOf", "allOf"].includes(seg)) {
              label = seg;
              break;
            }
          }
          nodes.push({ key: path.join("."), label, actionDataKey: actionKey, path });
        }

        // Also detect inline action-type pattern: a property that is an object with
        // { type (string enum of action types), value, data } — e.g. applyActionType, cancelActionType
        Object.entries(node.properties).forEach(([k, v]) => {
          if (
            v?.type === "object" &&
            v?.properties?.type?.enum?.length > 0 &&
            v?.properties?.data &&
            v?.properties?.value !== undefined
          ) {
            nodes.push({
              key: [...path, "properties", k].join("."),
              label: k,
              actionDataKey: k,
              path: [...path, "properties", k],
              isInlineActionType: true,
            });
          }
        });

        Object.entries(node.properties).forEach(([k, v]) => {
          search(v, [...path, "properties", k]);
        });
      } else if (node.type === "array" && node.items) {
        search(node.items, [...path, "items"]);
      }
    };

    const rootSchema = schemaNode?.schema || schemaNode;
    if (rootSchema) search(rootSchema);

    const seen = new Set();
    return nodes.filter((n) => {
      if (seen.has(n.key)) return false;
      seen.add(n.key);
      return true;
    });
  }, []);
  // Helper function to render parameter fields
  const renderParameterField = (
    key,
    { field, min = 0, max, step, default: defaultValue, options, name, description }
  ) => {
    const isDeafaultObject = typeof modelInfoData?.[key]?.default === "object";
    if (key === "response_type" && isEmbedUser && !showResponseType) {
      return null;
    }

    // Use name and description from modelInfoData instead of static file
    const displayName = name || modelInfoData?.[key]?.name || key;
    const displayDescription = description || modelInfoData?.[key]?.description || "";
    const isDefaultValue = configuration?.[key] === "default" || configuration?.[key] === undefined;
    // Check if this parameter has a default value defined in model info
    const hasDefaultValue = modelInfoData?.[key]?.default !== undefined;
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
            <span className={labelTextClass}>{displayName}</span>
            {displayDescription && (
              <InfoTooltip tooltipContent={displayDescription}>
                <CircleQuestionMark size={14} className="text-gray-500 hover:text-gray-700 cursor-help" />
              </InfoTooltip>
            )}
            {field === "boolean" &&
              (() => {
                const modelDefault = modelInfoData?.[key]?.default;
                const checkedValue = isDefaultValue ? !!modelDefault : inputConfiguration?.[key] || false;
                return (
                  <input
                    autoComplete="off"
                    data-testid={`advanced-param-checkbox-${key}`}
                    id={`advanced-param-checkbox-${key}`}
                    name={key}
                    type="checkbox"
                    className="checkbox checkbox-xs"
                    checked={checkedValue}
                    onChange={(e) => {
                      if (isDefaultValue) {
                        setSliderValue(e.target.checked, key, isDeafaultObject);
                      } else {
                        handleInputChange(e, key);
                      }
                    }}
                    disabled={isReadOnly}
                  />
                );
              })()}
          </div>
          {/* response_type: dropdown to add/change/remove the response type inline with the label */}
          {key === "response_type" &&
            !isReadOnly &&
            (() => {
              const currentType = configuration?.[key]?.is_template ? "widget" : configuration?.[key]?.type;
              const hasType =
                currentType === "text" ||
                currentType === "json_schema" ||
                currentType === "json_object" ||
                currentType === "widget";
              const bridgeKind = bridgeType?.toString()?.toLowerCase();
              const typeLabels = {
                text: "Text",
                json_schema: "JSON Schema",
                json_object: "JSON Schema",
                widget: "Widget",
              };
              const applySelection = (selectedValue) => {
                setResponseTypePickerOpen(false);
                guardedResponseTypeAction(() => {
                  if (selectedValue === "remove") {
                    setSliderValue("default", key, isDeafaultObject);
                    return;
                  }
                  if (selectedValue === "widget") {
                    const defaultSchema = generateCombinedSchema([], richUiWidgets);
                    dispatch(
                      updateBridgeVersionAction({
                        bridgeId: params?.id,
                        versionId: searchParams?.version,
                        dataToSend: {
                          configuration: {
                            response_type: {
                              type: "json_schema",
                              json_schema: defaultSchema,
                              is_template: true,
                              template_id: [],
                            },
                          },
                        },
                      })
                    );
                  } else if (selectedValue === "json_schema") {
                    setObjectFieldValue(null);
                    dispatchResponseTypeUpdate(buildJsonSchemaResponseType({ is_template: false }), {
                      localOnly: true,
                    });
                  } else if (selectedValue === "text") {
                    dispatch(
                      updateBridgeVersionAction({
                        bridgeId: params?.id,
                        versionId: searchParams?.version,
                        dataToSend: {
                          configuration: {
                            response_type: { type: "text", text: "" },
                          },
                        },
                      })
                    );
                  }
                });
              };
              const triggerLabel = hasType ? (
                <>
                  {typeLabels[currentType] || currentType}
                  <ChevronDownIcon size={12} />
                </>
              ) : (
                <>
                  <span className="text-base leading-none">+</span> Add
                </>
              );
              return (
                <div
                  ref={responseTypePickerRef}
                  className={`dropdown dropdown-end ${responseTypePickerOpen ? "dropdown-open" : ""}`}
                >
                  <button
                    type="button"
                    tabIndex={0}
                    data-testid={`advanced-param-add-response-type-${key}`}
                    className={`btn btn-xs gap-1 ${hasType ? "btn-outline" : "btn-outline"}`}
                    onClick={() => setResponseTypePickerOpen((v) => !v)}
                  >
                    {triggerLabel}
                  </button>
                  {responseTypePickerOpen && (
                    <ul
                      tabIndex={0}
                      className="dropdown-content z-[60] p-0 mt-1 shadow-lg bg-base-100 rounded-md border border-base-300 w-44 overflow-hidden"
                    >
                      {[
                        { value: "text", label: "Text", isActive: currentType === "text" },
                        {
                          value: "json_schema",
                          label: "JSON Schema",
                          isActive: currentType === "json_schema" || currentType === "json_object",
                        },
                        ...(bridgeKind === "chatbot" && !isEmbedUser
                          ? [{ value: "widget", label: "Widget", isActive: !!configuration?.[key]?.is_template }]
                          : []),
                      ].map((opt) => (
                        <li key={opt.value} className="border-b border-base-200">
                          <button
                            type="button"
                            className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-base-200 ${
                              opt.isActive ? "bg-primary/10 text-primary font-medium" : ""
                            }`}
                            onClick={() => applySelection(opt.value)}
                          >
                            <span>{opt.label}</span>
                            {opt.isActive && <Check size={14} className="text-primary" />}
                          </button>
                        </li>
                      ))}
                      {hasType && (
                        <li>
                          <button
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm text-error hover:bg-error/10"
                            onClick={() => applySelection("remove")}
                          >
                            Remove
                          </button>
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              );
            })()}
          {/* Set Default button - shows when parameter has default value and is not currently default */}
          {key !== "response_type" && hasDefaultValue && !isDefaultValue && !isReadOnly && (
            <button
              data-testid={`advanced-param-reset-${key}`}
              id={`advanced-param-set-default-btn-${key}`}
              type="button"
              className="btn btn-xs btn-ghost text-primary hover:bg-primary/10"
              onClick={() => {
                setSliderValue("default", key, isDeafaultObject);
              }}
              title="Reset to default value"
            >
              Set Default
            </button>
          )}
        </div>

        {field !== "boolean" && (
          <div className="flex items-center gap-2 w-full">
            {/* Text input */}
            {field === "text" && (
              <input
                autoComplete="off"
                data-testid={`advanced-param-text-${key}`}
                id={`advanced-param-text-${key}`}
                type="text"
                value={inputConfiguration?.[key] === "default" ? "" : inputConfiguration?.[key] || ""}
                onChange={(e) => {
                  setInputConfiguration((prev) => ({
                    ...prev,
                    [key]: e.target.value,
                  }));
                }}
                onBlur={(e) => {
                  if (e.target.value === "") {
                    setSliderValue("default", key, isDeafaultObject);
                  } else if (e.target.value !== configuration?.[key]) {
                    handleInputChange(e, key);
                  }
                }}
                className={`input border-base-200 ${inputSizeClass} w-full bg-base-300 text-base-content/70 text-sm`}
                name={key}
                disabled={isReadOnly}
                placeholder="default"
              />
            )}

            {/* Number input */}
            {field === "number" && (
              <input
                autoComplete="off"
                data-testid={`advanced-param-number-${key}`}
                id={`advanced-param-number-${key}`}
                type="number"
                min={min}
                max={max}
                step={step}
                value={isDefaultValue ? "" : inputConfiguration?.[key] || 0}
                onChange={(e) => {
                  setInputConfiguration((prev) => ({
                    ...prev,
                    [key]: e.target.value,
                  }));
                }}
                onBlur={(e) => {
                  if (e.target.value === "") {
                    setSliderValue("default", key, isDeafaultObject);
                  } else if (e.target.value !== configuration?.[key]?.toString()) {
                    handleInputChange(e, key);
                  }
                }}
                className={`input border-base-200 ${inputSizeClass} w-full bg-base-300 text-base-content/70 text-sm`}
                name={key}
                disabled={isReadOnly}
                placeholder="default"
              />
            )}

            {/* Select input */}
            {field === "select" && (
              <div className="w-full">
                {key !== "response_type" && (
                  <select
                    data-testid={`advanced-param-select-${key}`}
                    id={`advanced-param-select-${key}`}
                    value={(() => {
                      if (key === "response_type") {
                        // Handle response_type specifically
                        if (configuration?.[key]?.is_template) {
                          return "widget";
                        } else if (
                          configuration?.[key]?.type === "json_schema" ||
                          configuration?.[key]?.type === "json_object"
                        ) {
                          return "json_schema";
                        } else if (configuration?.[key]?.type) {
                          return configuration?.[key]?.type;
                        } else if (configuration?.[key] === "default") {
                          return "default";
                        } else {
                          return configuration?.[key] || "default";
                        }
                      }
                      // For other keys, use the original logic
                      return isDefaultValue
                        ? "default"
                        : configuration?.[key]?.[defaultValue?.key] || configuration?.[key];
                    })()}
                    onChange={(e) => {
                      const selectedValue = e.target.value;
                      if (key === "response_type") {
                        guardedResponseTypeAction(() => {
                          if (selectedValue === "widget") {
                            // Use generateCombinedSchema with empty array to get normal schema without anyOf
                            const defaultSchema = generateCombinedSchema([], richUiWidgets);
                            const updatedDataToSend = {
                              configuration: {
                                response_type: {
                                  type: "json_schema",
                                  json_schema: defaultSchema,
                                  is_template: true,
                                  template_id: [],
                                },
                              },
                            };
                            dispatch(
                              updateBridgeVersionAction({
                                bridgeId: params?.id,
                                versionId: searchParams?.version,
                                dataToSend: { ...updatedDataToSend },
                              })
                            );
                            return;
                          } else if (selectedValue === "json_schema") {
                            setObjectFieldValue(null);
                            dispatchResponseTypeUpdate(buildJsonSchemaResponseType({ is_template: false }), {
                              localOnly: true,
                            });
                            return;
                          } else if (selectedValue === "text") {
                            dispatch(
                              updateBridgeVersionAction({
                                bridgeId: params?.id,
                                versionId: searchParams?.version,
                                dataToSend: {
                                  configuration: {
                                    response_type: {
                                      type: "text",
                                      text: configuration?.response_type?.text || "",
                                    },
                                  },
                                },
                              })
                            );
                            return;
                          } else if (selectedValue === "default") {
                            // Handle default case
                            setSliderValue("default", key, isDeafaultObject);
                            return;
                          } else {
                            dispatch(
                              updateBridgeVersionAction({
                                bridgeId: params?.id,
                                versionId: searchParams?.version,
                                dataToSend: {
                                  configuration: {
                                    [key]: { type: selectedValue },
                                  },
                                },
                              })
                            );
                            return;
                          }
                        }); // end guardedResponseTypeAction
                        return;
                      }
                      // Fallback for other keys or normal types
                      handleSelectChange(e, key, defaultValue, "{}", isDeafaultObject);
                    }}
                    className={`select select-bordered ${selectSizeClass} w-full`}
                    name={key}
                    disabled={isReadOnly}
                  >
                    {hasDefaultValue && <option value="default">default</option>}
                    {(() => {
                      const rawOptions = Array.isArray(options) ? options : [];
                      if (key !== "response_type") {
                        return rawOptions.map((option) => (
                          <option
                            key={typeof option === "object" ? option?.value || option?.type : option}
                            value={typeof option === "object" ? option?.value || option?.type : option}
                          >
                            {typeof option === "object" ? option?.displayName || option?.type || option?.value : option}
                          </option>
                        ));
                      }

                      const bridgeKind = bridgeType?.toString()?.toLowerCase();
                      return (
                        <>
                          <option value="text">Text</option>
                          <option value="json_schema">JSON Schema</option>
                          {bridgeKind === "chatbot" && !isEmbedUser && <option value="widget">Widget</option>}
                        </>
                      );
                    })()}
                  </select>
                )}

                {/* Widget UI - Only show if response_type is widget (is_template = true) */}
                {key === "response_type" && configuration?.[key]?.is_template && (
                  <div className="mb-3 p-3 bg-base-200 rounded-lg mt-2">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium">Available Widgets:</div>
                        <button
                          type="button"
                          className="btn btn-xs btn-ghost gap-1 text-primary"
                          onClick={() => router.push(`/org/${params?.org_id}/widgets`)}
                          title="Manage Widgets"
                        >
                          <ExternalLink size={12} />
                          Manage
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {richUiWidgets.map((widgetObj) => {
                        const widgetName = widgetObj.name || `Widget`;
                        const isSelected = selectedWidgets.includes(widgetObj._id);

                        return (
                          <div
                            key={widgetObj._id}
                            className={`flex flex-col gap-2 p-3 rounded-lg border cursor-pointer transition-colors min-w-[280px] flex-shrink-0 ${isSelected ? "bg-primary/10 border-primary" : "bg-base-100 border-base-200 hover:bg-base-200"}`}
                            onClick={() => {
                              if (isReadOnly) return;

                              // Update selected widgets
                              const newSelectedWidgets = selectedWidgets.includes(widgetObj._id)
                                ? selectedWidgets.filter((id) => id !== widgetObj._id)
                                : [...selectedWidgets, widgetObj._id];

                              setSelectedWidgets(newSelectedWidgets);

                              // Apply changes immediately
                              const combinedSchema = generateCombinedSchema(newSelectedWidgets, richUiWidgets);

                              if (combinedSchema) {
                                const updatedDataToSend = {
                                  configuration: {
                                    response_type: {
                                      type: "json_schema",
                                      json_schema: combinedSchema,
                                      is_template: true,
                                      template_id: newSelectedWidgets,
                                    },
                                  },
                                };

                                dispatch(
                                  updateBridgeVersionAction({
                                    bridgeId: params?.id,
                                    versionId: searchParams?.version,
                                    dataToSend: { ...updatedDataToSend },
                                  })
                                );

                                toast.success(`Updated widgets (${newSelectedWidgets.length} selected)`);
                              }
                            }}
                          >
                            {/* Content Preview */}
                            <div className="relative w-full h-40 bg-base-100 rounded border border-base-300 overflow-hidden pointer-events-none mb-2">
                              {widgetObj.ui || widgetObj.template_format ? (
                                <div className="absolute inset-0 w-full h-full overflow-hidden p-2">
                                  <div className="transform scale-[0.5] origin-top-left w-[200%]">
                                    <RenderNode node={widgetObj.ui || widgetObj.template_format} />
                                  </div>
                                </div>
                              ) : widgetObj.html ? (
                                <div className="absolute inset-0 w-full h-full overflow-hidden">
                                  <div
                                    className="transform scale-[0.5] origin-top-left w-[200%]"
                                    dangerouslySetInnerHTML={{ __html: widgetObj.html }}
                                  />
                                </div>
                              ) : (
                                <div className="flex items-center justify-center h-full text-base-content/40 text-xs">
                                  No Preview
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between w-full mt-1">
                              <span className="text-sm font-medium capitalize truncate">{widgetName}</span>
                              <div className="flex items-center gap-2">
                                {isSelected && widgetHasButton(widgetObj) && (
                                  <span
                                    className="cursor-pointer text-primary hover:opacity-80 transition-opacity"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      guardedResponseTypeAction(() => {
                                        const actionNodes = extractActionDataNodesFromSchema(
                                          configuration?.response_type?.json_schema,
                                          widgetObj._id
                                        );
                                        setActiveWidgetButtons(actionNodes);
                                        openModal(MODAL_TYPE.BUTTON_SCHEMA_BUILDER);
                                      });
                                    }}
                                    title="Configure Button Payload Schema"
                                  >
                                    <SettingsIcon size={14} />
                                  </span>
                                )}
                                {isSelected && <Check className="w-5 h-5 text-primary shrink-0" />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Button Schema Builder Modal */}
                    <JsonSchemaBuilderModal
                      params={params}
                      searchParams={searchParams}
                      isReadOnly={isReadOnly}
                      schemaKey="json_schema"
                      modalId={MODAL_TYPE.BUTTON_SCHEMA_BUILDER}
                      title="Configure Button Payload Schema"
                      hideName
                      widgetButtons={activeWidgetButtons}
                    />
                  </div>
                )}
                {field === "select" &&
                  !isDefaultValue &&
                  key === "response_type" &&
                  configuration?.[key]?.type === "text" && (
                    <div
                      id={`advanced-param-example-output-${key}`}
                      data-testid={`advanced-param-example-output-${key}`}
                      className="mt-3 space-y-2"
                    >
                      <label className="text-xs font-medium block">Example Output</label>
                      <textarea
                        data-testid={`advanced-param-example-output-textarea-${key}`}
                        className="textarea textarea-bordered w-full text-xs font-mono"
                        rows={6}
                        placeholder="Enter an example output the model should produce..."
                        disabled={isReadOnly}
                        defaultValue={configuration?.[key]?.text ?? configuration?.[key]?.example_output ?? ""}
                        onBlur={(e) => {
                          const val = e.target.value;
                          const current = configuration?.[key]?.text ?? configuration?.[key]?.example_output ?? "";
                          if (val === current) return;
                          dispatch(
                            updateBridgeVersionAction({
                              bridgeId: params?.id,
                              versionId: searchParams?.version,
                              dataToSend: {
                                configuration: {
                                  response_type: { type: "text", text: val },
                                },
                              },
                            })
                          );
                        }}
                      />
                    </div>
                  )}
                {field === "select" &&
                  !isDefaultValue &&
                  (configuration?.[key]?.type === "json_schema" || configuration?.[key]?.type === "json_object") &&
                  !configuration?.[key]?.is_template && (
                    <div
                      id={`advanced-param-json-schema-${key}`}
                      data-testid={`advanced-param-json-schema-section-${key}`}
                      className="mt-3 space-y-2"
                    >
                      <div
                        id={`advanced-param-json-schema-header-${key}`}
                        data-testid={`advanced-param-json-schema-header-${key}`}
                        className="flex justify-between items-center"
                      >
                        <div
                          className="flex gap-2 mt-4 ml-auto items-center"
                          data-testid={`advanced-param-json-schema-actions-${key}`}
                        >
                          <span
                            data-testid={`advanced-param-json-schema-build-visually-${key}`}
                            className="label-text capitalize font-medium bg-gradient-to-r from-blue-800 to-orange-600 text-transparent bg-clip-text cursor-pointer hover:opacity-80 transition-opacity text-xs"
                            onClick={() => {
                              guardedResponseTypeAction(() => {
                                openModal(MODAL_TYPE.JSON_SCHEMA_BUILDER);
                              });
                            }}
                          >
                            Build Visually
                          </span>
                          <span className="text-xs text-base-content/50">|</span>
                          <span
                            data-testid={`advanced-param-json-schema-build-ai-${key}`}
                            className="label-text capitalize font-medium bg-gradient-to-r from-blue-800 to-orange-600 text-transparent bg-clip-text cursor-pointer hover:opacity-80 transition-opacity text-xs"
                            onClick={() => {
                              guardedResponseTypeAction(() => {
                                openModal(MODAL_TYPE.JSON_SCHEMA);
                              });
                            }}
                          >
                            Build with AI
                          </span>
                          <span className="text-xs text-base-content/50">|</span>
                          <FullscreenEditorButton
                            data-testid={`advanced-param-json-schema-fullscreen-${key}`}
                            tooltip="Open JSON schema in fullscreen"
                            className=""
                            onClick={() => {
                              setJsonSchemaFullscreen(true);
                            }}
                          />
                        </div>
                      </div>

                      <div className="relative" data-testid={`advanced-param-json-schema-editor-wrapper-${key}`}>
                        {hasUnsavedChanges && (
                          <div
                            className="absolute inset-0 z-10 cursor-text"
                            onClick={(e) => {
                              e.stopPropagation();
                              guardedResponseTypeAction(() => {});
                            }}
                          />
                        )}
                        {jsonSchemaError && (
                          <div
                            className="flex flex-col gap-1 mb-1.5 text-error"
                            data-testid={`advanced-param-json-schema-error-${key}`}
                          >
                            <div className="flex items-start gap-1.5">
                              <CircleX className="h-3.5 w-3.5 mt-0.5 shrink-0 text-error" />
                              <div className="flex-1">
                                <div className="flex items-start gap-1">
                                  <div
                                    ref={errorTextRef}
                                    className={`text-xs text-error whitespace-pre-wrap break-words ${!jsonSchemaErrorExpanded ? "line-clamp-1" : ""}`}
                                  >
                                    {jsonSchemaError}
                                  </div>
                                  {!jsonSchemaErrorExpanded && isErrorTruncated && (
                                    <button
                                      onClick={() => setJsonSchemaErrorExpanded(true)}
                                      className="text-xs text-error underline shrink-0 hover:opacity-80 whitespace-nowrap"
                                    >
                                      more
                                    </button>
                                  )}
                                </div>
                                {jsonSchemaErrorExpanded && (
                                  <button
                                    onClick={() => setJsonSchemaErrorExpanded(false)}
                                    className="text-xs text-error underline hover:opacity-80 whitespace-nowrap"
                                  >
                                    less
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                        <div
                          data-testid={`advanced-param-json-schema-editor-border-${key}`}
                          className={`w-full text-xs font-mono rounded overflow-hidden border transition-colors duration-200 ${
                            jsonSchemaError ? "border-red-600" : "border-base-300"
                          }`}
                        >
                          <CodeMirror
                            id={`advanced-param-json-schema-textarea-${key}`}
                            value={getJsonSchemaEditorValue(key)}
                            extensions={[json(), linter(jsonParseLinter()), lintGutter()]}
                            theme={actualTheme}
                            editable={!isReadOnly}
                            onChange={(val) => {
                              setObjectFieldValue(val);
                              // Clear error when user modifies the schema
                              if (jsonSchemaError) setJsonSchemaError(null);
                            }}
                            onBlur={async () => {
                              try {
                                const currentValueToParse = getJsonSchemaEditorValue(key).trim();
                                if (!currentValueToParse) {
                                  if (!isEmptyJsonSchema(configuration?.response_type?.json_schema)) {
                                    dispatchResponseTypeUpdate(
                                      buildJsonSchemaResponseType({
                                        is_template: configuration?.response_type?.is_template ?? false,
                                        template_id: configuration?.response_type?.template_id,
                                      })
                                    );
                                  }
                                  setObjectFieldValue(null);
                                  lastSubmittedSchemaRef.current = null;
                                  return;
                                }
                                const parsedValue = JSON.parse(currentValueToParse);

                                const trimmedValue = {
                                  ...parsedValue,
                                  name: parsedValue.name?.trim(),
                                  schema: parsedValue.schema
                                    ? {
                                        ...parsedValue.schema,
                                        properties: trimPropertyNames(parsedValue.schema.properties),
                                      }
                                    : parsedValue.schema,
                                };

                                if (isEmptyJsonSchema(trimmedValue)) {
                                  return;
                                }

                                // Skip API call if schema hasn't changed since last successful submission
                                const schemaKey = JSON.stringify(trimmedValue);
                                if (lastSubmittedSchemaRef.current === schemaKey) {
                                  return;
                                }

                                const result = await handleSelectChange(
                                  { target: { value: "json_schema" } },
                                  key,
                                  defaultValue,
                                  trimmedValue,
                                  true
                                );

                                if (result?.success === false) {
                                  setJsonSchemaErrorExpanded(false);
                                  setJsonSchemaError(
                                    result?.error ||
                                      result?.message ||
                                      "Invalid JSON schema. Please check the schema and try again."
                                  );
                                } else {
                                  lastSubmittedSchemaRef.current = schemaKey;
                                  setJsonSchemaError(null);
                                }
                              } catch (error) {
                                const errorMessage =
                                  error?.response?.data?.message ||
                                  error?.response?.data ||
                                  error?.message ||
                                  "Invalid JSON schema. Please fix the syntax and try again.";
                                setJsonSchemaErrorExpanded(false);
                                setJsonSchemaError(
                                  typeof errorMessage === "string" ? errorMessage : JSON.stringify(errorMessage)
                                );
                              }
                            }}
                            className="w-full"
                            minHeight="128px"
                          />
                        </div>
                      </div>
                      <FullscreenEditorModal
                        modalId={MODAL_TYPE.FULLSCREEN_JSON_SCHEMA}
                        title="JSON Schema"
                        value={getJsonSchemaEditorValue(key)}
                        isOpen={jsonSchemaFullscreen}
                        onClose={() => setJsonSchemaFullscreen(false)}
                        onSave={async (finalVal) => {
                          try {
                            const parsedValue = JSON.parse(String(finalVal).trim());
                            const trimmedValue = {
                              ...parsedValue,
                              name: parsedValue.name?.trim(),
                              schema: parsedValue.schema
                                ? {
                                    ...parsedValue.schema,
                                    properties: trimPropertyNames(parsedValue.schema.properties),
                                  }
                                : parsedValue.schema,
                            };
                            setObjectFieldValue(JSON.stringify(parsedValue, undefined, 4));
                            setJsonSchemaError(null);
                            const result = await handleSelectChange(
                              { target: { value: "json_schema" } },
                              key,
                              defaultValue,
                              trimmedValue,
                              true
                            );
                            if (result?.success === false) {
                              setJsonSchemaErrorExpanded(false);
                              setJsonSchemaError(
                                result?.error ||
                                  result?.message ||
                                  "Invalid JSON schema. Please check the schema and try again."
                              );
                              toast.error("Invalid JSON schema");
                              return false;
                            }
                            setJsonSchemaError(null);
                            return true;
                          } catch (error) {
                            console.error(error);
                            const errorMessage =
                              error?.response?.data?.message ||
                              error?.response?.data ||
                              error?.message ||
                              "Invalid JSON schema. Please fix the syntax and try again.";
                            setJsonSchemaErrorExpanded(false);
                            setJsonSchemaError(
                              typeof errorMessage === "string" ? errorMessage : JSON.stringify(errorMessage)
                            );
                            toast.error("Invalid JSON schema");
                            return false;
                          }
                        }}
                        placeholder="Enter JSON schema..."
                        disabled={isReadOnly || hasUnsavedChanges}
                        mono
                        isJson
                        onAttemptEdit={
                          !isReadOnly && hasUnsavedChanges
                            ? () => {
                                guardedResponseTypeAction(() => {});
                              }
                            : undefined
                        }
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
            )}
            {/* Slider input */}
            {field === "slider" && (
              <div className="flex items-center gap-2 w-full">
                <button
                  data-testid={`advanced-param-slider-min-btn-${key}`}
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
                  autoComplete="off"
                  data-testid={`advanced-param-slider-${key}`}
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
                  data-testid={`advanced-param-slider-max-btn-${key}`}
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
                  data-testid={`advanced-param-dropdown-trigger-${key}`}
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
                    data-testid={`advanced-param-dropdown-menu-${key}`}
                    id={`advanced-param-dropdown-menu-${key}`}
                    className="absolute top-full left-0 right-0 bg-base-300 border border-base-200 rounded-md shadow-lg z-50 max-h-[200px] overflow-y-auto mt-1 p-2"
                  >
                    <div className="p-2 top-0 bg-base-100">
                      <input
                        autoComplete="off"
                        data-testid={`advanced-param-dropdown-search-${key}`}
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
                    {!searchQuery &&
                      options &&
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
                              autoComplete="off"
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
                            const funcName = integrationData?.[func?.script_id]?.title || func?.title || "";
                            return funcName.toLowerCase().includes(searchQuery.toLowerCase());
                          })
                          .map((func) => (
                            <div
                              key={func?._id}
                              className="p-2 hover:bg-base-200 cursor-pointer"
                              onClick={() => {
                                const toolName = integrationData?.[func?.script_id]?.title || func?.title;
                                setSelectedOptions([{ name: toolName, id: func?._id }]);
                                handleDropdownChange(func?._id, key);
                                setShowDropdown(false);
                              }}
                            >
                              <label
                                id={`advanced-param-dropdown-tool-label-${key}-${func?._id}`}
                                className="flex items-center gap-2"
                              >
                                <input
                                  autoComplete="off"
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
                            const agentName = getToolName(agent.bridge_id, allBridgesMap, orgBridges, integrationData);
                            return String(agentName || name)
                              .toLowerCase()
                              .includes(searchQuery.toLowerCase());
                          })
                          .map(([name, agent]) => (
                            <div
                              key={agent.bridge_id}
                              className="p-2 hover:bg-base-200 cursor-pointer"
                              onClick={() => {
                                const agentName = getToolName(
                                  agent.bridge_id,
                                  allBridgesMap,
                                  orgBridges,
                                  integrationData
                                );
                                setSelectedOptions([{ name: agentName, id: agent.bridge_id }]);
                                handleDropdownChange(agent.bridge_id, key);
                                setShowDropdown(false);
                              }}
                            >
                              <label
                                id={`advanced-param-dropdown-agent-label-${key}-${agent.bridge_id}`}
                                className="flex items-center gap-2"
                              >
                                <input
                                  autoComplete="off"
                                  id={`advanced-param-dropdown-agent-radio-${key}-${agent.bridge_id}`}
                                  type="radio"
                                  name="function-select"
                                  checked={selectedOptions?.some((opt) => opt?.id === agent.bridge_id)}
                                  className="radio radio-xs"
                                  disabled={isReadOnly}
                                />
                                <span className="font-medium text-xs">
                                  {getToolName(agent.bridge_id, allBridgesMap, orgBridges, integrationData)}
                                </span>
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
      </div>
    );
  };

  const shouldShowLevel1 = level1Parameters.length > 0 && (!isEmbedUser || (isEmbedUser && showAdvancedParameters));

  const unsavedPromptActionModal = (
    <ConfirmationModal
      modalType="UNSAVED_PROMPT_SCHEMA_MODAL"
      title="Unsaved Prompt Changes"
      message="You have unsaved changes to your prompt. Save your prompt first, or discard changes and continue."
      confirmText="Discard & Continue"
      cancelText="Go Back"
      confirmButtonClass="btn-error text-white"
      onConfirm={() => {
        closeModal("UNSAVED_PROMPT_SCHEMA_MODAL");
        discardPromptDraft();
        const action = pendingResponseTypeActionRef.current;
        pendingResponseTypeActionRef.current = null;
        if (action) action();
      }}
      onCancel={() => {
        closeModal("UNSAVED_PROMPT_SCHEMA_MODAL");
        pendingResponseTypeActionRef.current = null;
      }}
      onClose={() => {
        closeModal("UNSAVED_PROMPT_SCHEMA_MODAL");
        pendingResponseTypeActionRef.current = null;
      }}
    />
  );

  if (level === 2) {
    if (level2Parameters.length === 0) {
      return null;
    }

    return (
      <>
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
        {unsavedPromptActionModal}
      </>
    );
  }

  if (level === 1) {
    if (!shouldShowLevel1) {
      return null;
    }

    // Level 1 parameters now render without accordion
    return (
      <>
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
        {unsavedPromptActionModal}
      </>
    );
  }

  return null;
};

export default AdvancedParameters;
