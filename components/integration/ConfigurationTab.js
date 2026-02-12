"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useDispatch } from "react-redux";
import { useCustomSelector } from "@/customHooks/customSelector";
import { updateIntegrationDataAction } from "@/store/action/integrationAction";
import { setEmbedUserDetailsAction } from "@/store/action/appInfoAction";
import { toast } from "react-toastify";
import { RefreshCw } from "lucide-react";
import ThemePaletteEditor, { hexToOklchString } from "./ThemePaletteEditor";
import defaultUserTheme from "@/public/themes/default-user-theme.json";
import EmbedPreview from "./EmbedPreview";

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
    key: "showAgentTypeOnCreateAgent",
    type: "toggle",
    label: "Show Agent Type on Create Agent",
    description: "Display agent type on create agent",
    defaultValue: true,
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

// API Keys Input Component
const ApiKeysInput = ({ configuration, onChange, orgId }) => {
  const SERVICES = useCustomSelector((state) => state?.serviceReducer?.services);

  const { apikeydata } = useCustomSelector((state) => {
    const apikeys = state?.apiKeysReducer?.apikeys?.[orgId] || [];
    return { apikeydata: apikeys };
  });

  const handleApiKeyChange = (serviceKey, value) => {
    const currentApiKeys = configuration?.apikey_object_id || {};
    onChange("apikey_object_id", {
      ...currentApiKeys,
      [serviceKey]: value,
    });
  };

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-base-content mb-3">Configure API Keys for Services</div>

      {Array.isArray(SERVICES)
        ? SERVICES.map(({ value: serviceKey, displayName }) => {
            const selectedId = configuration?.apikey_object_id?.[serviceKey] || "";
            const serviceApiKeys = (apikeydata || []).filter((apiKey) => apiKey?.service === serviceKey);

            return (
              <div key={serviceKey} className="flex items-center gap-3">
                <div className="w-32 text-sm font-medium text-base-content">{displayName}:</div>

                <select
                  className="select select-bordered select-sm w-full"
                  value={selectedId}
                  onChange={(e) => handleApiKeyChange(serviceKey, e.target.value)}
                >
                  <option value="" disabled>
                    Select API key
                  </option>
                  {serviceApiKeys.map((apiKey) => (
                    <option key={apiKey._id} value={apiKey._id}>
                      {apiKey.name}
                    </option>
                  ))}
                </select>
              </div>
            );
          })
        : null}
    </div>
  );
};

const ConfigurationTab = ({ data, isConfigMode }) => {
  const dispatch = useDispatch();
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [autoReload, setAutoReload] = useState(true);
  const saveTimeoutRef = useRef(null);

  const { embedToken } = useCustomSelector((state) => ({
    embedToken: state?.integrationReducer?.embedTokens?.[data?.folder_id],
  }));

  const integrationData = useCustomSelector((state) =>
    state?.integrationReducer?.integrationData?.[data?.org_id]?.find((f) => f.folder_id === data?.embed_id)
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
  }));

  const [theme, setTheme] = useState(config?.theme_config || defaultUserTheme);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear isEmbedUser from Redux to prevent it from affecting main layout
      dispatch(setEmbedUserDetailsAction({ isEmbedUser: false }));
    };
  }, [dispatch]);

  // Auto-save function with API call and conditional script reload
  const autoSave = useCallback(
    async (configToSave, themeToSave, shouldReload = autoReload) => {
      try {
        setIsSaving(true);
        const dataToSend = {
          folder_id: data?.folder_id,
          orgId: data?.org_id,
          config: {
            ...configToSave,
            theme_config: themeToSave,
          },
        };

        await dispatch(updateIntegrationDataAction(data?.org_id, dataToSend));

        // Trigger embed script reload only if auto-reload is enabled
        if (shouldReload) {
          setReloadTrigger((prev) => prev + 1);
        }
      } catch (error) {
        console.error("Failed to save configuration:", error);
        toast.error("Failed to save configuration");
      } finally {
        setIsSaving(false);
      }
    },
    [data?.folder_id, data?.org_id, dispatch, autoReload]
  );

  const handleConfigChange = (key, value) => {
    const newConfig = {
      ...configuration,
      [key]: value,
    };
    setConfiguration(newConfig);

    // Debounce auto-save with API call and reload
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      autoSave(newConfig, theme);
    }, 1000);
  };

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

    // Debounce auto-save with API call and reload
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      autoSave(configuration, newTheme);
    }, 1000);
  };

  const handleThemeReset = () => {
    const resetTheme = JSON.parse(JSON.stringify(defaultUserTheme));
    setTheme(resetTheme);
    setConfiguration((prev) => ({
      ...prev,
      theme_config: resetTheme,
    }));

    // Auto-save immediately on reset with API call and conditional reload
    autoSave(configuration, resetTheme);
  };

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
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-primary">Live Preview</h3>
          <div className="flex items-center gap-2">
            <div className="form-control">
              <label className="label cursor-pointer gap-2 py-0">
                <span className="label-text text-xs">Auto</span>
                <input
                  type="checkbox"
                  className="toggle toggle-xs toggle-primary"
                  checked={autoReload}
                  onChange={(e) => setAutoReload(e.target.checked)}
                />
              </label>
            </div>
            {!autoReload && (
              <button
                onClick={handleManualReload}
                className="btn btn-ghost btn-xs gap-1"
                title="Reload embed"
                disabled={isSaving}
              >
                <RefreshCw className="h-4 w-4" />
                Reload
              </button>
            )}
          </div>
        </div>
        {isSaving && (
          <span className="text-xs text-base-content/60 flex items-center gap-2">
            <span className="loading loading-spinner loading-xs"></span>
            Saving...
          </span>
        )}
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
            {Object.entries(groupedConfigs).map(([sectionName, configs]) => (
              <div key={sectionName}>
                <h5 className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-2">{sectionName}</h5>
                <div className="space-y-2">
                  {configs.map((config) => (
                    <div key={config.key} className="bg-base-200 rounded-lg p-2">
                      <label
                        className={`flex items-center justify-between ${config.type === "toggle" ? "cursor-pointer" : ""}`}
                      >
                        <span className="text-xs font-medium flex-1">{config.label}</span>
                        {config.type === "toggle" && (
                          <input
                            type="checkbox"
                            className="toggle toggle-xs toggle-primary"
                            checked={configuration[config.key] || false}
                            onChange={(e) => handleConfigChange(config.key, e.target.checked)}
                          />
                        )}
                      </label>
                      {config.type === "select" && (
                        <select
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

            {/* Theme Palette Section */}
            <div className="border-t border-base-300 pt-3 mt-3">
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-[10px] font-semibold text-primary uppercase tracking-wider">Theme Palette</h5>
                <button className="btn btn-outline btn-xs" onClick={handleThemeReset} type="button">
                  Reset
                </button>
              </div>
              <ThemePaletteEditor theme={theme} onColorChange={handleColorChange} defaultTheme={defaultUserTheme} />
            </div>
          </div>,
          portalTarget
        )}
    </div>
  );
};

export default ConfigurationTab;
