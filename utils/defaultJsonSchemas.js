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

export const getDefaultJsonSchemaWithAnyOf = () => ({
  name: "response_schema",
  strict: true,
  schema: {
    type: "object",
    properties: {
      anyOf: {
        type: "array",
        items: { type: "object" },
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

export const getDefaultJsonSchema = (type = "greeting", withAnyOf = false) => {
  if (withAnyOf) return getDefaultJsonSchemaWithAnyOf();
  switch (type) {
    case "greeting":
    default:
      return getDefaultGreetingJsonSchema();
  }
};
export const getWidgetJsonSchema = (fields = {}) => {
  const properties = {};
  const required = [];

  if (fields.title !== false) {
    properties.title = { type: "string", description: "Card title" };
    required.push("title");
  }

  if (fields.summary) {
    properties.summary = { type: "string", description: "Short summary below the title" };
  }

  if (fields.headers) {
    properties.headers = {
      type: "object",
      description: "Column headers for table-style widgets",
      properties: {
        name: { type: "string" },
        email: { type: "string" },
        status: { type: "string" },
      },
      additionalProperties: true,
    };
  }

  if (fields.buttons) {
    const buttonProps = {};
    if (typeof fields.buttons === "object") {
      for (const [k, desc] of Object.entries(fields.buttons)) {
        buttonProps[k] = { type: "string", description: desc || k };
      }
    } else {
      buttonProps.label = { type: "string", description: "Button label" };
    }
    properties.buttons = {
      type: "object",
      description: "Button labels and text used in the template",
      properties: buttonProps,
      additionalProperties: false,
    };
  }

  if (fields.rows !== false) {
    properties.rows = {
      type: "array",
      description: "Data rows rendered by ListView",
      items: {
        type: "object",
        properties: {
          id: { type: "string", description: "Unique row identifier" },
          name: { type: "string" },
          email: { type: "string" },
          status: { type: "string" },
        },
        required: ["id"],
        additionalProperties: true,
      },
    };
    required.push("rows");
  }

  return {
    name: "widget_response",
    strict: true,
    schema: {
      type: "object",
      properties,
      required,
      additionalProperties: false,
    },
  };
};

export const generateCombinedSchema = (selectedWidgetIds, richUiWidgets) => {
  // If no widgets are selected, return normal schema without anyOf
  if (!selectedWidgetIds || selectedWidgetIds.length === 0) {
    return {
      name: "event_schema",
      schema: {
        type: "object",
        properties: {
          item: {
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
        },
        additionalProperties: false,
        required: ["item"],
      },
      strict: true,
    };
  }

  const anyOfSchemas = [];

  // Include plain greeting as first option when widgets are selected
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

  selectedWidgetIds.forEach((widgetId) => {
    const widgetObj = richUiWidgets.find((w) => w._id === widgetId);
    if (!widgetObj?.json_schema) return;

    const widgetSchema = widgetObj.json_schema.schema || widgetObj.json_schema;
    if (!widgetSchema || typeof widgetSchema !== "object" || widgetSchema.type !== "object") return;

    const { widget_id, ...cleanProperties } = widgetSchema.properties || {};
    anyOfSchemas.push({
      type: "object",
      properties: {
        widget_id: {
          type: "string",
          enum: [widgetId],
          description: `Widget ID for ${widgetObj.name || widgetId}`,
        },
        ...cleanProperties,
      },
      required: ["widget_id", ...(Array.isArray(widgetSchema.required) ? widgetSchema.required : [])],
      additionalProperties: widgetSchema.additionalProperties !== undefined ? widgetSchema.additionalProperties : false,
    });
  });

  if (anyOfSchemas.length === 0) return null;

  return {
    name: "event_schema",
    schema: {
      type: "object",
      properties: {
        item: {
          type: "object",
          anyOf: anyOfSchemas,
          additionalProperties: false,
        },
      },
      additionalProperties: false,
      required: ["item"],
    },
    strict: true,
  };
};

/** True when schema is missing or an empty object (not valid for the API). */
export const isEmptyJsonSchema = (schema) => {
  if (schema == null) return true;
  if (typeof schema !== "object" || Array.isArray(schema)) return false;
  return Object.keys(schema).length === 0;
};

/**
 * Build response_type for a schema-backed response. Defaults to `json_schema`
 * but accepts `json_object` too — both shapes persist the schema under the
 * `json_schema` key so the rest of the UI can stay model-agnostic.
 */
export const buildJsonSchemaResponseType = ({ json_schema, template_id, type = "json_schema" } = {}) => {
  const payload = {
    type,
  };
  if (template_id !== undefined) {
    payload.template_id = template_id;
  }
  if (!isEmptyJsonSchema(json_schema)) {
    payload.json_schema = json_schema;
  }
  return payload;
};
