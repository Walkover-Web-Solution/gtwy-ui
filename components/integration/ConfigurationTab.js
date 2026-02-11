"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useDispatch } from "react-redux";
import { useCustomSelector } from "@/customHooks/customSelector";
import { updateIntegrationDataAction, generateEmbedTokenAction } from "@/store/action/integrationAction";
import { setEmbedUserDetailsAction } from "@/store/action/appInfoAction";
import { toast } from "react-toastify";
import ThemePaletteEditor, { hexToOklchString } from "./ThemePaletteEditor";
import defaultUserTheme from "@/public/themes/default-user-theme.json";

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

// Config Input Component
const ConfigInput = ({ config, value, onChange }) => {
  const { key, type, label, description, options } = config;

  const renderInput = () => {
    switch (type) {
      case "toggle":
        return (
          <input
            type="checkbox"
            className="toggle toggle-sm toggle-primary"
            checked={value || false}
            onChange={(e) => onChange(key, e.target.checked)}
          />
        );

      case "select":
        return (
          <select
            className="select select-bordered select-sm w-full"
            value={value ?? config.defaultValue}
            onChange={(e) => onChange(key, e.target.value)}
          >
            {options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      default:
        return null;
    }
  };

  return (
    <div className="form-control bg-base-200 rounded-lg p-3">
      <label className={`label ${type === "toggle" ? "cursor-pointer" : ""} py-1`}>
        <span className="label-text text-sm font-medium">{label}</span>
        {type === "toggle" && renderInput()}
      </label>
      {type !== "toggle" && <div className="mt-2">{renderInput()}</div>}
      <p className="text-xs text-base-content/70 mt-1">{description}</p>
    </div>
  );
};

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

// Config Section Component
const ConfigSection = ({ title, configs, configuration, onChange, orgId }) => {
  return (
    <div className="space-y-3">
      <h5 className="text-sm font-semibold text-primary border-b border-base-300 pb-2">{title}</h5>
      <div className="space-y-3">
        {configs.map((config) => (
          <ConfigInput key={config.key} config={config} value={configuration[config.key]} onChange={onChange} />
        ))}
      </div>

      {/* Show API Keys input section when addDefaultApiKeys is enabled */}
      {title === "Display Settings" && configuration.addDefaultApiKeys && (
        <div className="mt-4 p-4 bg-base-200 rounded-lg border border-base-300">
          <ApiKeysInput configuration={configuration} onChange={onChange} orgId={orgId} />
        </div>
      )}
    </div>
  );
};

const ConfigurationTab = ({ data, isConfigMode }) => {
  const dispatch = useDispatch();
  const [embedToken, setEmbedToken] = useState("");
  const [isLoadingToken, setIsLoadingToken] = useState(false);
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const isLocalChangeRef = useRef(false);

  const { currentUser, reduxThemeConfig } = useCustomSelector((state) => ({
    currentUser: state.userDetailsReducer.userDetails,
    reduxThemeConfig: state.appInfoReducer?.embedUserDetails?.theme_config,
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

  // Reload embed when Redux theme_config changes (from external sources)
  useEffect(() => {
    if (reduxThemeConfig && !isLocalChangeRef.current) {
      setTheme(reduxThemeConfig);
      setReloadTrigger((prev) => prev + 1);
    }
    // Reset the flag after processing
    isLocalChangeRef.current = false;
  }, [reduxThemeConfig]);

  // Fetch embed token on component mount
  useEffect(() => {
    const fetchEmbedToken = async () => {
      if (embedToken) return; // Already loaded
      if (!data?.org_id || !data?.folder_id) {
        setIsLoadingToken(false);
        return;
      }

      try {
        setIsLoadingToken(true);
        const response = await dispatch(
          generateEmbedTokenAction({
            user_id: currentUser?.id || "test_user",
            folder_id: data.folder_id,
          })
        );

        if (response?.data?.embedToken) {
          setEmbedToken(response.data.embedToken);
        }
      } catch (error) {
        console.error("Error generating embed token:", error);
      } finally {
        setIsLoadingToken(false);
      }
    };

    fetchEmbedToken();
  }, [data?.org_id, data?.folder_id, currentUser?.id, embedToken, dispatch]);

  // Load embed script when token is available or when reload is triggered
  useEffect(() => {
    if (!embedToken) return;

    // Remove existing script if it exists (for reload)
    const existingScript = document.getElementById("gtwy-main-script");
    if (existingScript) {
      try {
        document.body.removeChild(existingScript);

        // Remove embed container if it exists
        const embedContainer = document.getElementById("iframe-viasocket-embed-parent-container");
        if (embedContainer && embedContainer.parentNode === document.body) {
          document.body.removeChild(embedContainer);
        }
      } catch (error) {
        console.warn("Error removing existing embed scripts:", error);
      }
    }

    // Create and load the embed script
    const script = document.createElement("script");
    script.id = "gtwy-main-script";
    script.setAttribute("embedToken", embedToken);
    script.src = "http://localhost:3000/gtwy_embed_local.js";
    script.setAttribute("parentId", "alert-embed-parent");
    script.setAttribute("defaultOpen", "true");
    document.body.appendChild(script);

    // Cleanup function when component unmounts
    return () => {
      try {
        const scriptElement = document.getElementById("gtwy-main-script");
        if (scriptElement && scriptElement.parentNode === document.body) {
          document.body.removeChild(scriptElement);
        }

        // Remove embed container if it exists
        const embedContainer = document.getElementById("iframe-viasocket-embed-parent-container");
        if (embedContainer && embedContainer.parentNode === document.body) {
          document.body.removeChild(embedContainer);
        }

        // Clear isEmbedUser from Redux to prevent it from affecting main layout
        dispatch(setEmbedUserDetailsAction({ isEmbedUser: false }));
      } catch (error) {
        console.warn("Error removing embed scripts:", error);
      }
    };
  }, [embedToken, reloadTrigger, dispatch]);

  // Manual save function to persist to database
  const handleManualSave = useCallback(async () => {
    try {
      setIsSaving(true);
      const dataToSend = {
        folder_id: data?.folder_id,
        orgId: data?.org_id,
        config: {
          ...configuration,
          theme_config: theme,
        },
      };

      await dispatch(updateIntegrationDataAction(data?.org_id, dataToSend));
      setHasUnsavedChanges(false);
      toast.success("Configuration saved successfully");
    } catch (error) {
      console.error("Failed to save configuration:", error);
      toast.error("Failed to save configuration");
    } finally {
      setIsSaving(false);
    }
  }, [data?.folder_id, data?.org_id, dispatch, configuration, theme]);

  const handleConfigChange = (key, value) => {
    const newConfig = {
      ...configuration,
      [key]: value,
    };
    setConfiguration(newConfig);
    setHasUnsavedChanges(true);

    // Send to embed immediately for live preview
    if (window.GtwyEmbed && window.GtwyEmbed.sendDataToGtwy) {
      window.GtwyEmbed.sendDataToGtwy({ [key]: value });
    }
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

    // Mark this as a local change to prevent reload loop
    isLocalChangeRef.current = true;

    setTheme(newTheme);
    setHasUnsavedChanges(true);

    // Send theme to embed immediately for live preview
    if (window.GtwyEmbed && window.GtwyEmbed.sendDataToGtwy) {
      window.GtwyEmbed.sendDataToGtwy({ theme_config: newTheme });
    }
  };

  const handleThemeReset = () => {
    const resetTheme = JSON.parse(JSON.stringify(defaultUserTheme));

    // Mark this as a local change to prevent reload loop
    isLocalChangeRef.current = true;

    setTheme(resetTheme);
    setConfiguration((prev) => ({
      ...prev,
      theme_config: resetTheme,
    }));
    setHasUnsavedChanges(true);

    // Send reset theme to embed immediately
    if (window.GtwyEmbed && window.GtwyEmbed.sendDataToGtwy) {
      window.GtwyEmbed.sendDataToGtwy({ theme_config: resetTheme });
    }
  };

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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-primary">Live Preview</h3>
        </div>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && !isSaving && <span className="text-xs text-warning">Unsaved changes</span>}
          {isSaving && (
            <span className="text-xs text-base-content/60 flex items-center gap-2">
              <span className="loading loading-spinner loading-xs"></span>
              Saving...
            </span>
          )}
          <button
            className="btn btn-primary btn-sm"
            onClick={handleManualSave}
            disabled={isSaving || !hasUnsavedChanges}
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Embed Preview Container */}
      {isLoadingToken ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <p className="text-sm text-base-content/70 mt-4">Loading embed preview...</p>
          </div>
        </div>
      ) : (
        <div id="alert-embed-parent" className="w-full h-full"></div>
      )}

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
