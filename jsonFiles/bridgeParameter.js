// Parameter names and descriptions are now stored in ModelConfig database
// This file only contains utility constants that are still needed

// eslint-disable-next-line import/no-unused-modules
export function getDefaultValues(additionalParams, bridgeParams) {
  const defaults = {};
  for (const key in bridgeParams) {
    if (additionalParams.hasOwnProperty(key) && additionalParams[key].hasOwnProperty("default")) {
      defaults[key] = additionalParams[key]["default"];
    }
  }
  return defaults;
}

// eslint-disable-next-line import/no-unused-modules
export const parameterTypes = ["string", "number", "boolean", "object", "array"];

export const KEYS_TO_COMPARE = [
  "configuration",
  "service",
  "cache_on",
  "org_id",
  "apikey_object_id",
  "gpt_memory",
  "function_ids",
  "pre_tools",
  "settings",
  "IsstarterQuestionEnable",
  "actions",
  "apikey",
  "connected_agents",
  "user_reference",
  "doc_ids",
  "gpt_memory_context",
];

export const CONFIGURATION_KEYS_TO_EXCLUDE = ["system_prompt_version_id"];

export const DIFFERNCE_DATA_DISPLAY_NAME = (key) => {
  switch (key) {
    case "configuration":
      return "Advanced Parameters";
    case "function_ids":
      return "Tools";
    case "pre_tools":
      return "Pre Tools";
    case "service":
      return "Service Provider";
    case "cache_on":
      return "Allow Cached Response";
    case "apikey_object_id":
      return "API Key";
    case "doc_ids":
      return "Knowledge Base";
    case "connected_agents":
      return "Connected Agents";
    case "model":
      return "Model";
    case "prompt":
      return "Prompt";
    case "gpt_memory_context":
      return "GPT Memory Context";
    case "gpt_memory":
      return "GPT Memory";
    case "IsstarterQuestionEnable":
      return "Starter Question";
    case "user_reference":
      return "Rich Text context";
    case "is_rich_text":
      return "Rich Text";
    case "actions":
      return "Actions";
    case "is_enable":
      return "Fallback Model";

    default:
      return key;
  }
};
