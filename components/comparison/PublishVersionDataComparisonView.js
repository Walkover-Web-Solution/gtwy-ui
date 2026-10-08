import React, { useMemo } from "react";
import { Check, X, AlertCircle, Bot } from "lucide-react";
import { isEqual } from "lodash";
import { useCustomSelector } from "@/customHooks/customSelector";
import { DIFFERNCE_DATA_DISPLAY_NAME, CONFIGURATION_KEYS_TO_EXCLUDE } from "@/jsonFiles/bridgeParameter";
import ComparisonCheck from "@/utils/comparisonCheck";
import { preprocessPrompt } from "@/utils/promptUtils";
import { PROMPT_SECTION_CONFIG, PRE_TOOL_LABELS, PRE_TOOL_TYPES } from "@/utils/enums";
import { SquareFunctionIcon } from "@/components/Icons";

const TOOL_LIST_KEYS = ["function_ids", "pre_tools", "post_tool", "connected_agents"];
const TOOL_STATUS_BORDER = {
  added: "border-success/60",
  removed: "border-error/60",
  changed: "border-warning/60",
};
const TOOL_STATUS_BADGE = {
  added: "badge-success text-white",
  removed: "badge-error text-white",
  changed: "badge-warning text-white",
};

const PublishVersionDataComparisonView = ({ oldData, newData, params }) => {
  const { apikeyData, functionData, integrationData, knowledgeBaseData, orgAgents, allBridgesMap } = useCustomSelector(
    (state) => ({
      apikeyData: state?.apiKeysReducer?.apikeys[params.org_id] || [],
      functionData: state?.bridgeReducer?.org[params.org_id]?.functionData || {},
      integrationData: state?.bridgeReducer?.org?.[params.org_id]?.integrationData || {},
      knowledgeBaseData: state?.knowledgeBaseReducer?.knowledgeBaseData?.[params.org_id] || [],
      orgAgents: state?.bridgeReducer?.org?.[params.org_id]?.orgs || [],
      allBridgesMap: state?.bridgeReducer?.allBridgesMap || {},
    })
  );

  const bridgeIdToNameMap = useMemo(() => {
    const idToName = {};
    orgAgents.forEach((agent) => {
      if (agent?._id) {
        idToName[agent._id] = agent?.name || idToName[agent._id];
      }
    });
    Object.entries(allBridgesMap || {}).forEach(([id, agent]) => {
      if (id) {
        idToName[id] = agent?.name || idToName[id];
      }
    });
    return idToName;
  }, [orgAgents, allBridgesMap]);

  // Get status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case "added":
        return (
          <span data-testid="status-badge-added" className="badge badge-success flex items-center gap-1 text-white">
            <Check size={12} /> Added
          </span>
        );
      case "removed":
        return (
          <span data-testid="status-badge-removed" className="badge badge-error flex items-center gap-1 text-white">
            <X size={12} /> Removed
          </span>
        );
      case "changed":
        return (
          <span data-testid="status-badge-changed" className="badge badge-warning flex items-center gap-1 text-white">
            <AlertCircle size={12} /> Changed
          </span>
        );
      default:
        return null;
    }
  };

  // Function to deeply compare objects and find differences
  const findDifferences = (obj1, obj2, path = "") => {
    if (!obj1 || !obj2) {
      return { [path]: { oldValue: obj1, newValue: obj2, status: "changed" } };
    }

    if (typeof obj1 !== "object" || typeof obj2 !== "object") {
      if (obj1 !== obj2) {
        return { [path]: { oldValue: obj1, newValue: obj2, status: "changed" } };
      }
      return {};
    }

    // Handle arrays
    if (Array.isArray(obj1) && Array.isArray(obj2)) {
      if (isEqual(obj1, obj2)) {
        return {};
      }
      return { [path]: { oldValue: obj1, newValue: obj2, status: "changed" } };
    }

    const allKeys = [...new Set([...Object.keys(obj1), ...Object.keys(obj2)])];
    const differences = {};

    allKeys.forEach((key) => {
      const currentPath = path ? `${path}.${key}` : key;

      // Key exists only in obj1
      if (!(key in obj2)) {
        differences[currentPath] = { oldValue: obj1[key], newValue: undefined, status: "removed" };
        return;
      }

      // Key exists only in obj2
      if (!(key in obj1)) {
        differences[currentPath] = { oldValue: undefined, newValue: obj2[key], status: "added" };
        return;
      }

      // Both have the key, check if values are different
      if (typeof obj1[key] === "object" && obj1[key] !== null && typeof obj2[key] === "object" && obj2[key] !== null) {
        // Recursively compare nested objects
        const nestedDifferences = findDifferences(obj1[key], obj2[key], currentPath);
        Object.assign(differences, nestedDifferences);
      } else if (!isEqual(obj1[key], obj2[key])) {
        differences[currentPath] = {
          oldValue: obj1[key],
          newValue: obj2[key],
          status: "changed",
        };
      }
    });

    return differences;
  };

  const preprocessData = (data) => {
    if (!data) return data;
    const cloned = JSON.parse(JSON.stringify(data));

    const traverseAndTransform = (obj) => {
      if (!obj || typeof obj !== "object") return;

      if ("prompt" in obj) {
        obj.prompt = preprocessPrompt(obj.prompt);
      }

      Object.keys(obj).forEach((key) => {
        if (key !== "prompt" && typeof obj[key] === "object") {
          traverseAndTransform(obj[key]);
        }
      });
    };

    traverseAndTransform(cloned);
    return cloned;
  };

  const alignPromptShapes = (a, b) => {
    if (!a || !b || typeof a.prompt !== "object" || typeof b.prompt !== "object") return;
    const allKeys = new Set([...Object.keys(a.prompt), ...Object.keys(b.prompt)]);
    allKeys.forEach((key) => {
      if (!(key in a.prompt)) a.prompt[key] = "";
      if (!(key in b.prompt)) b.prompt[key] = "";
    });
  };

  // Calculate differences using preprocessed data
  const differences = useMemo(() => {
    const processedOld = preprocessData(oldData);
    const processedNew = preprocessData(newData);
    alignPromptShapes(processedOld, processedNew);
    return findDifferences(processedOld, processedNew);
  }, [oldData, newData]);

  // Flatten the differences structure for direct display
  const flattenedDifferences = useMemo(() => {
    return Object.entries(differences).map(([path, diff]) => {
      return {
        path,
        ...diff,
        displayPath: path.split(".").join(" › "),
      };
    });
  }, [differences]);

  const formatVariableValue = (variableValue) =>
    variableValue !== null && typeof variableValue === "object" ? JSON.stringify(variableValue) : String(variableValue);

  // Normalize a tool/agent entry (legacy string id or connected_tools-derived object) and resolve its display data
  const resolveToolItem = (item, rootKey) => {
    const tool = typeof item === "string" ? { id: item } : item || {};

    if (rootKey === "connected_agents") {
      return {
        key: tool.id || JSON.stringify(tool),
        title: bridgeIdToNameMap[tool.id] || tool.id || "Unknown Agent",
        icons: [],
        isAgent: true,
        meta: [tool.thread_id ? "Thread: On" : null, tool.environment ? `Env: ${tool.environment}` : null].filter(
          Boolean
        ),
        variables: tool.variable_path || {},
        raw: tool,
      };
    }

    const isBuiltInPreTool = tool.type && tool.type !== PRE_TOOL_TYPES.custom_function;
    const functionId = tool.id || tool.config?.function_id;
    const fn = functionId ? functionData?.[functionId] : null;
    const scriptId = fn?.script_id || tool.config?.script_id;
    const integration = scriptId ? integrationData?.[scriptId] : null;
    const title = isBuiltInPreTool
      ? PRE_TOOL_LABELS[tool.type] || tool.type
      : fn?.title || integration?.title || fn?.name || functionId || "Unknown Tool";
    return {
      key: isBuiltInPreTool ? `type:${tool.type}` : functionId || JSON.stringify(tool),
      title,
      icons: integration?.serviceIcons || [],
      meta: [],
      variables: tool.variable_path || tool.args || {},
      raw: tool,
    };
  };

  const renderToolList = (items, otherItems, side, rootKey) => {
    const otherByKey = new Map(
      (Array.isArray(otherItems) ? otherItems : []).map((item) => {
        const resolved = resolveToolItem(item, rootKey);
        return [resolved.key, resolved];
      })
    );

    return (
      <div className="flex flex-col gap-2 whitespace-normal break-normal">
        {items.map((item, index) => {
          const tool = resolveToolItem(item, rootKey);
          const counterpart = otherByKey.get(tool.key);
          const itemStatus = !counterpart
            ? side === "old"
              ? "removed"
              : "added"
            : isEqual(counterpart.raw, tool.raw)
              ? null
              : "changed";
          const variableEntries = Object.entries(tool.variables || {});

          return (
            <div
              key={`${tool.key}-${index}`}
              className={`flex flex-col gap-1 rounded-md border bg-base-100 px-2 py-1.5 ${TOOL_STATUS_BORDER[itemStatus] || "border-base-200"}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {tool.icons.length > 0 ? (
                  <div className="flex items-center -space-x-2 shrink-0">
                    {tool.icons.slice(0, 5).map((icon, iconIndex) => (
                      <img
                        key={iconIndex}
                        src={icon}
                        alt={`${tool.title} icon ${iconIndex + 1}`}
                        className="w-5 h-5 rounded-full border-2 border-base-100 object-contain bg-white p-0.5"
                        style={{ zIndex: 5 - iconIndex }}
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    ))}
                  </div>
                ) : tool.isAgent ? (
                  <Bot size={20} className="shrink-0" />
                ) : (
                  <SquareFunctionIcon className="w-5 h-5 shrink-0" />
                )}
                <span className="text-sm truncate flex-1 min-w-0" title={tool.title}>
                  {tool.title}
                </span>
                {itemStatus && (
                  <span className={`badge badge-xs shrink-0 ${TOOL_STATUS_BADGE[itemStatus]}`}>{itemStatus}</span>
                )}
              </div>
              {tool.meta.length > 0 && (
                <div className="flex flex-wrap gap-1 pl-7">
                  {tool.meta.map((metaLabel) => (
                    <span key={metaLabel} className="badge badge-outline badge-xs text-[10px] text-base-content/70">
                      {metaLabel}
                    </span>
                  ))}
                </div>
              )}
              {variableEntries.length > 0 && (
                <div className="flex flex-col gap-0.5 pl-7">
                  <span className="text-[10px] uppercase tracking-wide text-base-content/50">Variables</span>
                  {variableEntries.map(([variableKey, variableValue]) => {
                    const isVariableChanged =
                      !!counterpart && !isEqual(counterpart.variables?.[variableKey], variableValue);
                    return (
                      <div
                        key={variableKey}
                        className={`text-xs font-mono break-all ${isVariableChanged ? "text-warning" : "text-base-content/70"}`}
                      >
                        {variableKey} → {formatVariableValue(variableValue)}
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

  // Format value for display
  const formatValue = (value, key, otherValue, side) => {
    if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) {
      return <span className="text-gray-400 italic">No Data Added</span>;
    }

    // Get the root key for special handling
    const rootKey = key.split(".")[0];

    // Handle API keys
    if (rootKey === "apikey_object_id") {
      if (typeof value === "object" && value !== null) {
        return Object.entries(value).map(([service, id]) => {
          const apiKey = apikeyData?.find((item) => item._id === id);
          return (
            <div key={service}>
              {service}: {apiKey?.name || id}
            </div>
          );
        });
      }
      return apikeyData?.find((item) => item._id === value)?.name || value;
    }

    // Handle connected tools and agents with the same row UI as the configuration page
    if (TOOL_LIST_KEYS.includes(rootKey)) {
      if (!Array.isArray(value)) {
        return JSON.stringify(value);
      }
      return renderToolList(value, otherValue, side, rootKey);
    }

    // Handle tool_choice values (show tool title instead of tool id)
    if (key.includes("tool_choice")) {
      const resolveToolName = (toolId) => {
        if (!toolId || typeof toolId !== "string") return toolId;
        const matchedTool = Object.values(functionData || {}).find((item) => item?._id === toolId);
        return matchedTool?.title || matchedTool?.name || toolId;
      };

      if (typeof value === "string") {
        return resolveToolName(value);
      }

      if (Array.isArray(value)) {
        return value.map((item) => (typeof item === "string" ? resolveToolName(item) : item)).join(", ");
      }

      if (value && typeof value === "object") {
        const transformed = { ...value };
        ["id", "tool_id", "function_id"].forEach((candidateKey) => {
          if (typeof transformed[candidateKey] === "string") {
            transformed[candidateKey] = resolveToolName(transformed[candidateKey]);
          }
        });
        return (
          <pre className="text-xs whitespace-pre-wrap break-all max-h-40 overflow-auto">
            {JSON.stringify(transformed, null, 2)}
          </pre>
        );
      }
    }

    // Handle document IDs
    if (rootKey === "doc_ids") {
      if (Array.isArray(value) && value.length > 0) {
        const labels = value.map((docItem) => {
          if (typeof docItem === "string") {
            const kbItem = knowledgeBaseData?.find((item) => item?._id === docItem);
            return kbItem?.title || kbItem?.name || docItem;
          }
          if (docItem && typeof docItem === "object") {
            return (
              docItem.name ||
              docItem.title ||
              docItem.resource_id ||
              docItem._id ||
              docItem.id ||
              JSON.stringify(docItem)
            );
          }
          return String(docItem);
        });
        return labels.join(", ");
      }
      return JSON.stringify(value);
    }

    // Handle objects and arrays with improved display
    if (typeof value === "object" && value !== null) {
      try {
        // Arrays of plain values (e.g. built-in tools, filters) read better as chips
        if (Array.isArray(value) && value.every((item) => item === null || typeof item !== "object")) {
          return (
            <div className="flex flex-wrap gap-1.5">
              {value.map((item, index) => (
                <span key={index} className="badge badge-ghost border border-base-content/20 text-xs">
                  {String(item)}
                </span>
              ))}
            </div>
          );
        }

        // Handle arrays
        if (Array.isArray(value)) {
          return (
            <div className="nested-array">
              {value.map((item, index) => (
                <div key={index} className="nested-array-item mb-2">
                  <div className="text-xs text-gray-500 mb-1">Item {index + 1}:</div>
                  <div className="pl-2 border-l-2 border-gray-300">{formatValue(item, `${key}[${index}]`)}</div>
                </div>
              ))}
            </div>
          );
        }

        // Handle nested objects
        return (
          <div className="nested-object">
            {Object.entries(value).map(([nestedKey, nestedValue]) => (
              <div key={nestedKey} className="nested-object-item mb-2">
                <div className="text-xs text-gray-500 mb-1">{DIFFERNCE_DATA_DISPLAY_NAME(nestedKey)}:</div>
                <div className="pl-2 border-l-2 border-gray-300">{formatValue(nestedValue, `${key}.${nestedKey}`)}</div>
              </div>
            ))}
          </div>
        );
      } catch {
        // Fallback to JSON string if there's an error in the recursive rendering
        return (
          <pre className="text-xs whitespace-pre-wrap break-all max-h-40 overflow-auto">
            {JSON.stringify(value, null, 2)}
          </pre>
        );
      }
    }

    // Handle boolean values
    if (typeof value === "boolean") {
      return value ? <span className="text-green-500">true</span> : <span className="text-red-500">false</span>;
    }

    // Handle all other primitive values
    return String(value);
  };

  const hasDifferences = Object.keys(differences).length > 0;

  const categorizedDifferences = useMemo(() => {
    const categories = {};

    flattenedDifferences.forEach((diff) => {
      let normalizedPath = diff.path;

      // Show prompt changes under a dedicated Prompt section instead of Advanced Parameters.
      if (normalizedPath === "configuration.prompt" || normalizedPath.startsWith("configuration.prompt.")) {
        normalizedPath = normalizedPath.replace("configuration.", "");
      }

      // Check if this is a configuration key that should be excluded
      const pathParts = normalizedPath.split(".");
      if (pathParts[0] === "configuration" && pathParts.length > 1) {
        const configKey = pathParts[1];
        if (CONFIGURATION_KEYS_TO_EXCLUDE.includes(configKey)) return;
      }

      const isOldEmpty =
        diff.oldValue === undefined ||
        diff.oldValue === null ||
        (Array.isArray(diff.oldValue) && diff.oldValue.length === 0);
      const isNewEmpty =
        diff.newValue === undefined ||
        diff.newValue === null ||
        (Array.isArray(diff.newValue) && diff.newValue.length === 0);

      // Skip only when both sides are empty; keep added/removed/changed fields visible.
      if (isOldEmpty && isNewEmpty) {
        return;
      }

      const category = pathParts[0];
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push({
        ...diff,
        path: normalizedPath,
      });
    });
    return categories;
  }, [flattenedDifferences]);

  return (
    <div className="bg-base-100 overflow-auto">
      {!hasDifferences ? (
        <div className="alert alert-success">
          <Check />
          <span>No differences found between the data sets.</span>
        </div>
      ) : (
        <React.Fragment>
          <div className="divider"></div>
          {Object.entries(categorizedDifferences).map(([category, items]) => (
            <div key={category} className="mb-6">
              <h4 className="font-semibold text-lg mb-3">{DIFFERNCE_DATA_DISPLAY_NAME(category)}</h4>
              <div className="space-y-4">
                {items.map(({ path, oldValue, newValue, status }) => {
                  // Prompt sub-field: path is "prompt.role", "prompt.goal", "prompt.instruction",
                  // "prompt.customPrompt", or any embed field under prompt
                  const promptSubFieldKey = path.startsWith("prompt.") ? path.slice("prompt.".length) : null;
                  const isPromptField = path === "prompt" || promptSubFieldKey !== null;
                  const pathParts = path.split(".");
                  // Label: use PROMPT_SECTION_CONFIG label for known prompt sub-fields, else DIFFERNCE_DATA_DISPLAY_NAME
                  const leafKey = pathParts.at(-1);
                  const isFallbackModelPath = path === "settings.fall_back.model";
                  const displayLabel = isFallbackModelPath
                    ? "Fallback Model"
                    : promptSubFieldKey && PROMPT_SECTION_CONFIG[promptSubFieldKey]?.label
                      ? PROMPT_SECTION_CONFIG[promptSubFieldKey].label
                      : DIFFERNCE_DATA_DISPLAY_NAME(leafKey);

                  return (
                    <div key={path} data-testid={`comparison-card-${path}`} className="card bg-base-200">
                      <div className="card-body p-4">
                        <div className="flex justify-between items-start mb-3">
                          <h5 className="card-title text-sm">{displayLabel}</h5>
                          {getStatusBadge(status)}
                        </div>

                        {isPromptField ? (
                          // Use ComparisonCheck for prompt field
                          <ComparisonCheck isFromPublishModal={true} oldContent={oldValue} newContent={newValue} />
                        ) : (
                          // Use regular grid display for other fields
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Current Value:</div>
                              <div className="bg-base-300 p-3 rounded text-sm break-all whitespace-pre-wrap overflow-hidden">
                                {formatValue(oldValue, path, newValue, "old")}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Updated Value:</div>
                              <div className="bg-base-300 p-3 rounded text-sm break-all whitespace-pre-wrap overflow-hidden">
                                {formatValue(newValue, path, oldValue, "new")}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </React.Fragment>
      )}
    </div>
  );
};

export default PublishVersionDataComparisonView;
