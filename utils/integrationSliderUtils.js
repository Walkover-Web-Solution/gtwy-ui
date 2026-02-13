import defaultUserTheme from "@/public/themes/default-user-theme.json";

// Configuration Schema - easily extensible
// ---------------------------------------------
export const CONFIG_SCHEMA = [
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

// Theme utility functions
// ---------------------------------------------
export const cloneTheme = (theme) => JSON.parse(JSON.stringify(theme || defaultUserTheme));

export const stringifyTheme = (theme) => JSON.stringify(theme, null, 2);

export const normalizeThemeConfig = (value) => {
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

export const getMissingThemeKeys = (theme, reference, path = "") => {
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

export const sortObjectKeys = (value) => {
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

export const enforceThemeStructure = (theme) => {
  const missingKeys = getMissingThemeKeys(theme, defaultUserTheme);
  if (missingKeys.length) {
    throw new Error(`Theme JSON missing keys: ${missingKeys.join(", ")}`);
  }
};

// Configuration helper functions
// ---------------------------------------------
export const generateInitialConfig = () => {
  const initialConfig = {};
  CONFIG_SCHEMA.forEach((item) => {
    initialConfig[item.key] = item.defaultValue;
  });
  initialConfig.theme_config = cloneTheme(defaultUserTheme);
  return initialConfig;
};

export const groupConfigsBySection = () => {
  return CONFIG_SCHEMA.reduce((acc, config) => {
    const section = config.section || "Other";
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(config);
    return acc;
  }, {});
};

export const getConfigByKey = (key) => {
  return CONFIG_SCHEMA.find((config) => config.key === key);
};

export const validateConfig = (config) => {
  const errors = [];
  CONFIG_SCHEMA.forEach((schema) => {
    const value = config[schema.key];
    if (schema.type === "select" && schema.options) {
      const validValues = schema.options.map((opt) => opt.value);
      if (value && !validValues.includes(value)) {
        errors.push(`Invalid value for ${schema.key}: ${value}`);
      }
    }
  });
  return errors;
};
