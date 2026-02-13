"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { CloseIcon } from "@/components/Icons";
import { Save, AlertTriangle } from "lucide-react";
import ConfirmationModal from "../UI/ConfirmationModal";
import { generateGtwyAccessTokenAction } from "@/store/action/orgAction";
import { useDispatch } from "react-redux";
import { useCustomSelector } from "@/customHooks/customSelector";
import { updateIntegrationDataAction } from "@/store/action/integrationAction";
import GenericTable from "../table/Table";
import CopyButton from "../copyButton/CopyButton";
import defaultUserTheme from "@/public/themes/default-user-theme.json";
import { closeModal, openModal } from "@/utils/utility";
import { MODAL_TYPE } from "@/utils/enums";
import EmbedPromptBuilder from "../gtwy_embed/EmbedPromptBuilder";
import ThemePaletteEditor from "../gtwy_embed/ThemePaletteEditor";
import ApiKeysInput from "./ApiKeysInput";
import ToolsConfiguration from "../gtwy_embed/ToolsConfiguration";
import { hexToOklchString } from "@/utils/colorUtils";
import {
  CONFIG_SCHEMA,
  cloneTheme,
  stringifyTheme,
  normalizeThemeConfig,
  sortObjectKeys,
  enforceThemeStructure,
  generateInitialConfig,
} from "@/utils/integrationSliderUtils";

// Configuration and theme utilities imported from integrationSliderUtils

// Generic Input Component
// ---------------------------------------------
const ConfigInput = ({ config, value, onChange }) => {
  const { key, type, label, description, options } = config;

  const renderInput = () => {
    switch (type) {
      case "toggle":
        return (
          <input
            id={`config-toggle-${key}`}
            type="checkbox"
            className="toggle toggle-sm"
            checked={value || false}
            onChange={(e) => onChange(key, e.target.checked)}
          />
        );

      case "select":
        return (
          <select
            id={`config-select-${key}`}
            className="select select-bordered select-primary w-full select-sm"
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
    <div className="form-control bg-base-200 rounded p-2">
      <label className={`label ${type === "toggle" ? "cursor-pointer" : ""} py-1`}>
        <span className="label-text text-sm">{label}</span>
        {type === "toggle" && renderInput()}
      </label>
      {type !== "toggle" && <div className="mt-1">{renderInput()}</div>}
      <p className="text-xs text-base-content/70 mt-1 pl-2">{description}</p>
    </div>
  );
};

// Configuration Section Component
// ---------------------------------------------
const ConfigSection = ({ title, configs, configuration, onChange, orgId, params }) => {
  return (
    <div className="space-y-2">
      <h5 className="text-sm font-semibold text-primary border-b border-base-300 pb-1">{title}</h5>
      <div className="space-y-2">
        {configs.map((config, index) => (
          <React.Fragment key={config.key}>
            <ConfigInput config={config} value={configuration[config.key]} onChange={onChange} />

            {/* Show Pre-Tool Configuration immediately after hidePreTool toggle */}
            {config.key === "hidePreTool" && configuration.hidePreTool && (
              <div className="mt-2 p-4 bg-base-200 rounded-lg border border-base-300">
                <ToolsConfiguration
                  singleToolMode={true}
                  selectedToolId={configuration.pre_tool_id}
                  onToolChange={(toolId) => onChange("pre_tool_id", toolId)}
                  orgId={orgId}
                  params={params}
                  configuration={configuration}
                  onConfigChange={onChange}
                  title="Pre-Tool Configuration"
                  modalType={MODAL_TYPE.PRE_FUNCTION_PARAMETER_MODAL}
                />
              </div>
            )}
          </React.Fragment>
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

function GtwyIntegrationGuideSlider({ data, handleCloseSlider }) {
  const dispatch = useDispatch();
  const [copied, setCopied] = useState({
    accessKey: false,
    jwtToken: false,
    script: false,
    functions: false,
    interfaceData: false,
    eventListener: false,
    metaUpdate: false,
    getDataUsingUserId: false,
  });
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedConfig, setLastSavedConfig] = useState(null);

  // Track previous prompt value to prevent unnecessary updates
  const prevPromptRef = useRef(null);

  // Get config and root-level data from Redux store
  const integrationData = useCustomSelector((state) =>
    state?.integrationReducer?.integrationData?.[data?.org_id]?.find((f) => f.folder_id === data?.embed_id)
  );

  const config = integrationData?.config;

  // Initialize configuration state
  const [configuration, setConfiguration] = useState(() => {
    const defaults = generateInitialConfig();
    const merged = config ? { ...defaults, ...config } : defaults;

    // Use root-level apikey_object_id if available, otherwise empty object
    // Only include API keys if addDefaultApiKeys is enabled in the saved config
    const apiKeyIds =
      merged.addDefaultApiKeys && integrationData?.apikey_object_id ? integrationData.apikey_object_id : {};

    // Read tools_id, pre_tool_id, variables_path from config only
    const toolsIds = merged.tools_id || [];
    const preToolId = merged.pre_tool_id || null;
    const variablesPath = merged.variables_path || {};

    const resolvedTheme = normalizeThemeConfig(merged.theme_config);

    return {
      ...merged,
      theme_config: resolvedTheme,
      apikey_object_id: apiKeyIds,
      tools_id: toolsIds,
      pre_tool_id: preToolId,
      variables_path: variablesPath,
      embed_id: data?.embed_id,
    };
  });

  // Initialize prevPromptRef with initial prompt value
  useEffect(() => {
    if (prevPromptRef.current === null && configuration?.prompt !== undefined) {
      prevPromptRef.current = configuration.prompt;
    }
  }, [configuration?.prompt]);

  const [themeEditorValue, setThemeEditorValue] = useState(stringifyTheme(cloneTheme(defaultUserTheme)));
  const themeEditorDiffers = useMemo(() => {
    try {
      const parsedEditor = JSON.parse(themeEditorValue);
      const sortedEditor = sortObjectKeys(parsedEditor);
      const sortedConfig = sortObjectKeys(configuration?.theme_config || {});
      return JSON.stringify(sortedEditor) !== JSON.stringify(sortedConfig);
    } catch {
      return false;
    }
  }, [themeEditorValue, configuration?.theme_config]);

  useEffect(() => {
    setConfiguration((prevConfig) => {
      const defaults = generateInitialConfig();
      const merged = config ? { ...defaults, ...config } : defaults;

      // Determine final API key IDs based on current and saved state
      let finalApiKeyIds = {};

      if (merged.addDefaultApiKeys) {
        // If addDefaultApiKeys is enabled in saved config, use saved API keys
        finalApiKeyIds = integrationData?.apikey_object_id || {};
      } else if (prevConfig?.addDefaultApiKeys && data?.embed_id === prevConfig?.embed_id) {
        // Only preserve current selections if it's the same integration
        // This prevents API key selections from carrying over to different integrations
        finalApiKeyIds = prevConfig.apikey_object_id || {};
      }
      // Otherwise, keep empty object (no API keys)

      // Read tools_id, pre_tool_id, variables_path from config only
      const toolsIds = merged.tools_id || [];
      const preToolId = merged.pre_tool_id || null;
      const variablesPath = merged.variables_path || {};

      const resolvedTheme = normalizeThemeConfig(merged.theme_config);
      const newConfig = {
        ...merged,
        theme_config: resolvedTheme,
        apikey_object_id: finalApiKeyIds,
        tools_id: toolsIds,
        pre_tool_id: preToolId,
        variables_path: variablesPath,
        embed_id: data?.embed_id,
      };

      // Set this as the last saved config if we have integration data (meaning it's saved)
      if (integrationData && config) {
        setLastSavedConfig(newConfig);
      }

      return newConfig;
    });
  }, [integrationData, config, data?.embed_id]);

  useEffect(() => {
    const themeSource = configuration?.theme_config
      ? cloneTheme(configuration.theme_config)
      : cloneTheme(defaultUserTheme);
    setThemeEditorValue(stringifyTheme(themeSource));
  }, [configuration?.theme_config]);

  const gtwyAccessToken = useCustomSelector(
    (state) => state?.userDetailsReducer?.organizations?.[data?.org_id]?.meta?.gtwyAccessToken || ""
  );

  useEffect(() => {
    if (data) {
      setIsOpen(true);
      const sidebar = document.getElementById("gtwy-integration-slider");
      if (sidebar) {
        sidebar.classList.remove("translate-x-full");
      }
    }
  }, [data]);

  // Update the data-unsaved-changes attribute whenever configChanged or themeEditorDiffers changes

  const handleClose = () => {
    // Check if there are unsaved changes
    if (configChanged || themeEditorDiffers) {
      openModal(MODAL_TYPE.UNSAVED_CHANGES_MODAL);
    } else {
      // No changes, close directly
      setIsOpen(false);
      handleCloseSlider();
    }
  };

  const handleConfirmClose = () => {
    // Completely reset the configuration state to its original values
    if (lastSavedConfig) {
      // Directly set the entire configuration state back to lastSavedConfig
      setConfiguration(JSON.parse(JSON.stringify(lastSavedConfig)));
    } else if (integrationData) {
      // If no lastSavedConfig, fall back to the original data from Redux
      const defaults = generateInitialConfig();
      const merged = integrationData.config ? { ...defaults, ...integrationData.config } : defaults;

      // Use root-level apikey_object_id if available, otherwise empty object
      const apiKeyIds =
        merged.addDefaultApiKeys && integrationData.apikey_object_id ? integrationData.apikey_object_id : {};

      const resolvedTheme = normalizeThemeConfig(merged.theme_config);

      // Set the entire configuration state
      setConfiguration({
        ...merged,
        apikey_object_id: apiKeyIds,
        theme_config: resolvedTheme,
      });
    }

    // Close modal and slider
    closeModal(MODAL_TYPE.UNSAVED_CHANGES_MODAL);
    setIsOpen(false);
    handleCloseSlider();
  };
  const handleSaveAndClose = async () => {
    // Save changes then close
    await handleConfigurationSave();
    closeModal(MODAL_TYPE.UNSAVED_CHANGES_MODAL);
    setIsOpen(false);
    handleCloseSlider();
  };

  const handleCopy = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setCopied((prev) => ({ ...prev, [key]: false }));
      }, 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const handleGenerateAccessKey = () => {
    dispatch(generateGtwyAccessTokenAction(data?.org_id));
  };

  const parseThemeEditorValue = () => {
    try {
      const parsed = JSON.parse(themeEditorValue);
      if (typeof parsed !== "object" || !parsed.light || !parsed.dark) {
        throw new Error("Theme JSON must include both 'light' and 'dark' objects");
      }
      enforceThemeStructure(parsed);
      return cloneTheme(parsed);
    } catch (err) {
      console.error("Failed to parse theme JSON:", err);
      return null;
    }
  };
  const handleThemeReset = () => {
    const resetTheme = cloneTheme(defaultUserTheme);
    setThemeEditorValue(stringifyTheme(resetTheme));
    setConfiguration((prev) => ({
      ...prev,
      theme_config: resetTheme,
    }));
  };

  const handlePaletteColorChange = (mode, token, hexColor) => {
    const oklchColor = hexToOklchString(hexColor, configuration?.theme_config?.[mode]?.[token]);
    setConfiguration((prev) => {
      const updatedTheme = cloneTheme(prev.theme_config);
      if (!updatedTheme[mode]) {
        updatedTheme[mode] = {};
      }
      updatedTheme[mode][token] = oklchColor;
      setThemeEditorValue(stringifyTheme(updatedTheme));
      return {
        ...prev,
        theme_config: updatedTheme,
      };
    });
  };

  const handleConfigurationSave = async () => {
    setIsSaving(true);
    try {
      const parsedTheme = parseThemeEditorValue();
      if (!parsedTheme) {
        return;
      }

      if (JSON.stringify(parsedTheme) !== JSON.stringify(configuration?.theme_config || {})) {
        setConfiguration((prev) => ({
          ...prev,
          theme_config: parsedTheme,
        }));
      }

      // Extract only apikey_object_id and embed_id from config (these go to root level)
      const { apikey_object_id, embed_id, ...restConfig } = configuration;

      // Config contains all settings including tools_id, pre_tool_id, variables_path
      const cleanedConfig = {
        ...restConfig,
        theme_config: parsedTheme,
      };

      // Build dataToSend - tools_id, pre_tool_id, variables_path stay in config
      const dataToSend = {
        folder_id: data?.embed_id,
        orgId: data?.org_id,
        config: cleanedConfig.config ? cleanedConfig.config : cleanedConfig,
      };

      // Only include apikey_object_id if addDefaultApiKeys is true
      if (configuration.addDefaultApiKeys) {
        dataToSend.apikey_object_id = apikey_object_id || {};
      }
      if (dataToSend.apikey_object_id && Object.keys(dataToSend.apikey_object_id).length === 0) {
        delete dataToSend.apikey_object_id;
        dataToSend.config.addDefaultApiKeys = false;
      }

      await dispatch(updateIntegrationDataAction(data?.org_id, dataToSend));

      // Store the saved configuration for change detection
      setLastSavedConfig({
        ...configuration,
        theme_config: parsedTheme,
        apikey_object_id: configuration.addDefaultApiKeys ? apikey_object_id || {} : {},
      });

      // Clear API keys from local state after successful save if addDefaultApiKeys is false
      if (!configuration.addDefaultApiKeys) {
        setConfiguration((prev) => ({
          ...prev,
          apikey_object_id: {},
        }));
      }
    } catch (error) {
      console.error("Failed to save configuration:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfigChange = (key, value) => {
    setConfiguration((prev) => {
      const currentValue = prev[key];

      // For prompt, do deep comparison to avoid unnecessary updates that cause sync loops
      if (key === "prompt") {
        // Check if this is the same value we just processed
        if (prevPromptRef.current !== null) {
          if (typeof prevPromptRef.current === "string" && typeof value === "string") {
            if (prevPromptRef.current === value) {
              return prev; // Same as what we just set, don't update
            }
          } else if (typeof prevPromptRef.current === "object" && typeof value === "object") {
            if (JSON.stringify(prevPromptRef.current) === JSON.stringify(value)) {
              return prev; // Same as what we just set, don't update
            }
          }
        }

        // Check if values are actually different from current
        if (typeof currentValue === "string" && typeof value === "string") {
          if (currentValue === value) {
            prevPromptRef.current = value;
            return prev; // No change, don't update
          }
        } else if (
          typeof currentValue === "object" &&
          typeof value === "object" &&
          currentValue !== null &&
          value !== null
        ) {
          // Both are objects, compare them
          const currentStr = JSON.stringify(currentValue);
          const newStr = JSON.stringify(value);
          if (currentStr === newStr) {
            prevPromptRef.current = value;
            return prev; // No change, don't update
          }
        }
        // Different types or actually different values - update
        prevPromptRef.current = value;
      } else if (currentValue === value) {
        // For other keys, simple comparison
        return prev; // No change, don't update
      }

      return {
        ...prev,
        [key]: value,
      };
    });
  };

  // Check if configuration has changed from the last saved state
  const isConfigChanged = () => {
    // If we have a last saved config, compare against that
    if (lastSavedConfig) {
      const normalizedCurrent = {
        ...configuration,
        apikey_object_id: configuration.apikey_object_id || {},
      };

      const normalizedSaved = {
        ...lastSavedConfig,
        apikey_object_id: lastSavedConfig.apikey_object_id || {},
      };

      // Remove embed_id from comparison as it's just for tracking
      const { embed_id: currentEmbedId, ...currentForComparison } = normalizedCurrent;
      const { embed_id: savedEmbedId, ...savedForComparison } = normalizedSaved;

      return JSON.stringify(currentForComparison) !== JSON.stringify(savedForComparison);
    }

    // Fallback to original logic if no saved config exists
    const defaults = generateInitialConfig();
    const baseline = config ? { ...defaults, ...config } : defaults;

    const baselineApiKeyIds = integrationData?.apikey_object_id || {};

    const normalizedCurrent = {
      ...configuration,
      apikey_object_id: configuration.apikey_object_id || {},
    };

    const normalizedBaseline = {
      ...baseline,
      apikey_object_id: baselineApiKeyIds,
    };

    // Remove embed_id from comparison
    const { embed_id: currentEmbedId, ...currentForComparison } = normalizedCurrent;
    const { embed_id: baselineEmbedId, ...baselineForComparison } = normalizedBaseline;

    return JSON.stringify(currentForComparison) !== JSON.stringify(baselineForComparison);
  };

  // Group configs by section
  const groupedConfigs = CONFIG_SCHEMA.reduce((groups, cfg) => {
    const section = cfg.section || "General";
    if (!groups[section]) groups[section] = [];
    groups[section].push(cfg);
    return groups;
  }, {});

  const configChanged = isConfigChanged();

  /* New Prompt Validation State */
  const [isPromptValid, setIsPromptValid] = useState(true);

  const themeSaveDisabled = isSaving || (!configChanged && !themeEditorDiffers) || !isPromptValid;
  useEffect(() => {
    const sidebar = document.getElementById("gtwy-integration-slider");
    if (sidebar) {
      sidebar.setAttribute("data-unsaved-changes", (configChanged || themeEditorDiffers).toString());
      sidebar.setAttribute("data-confirmation-modal", MODAL_TYPE.UNSAVED_CHANGES_MODAL);
    }
  }, [configChanged, themeEditorDiffers]);

  const jwtPayload = `{
  "org_id": "${data?.org_id}",
  "folder_id": "${data?.embed_id}",
  "user_id": "Your_user_id"
}`;

  const integrationScript = `<script
  id="gtwy-main-script"
  embedToken="Your embed token"
  src=${
    process.env.NEXT_PUBLIC_ENV !== "PROD"
      ? `${process.env.NEXT_PUBLIC_FRONTEND_URL}/gtwy_dev.js`
      : `${process.env.NEXT_PUBLIC_FRONTEND_URL}/gtwy.js`
  }
  parentId="${configuration.parentId || "Your_parent_id"}"
  agent_id="Your_agent_id"
  agent_name="Your_agent_name"
></script>`;

  const helperFunctions = `window.openGtwy() //To open GTWY;
window.closeGtwy() //To Close GTWY;
window.openGtwy({"agent_id":"your gtwy agentid"}); // Open GTWY with specific agent
window.openGtwy({"agent_name":"your gtwy agent name"}); // Create agent with specific name`;

  const interfaceData = `// Configure UI elements
window.GtwyEmbed.sendDataToGtwy({
  agent_name: "New Agent",  // Create bridge with agent name
  agent_id: "your_agent_id" // Redirect to specific agent
});`;

  const eventListenerScript = `<script>
window.addEventListener('message', (event) => {
  if (event.data.type === 'gtwy') {
    console.log('Received gtwy event:', event.data);
  }
});
</script>`;

  const metaUpdateScript = `
window.openGtwy({
  "agent_id": "your_agent_id",
  "meta": {
    "meta_data": "your_meta_data"
  }
});
`;

  const getDataUsingUserId = () => {
    return `curl --location ${process.env.NEXT_PUBLIC_SERVER_URL}/api/embed/getAgents \\
-H 'Authorization: your_embed_token'`;
  };

  const tableData = [
    ["parentId", "To open GTWY in a specific container"],
    ["agent_id", "To open agent in a specific agent"],
    ["agent_name", "To create an agent with a specific name, or redirect if the agent already exists."],
  ];
  const tableHeaders = ["Key", "Description"];

  return (
    <>
      <aside
        id="gtwy-integration-slider"
        className={`sidebar-container fixed z-very-high flex flex-col top-0 right-0 p-4 w-full md:w-[60%] lg:w-[70%] xl:w-[80%] 2xl:w-[70%] opacity-100 h-screen bg-base-200 transition-all overflow-auto duration-300  ${
          isOpen ? "" : "translate-x-full"
        }`}
        aria-label="Integration Guide Slider"
      >
        <div className="flex flex-col w-full gap-4">
          <div className="flex justify-between items-center border-b border-base-300 pb-4">
            <h3 className="font-bold text-lg">Embed Setup</h3>
            <CloseIcon
              id="gtwy-integration-slider-close-icon"
              className="cursor-pointer hover:text-error transition-colors"
              onClick={handleClose}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Left Column - Configuration Form */}
            <div className="space-y-2 overflow-y-auto h-[calc(100vh-100px)] scrollbar-hide mb-4">
              <div className="card bg-base-100 shadow-sm">
                <div className="card-body p-3">
                  <h4 className="card-title text-primary text-base mb-0">Configuration Settings</h4>
                  <p className="text-xs text-base-content/70">
                    Customize how GTWY appears and behaves in your application
                  </p>

                  <div className="space-y-4 mt-2">
                    {/* Dynamically render sections */}
                    {Object.entries(groupedConfigs).map(([sectionName, configs]) => (
                      <div key={sectionName}>
                        <ConfigSection
                          title={sectionName}
                          configs={configs}
                          configuration={configuration}
                          onChange={handleConfigChange}
                          orgId={data?.org_id}
                          params={{ org_id: data?.org_id }}
                        />
                        {sectionName !== Object.keys(groupedConfigs)[Object.keys(groupedConfigs).length - 1] && (
                          <div className="divider my-2"></div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Embed Prompt Builder Section */}
              <div className="card bg-base-100 shadow-sm">
                <div className="card-body p-3">
                  <EmbedPromptBuilder
                    configuration={configuration}
                    onChange={(promptValue) => {
                      // promptValue can be string (useDefaultPrompt=true) or object (useDefaultPrompt=false)
                      handleConfigChange("prompt", promptValue);
                    }}
                    onValidate={setIsPromptValid}
                  />
                </div>
              </div>

              {/* Tools Configuration Section */}
              <div className="card bg-base-100 shadow-sm">
                <div className="card-body p-3">
                  <ToolsConfiguration
                    selectedTools={configuration.tools_id || []}
                    onToolsChange={(tools) => handleConfigChange("tools_id", tools)}
                    orgId={data?.org_id}
                    params={{ org_id: data?.org_id }}
                    configuration={configuration}
                    onConfigChange={handleConfigChange}
                    modalType={MODAL_TYPE.TOOL_FUNCTION_PARAMETER_MODAL}
                  />
                </div>
              </div>

              <div className="card bg-base-100 shadow-sm">
                <div className="card-body p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="card-title text-primary text-base mb-0">Theme Palette</h4>
                      <p className="text-xs text-base-content/70">
                        Customize the colors of GTWY to match your application's design.
                      </p>
                    </div>
                    <button
                      id="gtwy-integration-theme-reset-button"
                      className="btn btn-outline btn-xs"
                      onClick={handleThemeReset}
                      type="button"
                    >
                      Reset
                    </button>
                  </div>

                  <ThemePaletteEditor theme={configuration?.theme_config} onColorChange={handlePaletteColorChange} />
                  <div className="divider my-4"></div>
                  <button
                    id="gtwy-integration-save-config-button"
                    className={`btn btn-primary btn-sm w-full gap-2 ${themeSaveDisabled ? "btn-disabled" : ""}`}
                    type="button"
                    onClick={handleConfigurationSave}
                    disabled={themeSaveDisabled}
                  >
                    <Save size={14} />
                    {isSaving ? "Saving..." : "Save Configuration"}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column - Generated Scripts */}
            <div className="space-y-6 overflow-y-auto h-[calc(100vh-100px)] scrollbar-hide mb-4">
              {/* Script Integration */}
              <div className="card bg-base-100 border border-base-300">
                <div className="card-body">
                  <h4 className="card-title text-base">Step 1: Generate Embed Token</h4>
                  <div className="space-y-6">
                    {/* JWT Payload */}
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium">JWT Payload</span>
                      </label>
                      <div className="relative">
                        <div className="mockup-code">
                          <pre data-prefix=">">
                            <code className="text-error">org_id=</code>
                            <code className="text-warning">{data?.org_id}</code>
                          </pre>
                          <pre data-prefix=">">
                            <code className="text-error">folder_id=</code>
                            <code className="text-warning">{data?.embed_id}</code>
                          </pre>
                          <pre data-prefix=">">
                            <code className="text-error">user_id=</code>
                            <code className="text-warning">"Your_user_id"</code>
                          </pre>
                        </div>
                        <CopyButton
                          data={jwtPayload}
                          onCopy={() => handleCopy(jwtPayload, "jwtToken")}
                          copied={copied.jwtToken}
                        />
                      </div>
                    </div>

                    {/* Access Token */}
                    <div className="form-control">
                      <label className="label flex flex-col items-start space-y-1">
                        <span className="label-text font-medium">Access Token (Signed with RS256)</span>
                      </label>

                      <div className="text-sm text-base-content/70 leading-relaxed ml-1">
                        RS256 is an asymmetric signing algorithm defined in
                        <a
                          id="gtwy-integration-rfc-link"
                          href="https://datatracker.ietf.org/doc/html/rfc7518#section-3.1"
                          className="text-blue-600 underline ml-1"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          RFC 7518
                        </a>
                      </div>

                      {gtwyAccessToken ? (
                        <div className="relative mt-3">
                          <div className="mockup-code">
                            <pre data-prefix=">">
                              <code className="text-error">Access Token: </code>
                              <code className="text-warning">{gtwyAccessToken}</code>
                            </pre>
                          </div>
                          <CopyButton
                            data={gtwyAccessToken}
                            onCopy={() => handleCopy(gtwyAccessToken, "accessKey")}
                            copied={copied.accessKey}
                          />
                        </div>
                      ) : (
                        <button
                          id="gtwy-integration-generate-access-key-button"
                          onClick={handleGenerateAccessKey}
                          className="btn btn-primary btn-sm w-56 mt-3"
                        >
                          Show Access Key
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="card bg-base-100 border border-base-300">
                <div className="card-body">
                  <h4 className="card-title text-base">Step 2: Add Script</h4>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Add this script tag to your HTML</span>
                    </label>
                    <div className="relative">
                      <div className="mockup-code">
                        <pre data-prefix=">">
                          <code className="text-error">&lt;script</code>
                        </pre>
                        <pre data-prefix=">">
                          <code className="text-error"> id=</code>
                          <code className="text-warning">"gtwy-main-script"</code>
                        </pre>
                        <pre data-prefix=">">
                          <code className="text-error"> embedToken=</code>
                          <code className="text-warning">"Your embed token"</code>
                        </pre>
                        <pre data-prefix=">">
                          <code className="text-error"> src=</code>
                          <code className="text-warning">
                            {process.env.NEXT_PUBLIC_ENV !== "PROD"
                              ? `${process.env.NEXT_PUBLIC_FRONTEND_URL}/gtwy_dev.js`
                              : `${process.env.NEXT_PUBLIC_FRONTEND_URL}/gtwy.js`}
                          </code>
                        </pre>
                        <pre data-prefix=">">
                          <code className="text-error"> parentId=</code>
                          <code className="text-warning">"{"Your_parent_id"}"</code>
                        </pre>
                        <pre data-prefix=">">
                          <code className="text-error"> agent_id=</code>
                          <code className="text-warning">"{"Your_agent_id"}"</code>
                        </pre>
                        <pre data-prefix=">">
                          <code className="text-error"> agent_name=</code>
                          <code className="text-warning">"{"Your_agent_name"}"</code>
                        </pre>
                        <pre data-prefix=">">
                          <code className="text-error">&gt;&lt;/script&gt;</code>
                        </pre>
                      </div>
                      <CopyButton
                        data={integrationScript}
                        onCopy={() => handleCopy(integrationScript, "script")}
                        copied={copied.script}
                      />
                    </div>
                  </div>
                  <GenericTable data={tableData} headers={tableHeaders} />
                </div>
              </div>

              {/* Interface Configuration */}
              <div className="card bg-base-100 border border-base-300">
                <div className="card-body">
                  <h4 className="card-title text-base">Configure Interface</h4>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Send Data to GTWY</span>
                    </label>
                    <div className="relative">
                      <div className="mockup-code">
                        <pre data-prefix=">">
                          <code className="text-error"> window.GtwyEmbed.sendDataToGtwy({`{`}</code>
                        </pre>
                        <pre data-prefix=">">
                          <code className="text-error"> agent_name: </code>
                          <code className="text-warning">"New Agent"</code>
                          <code>{", // Create bridge with agent name"}</code>
                        </pre>
                        <pre data-prefix=">">
                          <code className="text-error"> agent_id: </code>
                          <code className="text-warning">"your_agent_id"</code>
                          <code>{" // Redirect to specific agent"}</code>
                        </pre>
                        <pre data-prefix=">">
                          <code className="text-error"> {`});`}</code>
                        </pre>
                      </div>
                      <CopyButton
                        data={interfaceData}
                        onCopy={() => handleCopy(interfaceData, "interfaceData")}
                        copied={copied.interfaceData}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Helper Functions */}
              <div className="card bg-base-100 border border-base-300">
                <div className="card-body">
                  <h4 className="card-title text-base">Step 3: Integration Functions</h4>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Available Functions</span>
                    </label>
                    <div className="relative">
                      <div className="mockup-code">
                        <pre data-prefix=">">
                          <code className="text-warning"> window.openGtwy()</code>
                          <code>{" //To open GTWY"}</code>
                        </pre>
                        <pre data-prefix=">">
                          <code className="text-warning"> window.closeGtwy()</code>
                          <code>{" //To Close GTWY"}</code>
                        </pre>
                        <pre data-prefix=">">
                          <code className="text-warning"> window.openGtwy({`{"agent_id":"your gtwy agentid"}`})</code>
                          <code>{" // Open GTWY with specific agent"}</code>
                        </pre>
                        <pre data-prefix=">">
                          <code className="text-warning"> window.openGtwy({`{"agent_name":"your agent name"}`})</code>
                          <code>{" // Create agent with specific name"}</code>
                        </pre>
                      </div>
                      <CopyButton
                        data={helperFunctions}
                        onCopy={() => handleCopy(helperFunctions, "functions")}
                        copied={copied.functions}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="card bg-base-100 border mt-4 border-base-300">
                <div className="card-body">
                  <h4 className="card-title text-base">Add Meta Data</h4>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Use this script to add meta data to GTWY </span>
                    </label>
                    <div className="relative">
                      <div className="mockup-code">
                        <pre data-prefix=">">
                          <code className="text-error">
                            {" "}
                            window.GtwyEmbed.openGtwy(
                            {`{"agent_id":"your gtwy agentid" , "meta": {"meta_data": "your_meta_data"}}`})
                          </code>
                        </pre>
                      </div>
                      <CopyButton
                        data={metaUpdateScript}
                        onCopy={() => handleCopy(metaUpdateScript, "metaUpdate")}
                        copied={copied.metaUpdate}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="card bg-base-100  mt-4">
                <div className="card-body">
                  <h4 className="card-title text-base">Get Agent Data Using User ID</h4>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Use this script to get data using user id</span>
                    </label>
                    <div className="relative">
                      <div className="mockup-code">
                        <pre data-prefix=">">
                          <code className="text-error"> {getDataUsingUserId()}</code>
                        </pre>
                      </div>
                      <p className="text-sm text-gray-600 mt-4">
                        Note: Pass <code>agent_id="your_agent_id"</code> in the params if you want to get the data of
                        specific agent.
                      </p>
                      <CopyButton
                        data={getDataUsingUserId()}
                        onCopy={() => handleCopy(getDataUsingUserId(), "getDataUsingUserId")}
                        copied={copied.getDataUsingUserId}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Event Listener */}
              <div className="card bg-base-100 border border-base-300">
                <div className="card-body">
                  <h4 className="card-title text-base">Add Event Listener</h4>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Add this script to receive GTWY events</span>
                    </label>
                    <div className="relative">
                      <div className="mockup-code">
                        <pre data-prefix=">">
                          <code className="text-error">&lt;script&gt;</code>
                        </pre>
                        <pre data-prefix=">">
                          <code className="text-error"> window.addEventListener('message', (event) =&gt; {`{`}</code>
                        </pre>
                        <pre data-prefix=">">
                          <code className="text-error"> if (event.data.type === 'gtwy') {`{`}</code>
                        </pre>
                        <pre data-prefix=">">
                          <code className="text-error"> console.log('Received gtwy event:', event.data);</code>
                        </pre>
                        <pre data-prefix=">">
                          <code className="text-error"> {`}`}</code>
                        </pre>
                        <pre data-prefix=">">
                          <code className="text-error"> {`});`}</code>
                        </pre>
                        <pre data-prefix=">">
                          <code className="text-error">&lt;/script&gt;</code>
                        </pre>
                      </div>
                      <CopyButton
                        data={eventListenerScript}
                        onCopy={() => handleCopy(eventListenerScript, "eventListener")}
                        copied={copied.eventListener}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Confirmation Modal using the reusable component */}
      <ConfirmationModal
        modalType={MODAL_TYPE.UNSAVED_CHANGES_MODAL}
        onConfirm={handleSaveAndClose}
        onCancel={handleConfirmClose}
        title="Unsaved Changes"
        message="You have unsaved changes. Would you like to save your changes before closing?"
        confirmText="Save & Close"
        cancelText="Discard Changes"
        icon={<AlertTriangle className="w-6 h-6" />}
      />
    </>
  );
}

export default GtwyIntegrationGuideSlider;
