import { BookIcon, BotIcon, KeyIcon, SettingsIcon, TestTubeDiagonalIcon, WrenchIcon } from "@/components/Icons";
export const PAUTH_KEY_COLUMNS = ["name", "authkey", "created_at"];
export const API_KEY_COLUMNS = ["name", "apikey", "comment", "apikey_usage", "last_used"];
export const WEBHOOKALERT_COLUMNS = ["name", "url", "headers", "alertType", "bridges"];
export const ALERT_TYPE = ["Error", "Variable"];

export const AVAILABLE_MODEL_TYPES = {
  API: "api",
  CHAT: "chat",
  FINETUNE: "finetune",
  COMPLETION: "completion",
  IMAGE: "image",
  EMBEDDING: "embedding",
  REASONING: "reasoning",
};
// Canonical descriptions for finish_reason values

export const MODAL_TYPE = {
  CREATE_VARIABLE: "CREATE_VARIABLE",
  CREATE_BRIDGE_MODAL: "CREATE_BRIDGE_MODAL",
  OPTIMIZE_PROMPT: "optmize_prompt_modal",
  PUBLISH_BRIDGE_VERSION: "publish_bridge_version_modal",
  VERSION_DESCRIPTION_MODAL: "version_description_modal",
  API_KEY_MODAL: "API_KEY_MODAL",
  PAUTH_KEY_MODAL: "PAUTH_KEY_MODAL",
  FINE_TUNE_MODAL: "fine-tune-modal",
  PRE_FUNCTION_PARAMETER_MODAL: "pre-function-parameter-modal",
  TOOL_FUNCTION_PARAMETER_MODAL: "tool-function-parameter-modal",
  ACTION_MODAL: "actionModel",
  CHATBOT_MODAL: "chatBot_model",
  CREATE_ORG_MODAL: "create-org-modal",
  WEBHOOK_MODAL: "WEBHOOK_MODAL",
  CHAT_DETAILS_VIEW_MODAL: "chat_details_view",
  JSON_SCHEMA: "JSON_SCHEMA",
  JSON_SCHEMA_BUILDER: "JSON_SCHEMA_BUILDER",
  KNOWLEDGE_BASE_MODAL: "KNOWLEDGE_BASE_MODAL",
  PROMPT_SUMMARY: "PROMPT_SUMMARY",
  TESTCASE_MODAL: "TESTCASE_MODAL",
  DEMO_MODAL: "DEMO_MODAL",
  ADD_TEST_CASE_MODAL: "ADD_TEST_CASE_MODAL",
  HISTORY_PAGE_PROMPT_UPDATE_MODAL: "HISTORY_PAGE_PROMPT_UPDATE_MODAL",
  AGENT_DESCRIPTION_MODAL: "AGENT_DESCRIPTION_MODAL",
  AGENT_VARIABLE_MODAL: "AGENT_VARIABLE_MODAL",
  TUTORIAL_MODAL: "TUTORIAL_MODAL",
  EDIT_MESSAGE_MODAL: "EDIT_MESSAGE_MODAL",
  INTEGRATION_MODAL: "INTEGRATION_MODAL",
  INTEGRATION_GUIDE_MODAL: "INTEGRATION_GUIDE_MODAL",
  AUTH_DATA_MODAL: "AUTH_DATA_MODAL",
  KNOWLEDGE_BASE_MODAL: "KNOWLEDGE_BASE_MODAL",
  DELETE_MODAL: "DELETE_MODAL",
  DELETE_PREBUILT_TOOL_MODAL: "DELETE_PREBUILT_TOOL_MODAL",
  DELETE_TOOL_MODAL: "DELETE_TOOL_MODAL",
  DELETE_AGENT_MODAL: "DELETE_AGENT_MODAL",
  DELETE_PRE_TOOL_MODAL: "DELETE_PRE_TOOL_MODAL",
  DELETE_KNOWLEDGE_BASE_MODAL: "DELETE_KNOWLEDGE_BASE_MODAL",
  BRIDGE_TYPE_MODAL: "BRIDGE_TYPE_MODAL",
  ADD_NEW_MODEL_MODAL: "ADD_NEW_MODEL_MODAL",
  USAGE_DETAILS_MODAL: "USAGE_DETAILS_MODAL",
  CONNECTED_AGENTS_MODAL: "CONNECTED_AGENTS_MODAL",
  DIFF_PROMPT: "DIFF_PROMPT",
  ORCHESTRAL_AGENT_PARAMETER_MODAL: "ORCHESTRAL_AGENT_PARAMETER_MODAL",
  CREATE_ORCHESTRAL_FLOW_MODAL: "CREATE_ORCHESTRAL_FLOW_MODAL",
  API_KEY_LIMIT_MODAL: "API_KEY_LIMIT_MODAL",
  PROMPT_SUMMARY_PUBLISH: "PROMPT_SUMMARY_PUBLISH",
  DELETE_VERSION_MODAL: "DELETE_VERSION_MODAL",
  PREBUILT_TOOLS_CONFIG_MODAL: "PREBUILT_TOOLS_CONFIG_MODAL",
  INVITE_USER: "INVITE_USER",
  ORCHESTRAL_DELETE_MODAL: "ORCHESTRAL_DELETE_MODAL",
  ACCESS_MANAGEMENT_MODAL: "ACCESS_MANAGEMENT_MODAL",
  UNSAVED_CHANGES_MODAL: "UNSAVED_CHANGES_MODAL",
  RESOURCE_CHUNKS_MODAL: "RESOURCE_CHUNKS_MODAL",
  GTWY_OPEN_WITH_AGENT_MODAL: "GTWY_OPEN_WITH_AGENT_MODAL",
  GTWY_CREATE_AGENT_NAME_MODAL: "GTWY_CREATE_AGENT_NAME_MODAL",
  GTWY_CREATE_AGENT_PURPOSE_MODAL: "GTWY_CREATE_AGENT_PURPOSE_MODAL",
  GTWY_SEND_DATA_MODAL: "GTWY_SEND_DATA_MODAL",
  GTWY_GET_AGENTS_MODAL: "GTWY_GET_AGENTS_MODAL",
  KEYBOARD_SHORTCUTS_MODAL: "KEYBOARD_SHORTCUTS_MODAL",
};

export const API_KEY_MODAL_INPUT = ["name", "apikey", "comment", "apikey_limit"];

export const USER_FEEDBACK_FILTER_OPTIONS = ["all", "1", "2"];

export const TIME_RANGE_OPTIONS = [
  "1 hour",
  "3 hours",
  "6 hours",
  "12 hours",
  "1 day",
  "2 days",
  "7 days",
  "14 days",
  "30 days",
];

export const METRICS_FACTOR_OPTIONS = ["bridge_id", "apikey_id", "model"];
export const KNOWLEDGE_BASE_COLUMNS = ["name", "description", "created", "strategy", "chunk"];
export const KNOWLEDGE_BASE_SECTION_TYPES = [
  { value: "default", label: "Default" },
  { value: "custom", label: "Custom" },
];
export const KNOWLEDGE_BASE_CUSTOM_SECTION = [
  { value: "semantic", label: "Semantic Chunking" },
  { value: "manual", label: "Manual Chunking" },
  { value: "recursive", label: "Recursive Chunking" },
];
export const PROMPT_SUPPORTED_REASIONING_MODELS = ["o1", "o3-mini", "o4-mini"];

export const AUTH_COLUMNS = ["name", "redirection_url", "client_id"];

export const MIME_EXTENSION_MAP = {
  "application/pdf": ".pdf",
  "text/plain": ".txt",
};

export const AGENT_SETUP_GUIDE_STEPS = [
  {
    step: "1",
    title: "Define Your Agent's Purpose",
    detail: "Write a clear prompt describing what you want your agent to accomplish.",
    icon: "✨",
    example:
      'Example: "Help customers with product inquiries and provide personalized recommendations based on their purchase history."',
  },
  {
    step: "2",
    title: "Configure API Access",
    detail: "Add your API keys and configure authentication to enable your agent.",
    icon: "🔐",
    example: "Examples: OpenAI API key, Anthropic API key, Custom webhook URLs, Database connection strings",
  },
  {
    step: "3",
    title: "Connect External Functions",
    detail: "Enhance your agent's capabilities by connecting APIs, databases, or custom functions.",
    optional: true,
    icon: "🔗",
    example: "Examples: CRM systems (Salesforce), Payment processors (Stripe), Database queries, Email services",
  },
  {
    step: "4",
    title: "Choose Your AI Service",
    detail: "Select from available AI providers like OpenAI, Anthropic, or others.",
    optional: true,
    icon: "⚡",
    example: "Examples: OpenAI GPT-4, Claude 3.5 Sonnet",
  },
  {
    step: "5",
    title: "Select the Right Model",
    detail: "Pick an AI model that matches your requirements.",
    optional: true,
    icon: "🧠",
    example: "Examples: GPT-4 for complex tasks, GPT-3.5 for cost efficiency, Claude for long conversations",
  },
];

export const PARAMETER_TYPES = [
  { value: "string", label: "String" },
  { value: "object", label: "Object" },
  { value: "array", label: "Array" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Boolean" },
];

export const TUTORIALS = [
  {
    title: "Agent Creation",
    description: "Learn how to create and manage agents in GTWY.ai platform",
    videoUrl: null, // Will be populated dynamically from Redux
    icon: BotIcon,
  },
  {
    title: "Pauth Key Setup",
    description: "Configure authentication keys for secure access",
    videoUrl: null, // Will be populated dynamically from Redux
    icon: KeyIcon,
  },
  {
    title: "Tool Configuration",
    description: "Set up and configure tools for your workflow",
    videoUrl: null, // Will be populated dynamically from Redux
    icon: WrenchIcon,
  },
  {
    title: "Variable Management",
    description: "Add and manage variables in your environment",
    videoUrl: null, // Will be populated dynamically from Redux
    icon: SettingsIcon,
  },
  {
    title: "KnowledgeBase Configuration",
    description: "Set up and manage your knowledge base for intelligent responses",
    videoUrl: null, // Will be populated dynamically from Redux
    icon: BookIcon,
  },
  {
    title: "Advanced Parameters",
    description: "Set up and update advanced parameters for your workflow",
    videoUrl: null, // Will be populated dynamically from Redux
    icon: BookIcon,
  },
  {
    title: "TestCases Creation",
    description: "Set up TestCase",
    videoUrl: "https://app.supademo.com/embed/cmav1ocfu4thnho3rijvpzlrq?embed_v=2",
    icon: TestTubeDiagonalIcon,
  },
];
