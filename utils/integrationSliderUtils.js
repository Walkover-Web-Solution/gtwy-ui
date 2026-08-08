import defaultUserTheme from "@/public/themes/default-user-theme.json";

// Configuration Schema - easily extensible
// ---------------------------------------------
export const CONFIG_SCHEMA = [
  {
    key: "showHomeButton",
    type: "toggle",
    label: "Show Home Button",
    description: "Show the home navigation button",
    defaultValue: true,
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
    key: "showAdvancedParameters",
    type: "toggle",
    label: "Show Advanced Parameters",
    description: "Display advanced parameters",
    defaultValue: true,
    section: "Interface Options",
  },
  {
    key: "showCreateManuallyButton",
    type: "toggle",
    label: "Show Create Agent Manually Button",
    description: "Display create agent manually button",
    defaultValue: true,
    section: "Interface Options",
  },
  {
    key: "showAdvancedConfigurations",
    type: "toggle",
    label: "Show Advanced Configurations",
    description: "Display advanced configurations",
    defaultValue: true,
    section: "Interface Options",
  },
  {
    key: "showFallbackModel",
    type: "toggle",
    label: "Show Fallback Model",
    description: "Display the fallback model section",
    defaultValue: false,
    section: "Interface Options",
  },
  {
    key: "showPreTool",
    type: "toggle",
    label: "Show Pre Tool",
    description:
      "When enabled, allows you to configure a global pre-tool that will be automatically attached to every agent created in the embed.",
    defaultValue: true,
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
    key: "showFullScreenButton",
    type: "toggle",
    label: "Show Full Screen",
    description: "Show the full screen toggle button",
    defaultValue: true,
    section: "Display Settings",
  },
  {
    key: "showCloseButton",
    type: "toggle",
    label: "Show Close Button",
    description: "Show the close button",
    defaultValue: true,
    section: "Display Settings",
  },
  {
    key: "showHeader",
    type: "toggle",
    label: "Show Header",
    description: "Show the header section",
    defaultValue: true,
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
    key: "showTestcases",
    type: "toggle",
    label: "Show Test Cases",
    description: "Display test cases tab in the embedded interface",
    defaultValue: true,
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
    key: "showPromptHelper",
    type: "toggle",
    label: "Show Prompt Helper",
    description: "Show the prompt helper",
    defaultValue: true,
    section: "Interface Options",
  },
  {
    key: "migratePrompt",
    type: "toggle",
    label: "Migrate Prompt",
    description: "Enable this option to migrate the prompt.",
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
  {
    key: "models",
    type: "nested",
    label: "Model Name Customization",
    description: "Customize model display names and visibility for each service",
    defaultValue: {},
    section: "Model Settings",
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
    key: "showReviewAgent",
    type: "toggle",
    label: "Show Review Agent",
    description: "Display review agent settings",
    defaultValue: false,
    section: "Interface Options",
  },
  {
    key: "showMcp",
    type: "toggle",
    label: "Show MCP Servers",
    description: "Display MCP server configuration in the Connectors tab",
    defaultValue: false,
    section: "Interface Options",
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
