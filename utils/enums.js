import { BookIcon, BotIcon, KeyIcon, SettingsIcon, TestTubeDiagonalIcon, WrenchIcon } from "@/components/Icons";
import { DollarSign, Star, Gauge, Activity, CheckCircle2, Timer, X, Cpu, ThumbsUp, ThumbsDown } from "lucide-react";
export const PAUTH_KEY_COLUMNS = ["name", "authkey", "created_at"];
export const API_KEY_COLUMNS = ["name", "apikey", "apikey_usage", "last_used", "last_used_status"];
export const WEBHOOKALERT_COLUMNS = ["name", "url", "headers", "alertType", "bridges"];
export const ALERT_TYPE = ["Error", "Variable"];

export const AUTO_MODEL_TRADEOFF_OPTIONS = [
  { value: "cost", label: "Cost", icon: DollarSign },
  { value: "quality", label: "Quality", icon: Star },
  { value: "speed", label: "Speed", icon: Gauge },
];

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
  TEMPLATE_NAME_MODAL: "template_name_modal",
  API_KEY_MODAL: "API_KEY_MODAL",
  PAUTH_KEY_MODAL: "PAUTH_KEY_MODAL",
  FINE_TUNE_MODAL: "fine-tune-modal",
  PRE_FUNCTION_PARAMETER_MODAL: "pre-function-parameter-modal",
  TOOL_FUNCTION_PARAMETER_MODAL: "tool-function-parameter-modal",
  POST_FUNCTION_PARAMETER_MODAL: "post-function-parameter-modal",
  ACTION_MODAL: "actionModel",
  CHATBOT_MODAL: "chatBot_model",
  CREATE_ORG_MODAL: "create-org-modal",
  WEBHOOK_MODAL: "WEBHOOK_MODAL",
  CHAT_DETAILS_MODAL: "chat_details_modal",
  CHAT_DETAILS_VIEW_MODAL: "chat_details_view",
  JSON_SCHEMA: "JSON_SCHEMA",
  JSON_SCHEMA_BUILDER: "JSON_SCHEMA_BUILDER",
  BUTTON_SCHEMA_BUILDER: "BUTTON_SCHEMA_BUILDER",
  KNOWLEDGE_BASE_MODAL: "KNOWLEDGE_BASE_MODAL",
  PROMPT_SUMMARY: "PROMPT_SUMMARY",
  TESTCASE_MODAL: "TESTCASE_MODAL",
  TESTCASE_SCORES_MODAL: "TESTCASE_SCORES_MODAL",
  DEMO_MODAL: "DEMO_MODAL",
  ADD_TEST_CASE_MODAL: "ADD_TEST_CASE_MODAL",
  TEST_CASE_VARIABLES_MODAL: "TEST_CASE_VARIABLES_MODAL",
  HISTORY_PAGE_PROMPT_UPDATE_MODAL: "HISTORY_PAGE_PROMPT_UPDATE_MODAL",
  AGENT_DESCRIPTION_MODAL: "AGENT_DESCRIPTION_MODAL",
  AGENT_VARIABLE_MODAL: "AGENT_VARIABLE_MODAL",
  TUTORIAL_MODAL: "TUTORIAL_MODAL",
  EDIT_MESSAGE_MODAL: "EDIT_MESSAGE_MODAL",
  INTEGRATION_MODAL: "INTEGRATION_MODAL",
  INTEGRATION_GUIDE_MODAL: "INTEGRATION_GUIDE_MODAL",
  AUTH_DATA_MODAL: "AUTH_DATA_MODAL",
  DELETE_MODAL: "DELETE_MODAL",
  DELETE_TESTCASE_BULK_MODAL: "DELETE_TESTCASE_BULK_MODAL",
  RUN_ALL_TESTCASE_CONFIRM_MODAL: "RUN_ALL_TESTCASE_CONFIRM_MODAL",
  DELETE_ALL_TESTCASES_MODAL: "DELETE_ALL_TESTCASES_MODAL",
  DELETE_PREBUILT_TOOL_MODAL: "DELETE_PREBUILT_TOOL_MODAL",
  DELETE_TOOL_MODAL: "DELETE_TOOL_MODAL",
  DELETE_AGENT_MODAL: "DELETE_AGENT_MODAL",
  DELETE_PRE_TOOL_MODAL: "DELETE_PRE_TOOL_MODAL",
  DELETE_POST_TOOL_MODAL: "DELETE_POST_TOOL_MODAL",
  DELETE_KNOWLEDGE_BASE_MODAL: "DELETE_KNOWLEDGE_BASE_MODAL",
  BRIDGE_TYPE_MODAL: "BRIDGE_TYPE_MODAL",
  ADD_NEW_MODEL_MODAL: "ADD_NEW_MODEL_MODAL",
  USAGE_DETAILS_MODAL: "USAGE_DETAILS_MODAL",
  CONNECTED_AGENTS_MODAL: "CONNECTED_AGENTS_MODAL",
  DIFF_PROMPT: "DIFF_PROMPT",
  MIGRATE_PROMPT_MODAL: "MIGRATE_PROMPT_MODAL",
  ORCHESTRAL_AGENT_PARAMETER_MODAL: "ORCHESTRAL_AGENT_PARAMETER_MODAL",
  CREATE_ORCHESTRAL_FLOW_MODAL: "CREATE_ORCHESTRAL_FLOW_MODAL",
  API_KEY_LIMIT_MODAL: "API_KEY_LIMIT_MODAL",
  AGENT_USAGE_LIMIT_MODAL: "AGENT_USAGE_LIMIT_MODAL",
  PROMPT_SUMMARY_PUBLISH: "PROMPT_SUMMARY_PUBLISH",
  DELETE_VERSION_MODAL: "DELETE_VERSION_MODAL",
  PREBUILT_TOOLS_CONFIG_MODAL: "PREBUILT_TOOLS_CONFIG_MODAL",
  PREBUILT_PRE_TOOL_CONFIG_MODAL: "prebuilt-pre-tool-config-modal",
  PREBUILT_POST_TOOL_CONFIG_MODAL: "prebuilt-post-tool-config-modal",
  INVITE_USER: "INVITE_USER",
  ORCHESTRAL_DELETE_MODAL: "ORCHESTRAL_DELETE_MODAL",
  ACCESS_MANAGEMENT_MODAL: "ACCESS_MANAGEMENT_MODAL",
  UNSAVED_CHANGES_MODAL: "UNSAVED_CHANGES_MODAL",
  UNSAVED_CHANGES_INTEGRATION_MODAL: "UNSAVED_CHANGES_INTEGRATION_MODAL", // IntegrationDetailView config guard
  UNSAVED_CHANGES_PUBLISH_MODAL: "UNSAVED_CHANGES_PUBLISH_MODAL", // Publish button guard
  UNSAVED_CHANGES_NAV_MODAL: "UNSAVED_CHANGES_NAV_MODAL", // Navbar tab navigation guard
  UNSAVED_CHANGES_TAB_MODAL: "UNSAVED_CHANGES_TAB_MODAL", // TabsLayout inner-tab guard
  UNSAVED_CHANGES_VERSION_MODAL: "UNSAVED_CHANGES_VERSION_MODAL", // Version switch guard
  UNSAVED_CHANGES_ORG_SLIDER_MODAL: "UNSAVED_CHANGES_ORG_SLIDER_MODAL", // OrgSlider switch guard
  UNSAVED_PROMPT_CHAT_MODAL: "UNSAVED_PROMPT_CHAT_MODAL",
  UNSAVED_REFRESH_MODAL: "UNSAVED_REFRESH_MODAL",
  UNSAVED_PROMPT_ACTION_MODAL: "UNSAVED_PROMPT_ACTION_MODAL", // Pre-tool / response-type guard
  UNSAVED_PROMPT_SCHEMA_MODAL: "UNSAVED_PROMPT_SCHEMA_MODAL", // Response type schema changes guard
  RESOURCE_CHUNKS_MODAL: "RESOURCE_CHUNKS_MODAL",
  QUERY_KNOWLEDGE_BASE_MODAL: "QUERY_KNOWLEDGE_BASE_MODAL",
  GTWY_OPEN_WITH_AGENT_MODAL: "GTWY_OPEN_WITH_AGENT_MODAL",
  GTWY_CREATE_AGENT_MODAL: "GTWY_CREATE_AGENT_MODAL",
  GTWY_SEND_DATA_MODAL: "GTWY_SEND_DATA_MODAL",
  GTWY_GET_AGENTS_MODAL: "GTWY_GET_AGENTS_MODAL",
  KEYBOARD_SHORTCUTS_MODAL: "KEYBOARD_SHORTCUTS_MODAL",
  TEMPLATE_MODAL: "TEMPLATE_MODAL",
  TEMPLATE_PLAYGROUND: "TEMPLATE_PLAYGROUND",
  SAVE_WIDGET_MODAL: "SAVE_WIDGET_MODAL",
  POST_PUBLISH_FEEDBACK_MODAL: "post_publish_feedback_modal",
  MIGRATE_PROMPT_WARNING_MODAL: "MIGRATE_PROMPT_WARNING_MODAL",
  FULLSCREEN_PROMPT: "FULLSCREEN_PROMPT",
  FULLSCREEN_JSON_SCHEMA: "FULLSCREEN_JSON_SCHEMA",
  CUSTOM_TONE_MODAL: "CUSTOM_TONE_MODAL",
  CUSTOM_RESPONSE_STYLE_MODAL: "CUSTOM_RESPONSE_STYLE_MODAL",
  MAKE_PUBLIC_AGENT: "MAKE_PUBLIC_AGENT",
  CONFIGURE_ENVIRONMENT_MODAL: "CONFIGURE_ENVIRONMENT_MODAL",
  JSON_SCHEMA_MODEL_WARNING_MODAL: "JSON_SCHEMA_MODEL_WARNING_MODAL",
  JSON_SCHEMA_SERVICE_WARNING_MODAL: "JSON_SCHEMA_SERVICE_WARNING_MODAL",
  JSON_SCHEMA_VISUAL_BUILDER: "json-schema-visual-builder",
  JSON_SCHEMA_AI_BUILDER: "json-schema-ai-builder",
  JSON_SCHEMA_FULLSCREEN: "json-schema-fullscreen",
};

export const API_KEY_MODAL_INPUT = ["name", "apikey", "apikey_limit"];

export const USER_FEEDBACK_FILTER_OPTIONS = ["all", "1", "2"];

export const WEB_SEARCH_PREBUILT_TOOL_VALUES = new Set(["web_search", "Gtwy_Web_Search"]);
export const WEB_SEARCH_WARNING_CLASS = "border-warning/40 bg-warning/5";
export const WEB_SEARCH_TOKEN_WARNING =
  "Selecting Web Search can cause heavy token utilization and may exceed 10,000 tokens.";

export const CONFIG_HISTORY_FILTER_KEYS = {
  USER_IDS: "user_ids",
  TYPES: "types",
};

export const CONFIG_HISTORY_FEATURE_OPTIONS = [
  { value: "name", label: "Agent Name" },
  { value: "prompt", label: "Prompt" },
  { value: "type", label: "Model Type" },
  { value: "service", label: "Service" },
  { value: "model", label: "Model" },
  { value: "fall_back", label: "Fallback" },
  { value: "IsstarterQuestionEnable", label: "Starter Questions" },
  { value: "functionData", label: "Functions" },
  { value: "bridge_summary", label: "Bridge Summary" },
  { value: "agents", label: "Connected Agents" },
  { value: "apikey_object_id", label: "API Keys" },
];

export const CONFIG_HISTORY_HIDDEN_TYPES = ["system_prompt_version_id", "variables_state"];

export const BATCH_PROCESSING_STATUSES = ["in_progress", "processing", "queued", "pending", "validating", "finalizing"];

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

export const PROMPT_SECTIONS = {
  ROLE: "role",
  GOAL: "goal",
  INSTRUCTION: "instruction",
};

export const PROMPT_SECTION_CONFIG = {
  role: { label: "Role", type: "input", placeholder: "e.g. You are a helpful customer support agent" },
  goal: { label: "Goal", type: "input", placeholder: "e.g. Help users resolve billing issues" },
  instruction: {
    label: "Instruction",
    type: "textarea",
    placeholder: "e.g. Always be polite. Never reveal internal data. Ask clarifying questions when needed.",
  },
};

export const PROMPT_VIEW_MODE = {
  SIMPLE: "simple",
  ADVANCED: "advanced",
};

export const AUTH_COLUMNS = ["name", "redirection_url", "client_id"];

export const MIME_EXTENSION_MAP = {
  "application/pdf": ".pdf",
  "text/plain": ".txt",
  "text/markdown": ".md",
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
export const HISTORY_FILTER_BY_FIELDS = {
  thread_id: "",
  sub_thread_id: "",
  message_id: "",
  batch_id: "",
  user: "",
  llm_message: "",
  variables: "",
};

export const EMBED_OBJECT_KEYS = new Set(["theme_config", "prompt", "models", "apikey_object_id", "tools_id"]);
export const EMBED_ARRAY_KEYS = new Set(["tools_id"]);
export const EMBED_PASSTHROUGH_KEYS = new Set(["themeMode", "slide"]);
export const EMBED_SKIP_KEYS = new Set([
  "agent_name",
  "agent_id",
  "agent_purpose",
  "meta",
  "history",
  "configureGtwyRedirection",
  "variables_path",
]);

export const PRE_TOOL_TYPES = {
  custom_function: "custom_function",
  query_refiner: "query_refiner",
  rag_knowledgebase: "rag_knowledgebase",
  gtwy_web_search: "gtwy_web_search",
};

export const PRE_TOOL_LABELS = {
  custom_function: "Custom Function",
  query_refiner: "Query Refiner",
  rag_knowledgebase: "RAG Knowledgebase",
  gtwy_web_search: "Gtwy Web Search",
};

export const PRE_TOOL_TOOLTIPS = {
  query_refiner: "Rewrites the user's query before it reaches the model, making it more specific and search-friendly.",
  rag_knowledgebase: "Searches a knowledge base and injects relevant context into the prompt before the AI call.",
  gtwy_web_search: "Scrapes a specified domain and passes the content as context to the AI.",
};

export const PRE_TOOL_CONFIG_SCHEMA = {
  query_refiner: {
    configFields: [
      {
        key: "prompt",
        label: "Refinement Prompt",
        type: "textarea",
        placeholder:
          "e.g. Rewrite the user's query to be more specific and search-engine friendly. Focus on intent and remove ambiguity.",
      },
    ],
    argsFields: [],
  },
  rag_knowledgebase: {
    configFields: [{ key: "knowledgebase", label: "Knowledge Base", type: "knowledgebase_select" }],
    argsFields: [],
  },
  gtwy_web_search: {
    configFields: [
      {
        key: "formats",
        label: "Output Formats",
        type: "multiselect",
        options: [
          { value: "markdown", label: "Markdown" },
          { value: "html", label: "HTML" },
          { value: "links", label: "Links" },
        ],
      },
    ],
    argsFields: [{ key: "url", label: "URL to Scrape", placeholder: "example.com" }],
  },
};

export const ON_CLICK_ACTION_TYPES = ["reply", "sendDataToFrontend"];

export const PROXY_SCRIPT_SRC = "https://36blocks.com/assets/proxy-auth/proxy-auth.js";

export const AI_CREATE_STEPS = [
  { label: "Understanding your purpose", hint: "Reading what you described" },
  { label: "Generating configuration", hint: "AI is shaping prompts & settings" },
  { label: "Creating your agent", hint: "Saving to your workspace" },
];
export const DEFAULT_STARTER_QUESTIONS = [
  "What can you help me with?",
  "Give me a quick overview of your capabilities.",
  "How do I get started?",
  "What kind of questions can I ask you?",
];

export const getStatsConfig = (summary) => {
  const formatTokens = (tokens) => {
    if (tokens == null) return 0;
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`;
    return tokens;
  };

  return [
    {
      title: "Total Requests",
      value: summary?.total_requests ?? 0,
      change: "",
      trend: "up",
      icon: Activity,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      title: "Success Rate",
      value: summary?.success_rate != null ? `${summary.success_rate.toFixed(1)}%` : "0%",
      change: "",
      trend: "up",
      icon: CheckCircle2,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      title: "Avg Successful Response",
      value: summary?.avg_response != null ? `${summary.avg_response}s` : "0s",
      change: "",
      trend: "down",
      icon: Timer,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      title: "Failed Runs",
      value: summary?.failed_runs ?? 0,
      change: "",
      trend: "down",
      icon: X,
      color: "text-red-500",
      bg: "bg-red-500/10",
    },
    {
      title: "Token Usage",
      value: formatTokens(summary?.total_tokens),
      change: "",
      trend: "up",
      icon: Cpu,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      title: "Est. Cost",
      value: summary?.est_cost != null ? `$${summary.est_cost.toFixed(2)}` : "$0.00",
      change: "",
      trend: "up",
      icon: DollarSign,
      color: "text-red-500",
      bg: "bg-red-500/10",
    },
    {
      title: "Positive",
      value: summary?.positive_feedback ?? 0,
      change: "",
      trend: "up",
      icon: ThumbsUp,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      title: "Negative",
      value: summary?.negative_feedback ?? 0,
      change: "",
      trend: "down",
      icon: ThumbsDown,
      color: "text-red-500",
      bg: "bg-red-500/10",
    },
  ];
};

export const TOKEN_CATEGORIES = [
  {
    label: "Text Input",
    tokenKeys: ["text_input_tokens", "input_tokens"],
    costKeys: ["text_input_cost", "input_cost"],
  },
  {
    label: "Text Output",
    tokenKeys: ["text_output_tokens", "output_tokens"],
    costKeys: ["text_output_cost", "output_cost"],
  },
  {
    label: "Image Input",
    tokenKeys: ["image_input_tokens"],
    costKeys: ["image_input_cost"],
  },
  {
    label: "Image Output",
    tokenKeys: ["image_output_tokens", "total_images_generated"],
    costKeys: ["image_output_cost"],
  },
  {
    label: "Cached Input",
    tokenKeys: ["cached_text_input_tokens", "cached_tokens", "cache_read_input_tokens"],
    costKeys: ["cached_text_input_cost", "cached_cost", "cache_read_cost"],
  },
  {
    label: "Cached Image Input",
    tokenKeys: ["cached_image_input_tokens"],
    costKeys: ["cached_image_input_cost"],
  },
  {
    label: "Cache Creation Input",
    tokenKeys: ["cache_creation_input_tokens"],
    costKeys: ["cache_creation_cost"],
  },
  {
    label: "Reasoning",
    tokenKeys: ["reasoning_tokens"],
    costKeys: ["reasoning_cost"],
  },
  {
    label: "Audio",
    tokenKeys: ["audio_duration_seconds", "audio_duration_minutes"],
    costKeys: ["audio_cost"],
  },
];
