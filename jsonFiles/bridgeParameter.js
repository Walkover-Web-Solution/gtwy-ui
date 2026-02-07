export const ADVANCED_BRIDGE_PARAMETERS = {
  creativity_level: {
    name: "Creativity Level",
    description:
      "Controls the creativity of responses. Higher values (e.g., 0.7) increase creativity; lower values (e.g., 0.2) make responses more predictable.",
  },
  max_tokens: {
    name: "Max Tokens Limit",
    description: "Specifies the maximum number of text units (tokens) allowed in a response, limiting its length.",
  },
  token_selection_limit: {
    name: "Max Tokens Limit (Top K)",
    description: "Limits responses to the most likely words. Lower values focus on the most probable choices.",
  },
  response_type: { name: "Response Type", description: "Defines the format or type of the generated response." },
  probability_cutoff: {
    name: "Probability Cutoff (Top P)",
    description: "Focuses on the most likely words based on a percentage of probability.",
  },
  repetition_penalty: {
    name: "Repetition Penalty",
    description:
      "The `frequency_penalty` controls how often the model repeats itself, with higher positive values reducing repetition and negative values encouraging it.",
  },
  novelty_penalty: {
    name: "Novelty Penalty",
    description: "Discourages responses that are too similar to previous ones.",
  },
  log_probability: {
    name: "Log Probability",
    description: "If true, returns the log probabilities of each output token returned in the content of message.",
  },
  response_count: { name: "Response Count (n)", description: "Specifies how many different responses to generate." },
  response_suffix: { name: "Response Suffix", description: "Adds specific text at the end of each response." },
  additional_stop_sequences: {
    name: "Stop Sequences",
    description: "Stops generating text when certain phrases are reached.",
  },
  input_text: { name: "Input Text", description: "The starting point for generating responses." },
  echo_input: { name: "Echo Input", description: "Includes the original input text in the response." },
  best_response_count: {
    name: "Best Of",
    description: "Generates multiple responses and selects the most suitable one.",
  },
  seed: { name: "Seed", description: "Ensures consistent responses by setting a fixed value." },
  tool_choice: {
    name: "Tool Choice",
    description: "Decides whether to use tools or just the model for generating responses.",
  },
  stream: { name: "Stream", description: "Sends the response in real-time as it's being generated." },
  stop: {
    name: "Stop",
    description:
      "This parameter tells the model to stop generating text when it reaches any of the specified sequences (like a word or punctuation)",
  },
  top_p: {
    name: "Top_p",
    description:
      "Anthropic Claude computes the cumulative distribution over all the options for each subsequent token in decreasing probability order and cuts it off once it reaches a particular probability specified by top_p. You should alter either temperature or top_p, but not both.",
  },
  top_k: { name: "Top_k", description: "Use top_k to remove long tail low probability responses." },
  parallel_tool_calls: {
    name: "Parallel Tool Calls",
    description: "Enables parallel execution of tools, allowing multiple tools to run simultaneously.",
  },
  reasoning: {
    name: "Reasoning",
    description: "Controls the level of reasoning used by the model.",
  },
};

export const KEYS_NOT_TO_DISPLAY = [
  "model",
  "prompt",
  "apikey",
  "type",
  "bridgeType",
  "tools",
  "response_format",
  "stream",
  "vision",
];

export const KEYS_TO_COMPARE = [
  "configuration",
  "service",
  "org_id",
  "apikey_object_id",
  "gpt_memory",
  "function_ids",
  "tool_call_count",
  "IsstarterQuestionEnable",
  "actions",
  "apikey",
  "connected_agents",
  "user_reference",
  "doc_ids",
  "guardrails",
  "gpt_memory_context",
  "fall_back",
];

export const CONFIGURATION_KEYS_TO_EXCLUDE = ["system_prompt_version_id"];

export const DIFFERNCE_DATA_DISPLAY_NAME = (key) => {
  switch (key) {
    case "configuration":
      return "Advanced Parameters";
    case "function_ids":
      return "Tools";
    case "service":
      return "Service Provider";
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
    case "guardrails":
      return "Guardrails";
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
    case "fall_back":
      return "Fallback Model";
    default:
      return key;
  }
};
