export const validatePromptVariables = (prompt, variablesKeyValue) => {
  if (!prompt) return { isValid: true, missingVariables: [] };

  if (!Array.isArray(variablesKeyValue)) {
    variablesKeyValue = [];
  }
  // Extract variables from prompt using regex
  const regex = /{{(.*?)}}/g;
  const matches = [...prompt.matchAll(regex)];
  const promptVariables = [...new Set(matches.map((match) => match[1].trim()))];

  if (!promptVariables.length) return { isValid: true, missingVariables: [] };

  // Check which variables are missing values
  const missingVariables = promptVariables.filter((varName) => {
    const variable = variablesKeyValue.find((v) => v.key === varName);
    if (!variable) {
      return true; // Variable not defined at all
    }

    // Skip validation for optional variables
    if (!variable.required) {
      return false;
    }

    const hasValue = variable.value !== undefined && variable.value !== null && String(variable.value).trim() !== "";
    const hasDefault =
      variable.defaultValue !== undefined &&
      variable.defaultValue !== null &&
      String(variable.defaultValue).trim() !== "";
    return !hasValue && !hasDefault; // Missing both value and default
  });

  return {
    isValid: missingVariables.length === 0,
    missingVariables,
  };
};

export const buildVariablesObject = (variablesKeyValue) => {
  if (!Array.isArray(variablesKeyValue)) {
    return {};
  }

  const coerceValue = (rawValue, fallback, type) => {
    const candidate = rawValue ?? fallback ?? "";
    const trimmed = typeof candidate === "string" ? candidate.trim() : candidate;
    if (trimmed === "") {
      return undefined;
    }
    if (type === "number") {
      const parsed = Number(trimmed);
      return Number.isNaN(parsed) ? undefined : parsed;
    }
    if (type === "boolean") {
      if (typeof trimmed === "boolean") return trimmed;
      if (String(trimmed).toLowerCase() === "true") return true;
      if (String(trimmed).toLowerCase() === "false") return false;
      return undefined;
    }
    if (type === "object" || type === "array") {
      try {
        const parsed = typeof candidate === "string" ? JSON.parse(candidate) : candidate;
        return parsed;
      } catch {
        return undefined;
      }
    }
    return candidate;
  };

  return variablesKeyValue.reduce((acc, pair) => {
    if (!pair?.key) {
      return acc;
    }

    const coerced = coerceValue(pair.value, pair.defaultValue, pair.type || "string");
    if (coerced !== undefined) {
      acc[pair.key] = coerced;
    }
    return acc;
  }, {});
};
