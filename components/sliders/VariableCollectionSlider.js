"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useCustomSelector } from "@/customHooks/customSelector";
import { initializeVariablesState, updateVariables } from "@/store/reducer/variableReducer";
import { sendDataToParent, toggleSidebar } from "@/utils/utility";
import { CloseIcon } from "@/components/Icons";
import { Trash2, Upload, Play } from "lucide-react";

const SLIDER_ID = "variable-collection-slider";
const SLIDER_DISABLE_KEY = "variableSliderDisabled";

const VARIABLE_TYPES = [
  { value: "string", label: "String" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Boolean" },
  { value: "object", label: "Object" },
  { value: "array", label: "Array" },
];

const inferType = (value, fallback) => {
  // Handle non-string values first
  if (Array.isArray(value)) return "array";
  if (typeof value === "object" && value !== null) return "object";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";

  // Convert to string for string-based analysis
  const sample = String(value ?? fallback ?? "").trim();
  if (!sample) return "string";
  if (sample === "true" || sample === "false") return "boolean";
  if (!Number.isNaN(Number(sample))) return "number";
  try {
    const parsed = JSON.parse(sample);
    if (Array.isArray(parsed)) return "array";
    if (typeof parsed === "object") return "object";
  } catch {
    /* ignore */
  }
  return "string";
};

const createLocalId = () => `var_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;

const validateAndFormatValue = (rawValue, type, { allowEmpty } = {}) => {
  const original = rawValue ?? "";
  if (typeof original === "boolean") {
    return {
      ok: true,
      value: original ? "true" : "false",
    };
  }

  const stringValue = typeof original === "string" ? original : String(original);
  const trimmed = stringValue.trim();

  if (!trimmed) {
    return { ok: true, value: "" };
  }

  switch (type) {
    case "number": {
      const parsed = Number(trimmed);
      if (Number.isNaN(parsed)) {
        return { ok: false, error: "Value must be a valid number" };
      }
      return { ok: true, value: parsed };
    }
    case "boolean": {
      const lower = trimmed.toLowerCase();
      if (lower === "true" || lower === "false") {
        return { ok: true, value: lower };
      }
      return { ok: false, error: "Value must be true or false" };
    }
    case "object":
    case "array": {
      try {
        const parsed = JSON.parse(stringValue);
        if (type === "array" && !Array.isArray(parsed)) {
          return { ok: false, error: "Value must be a JSON array" };
        }
        if (type === "object" && (parsed === null || Array.isArray(parsed) || typeof parsed !== "object")) {
          return { ok: false, error: "Value must be a JSON object" };
        }
        return { ok: true, value: JSON.stringify(parsed, null, 2) };
      } catch {
        return { ok: false, error: "Value must be valid JSON" };
      }
    }
    default:
      return { ok: true, value: stringValue };
  }
};

const fallbackValueForType = (type) => {
  switch (type) {
    case "boolean":
      return "true";
    case "number":
      return "0";
    case "array":
      return "[]";
    case "object":
      return "{}";
    default:
      return "";
  }
};

const normaliseDraftList = (list = []) =>
  list.map((item) => ({
    id: item.id || item.__localId || createLocalId(),
    key: item.key ?? "",
    value: item.value ?? "",
    defaultValue: item.defaultValue ?? "",
    type: item.type || inferType(item.value, item.defaultValue),
    required: item.required !== false,
  }));

const validateVariables = (variables, options = {}) => {
  const { suppressErrors = false } = options;
  const errors = [];
  const normalisedKeys = new Map();

  const enrichedList = normaliseDraftList(Array.isArray(variables) ? variables : []);

  const normalised = enrichedList.map((variable, index) => {
    const type = variable.type || inferType(variable.value, variable.defaultValue);
    const key = (variable.key || "").trim();
    const lowerKey = key.toLowerCase();

    const valueCheck = validateAndFormatValue(variable.value, type, {
      allowEmpty: false,
    });
    const defaultCheck = validateAndFormatValue(variable.defaultValue, type, {
      allowEmpty: true,
    });

    if (!valueCheck.ok && !suppressErrors) {
      errors.push(`Row ${index + 1}: ${valueCheck.error}`);
    }
    if (!defaultCheck.ok && !suppressErrors) {
      errors.push(`Row ${index + 1}: Default value ${defaultCheck.error.toLowerCase()}`);
    }
    if (key && normalisedKeys.has(lowerKey) && !suppressErrors) {
      errors.push(`Duplicate key "${key}" found (rows ${normalisedKeys.get(lowerKey) + 1} and ${index + 1})`);
    } else if (key) {
      normalisedKeys.set(lowerKey, index);
    }

    return {
      id: variable.id || createLocalId(),
      key,
      value: valueCheck.ok ? valueCheck.value : (variable.value ?? ""),
      defaultValue: defaultCheck.ok ? defaultCheck.value : (variable.defaultValue ?? ""),
      type,
      required: variable.required !== false,
    };
  });

  return {
    isValid: errors.length === 0,
    errors,
    normalised,
  };
};

const VariableCollectionSlider = ({ params, versionId, isEmbedUser }) => {
  const dispatch = useDispatch();

  const { prompt, bridgeName, variableGroups, activeGroup, variablesKeyValue, variablesPath, variable_state } =
    useCustomSelector((state) => {
      const versionState = state?.variableReducer?.VariableMapping?.[params?.id]?.[versionId] || {};
      const groups = versionState?.groups || [];
      const activeGroupId = versionState?.activeGroupId;

      return {
        prompt: state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[versionId]?.configuration?.prompt || "",
        bridgeName: state?.bridgeReducer?.allBridgesMap?.[params?.id]?.name || "",
        variableGroups: groups,
        activeGroup: groups.find((group) => group.id === activeGroupId) || groups[0] || null,
        variablesKeyValue: versionState?.variables || [],
        variablesPath: state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[versionId]?.variables_path || {},
        variable_state: state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[versionId]?.variables_state || {},
      };
    });
  const [draftVariables, setDraftVariables] = useState([]);
  const [error, setError] = useState("");
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [bulkEditText, setBulkEditText] = useState("");
  const [missingVariables, setMissingVariables] = useState([]);
  const [blockedDeleteKey, setBlockedDeleteKey] = useState("");
  const [blockedDeleteMessage, setBlockedDeleteMessage] = useState("");

  const activeGroupId = activeGroup?.id;

  const variablesPathKeySet = useMemo(() => {
    const keys = new Set();
    Object.values(variablesPath || {}).forEach((functionVars = {}) => {
      Object.values(functionVars || {}).forEach((key) => {
        const trimmedKey = typeof key === "string" ? key.trim() : "";
        if (trimmedKey) {
          keys.add(trimmedKey);
        }
      });
    });
    return keys;
  }, [variablesPath]);

  const promptKeySet = useMemo(() => {
    if (!prompt) {
      return new Set();
    }

    // Handle both string and object formats
    let promptText = "";
    if (typeof prompt === "string") {
      promptText = prompt;
    } else if (typeof prompt === "object") {
      // Extract text from structured prompt object
      if (prompt.role) promptText += prompt.role + " ";
      if (prompt.goal) promptText += prompt.goal + " ";
      if (prompt.instruction) promptText += prompt.instruction + " ";
      if (prompt.customPrompt) promptText += prompt.customPrompt + " ";
      // Extract from embedFields if present
      if (Array.isArray(prompt.embedFields)) {
        prompt.embedFields.forEach((field) => {
          if (field.value) promptText += field.value + " ";
        });
      }
    }

    if (!promptText || typeof promptText !== "string") {
      return new Set();
    }

    const matches = promptText.match(/\{\{([^}]+)\}\}/g);
    if (!matches) {
      return new Set();
    }
    const keys = matches.map((match) => match.replace(/[{}]/g, "").trim()).filter(Boolean);
    return new Set(keys);
  }, [prompt]);

  const syncDraftWithStore = useCallback(
    (sourceList) => {
      // Use provided source if available, otherwise fall back to Redux state
      const baseVariables = Array.isArray(sourceList)
        ? sourceList
        : Array.isArray(variablesKeyValue)
          ? variablesKeyValue
          : [];

      // Create a fresh copy to avoid reference issues
      const allVariables = baseVariables.map((variable) => ({
        id: variable.id || createLocalId(),
        key: variable.key || "",
        value: variable.value || "",
        defaultValue: variable.defaultValue || "",
        type: variable.type || "string",
        required: variable.required !== false,
      }));

      // Add variables from variables_path
      Object.keys(variablesPath || {}).forEach((functionId) => {
        const functionVars = variablesPath[functionId] || {};
        Object.keys(functionVars).forEach((varName) => {
          const pathKey = functionVars[varName]; // This is "123" in your example
          const trimmedKey = typeof pathKey === "string" ? pathKey.trim() : "";
          if (!trimmedKey) {
            return;
          }

          // Check if this variable already exists
          const existsInSource = allVariables.find((v) => v.key === trimmedKey);

          if (!existsInSource) {
            // Check if this variable exists in variable_state
            const variableStateData = variable_state[trimmedKey];

            // Add the path variable to the list with data from variable_state if available
            allVariables.push({
              id: createLocalId(),
              key: trimmedKey,
              value: variableStateData?.value || "",
              defaultValue: variableStateData?.default_value || "",
              type: inferType(variableStateData?.value || variableStateData?.default_value, "") || "string",
              required: variableStateData?.status === "required" || false,
            });
          }
        });
      });

      // Also check for variables that exist in variable_state but not in Redux or variables_path
      Object.keys(variable_state || {}).forEach((stateKey) => {
        const trimmedKey = typeof stateKey === "string" ? stateKey.trim() : "";
        if (!trimmedKey) {
          return;
        }
        const existsInVariables = allVariables.find((v) => v.key === trimmedKey);

        if (!existsInVariables) {
          const variableStateData = variable_state[trimmedKey];

          // Add variable from variable_state
          allVariables.push({
            id: createLocalId(),
            key: trimmedKey,
            value: variableStateData?.value || "",
            defaultValue: variableStateData?.default_value || "",
            type: inferType(variableStateData?.value || variableStateData?.default_value, "") || "string",
            required: variableStateData?.status === "required" || false,
          });
        }
      });

      const { normalised } = validateVariables(allVariables, { suppressErrors: true });
      setDraftVariables(normalised);
    },
    [variablesKeyValue, variablesPath, variable_state]
  );

  useEffect(() => {
    if (params?.id && versionId) {
      dispatch(
        initializeVariablesState({
          bridgeId: params.id,
          versionId,
        })
      );
    }
  }, [dispatch, params?.id, versionId]);

  // Sync draft variables with store data when key dependencies change
  useEffect(() => {
    syncDraftWithStore();
  }, [syncDraftWithStore]);

  // Additional effect to ensure fresh data when critical Redux state changes
  useEffect(() => {
    // Force a fresh sync when variablesKeyValue, variablesPath, or variable_state changes
    // This helps prevent stale data when switching between agents or versions
    if (params?.id && versionId) {
      syncDraftWithStore();
    }
  }, [params?.id, versionId, variablesKeyValue, variablesPath, variable_state, syncDraftWithStore]);

  // Check for missing variables from sessionStorage (set by chat input validation)
  useEffect(() => {
    const checkMissingVariables = () => {
      try {
        const storedMissingVars = sessionStorage.getItem("missingVariables");
        if (storedMissingVars) {
          const parsedMissingVars = JSON.parse(storedMissingVars);
          setMissingVariables(parsedMissingVars);
        } else {
          setMissingVariables([]);
        }
      } catch (error) {
        console.error("Error parsing missing variables from sessionStorage:", error);
        setMissingVariables([]);
      }
    };

    // Check immediately
    checkMissingVariables();

    // Also check when storage changes (in case multiple tabs/components)
    const handleStorageChange = (e) => {
      if (e.key === "missingVariables") {
        checkMissingVariables();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Also check periodically in case sessionStorage is updated by same tab
    const interval = setInterval(checkMissingVariables, 1000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Ensure there's always at least one empty variable for new input
  useEffect(() => {
    if (activeGroup && draftVariables.length === 0) {
      setDraftVariables([
        {
          id: createLocalId(),
          key: "",
          value: "",
          defaultValue: "",
          type: "string",
          required: true,
        },
      ]);
    } else if (activeGroup && draftVariables.length > 0) {
      const lastVariable = draftVariables[draftVariables.length - 1];
      if (lastVariable.key.trim()) {
        // Add empty variable if last one has a key
        const hasEmptyVariable = draftVariables.some((v) => !v.key.trim());
        if (!hasEmptyVariable) {
          setDraftVariables((prev) => [
            ...prev,
            {
              id: createLocalId(),
              key: "",
              value: "",
              defaultValue: "",
              type: "string",
              required: true,
            },
          ]);
        }
      }
    }
  }, [activeGroup, draftVariables]);

  // Function to check if variables have actually changed (only prompt and variables_path variables)
  const hasVariablesChanged = useCallback(
    (currentVariables) => {
      const dbVariablesMap = new Map((variablesKeyValue || []).map((variable) => [variable.key, variable]));

      return currentVariables.some((current) => {
        const key = typeof current?.key === "string" ? current.key.trim() : "";
        if (!key || (!promptKeySet.has(key) && !variablesPathKeySet.has(key))) {
          return false;
        }

        const dbVariable = dbVariablesMap.get(key);
        if (!dbVariable) {
          // New variable detected
          return true;
        }

        return (
          current.value !== (dbVariable.value || "") ||
          current.defaultValue !== (dbVariable.defaultValue || "") ||
          current.type !== (dbVariable.type || "string") ||
          current.required !== (dbVariable.required !== false)
        );
      });
    },
    [variablesKeyValue, promptKeySet, variablesPathKeySet]
  );

  const resetLocalState = useCallback(
    (sourceList) => {
      // Clear all local state to prevent stale data
      setError("");
      setBulkEditMode(false);
      setBulkEditText("");
      setMissingVariables([]); // Clear missing variables state
      setBlockedDeleteKey("");
      setBlockedDeleteMessage("");

      // Force a fresh sync with the latest store data
      syncDraftWithStore(sourceList);
    },
    [syncDraftWithStore]
  );

  const updateVersionVariable = useCallback(
    (updatedPairs) => {
      const filteredPairs =
        (updatedPairs || variablesKeyValue)
          ?.filter((pair) => {
            const key = typeof pair?.key === "string" ? pair.key.trim() : "";
            if (!key) {
              return false;
            }
            return promptKeySet.has(key) || variablesPathKeySet.has(key);
          })
          ?.map((pair) => {
            const key = typeof pair?.key === "string" ? pair.key.trim() : "";
            if (!key) {
              return null;
            }
            // Format the value according to its type
            const originalType = pair?.type;
            const inferredType = inferType(pair?.value, pair?.defaultValue);
            const type = originalType || inferredType || "string";
            const rawValue = pair?.value ?? "";
            const rawDefaultValue = pair?.defaultValue ?? "";

            // Format the main value
            const valueCheck = validateAndFormatValue(rawValue, type, { allowEmpty: false });
            let formattedValue = valueCheck.ok ? valueCheck.value : rawValue;

            // Convert values to proper types for API
            if (type === "boolean" && valueCheck.ok && typeof formattedValue === "string") {
              formattedValue = formattedValue === "true";
            } else if ((type === "object" || type === "array") && valueCheck.ok && typeof formattedValue === "string") {
              try {
                formattedValue = JSON.parse(formattedValue);
              } catch {
                // If parsing fails, keep the string value
              }
            }

            // Format the default value
            const defaultCheck = validateAndFormatValue(rawDefaultValue, type, { allowEmpty: true });
            let formattedDefaultValue = defaultCheck.ok ? defaultCheck.value : rawDefaultValue;

            // Convert default values to proper types for API
            if (type === "boolean" && defaultCheck.ok && typeof formattedDefaultValue === "string") {
              formattedDefaultValue = formattedDefaultValue === "true";
            } else if (
              (type === "object" || type === "array") &&
              defaultCheck.ok &&
              typeof formattedDefaultValue === "string"
            ) {
              try {
                formattedDefaultValue = JSON.parse(formattedDefaultValue);
              } catch {
                // If parsing fails, keep the string value
              }
            }

            return {
              [key]: {
                status: pair?.required ? "required" : "optional",
                default_value: formattedDefaultValue ?? formattedValue ?? "",
              },
            };
          })
          ?.filter(Boolean) ?? [];
      // Deep check filtered pairs against existing variable_state
      const currentVariableState = Object.assign({}, ...filteredPairs);

      // Check if there are actual changes between current and existing variable_state
      const hasVariableStateChanged = () => {
        const existingKeys = Object.keys(variable_state || {});
        const currentKeys = Object.keys(currentVariableState || {});

        // Check if keys are different
        if (existingKeys.length !== currentKeys.length) return true;
        if (!existingKeys.every((key) => currentKeys.includes(key))) return true;

        // Check if values are different for each key
        return currentKeys.some((key) => {
          const existing = variable_state[key];
          const current = currentVariableState[key];

          if (!existing && !current) return false;
          if (!existing || !current) return true;

          // Deep compare the variable objects
          return (
            existing.status !== current.status ||
            JSON.stringify(existing.default_value) !== JSON.stringify(current.default_value)
          );
        });
      };

      // Only proceed with API call if there are changes
      if (!hasVariableStateChanged()) {
        return;
      }

      if (isEmbedUser) {
        sendDataToParent(
          "updated",
          {
            name: bridgeName,
            agent_id: params?.id,
            agent_version_id: versionId,
            variables: updatedPairs,
          },
          "Agent Version Updated"
        );
      }
    },
    [
      dispatch,
      variablesKeyValue,
      promptKeySet,
      variablesPathKeySet,
      versionId,
      isEmbedUser,
      bridgeName,
      params?.id,
      variable_state,
    ]
  );

  const commitVariables = useCallback(
    (candidateList, { suppressErrors = false } = {}) => {
      if (!activeGroupId) {
        if (!suppressErrors) {
          setError("Select or create a group first.");
        }
        return { success: false };
      }

      const { isValid, errors: validationErrors, normalised } = validateVariables(candidateList);

      if (!isValid) {
        if (!suppressErrors && validationErrors.length) {
          setError(validationErrors.join(" • "));
        }
        return { success: false };
      }

      setError("");

      // Always save all variables to Redux first (even if not in prompt/variables_path)
      const allVariables = normalised.filter((v) => v.key && v.key.trim());

      // Update all variables in Redux
      if (allVariables.length > 0) {
        dispatch(
          updateVariables({
            data: allVariables,
            bridgeId: params.id,
            versionId,
            groupId: activeGroupId,
          })
        );
      }

      // Check if variables have actually changed compared to DB data before making API calls
      if (!hasVariablesChanged(normalised)) {
        // No changes detected for relevant variables, return success without additional API calls
        return { success: true, normalised };
      }
      updateVersionVariable(normalised);

      // Variables are now saved to DB, no need to track original state

      return { success: true, normalised };
    },
    [activeGroupId, dispatch, params.id, updateVersionVariable, versionId, hasVariablesChanged, variablesKeyValue]
  );

  const closeSlider = useCallback(() => {
    const result = commitVariables(draftVariables, { suppressErrors: true }) || {};
    const { success, normalised } = result;
    resetLocalState(success ? normalised : undefined);
    toggleSidebar(SLIDER_ID, "right");
  }, [commitVariables, draftVariables, resetLocalState]);

  // Handle Run Anyway button click
  const handleRunAnyway = useCallback(() => {
    // Clear missing variables from sessionStorage
    sessionStorage.removeItem("missingVariables");
    setMissingVariables([]);
    sessionStorage.setItem(SLIDER_DISABLE_KEY, "true");

    // Close the slider
    toggleSidebar(SLIDER_ID, "right");

    // Trigger the message send with forceRun = true
    // We need to access the chat input's handleSendMessage function
    // This will be done by dispatching a custom event
    const runAnywayEvent = new CustomEvent("runAnyway", {
      detail: { forceRun: true },
    });
    window.dispatchEvent(runAnywayEvent);

    // Also clear the validation error from chat input
    const clearValidationEvent = new CustomEvent("clearValidationError");
    window.dispatchEvent(clearValidationEvent);
  }, []);

  const handleFieldChange = useCallback(
    (index, field, value) => {
      if (field === "key" && blockedDeleteKey && value.trim() !== blockedDeleteKey) {
        setBlockedDeleteKey("");
        setBlockedDeleteMessage("");
      }
      setDraftVariables((prev) =>
        prev.map((variable, idx) => (idx === index ? { ...variable, [field]: value } : variable))
      );
      setError("");
    },
    [blockedDeleteKey]
  );

  const applyDraftUpdate = useCallback(
    (updater, options) => {
      setDraftVariables((prev) => {
        const next = updater(prev);
        if (!Array.isArray(next)) {
          return prev;
        }
        const result = commitVariables(next, options);
        if (result.success && result.normalised) {
          return result.normalised;
        }
        return next;
      });
    },
    [commitVariables]
  );

  const handleFieldCommit = useCallback(
    (index, field, value) => {
      applyDraftUpdate((prev) => {
        if (!prev[index]) return prev;
        const next = prev.map((variable, idx) => {
          if (idx !== index) return variable;
          const updated = { ...variable };
          if (field === "type") {
            const newType = value;
            updated.type = newType;
            const valueCheck = validateAndFormatValue(updated.value, newType, {
              allowEmpty: false,
            });
            updated.value = valueCheck.ok ? valueCheck.value : fallbackValueForType(newType);
            const defaultCheck = validateAndFormatValue(updated.defaultValue, newType, { allowEmpty: true });
            updated.defaultValue = defaultCheck.ok ? defaultCheck.value : "";
          } else if (field === "value") {
            const valueCheck = validateAndFormatValue(value, updated.type, {
              allowEmpty: false,
            });
            updated[field] = valueCheck.ok ? valueCheck.value : value;

            // Clear missing variable error if value is provided
            if (value && value.trim() && missingVariables.includes(updated.key)) {
              const updatedMissingVars = missingVariables.filter((key) => key !== updated.key);
              setMissingVariables(updatedMissingVars);
              if (updatedMissingVars.length === 0) {
                sessionStorage.removeItem("missingVariables");
              } else {
                sessionStorage.setItem("missingVariables", JSON.stringify(updatedMissingVars));
              }
            }
          } else if (field === "defaultValue") {
            const defaultCheck = validateAndFormatValue(value, updated.type, {
              allowEmpty: true,
            });
            updated[field] = defaultCheck.ok ? defaultCheck.value : value;

            // Clear missing variable error if default value is provided and no main value exists
            if (value && value.trim() && !updated.value && missingVariables.includes(updated.key)) {
              const updatedMissingVars = missingVariables.filter((key) => key !== updated.key);
              setMissingVariables(updatedMissingVars);
              if (updatedMissingVars.length === 0) {
                sessionStorage.removeItem("missingVariables");
              } else {
                sessionStorage.setItem("missingVariables", JSON.stringify(updatedMissingVars));
              }
            }
          } else {
            updated[field] = value;
          }

          return updated;
        });

        // Auto-add new variable if the last variable's key was just filled
        if (field === "key" && value.trim() && index === prev.length - 1) {
          next.push({
            id: createLocalId(),
            key: "",
            value: "",
            defaultValue: "",
            type: "string",
            required: true,
          });
        }

        return next;
      });
    },
    [applyDraftUpdate, missingVariables]
  );

  useEffect(() => {
    return () => {
      sessionStorage.setItem("variableSliderDisabled", "false");
    };
  }, []);

  const handleRequiredToggle = useCallback(
    (index) => {
      applyDraftUpdate(
        (prev) =>
          prev.map((variable, idx) => (idx === index ? { ...variable, required: !variable.required } : variable)),
        { suppressErrors: true }
      );
    },
    [applyDraftUpdate]
  );

  const handleDeleteVariable = useCallback(
    (index) => {
      applyDraftUpdate(
        (prev) => {
          const target = prev[index];
          const key = typeof target?.key === "string" ? target.key.trim() : "";

          if (key && promptKeySet.has(key)) {
            setError("");
            setBlockedDeleteKey(key);
            setBlockedDeleteMessage(`Variable "${key}" is referenced in the prompt and can't be removed.`);
            return prev;
          }

          setBlockedDeleteKey("");
          setBlockedDeleteMessage("");
          return prev.filter((_, idx) => idx !== index);
        },
        { suppressErrors: true }
      );
    },
    [applyDraftUpdate, promptKeySet]
  );

  const parseJsonToKeyValue = useCallback((jsonText) => {
    try {
      const parsed = JSON.parse(jsonText);
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        return Object.entries(parsed).map(([key, value]) => ({
          key,
          value: typeof value === "object" ? JSON.stringify(value) : String(value),
        }));
      }
    } catch {
      // Not valid JSON, return null
    }
    return null;
  }, []);

  const handleBulkEditToggle = useCallback(() => {
    if (!bulkEditMode) {
      const rows = draftVariables
        .filter((variable) => variable.key.trim()) // Only include variables with keys
        .map((variable) => `${variable.key},${variable.value}`)
        .join("\n");
      setBulkEditText(rows);
    }
    setBulkEditMode((prev) => !prev);
    setError("");
  }, [bulkEditMode, draftVariables]);

  const handleBulkEditSave = useCallback(() => {
    if (!activeGroupId) {
      setError("Select or create a group first.");
      return;
    }
    try {
      // First, try to parse as JSON
      const jsonVariables = parseJsonToKeyValue(bulkEditText);
      if (jsonVariables) {
        const parsed = jsonVariables.map(({ key, value }) => {
          const type = inferType(value, "");
          const valueCheck = validateAndFormatValue(value, type, { allowEmpty: false });

          return {
            key,
            value: valueCheck.ok ? valueCheck.value : value,
            defaultValue: "",
            required: true,
            type,
          };
        });

        const result = commitVariables(parsed);
        if (result.success && result.normalised) {
          setDraftVariables(result.normalised);
          setBulkEditMode(false);
          setBulkEditText("");
          setError("");
        }
        return;
      }

      // If not JSON, parse as key-value pairs
      const lines = bulkEditText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      if (!lines.length) {
        setError("Paste content before saving.");
        return;
      }

      const parsed = [];
      const rowErrors = [];

      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        if (!line) continue;

        const commaIndex = line.indexOf(",");
        if (commaIndex === -1) {
          rowErrors.push(`Row ${i + 1}: Missing comma separator`);
          continue;
        }

        const key = line.substring(0, commaIndex).trim();
        const value = line.substring(commaIndex + 1).trim();

        if (!key) {
          continue;
        }
        if (!value) {
          rowErrors.push(`Row ${i + 1}: Value is required`);
          continue;
        }

        const type = inferType(value, "");
        const valueCheck = validateAndFormatValue(value, type, { allowEmpty: false });

        parsed.push({
          key,
          value: valueCheck.ok ? valueCheck.value : value,
          defaultValue: "",
          required: true,
          type,
        });
      }

      if (rowErrors.length) {
        setError(rowErrors.join(" • "));
        return;
      }

      const result = commitVariables(parsed);
      if (!result.success || !result.normalised) {
        return;
      }

      setDraftVariables(result.normalised);
      setBulkEditMode(false);
      setBulkEditText("");
      setError("");
    } catch {
      setError("Error parsing data. Please verify the format.");
    }
  }, [activeGroupId, bulkEditText, commitVariables, parseJsonToKeyValue]);

  useEffect(() => {
    const slider = document.getElementById(SLIDER_ID);
    if (!slider) return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "attributes" && mutation.attributeName === "class") {
          const isOpen = !slider.classList.contains("translate-x-full");
          if (isOpen) {
            // Add a small delay to ensure Redux state is fresh when slider opens
            setTimeout(() => {
              resetLocalState();
            }, 50);
          } else {
            setError("");
          }
        }
      });
    });

    observer.observe(slider, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, [resetLocalState]);

  useEffect(() => {
    // sync prompt variables into groups
    if (!prompt || !variableGroups.length) return;

    // Handle both string and object formats
    let promptText = "";
    if (typeof prompt === "string") {
      promptText = prompt;
    } else if (typeof prompt === "object") {
      // Extract text from structured prompt object
      if (prompt.role) promptText += prompt.role + " ";
      if (prompt.goal) promptText += prompt.goal + " ";
      if (prompt.instruction) promptText += prompt.instruction + " ";
      // Extract from embedFields if present
      if (Array.isArray(prompt.embedFields)) {
        prompt.embedFields.forEach((field) => {
          if (field.value) promptText += field.value + " ";
        });
      }
    }

    if (!promptText) return;

    const regex = /{{(.*?)}}/g;
    const matches = [...promptText.matchAll(regex)];
    const promptVariables = [...new Set(matches.map((match) => match[1].trim()))];
    if (!promptVariables.length) return;

    variableGroups.forEach((group) => {
      const groupVariables = group.variables || [];
      const existing = new Map(groupVariables.map((item) => [item.key, item]));
      const additions = promptVariables
        .filter((variable) => !existing.has(variable))
        .map((variable) => ({
          key: variable,
          value: "",
          defaultValue: "",
          type: "string",
          required: true,
        }));
      if (additions.length) {
        dispatch(
          updateVariables({
            data: [...groupVariables, ...additions],
            bridgeId: params.id,
            versionId,
            groupId: group.id,
          })
        );
      }
    });
  }, [dispatch, params?.id, prompt, variableGroups, versionId]);

  const variableCount = draftVariables.length;

  return (
    <aside
      id={SLIDER_ID}
      className="sidebar-container fixed z-very-high flex flex-col top-0 right-0 p-6 w-full md:w-[50%] lg:w-[50%] opacity-100 h-screen bg-base-200 transition-all duration-300 border-l border-base-300 overflow-y-auto translate-x-full"
      aria-label="Variable collection slider"
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div className="flex flex-col gap-6 h-full w-full">
        <header className="border-b border-base-300 pb-4">
          <div>
            <h1 className="text-2xl font-semibold text-base-content">Variables</h1>
            <p className="mt-1 text-sm text-base-content/70 leading-relaxed">
              Organise reusable variables to control which values your agent uses.
            </p>
            {/* Show missing variables warning without button */}
            {missingVariables.length > 0 && (
              <div className="mt-3 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                <p className="text-sm text-warning">Missing values for: {missingVariables.join(", ")}</p>
                <p className="text-xs text-warning/70 mt-1">
                  Fill in the missing variables below or use "Run Anyway" button at the bottom.
                </p>
              </div>
            )}
          </div>
          <button
            id="variable-slider-bulk-edit-button"
            type="button"
            className="btn btn-ghost btn-sm p-1 absolute top-6 right-6"
            onClick={closeSlider}
            aria-label="Close variable manager"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </header>

        <section className="bg-base-100 border border-base-300 rounded-lg shadow-sm p-4 flex-1 flex flex-col">
          <div className="flex items-center justify-between border-b border-base-200 pb-3">
            <div />

            <div className="flex gap-2">
              {!bulkEditMode && (
                <>
                  <button
                    id="variable-slider-bulk-edit-button"
                    type="button"
                    className="btn btn-outline btn-xs gap-1"
                    onClick={handleBulkEditToggle}
                    disabled={!activeGroup}
                  >
                    <Upload size={12} />
                    Bulk Edit
                  </button>
                </>
              )}
              {bulkEditMode && (
                <>
                  <button
                    id="variable-slider-bulk-edit-cancel-button"
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={handleBulkEditToggle}
                  >
                    Cancel
                  </button>
                  <button
                    id="variable-slider-bulk-edit-save-button"
                    type="button"
                    className="btn btn-primary btn-xs"
                    onClick={handleBulkEditSave}
                  >
                    Save Changes
                  </button>
                </>
              )}
            </div>
          </div>

          {!bulkEditMode && (
            <div className="mt-4 overflow-hidden rounded-lg border border-base-200 bg-base-100">
              <div className="grid grid-cols-[1fr,1.2fr,1fr,0.8fr,0.6fr,auto] gap-2 border-b border-base-200 bg-base-200/60 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-base-content/60">
                <span>Key</span>
                <span>Value</span>
                <span>Default Value</span>
                <span>Type</span>
                <span className="text-center">Required</span>
                <span className="text-right pr-1">Actions</span>
              </div>

              <div className="divide-y divide-base-200">
                {variableCount ? (
                  draftVariables.map((variable, index) => {
                    const trimmedKey = typeof variable.key === "string" ? variable.key.trim() : "";
                    const showBlockedWarning = Boolean(blockedDeleteKey) && trimmedKey === blockedDeleteKey;
                    // Check if previous variable has a key to enable current row
                    const isPreviousRowFilled = index === 0 || draftVariables[index - 1]?.key?.trim();
                    const isCurrentRowEnabled = isPreviousRowFilled;

                    return (
                      <div key={variable.id || `${variable.key}-${index}`} className="px-3 py-2 text-sm">
                        <div className="grid grid-cols-[1fr,1.2fr,1fr,0.8fr,0.6fr,auto] gap-2 items-center">
                          <input
                            id={`variable-key-input-${index}`}
                            type="text"
                            className={`input input-xs input-bordered w-full ${
                              missingVariables.includes(variable.key)
                                ? "border-error focus:border-error focus:ring-2 focus:ring-error/20"
                                : ""
                            }`}
                            value={variable.key}
                            disabled={!isCurrentRowEnabled}
                            onChange={(event) => handleFieldChange(index, "key", event.target.value)}
                            onBlur={(event) => handleFieldCommit(index, "key", event.target.value.trim())}
                            placeholder="variable key"
                          />

                          {variable.type === "boolean" ? (
                            <select
                              id={`variable-value-select-${index}`}
                              className={`select select-xs select-bordered w-full ${
                                missingVariables.includes(variable.key)
                                  ? "border-error focus:border-error focus:ring-2 focus:ring-error/20"
                                  : ""
                              }`}
                              disabled={!isCurrentRowEnabled || !variable.key.trim()}
                              value={variable.value === "false" ? "false" : variable.value === "true" ? "true" : ""}
                              onChange={(event) => {
                                handleFieldChange(index, "value", event.target.value);
                                handleFieldCommit(index, "value", event.target.value);
                              }}
                            >
                              <option value="">Select…</option>
                              <option value="true">True</option>
                              <option value="false">False</option>
                            </select>
                          ) : variable.type === "number" ? (
                            <input
                              id={`variable-value-number-${index}`}
                              type="number"
                              step="any"
                              className={`input input-xs input-bordered w-full ${
                                missingVariables.includes(variable.key)
                                  ? "border-error focus:border-error focus:ring-2 focus:ring-error/20"
                                  : ""
                              }`}
                              disabled={!isCurrentRowEnabled || !variable.key.trim()}
                              value={variable.value}
                              onChange={(event) => handleFieldChange(index, "value", event.target.value)}
                              onBlur={(event) => handleFieldCommit(index, "value", event.target.value)}
                              placeholder="variable value"
                            />
                          ) : variable.type === "string" ? (
                            <input
                              id={`variable-value-text-${index}`}
                              type="text"
                              className={`input input-xs input-bordered w-full ${
                                missingVariables.includes(variable.key)
                                  ? "border-error focus:border-error focus:ring-2 focus:ring-error/20"
                                  : ""
                              }`}
                              disabled={!isCurrentRowEnabled || !variable.key.trim()}
                              value={variable.value}
                              onChange={(event) => handleFieldChange(index, "value", event.target.value)}
                              onBlur={(event) => handleFieldCommit(index, "value", event.target.value)}
                              placeholder="variable value"
                            />
                          ) : variable.type === "object" || variable.type === "array" ? (
                            <textarea
                              className={`textarea textarea-xs textarea-bordered w-full min-h-[90px] font-mono text-xs ${
                                missingVariables.includes(variable.key)
                                  ? "border-error focus:border-error focus:ring-2 focus:ring-error/20"
                                  : ""
                              }`}
                              disabled={!isCurrentRowEnabled || !variable.key.trim()}
                              value={variable.value}
                              onChange={(event) => handleFieldChange(index, "value", event.target.value)}
                              onBlur={(event) => handleFieldCommit(index, "value", event.target.value)}
                              placeholder={variable.type === "array" ? '[\n  "value"\n]' : '{\n  "key": "value"\n}'}
                            />
                          ) : (
                            <textarea
                              id={`variable-value-textarea-${index}`}
                              className="textarea textarea-xs textarea-bordered w-full min-h-[60px]"
                              disabled={!isCurrentRowEnabled || !variable.key.trim()}
                              value={variable.value}
                              onChange={(event) => handleFieldChange(index, "value", event.target.value)}
                              onBlur={(event) => handleFieldCommit(index, "value", event.target.value)}
                              placeholder="variable value"
                            />
                          )}

                          {variable.type === "boolean" ? (
                            <select
                              id={`variable-default-select-${index}`}
                              className="select select-xs select-bordered w-full"
                              disabled={!isCurrentRowEnabled || !variable.key.trim()}
                              value={
                                variable.defaultValue === "false"
                                  ? "false"
                                  : variable.defaultValue === "true"
                                    ? "true"
                                    : ""
                              }
                              onChange={(event) => {
                                handleFieldChange(index, "defaultValue", event.target.value);
                                handleFieldCommit(index, "defaultValue", event.target.value);
                              }}
                            >
                              <option value="">None</option>
                              <option value="true">True</option>
                              <option value="false">False</option>
                            </select>
                          ) : variable.type === "number" ? (
                            <input
                              id={`variable-default-number-${index}`}
                              type="number"
                              step="any"
                              className="input input-xs input-bordered w-full"
                              disabled={!isCurrentRowEnabled || !variable.key.trim()}
                              value={variable.defaultValue}
                              onChange={(event) => handleFieldChange(index, "defaultValue", event.target.value)}
                              onBlur={(event) => handleFieldCommit(index, "defaultValue", event.target.value)}
                              placeholder="Optional fallback"
                            />
                          ) : variable.type === "object" || variable.type === "array" ? (
                            <textarea
                              id={`variable-default-textarea-${index}`}
                              className="textarea textarea-xs textarea-bordered w-full min-h-[90px] font-mono text-xs"
                              disabled={!isCurrentRowEnabled || !variable.key.trim()}
                              value={variable.defaultValue}
                              onChange={(event) => handleFieldChange(index, "defaultValue", event.target.value)}
                              onBlur={(event) => handleFieldCommit(index, "defaultValue", event.target.value)}
                              placeholder="Optional JSON fallback"
                            />
                          ) : (
                            <input
                              id={`variable-default-text-${index}`}
                              type="text"
                              className="input input-xs input-bordered w-full"
                              disabled={!isCurrentRowEnabled || !variable.key.trim()}
                              value={variable.defaultValue}
                              onChange={(event) => handleFieldChange(index, "defaultValue", event.target.value)}
                              onBlur={(event) => handleFieldCommit(index, "defaultValue", event.target.value)}
                              placeholder="default value"
                            />
                          )}

                          <select
                            id={`variable-type-select-${index}`}
                            className="select select-xs select-bordered w-full"
                            disabled={!isCurrentRowEnabled || !variable.key.trim()}
                            value={variable.type}
                            onChange={(event) => {
                              const newType = event.target.value;
                              handleFieldChange(index, "type", newType);
                              handleFieldCommit(index, "type", newType);
                            }}
                          >
                            {VARIABLE_TYPES.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>

                          <button
                            id={`variable-required-toggle-${index}`}
                            type="button"
                            className={`badge badge-xs cursor-pointer hover:opacity-80 ${
                              variable.required ? "badge-primary" : "badge-ghost"
                            }`}
                            disabled={!isCurrentRowEnabled || !variable.key.trim()}
                            onClick={() => handleRequiredToggle(index)}
                            title="Click to toggle required status"
                          >
                            {variable.required ? "Required" : "Optional"}
                          </button>

                          <div className="flex justify-end gap-1">
                            <button
                              id={`variable-delete-button-${index}`}
                              type="button"
                              className="btn btn-ghost btn-xs text-error"
                              disabled={!isCurrentRowEnabled || !variable.key.trim()}
                              onClick={() => handleDeleteVariable(index)}
                              title="Delete variable"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                        {showBlockedWarning && (
                          <p className="text-[11px] text-warning mt-1">
                            {blockedDeleteMessage ||
                              `Variable "${trimmedKey}" is referenced in the prompt and can't be removed.`}
                          </p>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="px-4 py-6 text-center text-sm text-base-content/60">
                    {activeGroup
                      ? "No variables in this group yet. Start typing in a key field to create one."
                      : "Select a group to view its variables."}
                  </div>
                )}
              </div>
            </div>
          )}

          {bulkEditMode && (
            <div className="mt-4 space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text text-sm font-medium">Bulk Edit Variables</span>
                  <span className="label-text-alt text-xs text-base-content/60">
                    Paste key-value pairs or JSON object
                  </span>
                </label>
                <textarea
                  className="textarea textarea-bordered textarea-sm w-full resize-y min-h-[280px] font-mono text-xs"
                  placeholder={`Option 1 - Key-value pairs:
customer_email,user@example.com
attempts,3

Option 2 - JSON object:
{
  "customer_email": "user@example.com",
  "attempts": 3
}`}
                  value={bulkEditText}
                  onChange={(event) => setBulkEditText(event.target.value)}
                />
                <div className="label">
                  <span className="label-text-alt text-xs text-base-content/50">
                    Format: key,value per line OR valid JSON object
                  </span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="alert alert-warning py-2 mt-4">
              <span className="text-xs">{error}</span>
            </div>
          )}
        </section>

        {/* Run Anyway Button at the bottom - Only show when there are missing variables */}
        {missingVariables.length > 0 && (
          <div className="border-t border-base-300 pt-4 mt-auto">
            <div className="flex justify-center">
              <button
                type="button"
                className="btn btn-warning gap-2 px-6"
                onClick={handleRunAnyway}
                title="Run the agent anyway with missing variables"
              >
                <Play size={16} />
                Run Anyway
              </button>
            </div>
            <p className="text-xs text-center text-base-content/60 mt-2">
              This will run the agent with the missing variable values
            </p>
          </div>
        )}
      </div>
    </aside>
  );
};

export default VariableCollectionSlider;
