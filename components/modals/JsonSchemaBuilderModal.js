import { updateBridgeVersionAction } from "@/store/action/bridgeAction";
import { closeModal, trimPropertyNames } from "@/utils/utility";
import { MODAL_TYPE, ON_CLICK_ACTION_TYPES, PARAMETER_TYPES } from "@/utils/enums";
import { TrashIcon, ChevronDownIcon, ChevronRightIcon } from "@/components/Icons";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import Modal from "@/components/UI/Modal";
import { PlusCircleIcon } from "lucide-react";
import { useCustomSelector } from "@/customHooks/customSelector";

const SchemaPropertyCard = ({
  isReadOnly,
  propertyKey,
  property,
  depth = 0,
  path = [],
  onDelete,
  onAddChild,
  onRequiredChange,
  onDescriptionChange,
  onTypeChange,
  onArrayItemTypeChange,
  onPropertyNameChange,
  schemaData,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [editingName, setEditingName] = useState(propertyKey);

  useEffect(() => {
    setEditingName(propertyKey);
  }, [propertyKey]);

  const currentPath = [...path, propertyKey].join(".");
  const hasChildren = property.type === "object" && property.properties;
  const bgColor = depth % 2 === 0 ? "bg-base-100" : "bg-base-200";

  return (
    <div className={`${bgColor} border border-base-300 rounded-lg p-2`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 justify-between w-full">
          <input
            data-testid={`schema-prop-name-input-${currentPath}`}
            id={`schema-prop-name-input-${currentPath}`}
            disabled={isReadOnly}
            type="text"
            value={editingName}
            className="w-1/2 text-xs font-medium bg-transparent p-0 focus:outline-none"
            onChange={(e) => {
              setEditingName(e.target.value);
            }}
            onBlur={(e) => {
              const trimmedValue = e?.target.value?.trim();

              if (trimmedValue && trimmedValue.includes(".")) {
                toast.error("Property names cannot contain periods (.)");
                setEditingName(propertyKey);
                return;
              }

              if (onPropertyNameChange && trimmedValue !== propertyKey && trimmedValue !== "") {
                onPropertyNameChange(currentPath, trimmedValue, propertyKey);
              } else if (trimmedValue === "") {
                setEditingName(propertyKey);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.target.blur();
              }
            }}
            placeholder="Property name"
          />
          <div className="flex items-center mr-4 gap-2">
            <label className="flex items-center gap-1 text-xs">
              <input
                data-testid={`schema-prop-required-checkbox-${currentPath}`}
                id={`schema-prop-required-checkbox-${currentPath}`}
                type="checkbox"
                className="checkbox checkbox-xs"
                checked={(() => {
                  const keyParts = currentPath.split(".");
                  if (keyParts.length === 1) {
                    return (schemaData?.required || []).includes(propertyKey);
                  } else {
                    const parentKeyParts = keyParts.slice(0, -1);
                    let currentField = schemaData?.properties;

                    for (let i = 0; i < parentKeyParts.length; i++) {
                      const key = parentKeyParts[i];
                      if (currentField?.[key]?.type === "array") {
                        currentField = currentField[key]?.items;
                      } else {
                        if (i === parentKeyParts.length - 1) {
                          currentField = currentField?.[key];
                        } else {
                          currentField = currentField?.[key]?.properties;
                        }
                      }
                    }

                    return (currentField?.required || []).includes(propertyKey);
                  }
                })()}
                disabled={isReadOnly}
                onChange={() => onRequiredChange(currentPath)}
              />
              <span className="text-base-content">Required</span>
            </label>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <select
            data-testid={`schema-prop-type-select-${currentPath}`}
            id={`schema-prop-type-select-${currentPath}`}
            disabled={isReadOnly}
            className="select select-xs select-bordered text-xs"
            value={property.type || "string"}
            onChange={(e) => onTypeChange(currentPath, e.target.value)}
          >
            {PARAMETER_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          {property.type === "array" && (
            <>
              <span className="text-xs text-base-content/70">Items:</span>
              <select
                id={`schema-prop-array-item-type-select-${currentPath}`}
                disabled={isReadOnly}
                className="select select-xs select-bordered text-xs"
                value={property.items?.type || "string"}
                onChange={(e) => onArrayItemTypeChange(currentPath, e.target.value)}
                title="Array item type"
              >
                {PARAMETER_TYPES.filter((type) => type.value !== "array").map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </>
          )}
          <button
            data-testid={`schema-prop-delete-button-${currentPath}`}
            id={`schema-prop-delete-button-${currentPath}`}
            onClick={() => onDelete(currentPath)}
            className="btn btn-sm btn-ghost text-error text-xs"
            title="Delete property"
            disabled={isReadOnly}
          >
            <TrashIcon size={14} />
          </button>
        </div>
      </div>

      <div className="text-xs mt-2">
        <textarea
          data-testid={`schema-prop-description-textarea-${currentPath}`}
          id={`schema-prop-description-textarea-${currentPath}`}
          placeholder="Description of property..."
          className="col-[1] row-[1] m-0 w-full overflow-y-hidden whitespace-pre-wrap break-words outline-none bg-transparent p-0 caret-black placeholder:text-quaternary dark:caret-slate-200 text-xs resize-none"
          value={property.description || ""}
          onChange={(e) => onDescriptionChange(currentPath, e.target.value)}
          disabled={isReadOnly}
        />
      </div>

      {/* Array items properties section when item type is object */}
      {property.type === "array" && property.items?.type === "object" && (
        <div className="mt-2">
          <div className="flex items-center justify-between">
            <button
              id={`schema-prop-array-items-expand-button-${currentPath}`}
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 text-xs font-medium"
            >
              {isExpanded ? <ChevronDownIcon size={16} /> : <ChevronRightIcon size={16} />}
              <span className="text-xs">Item Properties</span>
            </button>
            <button
              id={`schema-prop-array-items-add-property-button-${currentPath}`}
              onClick={() => onAddChild(currentPath + ".items")}
              disabled={isReadOnly}
              className="btn btn-sm btn-ghost text-primary gap-1"
              title="Add property to array items"
            >
              <PlusCircleIcon size={10} />
              <span className="text-xs">Add property</span>
            </button>
          </div>

          {isExpanded && property.items?.properties && Object.keys(property.items.properties).length > 0 && (
            <div className="space-y-1 mt-2">
              {Object.entries(property.items.properties).map(([childKey, childProperty]) => (
                <SchemaPropertyCard
                  key={childKey}
                  isReadOnly={isReadOnly}
                  propertyKey={childKey}
                  property={childProperty}
                  depth={depth + 1}
                  path={[...path, propertyKey]}
                  onDelete={onDelete}
                  onAddChild={onAddChild}
                  onRequiredChange={onRequiredChange}
                  onDescriptionChange={onDescriptionChange}
                  onTypeChange={onTypeChange}
                  onArrayItemTypeChange={onArrayItemTypeChange}
                  onPropertyNameChange={onPropertyNameChange}
                  schemaData={schemaData}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {property.type === "object" && (
        <div className="mt-2">
          <div className="flex items-center justify-between">
            <button
              id={`schema-prop-expand-button-${currentPath}`}
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 text-xs font-medium"
            >
              {isExpanded ? <ChevronDownIcon size={16} /> : <ChevronRightIcon size={16} />}
              <span className="text-xs">Properties</span>
            </button>
            <button
              id={`schema-prop-add-property-button-${currentPath}`}
              onClick={() => onAddChild(currentPath)}
              disabled={isReadOnly}
              className="btn btn-sm btn-ghost text-primary gap-1"
              title="Add property"
            >
              <PlusCircleIcon size={10} />
              <span className="text-xs">Add property</span>
            </button>
          </div>

          {isExpanded && hasChildren && (
            <div className="space-y-1 mt-2">
              {Object.entries(property.properties).map(([childKey, childProperty]) => (
                <SchemaPropertyCard
                  key={childKey}
                  isReadOnly={isReadOnly}
                  propertyKey={childKey}
                  property={childProperty}
                  depth={depth + 1}
                  path={[...path, propertyKey]}
                  onDelete={onDelete}
                  onAddChild={onAddChild}
                  onRequiredChange={onRequiredChange}
                  onDescriptionChange={onDescriptionChange}
                  onTypeChange={onTypeChange}
                  onArrayItemTypeChange={onArrayItemTypeChange}
                  onPropertyNameChange={onPropertyNameChange}
                  schemaData={schemaData}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const EMPTY_WIDGET_BUTTONS = [];

function JsonSchemaBuilderModal({
  params,
  searchParams,
  isReadOnly = false,
  schemaKey = "json_schema",
  modalId = MODAL_TYPE.JSON_SCHEMA_BUILDER,
  title = "Build JSON Schema",
  hideName = false,
  // When provided, shows a button dropdown and filters schema to only the selected button's vars
  widgetButtons = EMPTY_WIDGET_BUTTONS,
}) {
  const dispatch = useDispatch();

  const { json_schema, response_type } = useCustomSelector((state) => {
    const rt =
      state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[searchParams?.version]?.configuration?.response_type;
    return {
      json_schema: rt?.[schemaKey],
      response_type: rt,
    };
  });

  const [schemaName, setSchemaName] = useState("");
  const [schemaData, setSchemaData] = useState({
    type: "object",
    properties: {},
    required: [],
    additionalProperties: false,
  });
  const [selectedButtonKey, setSelectedButtonKey] = useState(null);
  const [buttonOnClickTypes, setButtonOnClickTypes] = useState({});
  const schemaCacheRef = useRef({});

  // Reset button selection when widgetButtons changes
  useEffect(() => {
    setSelectedButtonKey(widgetButtons.length > 0 ? (widgetButtons[0]?.key ?? null) : null);
    schemaCacheRef.current = {};
  }, [widgetButtons]);

  // Helper to navigate to the button's schema node and return its `onClickType` property node.
  const getOnClickTypeNode = useCallback((schema, buttonConfig) => {
    if (!buttonConfig || !schema) return null;
    let curr = schema;
    for (const seg of buttonConfig.path || []) {
      if (curr == null) return null;
      const next = Array.isArray(curr) ? curr[Number(seg)] : curr[seg];
      if (next == null) return null;
      curr = next;
    }
    // Inline action type pattern: the node itself has a type.enum (e.g. applyActionType)
    if (buttonConfig.isInlineActionType) {
      return curr?.properties?.type ?? null;
    }
    return curr?.properties?.onClickType ?? null;
  }, []);

  const getActionDataNode = useCallback((schema, buttonConfig) => {
    if (!buttonConfig || !schema) return null;
    let curr = schema;
    for (const seg of buttonConfig.path || []) {
      if (curr == null) return null;
      // Arrays use numeric index, objects use string key
      const next = Array.isArray(curr) ? curr[Number(seg)] : curr[seg];
      if (next == null) return null;
      curr = next;
    }
    // Inline action type pattern: the node itself contains the data property
    if (buttonConfig.isInlineActionType) {
      return curr?.properties?.data ?? null;
    }
    const actionKey = buttonConfig.actionDataKey || "actionData";
    if (curr?.properties?.[actionKey]?.properties?.data) {
      return curr.properties[actionKey].properties.data;
    }
    return null;
  }, []);

  useEffect(() => {
    if (!json_schema || widgetButtons.length === 0) return;
    const rootSchema = json_schema.schema || json_schema;
    const types = {};
    widgetButtons.forEach((btn) => {
      const node = getOnClickTypeNode(rootSchema, btn);
      if (node?.enum?.length === 1) {
        types[btn.key] = node.enum[0];
      } else {
        types[btn.key] = "";
      }
    });
    setButtonOnClickTypes(types);
  }, [widgetButtons]); // intentionally excludes json_schema & getOnClickTypeNode to avoid resetting on schema changes

  useEffect(() => {
    if (!json_schema || typeof json_schema !== "object") return;

    if (widgetButtons.length > 0) {
      // Resolve the active button from the primitive key — avoids stale derived-ref issues
      const activeBtn = widgetButtons.find((b) => b.key === selectedButtonKey) ?? widgetButtons[0];

      if (schemaCacheRef.current[activeBtn.key]) {
        setSchemaName("ActionData");
        setSchemaData(schemaCacheRef.current[activeBtn.key]);
      } else {
        const dataNode = getActionDataNode(json_schema.schema || json_schema, activeBtn);
        setSchemaName("ActionData");
        setSchemaData(
          dataNode
            ? {
                type: "object",
                properties: dataNode.properties || {},
                required: dataNode.required || [],
                additionalProperties: false,
              }
            : { type: "object", properties: {}, required: [], additionalProperties: false }
        );
      }
    } else {
      // Normal (non-widget-button) mode
      const fullProps = json_schema.schema?.properties || json_schema.properties || {};
      const fullRequired = json_schema.schema?.required || json_schema.required || [];
      setSchemaName(json_schema.name);
      setSchemaData({
        type: json_schema.schema?.type || json_schema.type || "object",
        properties: fullProps,
        required: fullRequired,
        additionalProperties:
          json_schema.schema?.additionalProperties !== undefined
            ? json_schema.schema.additionalProperties
            : json_schema.additionalProperties !== undefined
              ? json_schema.additionalProperties
              : false,
      });
    }
  }, [json_schema, selectedButtonKey, widgetButtons, getActionDataNode]);

  const updateProperty = useCallback((properties, keyParts, updateFn) => {
    const propertiesClone = JSON.parse(JSON.stringify(properties));

    const _updateProperty = (currentProperties, remainingKeyParts) => {
      if (remainingKeyParts.length === 1) {
        currentProperties[remainingKeyParts[0]] = updateFn(currentProperties[remainingKeyParts[0]]);
      } else {
        const [head, ...tail] = remainingKeyParts;
        if (currentProperties[head]) {
          const isArray = currentProperties[head].type === "array";
          if (isArray) {
            // For arrays, navigate to items first
            if (!currentProperties[head].items) {
              currentProperties[head].items = {};
            }
            // If items is an object type, navigate to its properties
            if (currentProperties[head].items.type === "object") {
              if (!currentProperties[head].items.properties) {
                currentProperties[head].items.properties = {};
              }
              currentProperties[head].items.properties = _updateProperty(
                currentProperties[head].items.properties,
                tail
              );
            } else {
              // For non-object items, just update items directly
              currentProperties[head].items = _updateProperty(currentProperties[head].items || {}, tail);
            }
          } else {
            // For objects, navigate to properties
            currentProperties[head].properties = _updateProperty(currentProperties[head].properties || {}, tail);
          }
        }
      }
      return currentProperties;
    };

    return _updateProperty(propertiesClone, keyParts);
  }, []);

  const handleAddProperty = useCallback(() => {
    setSchemaData((prevData) => {
      const properties = prevData.properties || {};
      let counter = 0;
      let newKey = `new${counter}`;
      while (properties[newKey]) {
        counter++;
        newKey = `new${counter}`;
      }

      const newProperties = {
        ...properties,
        [newKey]: {
          type: "string",
          description: "",
        },
      };

      const newRequired = [...(prevData.required || []), newKey];

      return {
        ...prevData,
        properties: newProperties,
        required: newRequired,
      };
    });
  }, []);

  const handleAddChildProperty = useCallback(
    (parentPath) => {
      setSchemaData((prevData) => {
        const pathParts = parentPath.split(".");
        const isArrayItems = pathParts[pathParts.length - 1] === "items";

        // Remove "items" from path if present, as we need to navigate to the parent property first
        const navigationPath = isArrayItems ? pathParts.slice(0, -1) : pathParts;

        const updatedProperties = updateProperty(prevData.properties, navigationPath, (property) => {
          // Determine where to add the new property
          let targetObject;
          if (isArrayItems) {
            // Adding to array items
            if (!property.items) {
              property.items = { type: "object", properties: {} };
            }
            if (!property.items.properties) {
              property.items.properties = {};
            }
            targetObject = property.items;
          } else {
            // Adding to regular object
            if (!property.properties) {
              property.properties = {};
            }
            targetObject = property;
          }

          let counter = 0;
          let newKey = `new${counter}`;
          while (targetObject.properties[newKey]) {
            counter++;
            newKey = `new${counter}`;
          }

          targetObject.properties[newKey] = {
            type: "string",
            description: "",
          };

          if (!targetObject.required) {
            targetObject.required = [];
          }
          targetObject.required = [...targetObject.required, newKey];

          return property;
        });

        return {
          ...prevData,
          properties: updatedProperties,
        };
      });
    },
    [updateProperty]
  );

  const handleDeleteProperty = useCallback((path) => {
    setSchemaData((prevData) => {
      const keyParts = path.split(".");
      const newProperties = JSON.parse(JSON.stringify(prevData.properties));
      const propertyToDelete = keyParts[keyParts.length - 1];

      if (keyParts.length === 1) {
        // Delete top-level property
        delete newProperties[keyParts[0]];

        // Remove from top-level required array
        const newRequired = (prevData.required || []).filter((item) => item !== propertyToDelete);

        return {
          ...prevData,
          properties: newProperties,
          required: newRequired,
        };
      } else {
        // Delete nested property
        let current = newProperties;
        let parent = null;

        for (let i = 0; i < keyParts.length - 1; i++) {
          const key = keyParts[i];
          parent = current[key];
          if (current[key].type === "array") {
            // Navigate to array items
            if (current[key].items && current[key].items.type === "object") {
              // For object-type items, navigate to items.properties
              current = current[key].items.properties;
              parent = current[key].items; // Update parent to items for required array
            } else {
              // For non-object items
              current = current[key].items;
            }
          } else {
            current = current[key].properties;
          }
        }

        delete current[propertyToDelete];

        // Remove from parent's required array
        if (parent && parent.required) {
          parent.required = parent.required.filter((item) => item !== propertyToDelete);
        }

        return {
          ...prevData,
          properties: newProperties,
        };
      }
    });
  }, []);

  const handleRequiredChange = useCallback(
    (key) => {
      const keyParts = key.split(".");
      if (keyParts.length === 1) {
        setSchemaData((prevData) => {
          const updatedRequired = prevData.required || [];
          const newRequired = updatedRequired.includes(keyParts[0])
            ? updatedRequired.filter((item) => item !== keyParts[0])
            : [...updatedRequired, keyParts[0]];

          return {
            ...prevData,
            required: newRequired,
          };
        });
      } else {
        setSchemaData((prevData) => {
          const updatedProperties = updateProperty(prevData.properties, keyParts.slice(0, -1), (property) => {
            if (!property) {
              console.warn(`Property not found for key: ${keyParts.slice(0, -1).join(".")}`);
              return {};
            }

            const propertyKey = keyParts[keyParts.length - 1];
            const updatedRequired = property.required || [];
            const newRequired = updatedRequired.includes(propertyKey)
              ? updatedRequired.filter((item) => item !== propertyKey)
              : [...updatedRequired, propertyKey];

            return {
              ...property,
              required: newRequired,
            };
          });

          return {
            ...prevData,
            properties: updatedProperties,
          };
        });
      }
    },
    [updateProperty]
  );

  const handleDescriptionChange = useCallback(
    (key, newDescription) => {
      setSchemaData((prevData) => {
        const updatedProperties = updateProperty(prevData.properties, key.split("."), (property) => ({
          ...property,
          description: newDescription,
        }));
        return {
          ...prevData,
          properties: updatedProperties,
        };
      });
    },
    [updateProperty]
  );

  const handleTypeChange = useCallback(
    (key, newType) => {
      setSchemaData((prevData) => {
        const updatedProperties = updateProperty(prevData.properties, key.split("."), (property) => {
          const updatedProperty = {
            ...property,
            type: newType,
          };

          if (newType === "object") {
            if (!updatedProperty.properties) {
              updatedProperty.properties = {};
            }
            updatedProperty.additionalProperties = false;
          } else if (newType !== "object") {
            delete updatedProperty.properties;
            delete updatedProperty.required;
            delete updatedProperty.additionalProperties;
          }

          if (newType === "array" && !updatedProperty.items) {
            updatedProperty.items = { type: "string" };
          } else if (newType !== "array") {
            delete updatedProperty.items;
          }

          return updatedProperty;
        });

        return {
          ...prevData,
          properties: updatedProperties,
        };
      });
    },
    [updateProperty]
  );

  const handleArrayItemTypeChange = useCallback(
    (key, newItemType) => {
      setSchemaData((prevData) => {
        const updatedProperties = updateProperty(prevData.properties, key.split("."), (property) => {
          const updatedItems = { type: newItemType };

          // Initialize properties object if item type is object
          if (newItemType === "object") {
            updatedItems.properties = property.items?.properties || {};
            updatedItems.additionalProperties = false;
          }

          return {
            ...property,
            items: updatedItems,
          };
        });

        return {
          ...prevData,
          properties: updatedProperties,
        };
      });
    },
    [updateProperty]
  );

  const handlePropertyNameChange = useCallback(
    (currentPath, newName, oldName) => {
      if (!newName?.trim() || newName === oldName) return;

      const keyParts = currentPath.split(".");
      const parentPath = keyParts.slice(0, -1);

      setSchemaData((prevData) => {
        if (parentPath.length === 0) {
          const newProperties = { ...prevData.properties };
          const propertyData = newProperties[oldName];

          if (!propertyData) {
            console.error("Property not found:", oldName);
            return prevData;
          }

          delete newProperties[oldName];
          newProperties[newName] = propertyData;

          let newRequired = prevData.required || [];
          if (newRequired.includes(oldName)) {
            newRequired = newRequired.filter((name) => name !== oldName);
            newRequired.push(newName);
          }

          return {
            ...prevData,
            properties: newProperties,
            required: newRequired,
          };
        }

        try {
          const updatedProperties = updateProperty(prevData.properties, parentPath, (parentProperty) => {
            if (!parentProperty || !parentProperty.properties) {
              console.error("Invalid parent property path:", parentPath);
              throw new Error("Invalid parent path");
            }

            const newNestedProperties = { ...parentProperty.properties };
            const propertyData = newNestedProperties[oldName];

            if (!propertyData) {
              console.error("Property not found:", oldName);
              throw new Error("Property not found");
            }

            delete newNestedProperties[oldName];
            newNestedProperties[newName] = propertyData;

            let newRequired = parentProperty.required || [];
            if (newRequired.includes(oldName)) {
              newRequired = newRequired.filter((name) => name !== oldName);
              newRequired.push(newName);
            }

            return {
              ...parentProperty,
              properties: newNestedProperties,
              required: newRequired,
            };
          });

          return {
            ...prevData,
            properties: updatedProperties,
          };
        } catch (error) {
          console.error("Failed to rename property:", error);
          toast.error("Failed to rename property. Please try again.");
          return prevData;
        }
      });
    },
    [updateProperty]
  );

  const handleSave = useCallback(() => {
    const trimmedProperties = trimPropertyNames(schemaData.properties);

    if (widgetButtons.length > 0) {
      const activeBtn = widgetButtons.find((b) => b.key === selectedButtonKey) ?? widgetButtons[0];
      let mergedSchema = JSON.parse(JSON.stringify(json_schema));
      const mergedRoot = mergedSchema.schema || mergedSchema;

      // Update current active button to cache
      schemaCacheRef.current[activeBtn.key] = {
        ...schemaData,
        properties: trimmedProperties,
      };

      // Apply all cached button changes
      Object.keys(schemaCacheRef.current).forEach((cacheKey) => {
        const btn = widgetButtons.find((b) => b.key === cacheKey);
        if (btn) {
          const foundNode = getActionDataNode(mergedRoot, btn);
          if (foundNode) {
            foundNode.properties = trimPropertyNames(schemaCacheRef.current[cacheKey].properties || {});
            foundNode.required = schemaCacheRef.current[cacheKey].required || [];
          }
        }
      });

      // Patch onClickType.enum for all buttons that have a selected type
      widgetButtons.forEach((btn) => {
        const selectedType = buttonOnClickTypes[btn.key];
        if (!selectedType) return;
        const onClickNode = getOnClickTypeNode(mergedRoot, btn);
        if (onClickNode) {
          onClickNode.enum = [selectedType];
        }
      });
      dispatch(
        updateBridgeVersionAction({
          bridgeId: params?.id,
          versionId: searchParams?.version,
          dataToSend: {
            configuration: {
              response_type: { ...response_type, json_schema: mergedSchema },
            },
          },
        })
      );
    } else {
      // Normal mode: replace the whole schema at schemaKey
      dispatch(
        updateBridgeVersionAction({
          bridgeId: params?.id,
          versionId: searchParams?.version,
          dataToSend: {
            configuration: {
              response_type: {
                ...response_type,
                [schemaKey]: {
                  name: schemaName?.trim(),
                  schema: { ...schemaData, properties: trimmedProperties },
                  strict: true,
                },
              },
            },
          },
        })
      );
    }
    toast.success("JSON Schema saved successfully");
    schemaCacheRef.current = {};
    setSelectedButtonKey(widgetButtons.length > 0 ? (widgetButtons[0]?.key ?? null) : null);
    closeModal(modalId);
  }, [
    dispatch,
    params,
    searchParams,
    schemaData,
    schemaName,
    schemaKey,
    modalId,
    selectedButtonKey,
    widgetButtons,
    json_schema,
    response_type,
    getActionDataNode,
    getOnClickTypeNode,
    buttonOnClickTypes,
  ]);

  const handleCloseModal = () => {
    schemaCacheRef.current = {};
    setSelectedButtonKey(widgetButtons.length > 0 ? (widgetButtons[0]?.key ?? null) : null);
    closeModal(modalId);
  };

  return (
    <Modal MODAL_ID={modalId} onClose={handleCloseModal}>
      <div
        id="json-schema-builder-modal-container"
        className="modal-box max-w-4xl overflow-hidden text-xs max-h-[90%] my-20 flex flex-col"
      >
        <div className="mb-4 pt-3">
          <h3 className="font-bold text-lg">{title}</h3>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="mb-4">
            {widgetButtons.length > 0 && (
              <div className="mb-4 space-y-2">
                {(() => {
                  const activeKey = selectedButtonKey ?? widgetButtons[0]?.key;
                  const activeBtn = widgetButtons.find((b) => b.key === activeKey) ?? widgetButtons[0];
                  const rootSchema = json_schema?.schema || json_schema;
                  const onClickNode = activeBtn ? getOnClickTypeNode(rootSchema, activeBtn) : null;
                  const currentType = activeBtn
                    ? (buttonOnClickTypes[activeBtn.key] ??
                      (onClickNode?.enum?.length === 1 ? onClickNode.enum[0] : ""))
                    : "";

                  const actionOptions = ON_CLICK_ACTION_TYPES;
                  const isMulti = widgetButtons.length > 1;

                  return (
                    <div className="flex items-end gap-2">
                      {/* Button dropdown — only shown when multiple buttons */}
                      {isMulti && (
                        <div className="flex-1">
                          <label className="block text-xs font-semibold mb-1">Button</label>
                          <select
                            className="select select-sm select-bordered w-full"
                            value={activeKey}
                            onChange={(e) => {
                              schemaCacheRef.current[activeKey] = schemaData;
                              setSelectedButtonKey(e.target.value);
                            }}
                          >
                            {widgetButtons.map((btn) => (
                              <option key={btn.key} value={btn.key}>
                                {btn.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Action Type dropdown — always shown for widget buttons */}
                      <div className={isMulti ? "flex-1" : "w-full"}>
                        <label className="block text-xs font-semibold mb-1">
                          {!isMulti ? `${activeBtn?.label} — ` : ""}Action Type
                        </label>
                        <select
                          className="select select-sm select-bordered w-full"
                          value={currentType}
                          disabled={isReadOnly}
                          onChange={(e) =>
                            setButtonOnClickTypes((prev) => ({ ...prev, [activeBtn.key]: e.target.value }))
                          }
                        >
                          {!currentType && (
                            <option value="" disabled>
                              Select action type
                            </option>
                          )}
                          {actionOptions.map((actionType) => (
                            <option key={actionType} value={actionType}>
                              {actionType === "reply"
                                ? "Reply"
                                : actionType === "sendDataToFrontend"
                                  ? "Send to Frontend"
                                  : actionType}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })()}

                <p className="text-xs text-base-content/50">
                  Editing the data payload for this button. Save merges changes into the widget schema.
                </p>
              </div>
            )}

            {!hideName && (
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Schema Name</label>
                <input
                  data-testid="json-schema-name-input"
                  id="json-schema-name-input"
                  type="text"
                  value={schemaName}
                  onChange={(e) => setSchemaName(e.target.value)}
                  className="input input-sm input-bordered w-full"
                  placeholder="Enter schema name..."
                  disabled={isReadOnly}
                />
              </div>
            )}

            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-semibold">Properties</h4>
              <button
                data-testid="json-schema-builder-add-property-button"
                id="json-schema-builder-add-property-button"
                onClick={handleAddProperty}
                disabled={isReadOnly}
                className="btn btn-sm btn-ghost text-primary gap-1"
              >
                <PlusCircleIcon size={14} />
                <span className="text-xs">Add Property</span>
              </button>
            </div>

            <div className="space-y-2">
              {Object.entries(schemaData.properties || {}).length > 0 ? (
                Object.entries(schemaData.properties || {}).map(([key, property]) => (
                  <SchemaPropertyCard
                    key={key}
                    isReadOnly={isReadOnly}
                    propertyKey={key}
                    property={property}
                    depth={0}
                    path={[]}
                    onDelete={handleDeleteProperty}
                    onAddChild={handleAddChildProperty}
                    onRequiredChange={handleRequiredChange}
                    onDescriptionChange={handleDescriptionChange}
                    onTypeChange={handleTypeChange}
                    onArrayItemTypeChange={handleArrayItemTypeChange}
                    onPropertyNameChange={handlePropertyNameChange}
                    schemaData={schemaData}
                  />
                ))
              ) : (
                <div className="flex items-center justify-center h-full min-h-[100px]">
                  <div className="text-xs opacity-60 text-gray-500 text-center">
                    No properties available. Click the "+ Add Property" button above to add your first property.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-action mt-2">
          <form method="dialog" className="flex flex-row gap-2">
            <button
              data-testid="json-schema-builder-close-button"
              id="json-schema-builder-close-button"
              onClick={handleCloseModal}
              className="btn btn-sm"
              type="button"
            >
              Close
            </button>
            <button
              data-testid="json-schema-builder-save-button"
              id="json-schema-builder-save-button"
              onClick={handleSave}
              className="btn btn-sm btn-primary"
              type="button"
              disabled={isReadOnly}
            >
              Save
            </button>
          </form>
        </div>
      </div>
    </Modal>
  );
}

export default React.memo(JsonSchemaBuilderModal);
