"use client";
import React, { useState, useEffect, useMemo } from "react";
import { CloseIcon } from "@/components/Icons";
import { Save, ChevronDown, AlertTriangle } from "lucide-react";
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

const COLOR_LABEL_MAP = {
  "base-100": "Page Background",
  "base-200": "Section Background",
  "base-300": "Card / Block Background",
  "base-400": "Surface Accent",
  "base-content": "Primary Text",
  primary: "Primary",
  "primary-content": "Primary Text Contrast",
  secondary: "Secondary",
  "secondary-content": "Secondary Text Contrast",
  accent: "Accent",
  "accent-content": "Accent Text Contrast",
  neutral: "Neutral",
  "neutral-content": "Neutral Text Contrast",
  info: "Info",
  "info-content": "Info Text Contrast",
  success: "Success",
  "success-content": "Success Text Contrast",
  warning: "Warning",
  "warning-content": "Warning Text Contrast",
  error: "Error",
  "error-content": "Error Text Contrast",
};

const MODE_TITLES = {
  light: "Light Theme Palette",
  dark: "Dark Theme Palette",
};

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const hexToRgb = (hex) => {
  if (!hex) return null;
  let normalized = hex.replace("#", "");
  if (normalized.length === 3) {
    normalized = normalized
      .split("")
      .map((char) => char + char)
      .join("");
  }
  if (normalized.length !== 6) return null;
  const intValue = parseInt(normalized, 16);
  if (Number.isNaN(intValue)) return null;
  return {
    r: ((intValue >> 16) & 255) / 255,
    g: ((intValue >> 8) & 255) / 255,
    b: (intValue & 255) / 255,
  };
};

const srgbToLinear = (value) => (value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4));

const linearToSrgb = (value) => (value <= 0.0031308 ? 12.92 * value : 1.055 * Math.pow(value, 1 / 2.4) - 0.055);

const rgbToOklch = ({ r, g, b }) => {
  if ([r, g, b].some((v) => typeof v !== "number")) return null;
  const rl = srgbToLinear(r);
  const gl = srgbToLinear(g);
  const bl = srgbToLinear(b);

  const l = 0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl;
  const m = 0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl;
  const s = 0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bVal = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const C = Math.sqrt(a * a + bVal * bVal);
  let h = (Math.atan2(bVal, a) * 180) / Math.PI;
  if (h < 0) h += 360;

  return { L, C, h };
};

const formatOklchString = ({ L, C, h }) => `oklch(${(L * 100).toFixed(2)}% ${C.toFixed(4)} ${h.toFixed(2)})`;

const parseOklchString = (value) => {
  if (!value) return null;
  const normalized = value.replace(/,/g, " ");
  const match = normalized.match(/oklch\(\s*([0-9.+-]+)(%?)\s+([0-9.+-]+)\s+([0-9.+-]+)\s*\)/i);
  if (!match) return null;
  let L = parseFloat(match[1]);
  if (Number.isNaN(L)) return null;
  if (match[2] === "%") {
    L = L / 100;
  }
  const C = parseFloat(match[3]);
  const h = parseFloat(match[4]);
  if ([C, h].some((n) => Number.isNaN(n))) return null;
  return { L, C, h };
};

const oklchToRgb = ({ L, C, h }) => {
  const hRad = (h * Math.PI) / 180;
  const a = Math.cos(hRad) * C;
  const bVal = Math.sin(hRad) * C;

  const l_ = L + 0.3963377774 * a + 0.2158037573 * bVal;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * bVal;
  const s_ = L - 0.0894841775 * a - 1.291485548 * bVal;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  let r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  let bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  r = clamp(linearToSrgb(r));
  g = clamp(linearToSrgb(g));
  bl = clamp(linearToSrgb(bl));

  return { r, g, b: bl };
};

const rgbToHex = ({ r, g, b }) =>
  `#${[r, g, b]
    .map((v) =>
      clamp(Math.round(v * 255), 0, 255)
        .toString(16)
        .padStart(2, "0")
    )
    .join("")}`;

const oklchToHex = (value, fallback = "#000000") => {
  const parsed = parseOklchString(value);
  if (!parsed) return fallback;
  const rgb = oklchToRgb(parsed);
  if (!rgb) return fallback;
  return rgbToHex(rgb);
};

const hexToOklchString = (hex, fallback = "") => {
  const rgb = hexToRgb(hex);
  if (!rgb) return fallback;
  const oklch = rgbToOklch(rgb);
  if (!oklch) return fallback;
  return formatOklchString(oklch);
};

const getMissingThemeKeys = (theme, reference, path = "") => {
  if (!reference || typeof reference !== "object" || Array.isArray(reference)) {
    return [];
  }

  return Object.keys(reference).reduce((missing, key) => {
    const currentPath = path ? `${path}.${key}` : key;
    const referenceValue = reference[key];
    const targetValue = theme?.[key];

    if (referenceValue && typeof referenceValue === "object" && !Array.isArray(referenceValue)) {
      if (!targetValue || typeof targetValue !== "object" || Array.isArray(targetValue)) {
        return [...missing, currentPath];
      }
      return [...missing, ...getMissingThemeKeys(targetValue, referenceValue, currentPath)];
    }

    if (targetValue === undefined) {
      return [...missing, currentPath];
    }

    return missing;
  }, []);
};

const sortObjectKeys = (value) => {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeys);
  }
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = sortObjectKeys(value[key]);
        return acc;
      }, {});
  }
  return value;
};

const enforceThemeStructure = (theme) => {
  const missingKeys = getMissingThemeKeys(theme, defaultUserTheme);
  if (missingKeys.length) {
    throw new Error(`Theme JSON missing keys: ${missingKeys.join(", ")}`);
  }
};

const ThemePaletteEditor = ({ theme, onColorChange }) => {
  const [openModes, setOpenModes] = useState(() =>
    Object.keys(MODE_TITLES).reduce((acc, mode) => ({ ...acc, [mode]: false }), {})
  );

  const toggleMode = (mode) => {
    setOpenModes((prev) => ({ ...prev, [mode]: !prev[mode] }));
  };

  return (
    <div className="space-y-3 mt-4">
      {Object.keys(MODE_TITLES).map((mode) => {
        const tokens = Object.keys(defaultUserTheme?.[mode] || {});
        const isOpen = openModes[mode];
        return (
          <div key={mode} className=" rounded bg-base-200">
            <button
              id={`theme-palette-toggle-${mode}`}
              type="button"
              className="w-full flex items-center justify-between px-3 py-2 text-left"
              onClick={() => toggleMode(mode)}
            >
              <div>
                <p className="text-sm text-base-content/70">{MODE_TITLES[mode]}</p>
              </div>
              <ChevronDown
                size={16}
                className={`text-base-content/70 transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
            {isOpen && (
              <div className="px-3 pb-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {tokens.map((token) => {
                    const value = theme?.[mode]?.[token] || "";
                    const hexValue = oklchToHex(value, "#000000");
                    return (
                      <div
                        key={`${mode}-${token}`}
                        className="flex items-center justify-between gap-3 rounded-lg border border-base-200 p-2"
                      >
                        <div className="flex-1">
                          <p className="text-xs font-semibold">{COLOR_LABEL_MAP[token] || token}</p>
                          <p className="text-[10px] font-mono text-base-content/60 break-all">{value || "—"}</p>
                        </div>
                        <input
                          id={`theme-color-${mode}-${token}`}
                          type="color"
                          className="w-10 h-10 border border-base-300 rounded cursor-pointer bg-transparent shrink-0"
                          value={hexValue}
                          onChange={(e) => onColorChange(mode, token, e.target.value)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Configuration Schema - easily extensible
// ---------------------------------------------
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
    key: "showGuide",
    type: "toggle",
    label: "Show Guide",
    description: "Display helpful user guides",
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
];

const cloneTheme = (theme) => JSON.parse(JSON.stringify(theme || defaultUserTheme));
const stringifyTheme = (theme) => JSON.stringify(theme, null, 2);
const normalizeThemeConfig = (value) => {
  if (!value) return cloneTheme(defaultUserTheme);
  if (typeof value === "string") {
    try {
      return cloneTheme(JSON.parse(value));
    } catch (error) {
      console.error("Invalid stored theme_config JSON", error);
      return cloneTheme(defaultUserTheme);
    }
  }
  return cloneTheme(value);
};

// ---------------------------------------------
// API Keys Input Component
// ---------------------------------------------
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
            // Get currently selected API key ID for this service
            const selectedId = configuration?.apikey_object_id?.[serviceKey] || "";

            // Filter API keys for this specific service
            const serviceApiKeys = (apikeydata || []).filter((apiKey) => apiKey?.service === serviceKey);

            return (
              <div key={serviceKey} className="flex items-center gap-3">
                <div className="w-32 text-sm font-medium text-base-content">{displayName}:</div>

                <select
                  id={`api-key-select-${serviceKey}`}
                  className="select select-bordered select-primary w-full select-sm"
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

// ---------------------------------------------
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
const ConfigSection = ({ title, configs, configuration, onChange, orgId }) => {
  return (
    <div className="space-y-2">
      <h5 className="text-sm font-semibold text-primary border-b border-base-300 pb-1">{title}</h5>
      <div className="space-y-2">
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

  // Get config and root-level data from Redux store
  const integrationData = useCustomSelector((state) =>
    state?.integrationReducer?.integrationData?.[data?.org_id]?.find((f) => f.folder_id === data?.embed_id)
  );

  const config = integrationData?.config;

  // Generate initial config from schema
  const generateInitialConfig = () => {
    const initialConfig = {};
    CONFIG_SCHEMA.forEach((item) => {
      initialConfig[item.key] = item.defaultValue;
    });
    initialConfig.theme_config = cloneTheme(defaultUserTheme);
    return initialConfig;
  };

  // Initialize configuration state
  const [configuration, setConfiguration] = useState(() => {
    const defaults = generateInitialConfig();
    const merged = config ? { ...defaults, ...config } : defaults;

    // Use root-level apikey_object_id if available, otherwise empty object
    // Only include API keys if addDefaultApiKeys is enabled in the saved config
    const apiKeyIds =
      merged.addDefaultApiKeys && integrationData?.apikey_object_id ? integrationData.apikey_object_id : {};

    const resolvedTheme = normalizeThemeConfig(merged.theme_config);

    return {
      ...merged,
      theme_config: resolvedTheme,
      apikey_object_id: apiKeyIds,
      embed_id: data?.embed_id,
    };
  });

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

      const resolvedTheme = normalizeThemeConfig(merged.theme_config);
      const newConfig = {
        ...merged,
        theme_config: resolvedTheme,
        apikey_object_id: finalApiKeyIds,
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

      const {
        apikey_object_id, // move to root
        ...restConfig
      } = configuration;
      const cleanedConfig = {
        ...restConfig,
        theme_config: parsedTheme,
      }; // strictly visual/config flags

      const dataToSend = {
        folder_id: data?.embed_id,
        orgId: data?.org_id,
        config: cleanedConfig.config ? cleanedConfig.config : cleanedConfig, // no api keys inside config
      };

      // Only include apikey_object_id if addDefaultApiKeys is true
      if (configuration.addDefaultApiKeys) {
        dataToSend.apikey_object_id = apikey_object_id || {};
      }
      if (dataToSend.apikey_object_id && Object.keys(dataToSend.apikey_object_id).length === 0) {
        delete dataToSend.apikey_object_id;
        dataToSend.config.addDefaultApiKeys = false;
      }
      // If addDefaultApiKeys is false, don't send apikey_object_id at all (will be removed from backend)

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
    setConfiguration((prev) => ({
      ...prev,
      [key]: value,
    }));
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
  const themeSaveDisabled = isSaving || (!configChanged && !themeEditorDiffers);
  useEffect(() => {
    const sidebar = document.getElementById("gtwy-integration-slider");
    if (sidebar) {
      sidebar.setAttribute("data-unsaved-changes", (configChanged || themeEditorDiffers).toString());
      sidebar.setAttribute("data-confirmation-modal", MODAL_TYPE.UNSAVED_CHANGES_MODAL);
    }
  }, [configChanged, themeEditorDiffers]);

  // Add event listener for outside clicks AFTER configChanged is defined

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
                        />
                        {sectionName !== Object.keys(groupedConfigs)[Object.keys(groupedConfigs).length - 1] && (
                          <div className="divider my-2"></div>
                        )}
                      </div>
                    ))}
                  </div>
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
