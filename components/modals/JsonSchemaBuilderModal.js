import { updateBridgeVersionAction } from "@/store/action/bridgeAction";
import { closeModal } from "@/utils/utility";
import { MODAL_TYPE, PARAMETER_TYPES } from "@/utils/enums";
import { TrashIcon, ChevronDownIcon, ChevronRightIcon } from "@/components/Icons";
import React, { useEffect, useState, useCallback } from "react";
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
            id={`schema-prop-name-input-${currentPath}`}
            disabled={isReadOnly}
            type="text"
            value={editingName}
            className="w-1/2 text-xs font-medium bg-transparent p-0 focus:outline-none"
            onChange={(e) => {
              setEditingName(e.target.value);
            }}
            onBlur={(e) => {
              if (onPropertyNameChange && e?.target.value?.trim() !== propertyKey && e?.target.value?.trim() !== "") {
                onPropertyNameChange(currentPath, e.target.value.trim(), propertyKey);
              } else if (e?.target.value?.trim() === "") {
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
              {Object.entries(property.items.properties).map(([childKey, childProperty], index) => (
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
              {Object.entries(property.properties).map(([childKey, childProperty], index) => (
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

function JsonSchemaBuilderModal({ params, searchParams, isReadOnly = false }) {
  const dispatch = useDispatch();

  const { json_schema } = useCustomSelector((state) => ({
    json_schema:
      state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[searchParams?.version]?.configuration?.response_type
        ?.json_schema,
  }));

  const [schemaName, setSchemaName] = useState("");
  const [schemaData, setSchemaData] = useState({
    type: "object",
    properties: {},
    required: [],
    additionalProperties: false,
  });

  useEffect(() => {
    if (json_schema && typeof json_schema === "object") {
      setSchemaName(json_schema.name);
      setSchemaData({
        type: json_schema.schema?.type || json_schema.type || "object",
        properties: json_schema.schema?.properties || json_schema.properties || {},
        required: json_schema.schema?.required || json_schema.required || [],
        additionalProperties:
          json_schema.schema?.additionalProperties !== undefined
            ? json_schema.schema.additionalProperties
            : json_schema.additionalProperties !== undefined
              ? json_schema.additionalProperties
              : false,
      });
    }
  }, [json_schema]);

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

        const updatedProperties = updateProperty(prevData.properties, parentPath, (parentProperty) => {
          if (!parentProperty.properties) return parentProperty;

          const newNestedProperties = { ...parentProperty.properties };
          const propertyData = newNestedProperties[oldName];

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
      });
    },
    [updateProperty]
  );

  const handleSave = useCallback(() => {
    const jsonSchemaOutput = {
      name: schemaName,
      schema: {
        ...schemaData,
      },
      strict: true,
    };

    dispatch(
      updateBridgeVersionAction({
        bridgeId: params?.id,
        versionId: searchParams?.version,
        dataToSend: {
          configuration: {
            response_type: {
              type: "json_schema",
              json_schema: jsonSchemaOutput,
            },
          },
        },
      })
    );
    toast.success("JSON Schema saved successfully");
    closeModal(MODAL_TYPE.JSON_SCHEMA_BUILDER);
  }, [dispatch, params, searchParams, schemaData, schemaName]);

  const handleCloseModal = () => {
    closeModal(MODAL_TYPE.JSON_SCHEMA_BUILDER);
  };

  return (
    <Modal MODAL_ID={MODAL_TYPE.JSON_SCHEMA_BUILDER} onClose={handleCloseModal}>
      <div
        id="json-schema-builder-modal-container"
        className="modal-box max-w-4xl overflow-hidden text-xs max-h-[90%] my-20 flex flex-col"
      >
        <div className="mb-4 pt-3">
          <h3 className="font-bold text-lg">Build JSON Schema</h3>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="mb-4">
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">Schema Name</label>
              <input
                id="json-schema-name-input"
                type="text"
                value={schemaName}
                onChange={(e) => setSchemaName(e.target.value)}
                className="input input-sm input-bordered w-full"
                placeholder="Enter schema name..."
                disabled={isReadOnly}
              />
            </div>

            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-semibold">Properties</h4>
              <button
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
              id="json-schema-builder-close-button"
              onClick={handleCloseModal}
              className="btn btn-sm"
              type="button"
            >
              Close
            </button>
            <button
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
