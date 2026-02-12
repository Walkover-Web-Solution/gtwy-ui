/**
 * Default JSON Schema for basic greeting responses
 * Returns a simple text response without rich UI
 */
export const getDefaultGreetingJsonSchema = () => ({
  name: "greeting_response",
  strict: true,
  schema: {
    type: "object",
    properties: {
      response: {
        type: "string",
        description: "A friendly greeting or response message",
      },
    },
    required: ["response"],
    additionalProperties: false,
  },
});

/**
 * Create a JSON schema with anyOf field including the default greeting schema
 * @returns {object} JSON schema with anyOf array
 */
export const getDefaultJsonSchemaWithAnyOf = () => ({
  name: "response_schema",
  strict: true,
  schema: {
    type: "object",
    properties: {
      anyOf: {
        type: "array",
        items: {
          type: "object",
        },
        description: "Array of possible response schemas",
      },
    },
    anyOf: [
      {
        type: "object",
        properties: {
          response: {
            type: "string",
            description: "A friendly greeting or response message",
          },
        },
        required: ["response"],
        additionalProperties: false,
      },
    ],
  },
});

/**
 * Get default JSON schema based on type
 * @param {string} type - Type of schema needed (default: 'greeting')
 * @param {boolean} withAnyOf - Whether to include anyOf field (default: false)
 * @returns {object} Default JSON schema object
 */
export const getDefaultJsonSchema = (type = "greeting", withAnyOf = false) => {
  if (withAnyOf) {
    return getDefaultJsonSchemaWithAnyOf();
  }

  switch (type) {
    case "greeting":
      return getDefaultGreetingJsonSchema();
    default:
      return getDefaultGreetingJsonSchema();
  }
};

/**
 * Generate combined schema with widget_id enum for selected widgets
 * @param {Array} selectedWidgetIds - Array of selected widget IDs
 * @param {Array} richUiWidgets - Array of all available rich UI widgets
 * @returns {object} Combined JSON schema with anyOf array and widget_id enum
 */
export const generateCombinedSchema = (selectedWidgetIds, richUiWidgets) => {
  if (!selectedWidgetIds || selectedWidgetIds.length === 0) {
    return null;
  }

  const anyOfSchemas = [];

  // Add default greeting schema as the first option
  anyOfSchemas.push({
    type: "object",
    properties: {
      response: {
        type: "string",
        description: "A friendly greeting or response message",
      },
    },
    required: ["response"],
    additionalProperties: false,
  });

  // Process selected widgets
  selectedWidgetIds.forEach((widgetId) => {
    // Find widget by _id
    const widgetObj = richUiWidgets.find((widget) => widget._id === widgetId);

    if (widgetObj?.json_schema?.schema) {
      // Get the widget schema
      const widgetSchema = widgetObj.json_schema.schema;

      // Remove any existing widget_id from the original schema properties
      const { widget_id, ...cleanProperties } = widgetSchema.properties || {};

      // Create enhanced schema with widget_id specific to this widget only
      const enhancedSchema = {
        type: "object",
        properties: {
          widget_id: {
            type: "string",
            enum: [widgetId],
            description: `Widget ID for ${widgetObj.name || widgetId}`,
          },
          ...cleanProperties,
        },
        required: ["widget_id", ...(widgetSchema.required || [])],
        additionalProperties:
          widgetSchema.additionalProperties !== undefined ? widgetSchema.additionalProperties : false,
      };

      anyOfSchemas.push(enhancedSchema);
    }
  });

  if (anyOfSchemas.length === 0) {
    return null;
  }

  return {
    name: "event_schema",
    schema: {
      type: "object",
      properties: {
        item: {
          anyOf: anyOfSchemas,
        },
      },
      additionalProperties: false,
      required: ["item"],
    },
    strict: true,
  };
};
