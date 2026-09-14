"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import { useCustomSelector } from "@/customHooks/customSelector";
import { getChatBotDetailsAction, updateChatBotConfigAction } from "@/store/action/chatBotAction";
import { getServiceAction } from "@/store/action/serviceAction";
import { getModelAction } from "@/store/action/modelAction";
import { getServiceDisplayName } from "@/utils/utility";
import ChatbotPreview from "./ChatbotPreview";
import { ExternalLink, Trash2, Save, Plus, Server } from "lucide-react";

function ModelCustomization({ value = {}, onChange, onBlur }) {
  const dispatch = useDispatch();
  const { serviceModels, SERVICES } = useCustomSelector((state) => ({
    serviceModels: state?.modelReducer?.serviceModels || {},
    SERVICES: state?.serviceReducer?.services || [],
  }));
  const [expandedServices, setExpandedServices] = useState({});

  useEffect(() => {
    dispatch(getServiceAction());
  }, [dispatch]);

  useEffect(() => {
    if (Array.isArray(SERVICES)) {
      SERVICES.forEach((svc) => {
        if (svc?.value) dispatch(getModelAction({ service: svc.value }));
      });
    }
  }, [SERVICES, dispatch]);

  const toggleService = (service) => setExpandedServices((prev) => ({ ...prev, [service]: !prev[service] }));

  const handleModelChange = (service, modelName, field, fieldValue, triggerBlur = false) => {
    const updatedModels = { ...value };
    updatedModels[service] = updatedModels[service] ? { ...updatedModels[service] } : {};
    updatedModels[service][modelName] = updatedModels[service][modelName]
      ? { ...updatedModels[service][modelName] }
      : { hide: false, value: undefined };
    updatedModels[service][modelName][field] = fieldValue;
    onChange(updatedModels);
    if (triggerBlur) onBlur?.(updatedModels);
  };

  const availableServiceValues = Array.isArray(SERVICES) ? SERVICES.map((s) => s?.value).filter(Boolean) : [];
  const filteredServiceModels = Object.entries(serviceModels).filter(([svc]) => availableServiceValues.includes(svc));

  if (filteredServiceModels.length === 0) return null;

  return (
    <div className="space-y-2">
      {filteredServiceModels.map(([service, types]) => {
        const allModels = [];
        Object.entries(types || {}).forEach(([, models]) => {
          Object.keys(models || {}).forEach((m) => {
            if (!allModels.includes(m)) allModels.push(m);
          });
        });
        if (allModels.length === 0) return null;
        return (
          <div key={service} className="border border-base-300 rounded-lg overflow-hidden">
            <button
              type="button"
              data-testid={`chatbot-config-model-service-toggle-${service}`}
              onClick={() => toggleService(service)}
              className="w-full flex items-center justify-between p-2 bg-base-200 text-sm"
            >
              <span className="font-medium">{getServiceDisplayName(service, SERVICES)}</span>
              <span className="text-xs text-base-content/60">
                {expandedServices[service] ? "▼" : "▶"} {allModels.length} models
              </span>
            </button>
            {expandedServices[service] && (
              <div className="p-2 space-y-2 bg-base-200">
                {allModels.map((modelName) => {
                  const modelConfig = value[service]?.[modelName] || { hide: false, value: undefined };
                  return (
                    <div key={modelName} className="flex items-start gap-2 p-2 bg-base-100 rounded">
                      <input
                        autoComplete="off"
                        type="checkbox"
                        className="checkbox checkbox-xs mt-1"
                        checked={!modelConfig.hide}
                        onChange={(e) => handleModelChange(service, modelName, "hide", !e.target.checked, true)}
                        title="Show/Hide model"
                        data-testid={`chatbot-config-model-visibility-${service}-${modelName}`}
                      />
                      <div className="flex flex-col gap-1 flex-1 min-w-0">
                        <span className="text-xs text-base-content/60 truncate">{modelName}</span>
                        <input
                          autoComplete="off"
                          type="text"
                          className="input input-bordered input-xs w-full bg-base-200"
                          value={modelConfig.value !== undefined ? modelConfig.value : modelName}
                          onChange={(e) => handleModelChange(service, modelName, "value", e.target.value)}
                          onBlur={(e) => handleModelChange(service, modelName, "value", e.target.value, true)}
                          placeholder={modelName}
                          data-testid={`chatbot-config-model-alias-${service}-${modelName}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function RadioGroup({ onChange, name, value }) {
  const options = [
    { label: "All Available space" },
    { label: "Left slider" },
    { label: "Right slider" },
    { label: "Pop over" },
    { label: "Popup" },
  ];

  return (
    <div id="radio-group-position">
      <div className="label">
        <span className="label-text">Position</span>
      </div>
      <select
        data-testid="chatbot-config-position-select"
        className="select select-bordered select-sm w-full"
        value={value || ""}
        onChange={(e) => onChange({ target: { name, value: e.target.value } })}
        name={name}
      >
        <option value="" disabled>
          Select position
        </option>
        {options.map((option, index) => (
          <option key={index} value={option.label.replaceAll(" ", "_").toLowerCase()}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function DimensionInput({ placeholder, options, onChange, name, value, unit }) {
  return (
    <div className="flex flex-col">
      <div className="label">
        <span className="label-text">{placeholder}</span>
      </div>
      <div className="join">
        <input
          autoComplete="off"
          data-testid={`chatbot-config-${name}-input`}
          id={`dimension-input-${name}`}
          className="input input-bordered join-item input-sm max-w-[90px]"
          type="number"
          placeholder={placeholder}
          defaultValue={value || ""}
          onBlur={onChange}
          min={0}
          name={name}
        />
        <select
          data-testid={`chatbot-config-${name}-unit`}
          id={`dimension-select-${name}-unit`}
          className="select select-bordered join-item select-sm max-w-[70px]"
          value={unit || ""}
          onChange={onChange}
          name={`${name}Unit`}
        >
          {options.map((option, index) => (
            <option key={index} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

const ChatbotConfigurationTab = ({ params, chatbotId, isInSidebar = false }) => {
  const dispatch = useDispatch();
  const router = useRouter();
  const { chatbots } = useCustomSelector((state) => ({
    chatbots: state?.ChatBot?.org?.[params?.org_id] || [],
  }));

  const chatBotId = useMemo(
    () => chatbotId || params?.chatbot_id || chatbots[0]?._id,
    [chatbotId, params?.chatbot_id, chatbots]
  );

  const [formData, setFormData] = useState({
    buttonName: "",
    height: "",
    heightUnit: "",
    width: "",
    widthUnit: "",
    type: "",
    themeColor: "",
    theme: "system",
    chatbotTitle: "Chatbot",
    chatbotSubtitle: "Smart Help, On Demand",
    iconUrl: "",
    allowBridgeSwitch: false,
    bridges: [],
    allowModalSwitch: false,
    models: {},
    side: "left",
    defaultErrorMessage: "",
    hide_tool: false,
    defaultMessage: "",
    mcpConfig: [],
  });

  const [mcpEdited, setMcpEdited] = useState({});

  const { chatBotConfig } = useCustomSelector((state) => ({
    chatBotConfig: state?.ChatBot?.ChatBotMap?.[chatBotId]?.config,
  }));

  useEffect(() => {
    if (chatBotId !== undefined) {
      dispatch(getChatBotDetailsAction(chatBotId));
    }
  }, [chatBotId, dispatch]);

  const handleInputChange = useCallback((event) => {
    const { name, value } = event.target;
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: value,
    }));
  }, []);

  const handleBlur = useCallback(
    (event) => {
      const { name, value } = event.target;

      setFormData((prevFormData) => {
        const updatedFormData = {
          ...prevFormData,
          [name]: value,
        };
        dispatch(updateChatBotConfigAction(chatBotId, updatedFormData));
        return updatedFormData;
      });
    },
    [dispatch, chatBotId]
  );

  const handleMcpConfigChange = useCallback((index, field, value) => {
    setFormData((prevFormData) => {
      const updatedMcpConfig = [...prevFormData.mcpConfig];
      updatedMcpConfig[index] = {
        ...updatedMcpConfig[index],
        [field]: value,
      };
      return {
        ...prevFormData,
        mcpConfig: updatedMcpConfig,
      };
    });

    // Mark this MCP as edited
    setMcpEdited((prev) => ({
      ...prev,
      [index]: true,
    }));
  }, []);

  const handleAddMcpConfig = useCallback(() => {
    setFormData((prevFormData) => {
      const newIndex = prevFormData.mcpConfig.length;
      setMcpEdited((prev) => ({
        ...prev,
        [newIndex]: true,
      }));
      return {
        ...prevFormData,
        mcpConfig: [...prevFormData.mcpConfig, { name: "", url: "" }],
      };
    });
  }, []);

  const handleUpdateMcpConfig = useCallback(
    (index) => {
      setFormData((prevFormData) => {
        const updatedFormData = {
          ...prevFormData,
        };
        dispatch(updateChatBotConfigAction(chatBotId, updatedFormData));
        return updatedFormData;
      });

      // Mark as not edited after update
      setMcpEdited((prev) => ({
        ...prev,
        [index]: false,
      }));
    },
    [dispatch, chatBotId]
  );

  const handleRemoveMcpConfig = useCallback(
    (index) => {
      setFormData((prevFormData) => {
        const updatedMcpConfig = prevFormData.mcpConfig.filter((_, i) => i !== index);
        const updatedFormData = {
          ...prevFormData,
          mcpConfig: updatedMcpConfig,
        };
        dispatch(updateChatBotConfigAction(chatBotId, updatedFormData));
        return updatedFormData;
      });

      // Remove edited state for this MCP
      setMcpEdited((prev) => {
        const newState = { ...prev };
        delete newState[index];
        return newState;
      });
    },
    [dispatch, chatBotId]
  );

  // Handler for boolean toggle fields (e.g. hide_tool)
  const handleToggleChange = useCallback(
    (name) => {
      setFormData((prevFormData) => {
        const updatedFormData = {
          ...prevFormData,
          [name]: !prevFormData[name],
        };
        dispatch(updateChatBotConfigAction(chatBotId, updatedFormData));
        return updatedFormData;
      });
    },
    [dispatch, chatBotId]
  );

  // Handler for the model show/hide + display-name customization map
  const handleModelsChange = useCallback(
    (updatedModels, persist = false) => {
      setFormData((prevFormData) => {
        const updatedFormData = {
          ...prevFormData,
          models: updatedModels,
        };
        if (persist) dispatch(updateChatBotConfigAction(chatBotId, updatedFormData));
        return updatedFormData;
      });
    },
    [dispatch, chatBotId]
  );

  useEffect(() => {
    if (chatBotConfig) {
      setFormData((prevFormData) => ({
        ...prevFormData,
        ...chatBotConfig,
        mcpConfig: Array.isArray(chatBotConfig.mcpConfig) ? chatBotConfig.mcpConfig : [],
      }));
    }
  }, [chatBotConfig]);

  // If in sidebar mode, render only the configuration settings
  if (isInSidebar) {
    return (
      <>
        <h3 className="text-lg font-semibold border-b border-base-300 pb-2 mb-4">Display Settings</h3>

        {/* Basic Information */}
        <div className="space-y-3">
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text font-medium text-xs">Chatbot Title</span>
            </div>
            <input
              autoComplete="off"
              data-testid="chatbot-config-title-input"
              type="text"
              placeholder="Enter chatbot title"
              className="input input-bordered w-full input-sm"
              value={formData.chatbotTitle}
              onChange={handleInputChange}
              onBlur={handleBlur}
              name="chatbotTitle"
            />
          </label>

          <label className="form-control w-full">
            <div className="label">
              <span className="label-text font-medium text-xs">Chatbot Subtitle</span>
            </div>
            <input
              autoComplete="off"
              data-testid="chatbot-config-subtitle-input"
              type="text"
              placeholder="Enter chatbot subtitle"
              className="input input-bordered w-full input-sm"
              value={formData.chatbotSubtitle}
              onChange={handleInputChange}
              onBlur={handleBlur}
              name="chatbotSubtitle"
            />
          </label>

          <label className="form-control w-full">
            <div className="label">
              <span className="label-text font-medium text-xs">Button Title</span>
            </div>
            <input
              autoComplete="off"
              type="text"
              placeholder="Enter button title"
              className="input input-bordered w-full input-sm"
              value={formData.buttonName}
              onChange={handleInputChange}
              onBlur={handleBlur}
              name="buttonName"
            />
          </label>

          <label className="form-control w-full">
            <div className="label">
              <span className="label-text font-medium text-xs">Button Icon URL</span>
            </div>
            <input
              autoComplete="off"
              type="text"
              placeholder="Enter icon URL"
              className="input input-bordered w-full input-sm"
              value={formData.iconUrl}
              onChange={handleInputChange}
              onBlur={handleBlur}
              name="iconUrl"
            />
          </label>

          <label className="form-control w-full">
            <div className="label justify-between">
              <span className="label-text font-medium text-xs">Default Error Message</span>
              <button
                type="button"
                onClick={() => router.push(`/org/${params?.org_id}/alerts`)}
                className="btn btn-xs btn-ghost text-primary hover:bg-primary/10 gap-1"
              >
                <ExternalLink size={12} />
                Configure Alerts
              </button>
            </div>
            <textarea
              autoComplete="off"
              placeholder="Enter default error message to show when something goes wrong"
              className="textarea textarea-bordered w-full textarea-sm"
              value={formData.defaultErrorMessage}
              onChange={handleInputChange}
              onBlur={handleBlur}
              name="defaultErrorMessage"
              rows="3"
              data-testid="chatbot-config-default-error-message"
            />
          </label>

          {/* Show Tool Calls Toggle */}
          <div className="form-control">
            <label
              data-testid="chatbot-config-hide-tool-toggle"
              className="label cursor-pointer justify-between gap-8 px-0"
            >
              <div className="flex flex-col">
                <span className="label-text font-medium text-xs">Hide Tool Calls</span>
                <span className="text-xs text-base-content/50">
                  {formData.hide_tool ? "Hidden from chat" : "Shown in chat"}
                </span>
              </div>
              <input
                autoComplete="off"
                data-testid="chatbot-config-hide-tool-checkbox"
                id="chatbot-config-hide-tool-checkbox"
                type="checkbox"
                className="toggle toggle-sm toggle-primary"
                checked={formData.hide_tool}
                onChange={(event) => {
                  event.preventDefault();
                  handleToggleChange("hide_tool");
                }}
              />
            </label>
          </div>

          {/* Allow Model Switch Toggle */}
          <div className="form-control">
            <label
              data-testid="chatbot-config-allow-modal-switch-toggle"
              className="label cursor-pointer justify-between gap-8 px-0"
            >
              <div className="flex flex-col">
                <span className="label-text font-medium text-xs">Allow Model Switch</span>
                <span className="text-xs text-base-content/50">
                  {formData.allowModalSwitch
                    ? "Users can switch the AI model in chat"
                    : "AI model is fixed for this chatbot"}
                </span>
              </div>
              <input
                autoComplete="off"
                data-testid="chatbot-config-allow-modal-switch-checkbox"
                id="chatbot-config-allow-modal-switch-checkbox"
                type="checkbox"
                className="toggle toggle-sm toggle-primary"
                checked={formData.allowModalSwitch}
                onChange={(event) => {
                  event.preventDefault();
                  handleToggleChange("allowModalSwitch");
                }}
              />
            </label>
          </div>

          {formData.allowModalSwitch && (
            <div className="form-control w-full">
              <div className="label">
                <span className="label-text font-medium text-xs">Models Shown In Switch</span>
              </div>
              <p className="text-xs text-base-content/50 mb-2">
                Choose which models users can switch to, and optionally rename how they appear in the chat.
              </p>
              <ModelCustomization
                value={formData.models || {}}
                onChange={(updatedModels) => handleModelsChange(updatedModels, false)}
                onBlur={(updatedModels) => handleModelsChange(updatedModels, true)}
              />
            </div>
          )}

          <label className="form-control w-full">
            <div className="label">
              <span className="label-text font-medium text-xs">Default Message</span>
            </div>
            <textarea
              autoComplete="off"
              placeholder="Enter default message to show when chatbot loads"
              className="textarea textarea-bordered w-full textarea-sm"
              value={formData.defaultMessage}
              onChange={handleInputChange}
              onBlur={handleBlur}
              name="defaultMessage"
              rows="3"
              data-testid="chatbot-config-default-message"
            />
          </label>

          <div className="divider my-2"></div>

          <div className="form-control w-full">
            <div className="label">
              <div className="flex items-center gap-2">
                <Server size={14} className="text-primary" />
                <span className="label-text font-medium text-xs">MCP Configuration</span>
              </div>
            </div>

            {formData.mcpConfig && formData.mcpConfig.length > 0 ? (
              <div className="space-y-3">
                {(() => {
                  const hasUnsavedMcp = Object.values(mcpEdited).some((edited) => edited);
                  return (
                    <>
                      {formData.mcpConfig.map((config, index) => {
                        const isComplete = config.name && config.url;
                        const isEdited = mcpEdited[index];
                        return (
                          <div
                            key={index}
                            className={`group relative bg-base-200/40 border rounded-lg p-3 space-y-2 transition-all hover:bg-base-200/60 ${
                              isEdited ? "border-warning" : "border-base-300"
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <span className="badge badge-sm badge-primary badge-outline font-medium">
                                  MCP {index + 1}
                                </span>
                                {isEdited && <span className="text-[10px] text-warning font-medium">• Unsaved</span>}
                              </div>
                              <div className="flex gap-1">
                                {isEdited && isComplete && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateMcpConfig(index)}
                                    className="btn btn-xs gap-1"
                                    title="Save changes"
                                  >
                                    <Save size={12} />
                                    Save
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMcpConfig(index)}
                                  className="btn btn-xs btn-ghost btn-square text-error hover:bg-error/10"
                                  title="Remove MCP"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                            <input
                              autoComplete="off"
                              type="text"
                              placeholder="MCP name (e.g. my-mcp)"
                              className={`input input-bordered w-full input-sm ${
                                !config.name ? "input-error input-error/30" : ""
                              }`}
                              value={config.name || ""}
                              onChange={(e) => handleMcpConfigChange(index, "name", e.target.value)}
                              required
                            />
                            <input
                              autoComplete="off"
                              type="url"
                              placeholder="https://mcp.example.com/..."
                              className={`input input-bordered w-full input-sm ${
                                !config.url ? "input-error input-error/30" : ""
                              }`}
                              value={config.url || ""}
                              onChange={(e) => handleMcpConfigChange(index, "url", e.target.value)}
                              required
                            />
                          </div>
                        );
                      })}
                      {!hasUnsavedMcp && (
                        <button
                          type="button"
                          onClick={handleAddMcpConfig}
                          className="w-full flex items-center justify-center gap-1 py-2 px-3 text-sm rounded-md border-2 border-dashed border-base-200 bg-transparent text-base-content/70 transition-all"
                        >
                          <Plus size={14} />
                          Add Another MCP
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>
            ) : (
              <button
                type="button"
                onClick={handleAddMcpConfig}
                className="w-full flex items-center justify-center gap-1 py-2 px-3 text-sm rounded-md border-2 border-dashed border-base-200 bg-transparent text-base-content/70 transition-all"
              >
                <Plus size={14} />
                Add MCP Configuration
              </button>
            )}
          </div>
        </div>

        {/* Dimensions */}
        <div className="space-y-3">
          <DimensionInput
            placeholder="Height"
            options={[
              { label: "Select unit", value: "", disabled: true },
              { label: "px", value: "px" },
              { label: "%", value: "%" },
            ]}
            onChange={handleBlur}
            name="height"
            value={formData.height}
            unit={formData.heightUnit}
          />
          <DimensionInput
            placeholder="Width"
            options={[
              { label: "Select unit", value: "", disabled: true },
              { label: "px", value: "px" },
              { label: "%", value: "%" },
            ]}
            onChange={handleBlur}
            name="width"
            value={formData.width}
            unit={formData.widthUnit}
          />
        </div>

        {/* Position */}
        <div>
          <RadioGroup value={formData.type} onChange={handleBlur} name="type" />
        </div>

        {/* Popup Side - only shown when position is popup */}
        {formData.type === "popup" && (
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text font-medium text-xs">Popup Side</span>
            </div>
            <select
              data-testid="chatbot-config-popup-side-select"
              className="select select-bordered select-sm w-full"
              value={formData.side || "right"}
              name="side"
              onChange={(e) => handleBlur(e)}
            >
              <option value="right">Right</option>
              <option value="left">Left</option>
            </select>
          </label>
        )}

        {/* Theme Color */}
        <label className="form-control">
          <div className="label">
            <span className="label-text font-medium text-xs">Theme Color</span>
          </div>
          <div className="flex items-center gap-3">
            <input
              autoComplete="off"
              data-testid="chatbot-config-theme-color"
              type="color"
              key={formData?.themeColor}
              defaultValue={formData.themeColor}
              onBlur={handleBlur}
              name="themeColor"
              className="w-12 h-8 rounded border"
            />
            <span className="text-sm text-base-content/70">{formData.themeColor}</span>
          </div>
        </label>

        {/* Theme Mode */}
        <label className="form-control w-full">
          <div className="label">
            <span className="label-text font-medium text-xs">Theme</span>
          </div>
          <select
            data-testid="chatbot-config-theme-mode"
            className="select select-bordered select-sm w-full"
            value={formData.theme}
            name="theme"
            onChange={(e) => handleBlur(e)}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
        </label>
      </>
    );
  }

  // Full view with sidebar and preview
  return (
    <div className="flex h-full">
      {/* Sidebar - Configuration Settings */}
      <div className="w-80 flex-shrink-0 border-r border-base-300 overflow-y-auto p-4 space-y-4">
        <h3 className="text-lg font-semibold border-b border-base-300 pb-2">Display Settings</h3>
        <ChatbotPreview />
      </div>
    </div>
  );
};

export default ChatbotConfigurationTab;
