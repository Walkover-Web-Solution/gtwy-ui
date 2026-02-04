import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  VariableMapping: {},
};

const DEFAULT_GROUP_NAME = "Default";

const generateId = (prefix = "grp") =>
  `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;

const createEmptyGroup = (name = DEFAULT_GROUP_NAME) => ({
  id: generateId("group"),
  name,
  variables: [],
});

const syncActiveGroupVariables = (versionState) => {
  if (!versionState) return;
  const groups = versionState.groups || [];
  if (!groups.length) {
    versionState.variables = [];
    versionState.activeGroupId = null;
    return;
  }

  let activeGroup = groups.find((group) => group.id === versionState.activeGroupId);
  if (!activeGroup) {
    activeGroup = groups[0];
    versionState.activeGroupId = activeGroup.id;
  }

  versionState.variables = Array.isArray(activeGroup.variables) ? activeGroup.variables : [];
};

const inferType = (value, fallback) => {
  const sample = (value ?? fallback ?? "").toString().trim();
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

const sanitizeValueForType = (rawValue, type, { allowEmpty } = {}) => {
  const original = rawValue ?? "";

  if (typeof original === "boolean") {
    return { ok: true, value: original ? "true" : "false" };
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
      return { ok: true, value: trimmed };
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

const normalizeVariableEntry = (variable = {}) => {
  const key = typeof variable.key === "string" ? variable.key.trim() : "";
  const id = variable.id || generateId("var");
  const resolvedType = variable.type || inferType(variable.value, variable.defaultValue);

  const valueCheck = sanitizeValueForType(variable.value, resolvedType, {
    allowEmpty: false,
  });
  const defaultCheck = sanitizeValueForType(variable.defaultValue, resolvedType, {
    allowEmpty: true,
  });

  return {
    id,
    key,
    value: valueCheck.ok ? valueCheck.value : fallbackValueForType(resolvedType),
    defaultValue: defaultCheck.ok ? defaultCheck.value : "",
    type: resolvedType,
    required: variable.required !== false,
  };
};

const ensureVersionState = (state, bridgeId, versionId) => {
  if (!state.VariableMapping[bridgeId]) {
    state.VariableMapping[bridgeId] = {};
  }

  if (!state.VariableMapping[bridgeId][versionId]) {
    const defaultGroup = createEmptyGroup();
    state.VariableMapping[bridgeId][versionId] = {
      groups: [defaultGroup],
      activeGroupId: defaultGroup.id,
      variables: defaultGroup.variables,
    };
  } else {
    const versionState = state.VariableMapping[bridgeId][versionId];
    if (!Array.isArray(versionState.groups) || !versionState.groups.length) {
      const defaultGroup = createEmptyGroup();
      const inheritedVariables = Array.isArray(versionState.variables)
        ? versionState.variables.map(normalizeVariableEntry)
        : [];
      defaultGroup.variables = inheritedVariables;
      versionState.groups = [defaultGroup];
      versionState.activeGroupId = defaultGroup.id;
    } else if (!versionState.activeGroupId) {
      versionState.activeGroupId = versionState.groups[0]?.id;
    }

    versionState.groups = versionState.groups.map((group) => ({
      ...group,
      variables: Array.isArray(group.variables) ? group.variables.map(normalizeVariableEntry) : [],
    }));
    if (Array.isArray(versionState.variables)) {
      versionState.variables = versionState.variables.map(normalizeVariableEntry);
    }
  }

  const versionState = state.VariableMapping[bridgeId][versionId];
  syncActiveGroupVariables(versionState);
  return versionState;
};

const variableReducer = createSlice({
  name: "Variable",
  initialState,
  reducers: {
    initializeVariablesState: (state, action) => {
      const { bridgeId, versionId, groupName = DEFAULT_GROUP_NAME } = action.payload;
      const versionState = ensureVersionState(state, bridgeId, versionId);
      if (!versionState.groups.length) {
        const defaultGroup = createEmptyGroup(groupName);
        versionState.groups.push(defaultGroup);
        versionState.activeGroupId = defaultGroup.id;
      }
      syncActiveGroupVariables(versionState);
    },
    createVariableGroup: (state, action) => {
      const { bridgeId, versionId, groupName = "" } = action.payload;
      const versionState = ensureVersionState(state, bridgeId, versionId);
      const displayName = groupName?.trim() || `Group ${versionState.groups.length + 1}`;
      const newGroup = createEmptyGroup(displayName);
      versionState.groups.push(newGroup);
      versionState.activeGroupId = newGroup.id;
      syncActiveGroupVariables(versionState);
    },
    renameVariableGroup: (state, action) => {
      const { bridgeId, versionId, groupId, newName } = action.payload;
      if (!newName?.trim()) return;
      const versionState = ensureVersionState(state, bridgeId, versionId);
      const targetGroup = versionState.groups.find((group) => group.id === groupId);
      if (!targetGroup) return;
      targetGroup.name = newName.trim();
      syncActiveGroupVariables(versionState);
    },
    deleteVariableGroup: (state, action) => {
      const { bridgeId, versionId, groupId } = action.payload;
      const versionState = ensureVersionState(state, bridgeId, versionId);
      if (versionState.groups.length <= 1) {
        return;
      }
      versionState.groups = versionState.groups.filter((group) => group.id !== groupId);
      if (versionState.activeGroupId === groupId) {
        versionState.activeGroupId = versionState.groups[0]?.id || null;
      }
      syncActiveGroupVariables(versionState);
    },
    setActiveVariableGroup: (state, action) => {
      const { bridgeId, versionId, groupId } = action.payload;
      const versionState = ensureVersionState(state, bridgeId, versionId);
      if (!versionState.groups.find((group) => group.id === groupId)) {
        return;
      }
      versionState.activeGroupId = groupId;
      syncActiveGroupVariables(versionState);
    },
    setGroupVariables: (state, action) => {
      const { bridgeId, versionId, groupId, variables = [] } = action.payload;
      const versionState = ensureVersionState(state, bridgeId, versionId);
      let targetGroup = versionState.groups.find((group) => group.id === groupId);
      if (!targetGroup) {
        const fallbackGroup = createEmptyGroup();
        versionState.groups.push(fallbackGroup);
        versionState.activeGroupId = fallbackGroup.id;
        targetGroup = fallbackGroup;
      }
      targetGroup.variables = Array.isArray(variables) ? variables.map(normalizeVariableEntry) : [];
      syncActiveGroupVariables(versionState);
    },
    updateVariables: (state, action) => {
      const { data, bridgeId, versionId = "", groupId } = action.payload;
      if (!bridgeId || !versionId) {
        return;
      }
      const versionState = ensureVersionState(state, bridgeId, versionId);
      const targetGroupId = groupId || versionState.activeGroupId;
      const targetGroup = versionState.groups.find((group) => group.id === targetGroupId) || versionState.groups[0];
      if (!targetGroup) {
        return;
      }
      targetGroup.variables = Array.isArray(data) ? data.map(normalizeVariableEntry) : [];
      versionState.activeGroupId = targetGroup.id;
      syncActiveGroupVariables(versionState);
    },
  },
});

export const {
  initializeVariablesState,
  createVariableGroup,
  renameVariableGroup,
  deleteVariableGroup,
  setActiveVariableGroup,
  setGroupVariables,
  updateVariables,
} = variableReducer.actions;
export default variableReducer.reducer;
