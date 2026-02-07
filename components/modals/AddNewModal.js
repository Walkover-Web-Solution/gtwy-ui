"use client";

import { CloseIcon } from "@/components/Icons";
import { useCustomSelector } from "@/customHooks/customSelector";
import { ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";
import Modal from "../UI/Modal";
import { MODAL_TYPE } from "@/utils/enums";
import { closeModal } from "@/utils/utility";
import { addNewModelAction, getModelAction } from "@/store/action/modelAction";
import { useDispatch } from "react-redux";

// --- Placeholder Examples for UI ---
const PLACEHOLDERS = {
  openai: {
    display_name: "e.g., GPT-4 Omni",
    model_name: "e.g., gpt-4o",
    input_cost: "e.g., 2.5",
    output_cost: "e.g., 10",
    description: "A fast, intelligent model for all-purpose tasks. Accepts text and image inputs.",
    knowledge_cutoff: "e.g., Oct 2023",
    usecase: "One per line, e.g., Complex document analysis",
  },
  anthropic: {
    display_name: "e.g., Claude Sonnet",
    model_name: "e.g., claude-3-5-sonnet-latest",
    input_cost: "e.g., 3",
    output_cost: "e.g., 15",
    description: "High-speed, high-intelligence model for complex reasoning and content generation.",
    knowledge_cutoff: "e.g., Apr 2024",
    usecase: "One per line, e.g., Enterprise-grade conversational AI",
  },
  groq: {
    display_name: "e.g., Llama 3 on Groq",
    model_name: "e.g., llama-3.1-8b-instant",
    input_cost: "e.g., 0.05",
    output_cost: "e.g., 0.08",
    description: "Low-latency model suitable for real-time conversational interfaces and data analysis.",
    knowledge_cutoff: "e.g., Dec 2023",
    usecase: "One per line, e.g., Real-time chat applications",
  },
  mistral: {
    display_name: "e.g., Mistral Medium",
    model_name: "e.g., mistral-medium-latest",
    input_cost: "e.g., 0.4",
    output_cost: "e.g., 2",
    description: "A balanced and performant model for a wide variety of tasks.",
    knowledge_cutoff: "e.g., May 2025",
    usecase: "One per line, e.g., Code generation",
  },
  open_router: {
    display_name: "e.g., Deepseek Chat",
    model_name: "e.g., deepseek/deepseek-chat-v3-0324:free",
    input_cost: "e.g., 0",
    output_cost: "e.g., 0",
    description: "A 685B-parameter, mixture-of-experts model from the DeepSeek team.",
    knowledge_cutoff: "e.g., Aug 2024",
    usecase: "One per line, e.g., Advanced research queries",
  },
  openai_response: {
    display_name: "e.g., Legacy GPT-4",
    model_name: "e.g., gpt-4",
    input_cost: "e.g., 30",
    output_cost: "e.g., 60",
    description: "An older version of a high-intelligence GPT model, usable in Chat Completions.",
    knowledge_cutoff: "e.g., Dec 2023",
    usecase: "One per line, e.g., Specialized legacy tasks",
  },
};

const DEFAULT_PARAMETER = {
  model: {
    label: "Model",
    description: "Add Model name",
  },
  creativity_level: {
    label: "Temperature",
    description:
      "Controls randomness in responses. Higher values produce more creative output; lower values produce more focused and predictable output.",
  },
  max_tokens: {
    label: "Max Tokens",
    description: "Sets the maximum number of tokens (words or characters) the model can generate in a single response.",
  },
  probability_cutoff: {
    label: "Top-P (Nucleus Sampling)",
    description:
      "Controls diversity by limiting tokens to a cumulative probability threshold. Lower values result in more focused output.",
  },
  top_p: {
    // Added for completeness based on example JSON
    label: "Top-P",
    description:
      "Controls diversity via nucleus sampling. A value of 0.9 means only tokens comprising the top 90% probability mass are considered.",
  },
  log_probability: {
    label: "Show Token Probabilities",
    description: "When enabled, returns log probabilities for each token generated. Useful for debugging or analysis.",
  },
  repetition_penalty: {
    label: "Repetition Penalty",
    description:
      "Reduces the likelihood of repeating the same words or phrases. Higher values increase the penalty for repetition.",
  },
  novelty_penalty: {
    label: "Novelty Penalty",
    description:
      "Discourages the use of rare or uncommon tokens. Higher values produce safer and more conventional responses.",
  },
  stop: {
    label: "Stop Sequence",
    description: "Specify one or more sequences at which the model will stop generating text.",
  },
  tools: {
    label: "Enabled Tools",
    description:
      "List of special tools (e.g. code interpreter, web search) the model is allowed to use during generation.",
  },
  tool_choice: {
    label: "Tool Usage Preference",
    description:
      "Defines whether tools should be used automatically (`auto`), not at all (`none`), or must be used (`required`).",
  },
  response_type: {
    label: "Response Format",
    description: "Sets the structure of the model's output: plain text, JSON object, or JSON schema.",
  },
  parallel_tool_calls: {
    label: "Parallel Tool Calls",
    description:
      "Allows the model to call multiple tools at the same time when necessary. Speeds up multi-tool responses.",
  },
};

export default function AddNewModelModal() {
  const dispatch = useDispatch();
  const { modelInfo, SERVICES, DEFAULT_MODEL } = useCustomSelector((state) => ({
    modelInfo: state?.modelReducer?.serviceModels,
    SERVICES: state?.serviceReducer?.services,
    DEFAULT_MODEL: state?.serviceReducer?.default_model,
  }));
  const SERVICE_CONFIGS = (Array.isArray(SERVICES) ? SERVICES : []).reduce((acc, service) => {
    const model = DEFAULT_MODEL?.[service?.value]?.model;
    const chatModel = modelInfo?.[service?.value]?.["chat"]?.[model];
    if (chatModel) {
      const newConfig = JSON.parse(JSON.stringify(chatModel));
      if (newConfig.validationConfig?.specification) {
        newConfig.validationConfig.specification = {
          input_cost: "",
          output_cost: "",
          description: "",
          knowledge_cutoff: "",
          usecase: [],
        };
      }

      newConfig.display_name = "";
      newConfig.model_name = "";
      newConfig.service = service.value;
      if (newConfig.org_id === null || newConfig.org_id === undefined || newConfig.org_id) {
        delete newConfig.org_id;
      }
      newConfig.status = "1";
      acc[service.value] = newConfig;
    }
    return acc;
  }, {});
  const [error, setError] = useState({});
  const initialService = SERVICE_CONFIGS.openai ? "openai" : Object.keys(SERVICE_CONFIGS)[0];
  const [config, setConfig] = useState(SERVICE_CONFIGS[initialService] || {});
  const [selectedKeys, setSelectedKeys] = useState(
    Object.keys(SERVICE_CONFIGS[initialService]?.configuration?.additional_parameters || {})
  );
  const [expandedKeys, setExpandedKeys] = useState(new Set());
  const [showNewParamForm, setShowNewParamForm] = useState(false);
  const [newParamData, setNewParamData] = useState({ name: "", type: "slider" });

  const resetFormToDefault = () => {
    const defaultConfig = SERVICE_CONFIGS[config.service];
    if (!defaultConfig) {
      toast.error("Could not find default configuration to reset.");
      return;
    }
    const initialConfig = JSON.parse(JSON.stringify(defaultConfig));
    setConfig(initialConfig);
    setSelectedKeys(Object.keys(initialConfig.configuration.additional_parameters || {}));
    setExpandedKeys(new Set());
  };

  /**
   * CORRECTED: This function now prepares the API payload with a flat
   * configuration structure, as requested.
   */
  const getCleanedConfigForApi = () => {
    // Destructure to separate the base configuration from the dynamic parameters
    const { additional_parameters, ...baseConfiguration } = config.configuration;

    // Gather only the parameters that are selected (checked) by the user
    const selectedParams = selectedKeys.reduce((acc, key) => {
      if (additional_parameters && additional_parameters[key]) {
        acc[key] = additional_parameters[key];
      }
      return acc;
    }, {});

    // Handle output configuration and costs
    const spec = config.validationConfig?.specification || {};
    let newOutPutConfig = {
      ...config.outputConfig,
      input_cost: spec.input_cost || "",
      output_cost: spec.output_cost || "",
    };
    if (config?.outputConfig?.usage?.[0]) {
      newOutPutConfig = {
        ...newOutPutConfig,
        usage: [
          {
            ...config?.outputConfig?.usage?.[0],
            total_cost: {
              input_cost: spec.input_cost || config?.outputConfig?.usage?.[0]?.total_cost?.input_cost,
              output_cost: spec.output_cost || config?.outputConfig?.usage?.[0]?.total_cost?.output_cost,
              // Ensure other cost fields from the base config are preserved if they exist
              ...config?.outputConfig?.usage?.[0]?.total_cost,
            },
          },
        ],
      };
    }

    // Construct the final object with the flattened configuration
    let finalConfig = {
      ...config,
      configuration: {
        ...baseConfiguration, // Spread base properties like 'model'
        ...selectedParams, // Spread the selected parameters directly into configuration
      },
      outputConfig: { ...newOutPutConfig },
    };

    return {
      ...finalConfig,
      configuration: {
        ...finalConfig.configuration,
        model: { ...finalConfig.configuration?.model, level: 1 },
      },
    };
  };

  const handleTopLevelChange = (key, value) => {
    if (key === "service") {
      const newDefaultConfig = SERVICE_CONFIGS[value] || SERVICE_CONFIGS.openai;
      const newConfig = JSON.parse(JSON.stringify(newDefaultConfig));
      setConfig(newConfig);
      setSelectedKeys(Object.keys(newConfig.configuration.additional_parameters || {}));
      setExpandedKeys(new Set());
    } else {
      setConfig((p) => ({ ...p, [key]: value }));
    }
  };

  const handleSelectKey = (key) => {
    setSelectedKeys((prev) => (prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]));
  };

  const handleConfigChange = (key, field, value) => {
    setConfig((p) => {
      const updatedParam = { ...p.configuration.additional_parameters[key], [field]: value };
      delete updatedParam.level;

      return {
        ...p,
        configuration: {
          ...p.configuration,
          additional_parameters: {
            ...p.configuration.additional_parameters,
            [key]: updatedParam,
          },
        },
      };
    });
  };

  const handleValidationChange = (key, value) =>
    setConfig((p) => ({
      ...p,
      validationConfig: { ...p.validationConfig, [key]: value },
    }));

  const handleSpecificationChange = (key, value) =>
    setConfig((p) => ({
      ...p,
      validationConfig: {
        ...p.validationConfig,
        specification: { ...p.validationConfig.specification, [key]: value },
      },
    }));

  const toggleExpanded = (key) =>
    setExpandedKeys((prev) => {
      const newSet = new Set(prev);
      newSet.has(key) ? newSet.delete(key) : newSet.add(key);
      return newSet;
    });

  const handleAddNewParam = () => {
    const { name, type } = newParamData;
    if (!name || config.configuration.additional_parameters[name]) {
      toast.error("Parameter name is blank or already exists.");
      return;
    }
    let newFieldConfig = {};
    switch (type) {
      case "slider":
        newFieldConfig = { field: "slider", min: 0, max: 1, step: 0.1, default: 0.5 };
        break;
      case "boolean":
        newFieldConfig = { field: "boolean", default: false, typeOf: "boolean" };
        break;
      case "number":
        newFieldConfig = { field: "number", default: 1, typeOf: "number" };
        break;
      case "dropdown":
        newFieldConfig = { field: "dropdown", options: ["option1", "option2"], default: "option1", typeOf: "string" };
        break;
      default:
        newFieldConfig = { field: "text", default: "", typeOf: "string" };
        break;
    }

    setConfig((p) => ({
      ...p,
      configuration: {
        ...p.configuration,
        additional_parameters: {
          ...p.configuration.additional_parameters,
          [name]: newFieldConfig,
        },
      },
    }));

    setSelectedKeys((p) => [...p, name]);
    setShowNewParamForm(false);
    setNewParamData({ name: "", type: "slider" });
    toast.success(`Added new parameter: ${name}`);
  };

  const addOption = (key) =>
    handleConfigChange(key, "options", [
      ...(config.configuration.additional_parameters[key].options || []),
      config.configuration.additional_parameters[key].options?.[0] &&
      typeof config.configuration.additional_parameters[key].options[0] === "object"
        ? { type: "new" }
        : "new",
    ]);
  const updateOption = (key, index, newValue) => {
    const options = [...config.configuration.additional_parameters[key].options];
    options[index] = typeof options[index] === "object" ? { ...options[index], type: newValue } : newValue;
    handleConfigChange(key, "options", options);
  };
  const removeOption = (key, index) =>
    handleConfigChange(
      key,
      "options",
      config.configuration.additional_parameters[key].options.filter((_, i) => i !== index)
    );

  const removeParameter = (key) => {
    setConfig((p) => {
      const newConfig = { ...p };
      const newAddParams = { ...newConfig.configuration.additional_parameters };
      delete newAddParams[key];
      newConfig.configuration = { ...newConfig.configuration, additional_parameters: newAddParams };
      return newConfig;
    });
    setSelectedKeys((arr) => arr.filter((k) => k !== key));
    setExpandedKeys((set) => {
      const s = new Set(set);
      s.delete(key);
      return s;
    });
  };

  const renderDropdownControls = (key, fieldConfig) => (
    <div className="mt-4 p-4 bg-base-200 rounded-md">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {fieldConfig.hasOwnProperty("min") && (
          <div className="form-control">
            <label className="label">
              <span className="label-text">Min</span>
            </label>
            <input
              type="number"
              value={fieldConfig.min}
              onChange={(e) => handleConfigChange(key, "min", parseFloat(e.target.value))}
              className="input input-bordered w-full"
            />
          </div>
        )}
        {fieldConfig.hasOwnProperty("max") && (
          <div className="form-control">
            <label className="label">
              <span className="label-text">Max</span>
            </label>
            <input
              type="number"
              value={fieldConfig.max}
              onChange={(e) => handleConfigChange(key, "max", parseFloat(e.target.value))}
              className="input input-bordered w-full"
            />
          </div>
        )}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Default value</span>
          </label>
          {fieldConfig.field === "boolean" ? (
            <select
              value={String(fieldConfig.default)}
              onChange={(e) => handleConfigChange(key, "default", e.target.value === "true")}
              className="select select-bordered w-full"
            >
              <option value="true">True</option>
              <option value="false">False</option>
            </select>
          ) : fieldConfig.field === "dropdown" || fieldConfig.field === "select" ? (
            <select
              value={
                typeof fieldConfig.default === "object" ? JSON.stringify(fieldConfig.default) : fieldConfig.default
              }
              onChange={(e) => {
                try {
                  const v = JSON.parse(e.target.value);
                  handleConfigChange(key, "default", v);
                } catch {
                  handleConfigChange(key, "default", e.target.value);
                }
              }}
              className="select select-bordered w-full"
            >
              {fieldConfig.options?.map((opt, i) => (
                <option key={i} value={typeof opt === "object" ? JSON.stringify(opt) : opt}>
                  {typeof opt === "object" ? opt.type : opt}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={fieldConfig.field === "number" ? "number" : "text"}
              value={key === "model" ? config.model_name : fieldConfig.default}
              onChange={(e) => {
                const v = fieldConfig.field === "number" ? parseFloat(e.target.value) : e.target.value;
                handleConfigChange(key, "default", v);
              }}
              className="input input-bordered w-full"
            />
          )}
        </div>
      </div>
      {(fieldConfig.field === "dropdown" || fieldConfig.field === "select") && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-3">
            <label className="label-text">Options</label>
            <button type="button" onClick={() => addOption(key)} className="btn btn-sm btn-primary">
              Add
            </button>
          </div>
          <div className="space-y-2">
            {fieldConfig.options?.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={typeof opt === "object" ? opt.type : opt}
                  onChange={(e) => updateOption(key, i, e.target.value)}
                  className="input input-bordered input-sm w-full"
                />
                <button
                  type="button"
                  onClick={() => removeOption(key, i)}
                  className="btn btn-sm btn-error btn-square text-base-100 text-sm"
                  title="Remove"
                >
                  <CloseIcon size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderSelectableKeys = () =>
    Object.keys(config?.configuration?.additional_parameters || {}).map((key) => {
      const fieldConfig = config.configuration.additional_parameters[key];
      const isExpanded = expandedKeys.has(key);
      const isProtected = key === "creativity_level" || key === "model";

      return (
        <div key={key} className="border border-base-300 bg-base-100 rounded-box">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {!isProtected && (
                  <input
                    type="checkbox"
                    checked={selectedKeys.includes(key)}
                    onChange={() => handleSelectKey(key)}
                    className="checkbox checkbox-primary"
                  />
                )}
                <div className="flex flex-col">
                  <span className="font-medium">{DEFAULT_PARAMETER[key]?.label || key.replace(/_/g, " ")}</span>
                  {DEFAULT_PARAMETER[key]?.description && (
                    <span className="text-xs text-base-content/60">{DEFAULT_PARAMETER[key].description}</span>
                  )}
                </div>
                <div className="badge badge-ghost badge-sm">{fieldConfig.field}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => toggleExpanded(key)} className="btn btn-sm btn-ghost btn-circle">
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                {!isProtected && (
                  <button
                    onClick={() => removeParameter(key)}
                    className="btn btn-sm btn-ghost btn-circle text-error"
                    title="Remove parameter"
                  >
                    <CloseIcon />
                  </button>
                )}
              </div>
            </div>
            {isExpanded && selectedKeys.includes(key) && renderDropdownControls(key, fieldConfig)}
          </div>
        </div>
      );
    });

  const handleAddModel = async () => {
    setError({}); // Clear previous errors
    const refactored = getCleanedConfigForApi();

    try {
      const result = await dispatch(
        addNewModelAction({
          service: config?.service,
          type: config?.validationConfig?.type,
          newModelObject: refactored,
        })
      );

      if (result?.data?.success) {
        closeModal(MODAL_TYPE?.ADD_NEW_MODEL_MODAL);
        setTimeout(() => dispatch(getModelAction({ service: config?.service })), 5000);
        resetFormToDefault();
      } else {
        // Handle server response with error but not exception
        setError({
          message: result?.data?.message || "Failed to add model",
          details: result?.data?.error || {},
        });
      }
    } catch (error) {
      setError({
        message: error?.response?.data?.message || error?.message || "An error occurred while adding the model",
        details: error?.response?.data?.error || {},
      });
    }
  };

  // --- Validation logic for the save button ---
  const spec = config.validationConfig?.specification;
  const isFormInvalid =
    !config.model_name?.trim() ||
    !config.display_name?.trim() ||
    !spec ||
    spec.input_cost === "" ||
    spec.output_cost === "" ||
    !spec.description?.trim() ||
    !spec.knowledge_cutoff?.trim() ||
    !spec.usecase ||
    spec.usecase.length === 0;

  const handleClose = () => {
    closeModal(MODAL_TYPE.ADD_NEW_MODEL_MODAL);
  };

  return (
    <Modal MODAL_ID={MODAL_TYPE.ADD_NEW_MODEL_MODAL} onClose={handleClose}>
      <div id="add-new-model-modal-container" className="modal-box min-w-[70rem]">
        <div className="min-h-screen bg-base-100 pt-4">
          <div className="w-full mx-auto">
            <div className="relative text-center">
              <button
                id="add-model-reset-button"
                onClick={resetFormToDefault}
                className="btn btn-ghost absolute right-0 top-1/3 tooltip tooltip-left"
                data-tip="Reset form to default values"
              >
                <RefreshCw size={20} />
              </button>
              <div>
                <h1 className="text-2xl font-bold">Add a New Model</h1>
                <p className="mt-2 text-base-content/70">
                  Add and configure a new model for your agent in just a few steps.
                </p>
              </div>
            </div>
            <div className="card w-full">
              <div className="card-body p-6 md:p-8">
                <div className="space-y-8">
                  <h2 className="card-title">Model Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Service</span>
                      </label>
                      <select
                        id="add-model-service-select"
                        value={config.service}
                        onChange={(e) => handleTopLevelChange("service", e.target.value)}
                        className="select select-bordered w-full"
                      >
                        {Array.isArray(SERVICES)
                          ? SERVICES.map(({ value, displayName }) => (
                              <option key={value} value={value}>
                                {displayName}
                              </option>
                            ))
                          : null}
                      </select>
                    </div>
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">
                          Model Name<span className="text-error">*</span>
                        </span>
                      </label>
                      <input
                        id="add-model-name-input"
                        type="text"
                        value={config.model_name}
                        onChange={(e) => {
                          const value = e.target.value;
                          handleTopLevelChange("model_name", value);
                          handleConfigChange("model", "default", value);
                          setConfig((prev) => ({
                            ...prev,
                            configuration: {
                              ...prev.configuration,
                              model: {
                                field: "drop",
                                default: value,
                                level: 1,
                              },
                            },
                          }));
                        }}
                        className="input input-bordered w-full"
                        placeholder={PLACEHOLDERS[config.service]?.model_name}
                      />
                    </div>
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">
                          Display Name <span className="text-error">*</span>
                        </span>
                      </label>
                      <input
                        id="add-model-display-name-input"
                        type="text"
                        value={config.display_name}
                        onChange={(e) => handleTopLevelChange("display_name", e.target.value)}
                        className="input input-bordered w-full"
                        placeholder={PLACEHOLDERS[config.service]?.display_name}
                      />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold mb-3">Model Capabilities</h2>
                    <p className="text-sm text-base-content/60 mb-4">
                      Enable/disable the features this model supports.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="form-control p-4 rounded-lg border border-base-300">
                        <label className="label cursor-pointer justify-start gap-4">
                          <input
                            id="add-model-vision-checkbox"
                            type="checkbox"
                            checked={!!config?.validationConfig?.vision}
                            onChange={(e) => handleValidationChange("vision", e.target.checked)}
                            className="checkbox checkbox-primary"
                          />
                          <span className="label-text font-medium">Supports Vision</span>
                        </label>
                      </div>
                      <div className="form-control p-4 rounded-lg border border-base-300">
                        <label className="label cursor-pointer justify-start gap-4">
                          <input
                            id="add-model-tools-checkbox"
                            type="checkbox"
                            checked={!!config.validationConfig?.tools}
                            onChange={(e) => handleValidationChange("tools", e.target.checked)}
                            className="checkbox checkbox-primary"
                          />
                          <span className="label-text font-medium">Supports Tools</span>
                        </label>
                      </div>
                      <div className="form-control p-4 rounded-lg border border-base-300">
                        <label className="label cursor-pointer justify-start gap-4">
                          <input
                            id="add-model-system-prompt-checkbox"
                            type="checkbox"
                            checked={!!config.validationConfig?.system_prompt}
                            onChange={(e) => handleValidationChange("system_prompt", e.target.checked)}
                            className="checkbox checkbox-primary"
                          />
                          <span className="label-text font-medium">Support System Prompt</span>
                        </label>
                      </div>
                      <div className="form-control p-4 rounded-lg border border-base-300">
                        <label className="label">
                          <span className="label-text font-medium">Model Type</span>
                        </label>
                        <select
                          id="add-model-type-select"
                          value={config.validationConfig?.type}
                          onChange={(e) => handleValidationChange("type", e.target.value)}
                          className="select select-bordered w-full"
                        >
                          <option value="chat">Chat</option>
                          <option value="fine-tune">Fine-tune</option>
                          <option value="image">Image</option>
                          <option value="reasoning">Reasoning</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  {config.validationConfig?.specification && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Reference Specification</h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="form-control">
                            <label className="label">
                              <span className="label-text">
                                Input Cost / Mtok<span className="text-error">*</span>
                              </span>
                            </label>
                            <input
                              id="add-model-input-cost-input"
                              type="number"
                              value={config.validationConfig.specification.input_cost}
                              onChange={(e) =>
                                handleSpecificationChange(
                                  "input_cost",
                                  e.target.value === "" ? "" : parseFloat(e.target.value)
                                )
                              }
                              className="input input-bordered w-full"
                              step="0.001"
                              placeholder={PLACEHOLDERS[config.service]?.input_cost}
                              min={0}
                            />
                          </div>
                          <div className="form-control">
                            <label className="label">
                              <span className="label-text">
                                Output Cost / Mtok<span className="text-error">*</span>
                              </span>
                            </label>
                            <input
                              id="add-model-output-cost-input"
                              type="number"
                              value={config.validationConfig.specification.output_cost}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value);
                                if (value < 0) {
                                  e.target.value = "";
                                } else {
                                  handleSpecificationChange("output_cost", value);
                                }
                              }}
                              min={0}
                              className="input input-bordered w-full"
                              step="0.001"
                              placeholder={PLACEHOLDERS[config.service]?.output_cost}
                            />
                          </div>
                        </div>
                        <div className="form-control">
                          <label className="label">
                            <span className="label-text">
                              Description<span className="text-error">*</span>
                            </span>
                          </label>
                          <textarea
                            id="add-model-description-textarea"
                            value={config.validationConfig.specification.description}
                            onChange={(e) => handleSpecificationChange("description", e.target.value)}
                            onBlur={(e) => handleSpecificationChange("description", e.target.value.trim())}
                            className="textarea bg-white dark:bg-black/15 textarea-bordered w-full"
                            rows={3}
                            placeholder={PLACEHOLDERS[config.service]?.description}
                          ></textarea>
                        </div>
                        <div className="form-control">
                          <label className="label">
                            <span className="label-text">
                              Knowledge Cutoff<span className="text-error">*</span>
                            </span>
                          </label>
                          <input
                            id="add-model-knowledge-cutoff-input"
                            type="text"
                            value={config.validationConfig.specification.knowledge_cutoff}
                            onChange={(e) => handleSpecificationChange("knowledge_cutoff", e.target.value)}
                            onBlur={(e) => handleSpecificationChange("knowledge_cutoff", e.target.value.trim())}
                            className="input input-bordered w-full"
                            placeholder={PLACEHOLDERS[config.service]?.knowledge_cutoff}
                          />
                        </div>
                        <div className="form-control">
                          <label className="label">
                            <span className="label-text">Use Case</span>
                          </label>
                          <textarea
                            id="add-model-usecase-textarea"
                            value={(config.validationConfig.specification.usecase || []).join("\n")}
                            onChange={(e) =>
                              handleSpecificationChange("usecase", e.target.value.split("\n").filter(Boolean))
                            }
                            onBlur={(e) => handleSpecificationChange("usecase", e.target.value.trim().split("\n"))}
                            className="textarea bg-white dark:bg-black/15 textarea-bordered w-full"
                            rows={3}
                            placeholder={PLACEHOLDERS[config.service]?.usecase}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      Model Parameters
                      <span className="text-xs text-base-content/40 font-normal">(advanced tuning)</span>
                    </h3>
                    {!showNewParamForm && (
                      <button
                        id="add-model-add-param-button"
                        className="btn btn-primary btn-sm mb-5"
                        onClick={() => setShowNewParamForm(true)}
                      >
                        + Add Model Parameter
                      </button>
                    )}
                    {showNewParamForm && (
                      <div
                        id="add-model-new-param-form"
                        className="p-4 border border-primary/20 rounded-lg bg-primary/5 mb-6"
                      >
                        <h4 className="text-md font-medium mb-3">New Parameter Details</h4>
                        <form
                          className="space-y-4"
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleAddNewParam();
                          }}
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="form-control">
                              <label className="label">
                                <span className="label-text">Parameter Name</span>
                              </label>
                              <input
                                id="add-model-param-name-input"
                                type="text"
                                autoFocus
                                value={newParamData.name}
                                onChange={(e) =>
                                  setNewParamData((p) => ({ ...p, name: e.target.value.replace(/\s/g, "_") }))
                                }
                                className="input input-bordered w-full"
                              />
                            </div>
                            <div className="form-control">
                              <label className="label">
                                <span className="label-text">Field Type</span>
                              </label>
                              <select
                                id="add-model-param-type-select"
                                value={newParamData.type}
                                onChange={(e) => setNewParamData((p) => ({ ...p, type: e.target.value }))}
                                className="select select-bordered w-full"
                              >
                                <option value="slider">Numeric (Slider)</option>
                                <option value="boolean">On/Off (Boolean)</option>
                                <option value="text">Free (Text)</option>
                                <option value="number">Number (Input)</option>
                                <option value="dropdown">Dropdown (Choices)</option>
                              </select>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button id="add-model-save-param-button" type="submit" className="btn btn-primary">
                              Save
                            </button>
                            <button
                              id="add-model-cancel-param-button"
                              type="button"
                              onClick={() => setShowNewParamForm(false)}
                              className="btn btn-ghost"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                    <div className="space-y-2">{renderSelectableKeys()}</div>
                  </div>
                </div>
                <div className="card-actions justify-end border-t border-base-200 pt-6 mt-8">
                  {error?.message && (
                    <div className="w-full mb-4">
                      <div className="error-container p-4 bg-red-50 border-l-4 border-red-500 rounded-md shadow-sm">
                        {error?.message}
                      </div>
                    </div>
                  )}
                  <button
                    id="add-model-close-button"
                    type="button"
                    onClick={() => closeModal(MODAL_TYPE?.ADD_NEW_MODEL_MODAL)}
                    className="btn btn-sm"
                  >
                    Close
                  </button>
                  <button
                    id="add-model-save-button"
                    type="button"
                    onClick={handleAddModel}
                    className="btn btn-sm btn-primary"
                    disabled={isFormInvalid}
                  >
                    Save Model
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
