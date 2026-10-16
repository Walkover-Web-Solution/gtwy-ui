"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useDispatch } from "react-redux";
import { useCustomSelector } from "@/customHooks/customSelector";
import { updateIntegrationDataAction } from "@/store/action/integrationAction";
import { createApiAction, integrationAction, deleteFunctionAction } from "@/store/action/bridgeAction";
import { setEmbedUserDetailsAction } from "@/store/action/appInfoAction";
import toast from "react-hot-toast";
import dynamic from "next/dynamic";
import { RefreshCw, Save } from "lucide-react";
import { HistoryIcon } from "@/components/Icons";
import ThemePaletteEditor, { hexToOklchString } from "./ThemePaletteEditor";
import EmbedPromptBuilder from "../gtwy_embed/EmbedPromptBuilder";
import ToolsConfiguration from "../gtwy_embed/ToolsConfiguration";
import ApiKeysInput from "../sliders/ApiKeysInput";
import defaultUserTheme from "@/public/themes/default-user-theme.json";
import EmbedPreview from "./EmbedPreview";
import { MODAL_TYPE, EMBED_FOLDER_HISTORY_FIELDS } from "@/utils/enums";
import { getServiceDisplayName, openModal, generateRandomID, toggleSidebar } from "@/utils/utility";
import CodeMirror from "@uiw/react-codemirror";
import { json, jsonParseLinter } from "@codemirror/lang-json";
import { linter, lintGutter } from "@codemirror/lint";
import { useThemeManager } from "@/customHooks/useThemeManager";
import JsonSchemaBuilderModal from "@/components/modals/JsonSchemaBuilderModal";
import JsonSchemaModal from "@/components/modals/JsonSchemaModal";
import FullscreenEditorModal, { FullscreenEditorButton } from "@/components/modals/FullscreenEditorModal";
import { setThreadIdForVersionReducer } from "@/store/reducer/bridgeReducer";
import { CONFIG_SCHEMA } from "@/jsonFiles/embedConfigSchema";

const ConfigHistorySlider = dynamic(() => import("@/components/sliders/ConfigHistorySlider"), { ssr: false });

const EMBED_HISTORY_SLIDER_ID = "embed-config-history-slider";

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
                          className="input input-xs w-full bg-base-200"
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
  const { actualTheme } = useThemeManager();
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isJsonSchemaFullscreen, setIsJsonSchemaFullscreen] = useState(false);
  const [aiMessages, setAiMessages] = useState([]);
  const [aiThreadId, setAiThreadId] = useState("");

  useEffect(() => {
    onUnsavedChanges?.(hasUnsavedChanges);
  }, [hasUnsavedChanges]);
  const saveTimeoutRef = useRef(null);

  const { embedToken, functionData } = useCustomSelector((state) => ({
    embedToken: state?.integrationReducer?.embedTokens?.[data?.folder_id],
    functionData: state?.bridgeReducer?.org?.[data?.org_id]?.functionData || {},
  }));

  const integrationData = useCustomSelector((state) =>
    state?.integrationReducer?.integrationData?.[data?.org_id]?.find((f) => f._id === data?.folder_id)
  );

  const config = integrationData?.config || {};
  const generateInitialConfig = () => {
    const initial = {};
    CONFIG_SCHEMA.forEach((cfg) => {
      if (cfg.key === "showPlayground") {
        if (config?.showPlayground !== undefined) {
          initial.showPlayground = config.showPlayground;
        } else if (config?.hideplayground !== undefined) {
          initial.showPlayground = !config.hideplayground;
        } else {
          initial.showPlayground = cfg.defaultValue;
        }
      } else {
        initial[cfg.key] = config[cfg.key] ?? cfg.defaultValue;
      }
    });
    return initial;
  };

  const [configuration, setConfiguration] = useState(() => {
    const initialConfig = generateInitialConfig();
    return {
      ...initialConfig,
      theme_config: config?.theme_config || defaultUserTheme,
      tools_id: config?.tools_id || [],
      pre_tool_id: config?.pre_tool_id || null,
      post_tool: config?.post_tool || null,
      variables_path: config?.variables_path || {},
      models: config?.models || {},
      apikey_object_id: integrationData?.apikey_object_id || {},
      prompt: config.prompt || {},
      // If showResponseType is false, response_type should be null
      response_type: !initialConfig.showResponseType === false ? null : config?.response_type || {},
    };
  });
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
    // `extra` carries anything sent outside `config` — a reverted_from_id, or a
    // folder-level field like name that is not part of the config panel's state.
    async (configToSave, themeToSave, extra = {}) => {
      try {
        setIsSaving(true);
        const { apikey_object_id, ...restConfig } = configToSave;
        // Preserve compatibility with old `hideplayground` key by also writing its inverse
        const configForSend = { ...restConfig };
        if (configForSend.showPlayground !== undefined) {
          configForSend.hideplayground = !configForSend.showPlayground;
        }

        // When showResponseType is on, folder-level response_type must be null
        if (configForSend.showResponseType === true) {
          configForSend.response_type = null;
        }

        const dataToSend = {
          folder_id: data?.folder_id,
          orgId: data?.org_id,
          ...(apikey_object_id !== undefined && { apikey_object_id }),
          config: {
            ...configForSend,
            theme_config: themeToSave,
          },
          ...extra,
        };
        await dispatch(updateIntegrationDataAction(data?.org_id, dataToSend));
        setHasUnsavedChanges(false);
        setReloadTrigger((prev) => prev + 1);
        toast.success("Configuration saved");
        return true;
      } catch (error) {
        console.error(error);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [data?.folder_id, data?.org_id, dispatch]
  );

  // Revert one history entry. The embed is saved whole, so a revert is an ordinary
  // save of the current config with a single key put back to its previous value —
  // sending only that key would wipe everything else.
  const handleRevertHistory = useCallback(
    async (item) => {
      const type = item?.type;
      if (!type) return false;
      const previous = item?.previous_value ?? null;
      const extra = { ...(item?.id != null && { reverted_from_id: item.id }) };

      if (type === "theme_config") {
        const revertedTheme = previous || defaultUserTheme;
        setTheme(revertedTheme);
        return handleSave(configuration, revertedTheme, extra);
      }
      // apikey_object_id is folder-level on the server but is held in `configuration`
      // here, so it reverts through the config branch like every toggle does.
      if (EMBED_FOLDER_HISTORY_FIELDS.includes(type) && type !== "apikey_object_id") {
        return handleSave(configuration, theme, { ...extra, [type]: previous });
      }

      const reverted = { ...configuration, [type]: previous };
      setConfiguration(reverted);
      return handleSave(reverted, theme, extra);
    },
    [configuration, theme, handleSave]
  );

  const openHistory = () => toggleSidebar(EMBED_HISTORY_SLIDER_ID, "right");

  // For toggles/selects — update state + send preview immediately
  const handleConfigChange = (key, value) => {
    setConfiguration((prev) => {
      const updated = { ...prev, [key]: value };

      // When showResponseType is turned off, set response_type to null
      if (key === "showResponseType" && value === false) {
        updated.response_type = null;
      }

      return updated;
    });
    setHasUnsavedChanges(true);

    // Send the appropriate data to preview
    const dataToSend = { [key]: value };
    if (key === "showResponseType" && value === false) {
      dataToSend.response_type = null;
    }

    window.GtwyEmbed?.sendDataToGtwy(dataToSend);
  };

  // Special handler for post_tool changes (nested object format)
  const handlePostToolChange = (toolId) => {
    if (!toolId) {
      const postToolValue = null;
      setConfiguration((prev) => ({ ...prev, post_tool: postToolValue }));
      setHasUnsavedChanges(true);
      window.GtwyEmbed?.sendDataToGtwy({ post_tool: postToolValue });
    } else {
      const fn = functionData?.[toolId];
      const postToolValue = {
        id: toolId,
        script_id: fn?.script_id || toolId,
        args: {},
      };
      setConfiguration((prev) => ({ ...prev, post_tool: postToolValue }));
      setHasUnsavedChanges(true);
      window.GtwyEmbed?.sendDataToGtwy({ post_tool: postToolValue });
    }
  };

  // Special handler for post_tool config/args changes
  const handlePostToolConfigChange = (key, value) => {
    if (key === "variables_path") {
      const scriptId = configuration.post_tool?.script_id;

      // If post_tool doesn't exist, this means it was already removed by handlePostToolChange
      if (!configuration.post_tool?.id) {
        return;
      }

      // If scriptId exists, extract the args from the wrapped structure
      // ToolsConfiguration wraps it as { [script_id]: args }
      // We need to unwrap it and store args directly as flat key-value pairs
      if (scriptId && value?.[scriptId]) {
        const actualArgs = value[scriptId];

        const updatedPostTool = {
          id: configuration.post_tool.id,
          script_id: scriptId,
          args: actualArgs, // Store args as flat key-value pairs
        };
        setConfiguration((prev) => ({ ...prev, post_tool: updatedPostTool }));
        setHasUnsavedChanges(true);
        window.GtwyEmbed?.sendDataToGtwy({ post_tool: updatedPostTool });
      }
    } else {
      handleConfigChange(key, value);
    }
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
            <div className="flex sticky top-0 z-20 bg-base-100 items-center justify-between pb-2 border-b border-base-300">
              <span className="text-xs text-base-content/60">
                {hasUnsavedChanges ? "Unsaved changes" : "All changes saved"}
              </span>
              <div className="flex items-center gap-1">
                {/* History is read-only, so it stays reachable even with nothing to save. */}
                <button
                  data-testid="embed-config-history-button"
                  className="btn btn-ghost btn-xs p-1"
                  onClick={openHistory}
                  title="Updates History"
                >
                  <HistoryIcon size={14} />
                </button>
                <button
                  data-testid="embed-config-save-button"
                  className="btn btn-primary btn-xs gap-1"
                  onClick={() => handleSave(configuration, theme)}
                  disabled={isSaving || !hasUnsavedChanges}
                >
                  {isSaving ? (
                    <span className="loading loading-spinner loading-xs"></span>
                  ) : (
                    <Save className="h-3 w-3" />
                  )}
                  Save
                </button>
              </div>
            </div>
            {Object.entries(groupedConfigs).map(([sectionName, configs]) => (
              <div key={sectionName}>
                <h5 className="text-[10px] font-semibold text-base-content/60 uppercase tracking-wider mb-2">
                  {sectionName}
                </h5>
                <div className="space-y-2">
                  {configs.map((config) => {
                    if (config.dependsOn && !configuration[config.dependsOn]) {
                      return null;
                    }
                    return (
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
                              className="select select-xs w-full mt-1"
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
                        {/* JSON Schema textarea when showResponseType is toggled off */}
                        {config.key === "showResponseType" && !configuration.showResponseType && (
                          <div className="p-2 bg-base-200 rounded-lg border border-base-300">
                            <label className="text-xs font-medium block mb-2">JSON Schema</label>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className="capitalize font-medium text-primary cursor-pointer hover:opacity-80 transition-opacity text-xs"
                                  onClick={() => openModal(MODAL_TYPE.JSON_SCHEMA_VISUAL_BUILDER)}
                                >
                                  Build Visually
                                </span>
                                <span className="text-xs text-base-content/50">|</span>
                                <span
                                  className="capitalize font-medium text-primary cursor-pointer hover:opacity-80 transition-opacity text-xs"
                                  onClick={() => {
                                    if (!aiThreadId) {
                                      const newThreadId = generateRandomID();
                                      setAiThreadId(newThreadId);
                                      setThreadIdForVersionReducer &&
                                        dispatch(
                                          setThreadIdForVersionReducer({
                                            bridgeId: data?.folder_id,
                                            threadId: newThreadId,
                                          })
                                        );
                                    }
                                    openModal(MODAL_TYPE.JSON_SCHEMA);
                                  }}
                                >
                                  Build with AI
                                </span>
                                <span className="text-xs text-base-content/50">|</span>
                                <FullscreenEditorButton
                                  tooltip="Open JSON schema in fullscreen"
                                  className=""
                                  onClick={() => setIsJsonSchemaFullscreen(true)}
                                  isjson={true}
                                />
                              </div>
                            </div>
                            <div
                              data-testid="embed-config-json-schema-codemirror"
                              className="relative z-0 border border-base-300 rounded-md overflow-hidden"
                            >
                              <CodeMirror
                                value={(() => {
                                  // When showResponseType is false, show empty if response_type is null
                                  if (configuration?.response_type === null) return "";
                                  const schemaValue = configuration?.response_type?.json_schema;
                                  if (schemaValue === undefined || schemaValue === null) return "";
                                  return typeof schemaValue === "object"
                                    ? JSON.stringify(schemaValue, null, 2)
                                    : schemaValue;
                                })()}
                                height="160px"
                                extensions={[json(), linter(jsonParseLinter()), lintGutter()]}
                                theme={actualTheme}
                                placeholder=""
                                className="text-xs"
                                onChange={(val) => {
                                  const raw = val ?? "";
                                  if (raw.trim() === "") {
                                    // Set response_type to null when empty (not removing the key)
                                    setConfiguration((prev) => ({ ...prev, response_type: null }));
                                    setHasUnsavedChanges(true);
                                    window.GtwyEmbed?.sendDataToGtwy({ response_type: null });
                                    return;
                                  }
                                  let schemaToStore = raw;
                                  try {
                                    schemaToStore = JSON.parse(raw);
                                  } catch {
                                    // keep raw string while user is typing invalid JSON
                                  }
                                  handleConfigChange("response_type", {
                                    type: "json_object",
                                    json_schema: schemaToStore,
                                  });
                                }}
                              />
                            </div>
                          </div>
                        )}
                        {/* Visual Builder Modal */}
                        <JsonSchemaBuilderModal
                          params={{ id: data?.folder_id }}
                          searchParams={{ version: "latest" }}
                          isReadOnly={false}
                          schemaKey="json_schema"
                          modalId={MODAL_TYPE.JSON_SCHEMA_VISUAL_BUILDER}
                          title="Build JSON Schema Visually"
                          hideName={false}
                          schema={configuration?.response_type?.json_schema}
                          responseType={configuration?.response_type}
                          onSave={(schema) => {
                            handleConfigChange("response_type", {
                              type: "json_object",
                              json_schema: schema,
                            });
                            setHasUnsavedChanges(true);
                          }}
                        />
                        {/* AI Builder Modal - Using JsonSchemaModal */}
                        <JsonSchemaModal
                          messages={aiMessages}
                          setMessages={setAiMessages}
                          thread_id={aiThreadId}
                          onResetThreadId={() => setAiThreadId("")}
                          schema={configuration?.response_type?.json_schema}
                          onSaveSchema={(schema) => {
                            handleConfigChange("response_type", {
                              type: "json_object",
                              json_schema: schema,
                            });
                            setHasUnsavedChanges(true);
                          }}
                        />
                        {/* Fullscreen JSON Schema Editor Modal */}
                        {isJsonSchemaFullscreen && (
                          <FullscreenEditorModal
                            modalId={MODAL_TYPE.JSON_SCHEMA_FULLSCREEN}
                            isOpen={isJsonSchemaFullscreen}
                            onClose={() => setIsJsonSchemaFullscreen(false)}
                            title="JSON Schema Editor"
                            value={(() => {
                              const schemaValue = configuration?.response_type?.json_schema;
                              if (schemaValue === undefined || schemaValue === null) return "";
                              return typeof schemaValue === "object"
                                ? JSON.stringify(schemaValue, null, 2)
                                : schemaValue;
                            })()}
                            onChange={(val) => {
                              const raw = val ?? "";
                              if (raw.trim() === "") {
                                setConfiguration((prev) => {
                                  const { response_type, ...rest } = prev;
                                  return rest;
                                });
                                setHasUnsavedChanges(true);
                                window.GtwyEmbed?.sendDataToGtwy({ response_type: undefined });
                                return;
                              }
                              let schemaToStore = raw;
                              try {
                                schemaToStore = JSON.parse(raw);
                              } catch {
                                // keep raw string while user is typing invalid JSON
                              }
                              handleConfigChange("response_type", {
                                type: "json_object",
                                json_schema: schemaToStore,
                              });
                            }}
                            onSave={(val) => {
                              const raw = val ?? "";
                              if (raw.trim() === "") {
                                setConfiguration((prev) => {
                                  const { response_type, ...rest } = prev;
                                  return rest;
                                });
                                setHasUnsavedChanges(true);
                                window.GtwyEmbed?.sendDataToGtwy({ response_type: undefined });
                                return;
                              }
                              let schemaToStore = raw;
                              try {
                                schemaToStore = JSON.parse(raw);
                              } catch {
                                // keep raw string while user is typing invalid JSON
                              }
                              handleConfigChange("response_type", {
                                type: "json_object",
                                json_schema: schemaToStore,
                              });
                              setHasUnsavedChanges(true);
                            }}
                            isJson={true}
                          />
                        )}
                        {/* Pre-Tool config inline after showPreTool toggle */}
                        {config.key === "showPreTool" && !configuration.showPreTool && (
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
                    );
                  })}
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
              selectedToolId={configuration.post_tool?.id || null}
              onToolChange={handlePostToolChange}
              orgId={data?.org_id}
              params={{ org_id: data?.org_id }}
              configuration={{
                ...configuration,
                // Wrap args with script_id for ToolsConfiguration to consume
                variables_path: configuration.post_tool?.script_id
                  ? { [configuration.post_tool.script_id]: configuration.post_tool.args || {} }
                  : {},
              }}
              onConfigChange={handlePostToolConfigChange}
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

      {/* An embed is its own config, so it is read with no version and no agent scope. */}
      <ConfigHistorySlider
        sliderId={EMBED_HISTORY_SLIDER_ID}
        variant="embed"
        configId={data?.folder_id}
        subtitle={integrationData?.name || data?.name}
        onRevert={handleRevertHistory}
      />
    </div>
  );
};

export default ConfigurationTab;
