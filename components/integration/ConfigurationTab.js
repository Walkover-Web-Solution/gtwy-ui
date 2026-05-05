"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useDispatch } from "react-redux";
import { useCustomSelector } from "@/customHooks/customSelector";
import { updateIntegrationDataAction } from "@/store/action/integrationAction";
import { createApiAction, integrationAction, deleteFunctionAction } from "@/store/action/bridgeAction";
import { setEmbedUserDetailsAction } from "@/store/action/appInfoAction";
import { toast } from "react-toastify";
import { RefreshCw, Save } from "lucide-react";
import ThemePaletteEditor, { hexToOklchString } from "./ThemePaletteEditor";
import EmbedPromptBuilder from "../gtwy_embed/EmbedPromptBuilder";
import ToolsConfiguration from "../gtwy_embed/ToolsConfiguration";
import ApiKeysInput from "../sliders/ApiKeysInput";
import defaultUserTheme from "@/public/themes/default-user-theme.json";
import EmbedPreview from "./EmbedPreview";
import { MODAL_TYPE } from "@/utils/enums";
import { getServiceDisplayName } from "@/utils/utility";

// Configuration Schema
const CONFIG_SCHEMA = [
  {
    key: "hideHomeButton",
    type: "toggle",
    label: "Hide Home Button",
    description: "Removes the home navigation button",
    defaultValue: false,
    section: "Interface Options",
  },
  {
    key: "showHistory",
    type: "toggle",
    label: "Show History",
    description: "Display conversation history",
    defaultValue: false,
    section: "Interface Options",
  },
  {
    key: "showConfigType",
    type: "toggle",
    label: "Show Config Type",
    description: "Show configuration type indicators",
    defaultValue: false,
    section: "Interface Options",
  },
  {
    key: "hideAdvancedParameters",
    type: "toggle",
    label: "Hide Advanced Parameters",
    description: "Display advanced parameters",
    defaultValue: true,
    section: "Interface Options",
  },
  {
    key: "hideCreateManuallyButton",
    type: "toggle",
    label: "Hide Create Agent Manually Button",
    description: "Display create agent manually button",
    defaultValue: false,
    section: "Interface Options",
  },
  {
    key: "hideAdvancedConfigurations",
    type: "toggle",
    label: "Hide Advanced Configurations",
    description: "Display advanced configurations",
    defaultValue: false,
    section: "Interface Options",
  },
  {
    key: "hidePreTool",
    type: "toggle",
    label: "Hide Pre Tool",
    description: "Display pre tool",
    defaultValue: false,
    section: "Interface Options",
  },
  {
    key: "hidePromptHelper",
    type: "toggle",
    label: "Hide Prompt Helper",
    description: "Hide prompt helper button",
    defaultValue: false,
    section: "Interface Options",
  },
  {
    key: "showResponseType",
    type: "toggle",
    label: "Show Response Type",
    description: "Show response type",
    defaultValue: false,
    section: "Interface Options",
  },
  {
    key: "showVariables",
    type: "toggle",
    label: "Show Variables",
    description: "Show variables",
    defaultValue: false,
    section: "Interface Options",
  },
  {
    key: "showAgentName",
    type: "toggle",
    label: "Show Agent Name",
    description: "Show agent name",
    defaultValue: false,
    section: "Interface Options",
  },
  {
    key: "hidePlayground",
    type: "toggle",
    label: "Hide Playground",
    description: "Hide the playground",
    defaultValue: false,
    section: "Interface Options",
  },
  {
    key: "slide",
    type: "select",
    label: "Slide Position",
    description: "Choose where GTWY appears on screen",
    defaultValue: "right",
    options: [
      { value: "left", label: "Left" },
      { value: "right", label: "Right" },
      { value: "full", label: "Full" },
    ],
    section: "Display Settings",
  },
  {
    key: "defaultOpen",
    type: "toggle",
    label: "Default Open",
    description: "Open GTWY automatically on page load",
    defaultValue: false,
    section: "Display Settings",
  },
  {
    key: "hideFullScreenButton",
    type: "toggle",
    label: "Hide Full Screen",
    description: "Remove the full screen toggle button",
    defaultValue: false,
    section: "Display Settings",
  },
  {
    key: "hideCloseButton",
    type: "toggle",
    label: "Hide Close Button",
    description: "Remove the close button",
    defaultValue: false,
    section: "Display Settings",
  },
  {
    key: "hideHeader",
    type: "toggle",
    label: "Hide Header",
    description: "Hide the header section completely",
    defaultValue: false,
    section: "Display Settings",
  },
  {
    key: "addDefaultApiKeys",
    type: "toggle",
    label: "Add Default ApiKeys",
    description: "Add default api keys",
    defaultValue: false,
    section: "Display Settings",
  },
  {
    key: "themeMode",
    type: "select",
    label: "Theme Mode",
    description: "Choose the color theme for the embedded GTWY interface",
    defaultValue: "system",
    options: [
      { value: "system", label: "System" },
      { value: "light", label: "Light" },
      { value: "dark", label: "Dark" },
    ],
    section: "Display Settings",
  },
];

// Model Customization Component
const ModelCustomization = ({ value = {}, onChange, onBlur }) => {
  const { serviceModels, SERVICES } = useCustomSelector((state) => ({
    serviceModels: state?.modelReducer?.serviceModels || {},
    SERVICES: state?.serviceReducer?.services || [],
  }));
  const [expandedServices, setExpandedServices] = useState({});

  const toggleService = (service) => setExpandedServices((prev) => ({ ...prev, [service]: !prev[service] }));

  const handleModelChange = (service, modelName, field, fieldValue, triggerBlur = false) => {
    const updatedModels = { ...value };
    updatedModels[service] = updatedModels[service] ? { ...updatedModels[service] } : {};
    updatedModels[service][modelName] = updatedModels[service][modelName]
      ? { ...updatedModels[service][modelName] }
      : { hide: false, value: undefined };
    updatedModels[service][modelName][field] = fieldValue;
    onChange("models", updatedModels);
    if (triggerBlur) onBlur?.("models", updatedModels);
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
};

const ConfigurationTab = ({ data, isConfigMode, onUnsavedChanges, onSaveRef }) => {
  const dispatch = useDispatch();
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    onUnsavedChanges?.(hasUnsavedChanges);
  }, [hasUnsavedChanges]);
  const saveTimeoutRef = useRef(null);

  const { embedToken, functionData } = useCustomSelector((state) => ({
    embedToken: state?.integrationReducer?.embedTokens?.[data?.folder_id],
    functionData: state?.bridgeReducer?.org?.[data?.org_id]?.functionData || {},
  }));

  const integrationData = useCustomSelector((state) =>
    state?.integrationReducer?.integrationData?.[data?.org_id].find((f) => f._id === data?.folder_id)
  );

  const config = integrationData?.config || {};
  const generateInitialConfig = () => {
    const initial = {};
    CONFIG_SCHEMA.forEach((cfg) => {
      initial[cfg.key] = config[cfg.key] ?? cfg.defaultValue;
    });
    return initial;
  };

  const [configuration, setConfiguration] = useState(() => ({
    ...generateInitialConfig(),
    theme_config: config?.theme_config || defaultUserTheme,
    tools_id: config?.tools_id || [],
    pre_tool_id: config?.pre_tool_id || null,
    post_tool_id: config?.post_tool_id || null,
    variables_path: config?.variables_path || {},
    models: config?.models || {},
    apikey_object_id: integrationData?.apikey_object_id || {},
    prompt: config.prompt || {},
  }));
  const [theme, setTheme] = useState(config?.theme_config || defaultUserTheme);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear isEmbedUser from Redux to prevent it from affecting main layout
      dispatch(setEmbedUserDetailsAction({ isEmbedUser: false }));
    };
  }, [dispatch]);

  // Expose save handler to parent via ref
  useEffect(() => {
    if (onSaveRef) onSaveRef.current = () => handleSave(configuration, theme);
  });

  // Save to backend
  const handleSave = useCallback(
    async (configToSave, themeToSave) => {
      try {
        setIsSaving(true);
        const { apikey_object_id, ...restConfig } = configToSave;
        const dataToSend = {
          folder_id: data?.folder_id,
          orgId: data?.org_id,
          ...(apikey_object_id !== undefined && { apikey_object_id }),
          config: {
            ...restConfig,
            theme_config: themeToSave,
          },
        };
        await dispatch(updateIntegrationDataAction(data?.org_id, dataToSend));
        setHasUnsavedChanges(false);
        setReloadTrigger((prev) => prev + 1);
        toast.success("Configuration saved");
      } catch (error) {
        console.error("Failed to save configuration:", error);
        toast.error("Failed to save configuration");
      } finally {
        setIsSaving(false);
      }
    },
    [data?.folder_id, data?.org_id, dispatch]
  );

  // For toggles/selects — update state + send preview immediately
  const handleConfigChange = (key, value) => {
    setConfiguration((prev) => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
    window.GtwyEmbed?.sendDataToGtwy({ [key]: value });
  };

  // For text inputs (models, prompt) — only update state on change
  const handleConfigChangeStateOnly = (key, value) => {
    setConfiguration((prev) => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  };

  // Called on blur for text inputs — send preview update
  const handleConfigBlur = (key, value) => {
    window.GtwyEmbed?.sendDataToGtwy({ [key]: value });
  };

  // For theme color pickers — only update state on change (fires continuously while dragging)
  const handleColorChange = (mode, token, hexValue) => {
    const oklchValue = hexToOklchString(hexValue);
    const newTheme = {
      ...theme,
      [mode]: {
        ...theme[mode],
        [token]: oklchValue,
      },
    };
    setTheme(newTheme);
    setHasUnsavedChanges(true);
  };

  // Called on blur of color picker — send preview update with final theme
  const handleColorBlur = (currentTheme) => {
    window.GtwyEmbed?.sendDataToGtwy({ theme_config: currentTheme });
  };

  const handleThemeReset = () => {
    const resetTheme = JSON.parse(JSON.stringify(defaultUserTheme));
    setTheme(resetTheme);
    setConfiguration((prev) => ({
      ...prev,
      theme_config: resetTheme,
    }));
    handleSave(configuration, resetTheme);
  };

  // Listen for viasocket tool creation/update events — auto-connect tool/pretool to this integration
  useEffect(() => {
    const handleMessage = async (e) => {
      if (e.data?.metadata?.type !== "tool") return;
      if (!e?.data?.webhookurl) return;

      const dataToSend = { ...e.data, status: e?.data?.action };
      dispatch(integrationAction(dataToSend, data?.org_id));

      if (e?.data?.action === "deleted") {
        const deletedScriptId = e?.data?.id;
        const matchedFn = Object.values(functionData).find((fn) => fn.script_id === deletedScriptId);
        const matchedId = matchedFn?._id;

        if (matchedId) {
          const currentTools = configuration.tools_id || [];
          if (currentTools.includes(matchedId)) {
            handleConfigChange(
              "tools_id",
              currentTools.filter((id) => id !== matchedId)
            );
          }
          if (configuration.pre_tool_id === matchedId) {
            handleConfigChange("pre_tool_id", null);
          }
          if (configuration.post_tool_id === matchedId) {
            handleConfigChange("post_tool_id", null);
          }
          dispatch(deleteFunctionAction({ script_id: deletedScriptId, orgId: data?.org_id, functionId: matchedId }));
        }
        return;
      }

      if (e?.data?.action === "published" || e?.data?.action === "updated") {
        const dataFromEmbed = {
          url: e?.data?.webhookurl,
          desc: e?.data?.description || e?.data?.title,
          id: e?.data?.id,
          status: e?.data?.action,
          title: e?.data?.title,
          openaiToolJson: e?.data?.openaiToolJson,
        };

        const createdTool = await dispatch(createApiAction(data?.org_id, dataFromEmbed));
        if (!createdTool?._id) return;

        if (e?.data?.metadata?.createFrom === "preFunction") {
          handleConfigChange("pre_tool_id", createdTool._id);
        } else if (e?.data?.metadata?.createFrom === "postFunction") {
          handleConfigChange("post_tool_id", createdTool._id);
        } else if (e?.data?.metadata?.createFrom === "tool") {
          const currentTools = configuration.tools_id || [];
          if (!currentTools.includes(createdTool._id)) {
            handleConfigChange("tools_id", [...currentTools, createdTool._id]);
          }
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [
    data?.org_id,
    configuration.tools_id,
    configuration.pre_tool_id,
    configuration.post_tool_id,
    functionData,
    dispatch,
  ]);

  // Manual reload function
  const handleManualReload = () => {
    setReloadTrigger((prev) => prev + 1);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // State to track if portal target is ready
  const [portalTarget, setPortalTarget] = useState(null);

  useEffect(() => {
    if (!isConfigMode) {
      setPortalTarget(null);
      return;
    }

    const timer = setTimeout(() => {
      const targetContainer = document.getElementById("config-sidebar-content");
      if (targetContainer) {
        setPortalTarget(targetContainer);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      setPortalTarget(null);
    };
  }, [isConfigMode]);

  // Group configs by section
  const groupedConfigs = CONFIG_SCHEMA.reduce((groups, cfg) => {
    const section = cfg.section || "General";
    if (!groups[section]) groups[section] = [];
    groups[section].push(cfg);
    return groups;
  }, {});

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pt-6 px-8">
        <h3 className="text-lg font-semibold">Live Preview</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleManualReload}
            data-testid="embed-config-reload-button"
            className="btn btn-ghost btn-xs gap-1"
            title="Reload embed"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Embed Preview Container */}
      <EmbedPreview
        embedToken={embedToken}
        showHeader={false}
        parentId="alert-embed-parent"
        reloadTrigger={reloadTrigger}
        isLoading={!embedToken}
      />

      {/* Configuration Settings - Portal to parent sidebar when in config mode */}
      {isConfigMode &&
        portalTarget &&
        createPortal(
          <div className="space-y-3">
            {/* Save Button */}
            <div className="flex sticky top-0 bg-base-100 items-center justify-between pb-2 border-b border-base-300">
              <span className="text-xs text-base-content/60">
                {hasUnsavedChanges ? "Unsaved changes" : "All changes saved"}
              </span>
              <button
                data-testid="embed-config-save-button"
                className="btn btn-primary btn-xs gap-1"
                onClick={() => handleSave(configuration, theme)}
                disabled={isSaving || !hasUnsavedChanges}
              >
                {isSaving ? <span className="loading loading-spinner loading-xs"></span> : <Save className="h-3 w-3" />}
                Save
              </button>
            </div>
            {Object.entries(groupedConfigs).map(([sectionName, configs]) => (
              <div key={sectionName}>
                <h5 className="text-[10px] font-semibold text-base-content/60 uppercase tracking-wider mb-2">
                  {sectionName}
                </h5>
                <div className="space-y-2">
                  {configs.map((config) => (
                    <React.Fragment key={config.key}>
                      <div className="bg-base-200 rounded-lg p-2">
                        <label
                          className={`flex items-center justify-between ${config.type === "toggle" ? "cursor-pointer" : ""}`}
                        >
                          <span className="text-xs font-medium flex-1">{config.label}</span>
                          {config.type === "toggle" && (
                            <input
                              autoComplete="off"
                              data-testid={`embed-config-toggle-${config.key}`}
                              type="checkbox"
                              className="toggle toggle-xs"
                              checked={configuration[config.key] || false}
                              onChange={(e) => handleConfigChange(config.key, e.target.checked)}
                            />
                          )}
                        </label>
                        {config.type === "select" && (
                          <select
                            data-testid={
                              config.key === "themeMode"
                                ? "embed-config-theme-mode-select"
                                : config.key === "slide"
                                  ? "embed-config-slide-position-select"
                                  : `embed-config-select-${config.key}`
                            }
                            className="select select-bordered select-xs w-full mt-1"
                            value={configuration[config.key] ?? config.defaultValue}
                            onChange={(e) => handleConfigChange(config.key, e.target.value)}
                          >
                            {config.options?.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                      {/* Pre-Tool config inline after hidePreTool toggle */}
                      {config.key === "hidePreTool" && configuration.hidePreTool && (
                        <div className="p-2 bg-base-200 rounded-lg border border-base-300">
                          <ToolsConfiguration
                            singleToolMode={true}
                            selectedToolId={configuration.pre_tool_id}
                            onToolChange={(toolId) => handleConfigChange("pre_tool_id", toolId)}
                            orgId={data?.org_id}
                            params={{ org_id: data?.org_id }}
                            configuration={configuration}
                            onConfigChange={handleConfigChange}
                            title="Pre-Tool Configuration"
                            modalType={MODAL_TYPE.PRE_FUNCTION_PARAMETER_MODAL}
                          />
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>

                {/* Show API Keys input when addDefaultApiKeys is enabled in Display Settings */}
                {sectionName === "Display Settings" && configuration.addDefaultApiKeys && (
                  <div className="mt-3 p-3 bg-base-200 rounded-lg border border-base-300">
                    <ApiKeysInput configuration={configuration} onChange={handleConfigChange} orgId={data?.org_id} />
                  </div>
                )}

                {sectionName !== Object.keys(groupedConfigs)[Object.keys(groupedConfigs).length - 1] && (
                  <div className="divider my-2"></div>
                )}
              </div>
            ))}

            {/* Models Settings */}
            <div className="divider my-2"></div>
            <div>
              <h5 className="text-[10px] font-semibold text-base-content/60 uppercase tracking-wider mb-2">
                Model Settings
              </h5>
              <ModelCustomization
                value={configuration.models || {}}
                onChange={handleConfigChangeStateOnly}
                onBlur={handleConfigBlur}
              />
            </div>

            {/* Embed Prompt Builder */}
            <div className="divider my-2"></div>
            <EmbedPromptBuilder
              key={data?.embed_id}
              configuration={configuration}
              onChange={(promptValue) => handleConfigChangeStateOnly("prompt", promptValue)}
              onPromptBlur={(promptValue) => handleConfigBlur("prompt", promptValue)}
              onConfigChange={handleConfigChangeStateOnly}
            />

            {/* Tools Configuration */}
            <div className="divider my-2"></div>
            <ToolsConfiguration
              selectedTools={configuration.tools_id || []}
              onToolsChange={(tools) => handleConfigChange("tools_id", tools)}
              orgId={data?.org_id}
              params={{ org_id: data?.org_id }}
              configuration={configuration}
              onConfigChange={handleConfigChange}
              modalType={MODAL_TYPE.TOOL_FUNCTION_PARAMETER_MODAL}
            />

            {/* Post Tool Configuration */}
            <div className="divider my-2"></div>
            <ToolsConfiguration
              singleToolMode={true}
              selectedToolId={configuration.post_tool_id}
              onToolChange={(toolId) => handleConfigChange("post_tool_id", toolId)}
              orgId={data?.org_id}
              params={{ org_id: data?.org_id }}
              configuration={configuration}
              onConfigChange={handleConfigChange}
              title="Post-Tool Configuration"
              modalType={MODAL_TYPE.POST_FUNCTION_PARAMETER_MODAL}
            />
            <p className="text-xs text-warning mt-1">⚠️ Post-Tool won't run when streaming is enabled.</p>

            {/* Theme Palette Section */}
            <div className="border-t border-base-300 pt-3 mt-3">
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-[10px] font-semibold text-base-content/60 uppercase tracking-wider">
                  Theme Palette
                </h5>
                <button className="btn btn-outline btn-xs" onClick={handleThemeReset} type="button">
                  Reset
                </button>
              </div>
              <ThemePaletteEditor
                theme={theme}
                onColorChange={handleColorChange}
                onColorBlur={handleColorBlur}
                defaultTheme={defaultUserTheme}
              />
            </div>
          </div>,
          portalTarget
        )}
    </div>
  );
};

export default ConfigurationTab;
