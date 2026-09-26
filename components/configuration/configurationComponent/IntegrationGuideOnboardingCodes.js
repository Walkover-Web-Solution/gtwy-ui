import { getThreads, getSingleThreadData } from "@/config/historyApi";
import { extractErrorMessage } from "@/utils/utility";

export const GTWY_SDK_LANGUAGES = [
  { id: "python", label: "Python", prism: "python", install: "pip install gtwy-sdk" },
  { id: "node", label: "Node.js", prism: "javascript", install: "npm install gtwy-sdk" },
  { id: "java", label: "Java", prism: "java", install: "implementation 'ai.gtwy:gtwy-sdk:0.3.0'" },
];

export const getGtwyPythonCode = (agentId) =>
  [
    "from gtwy import Gtwy",
    "",
    'client = Gtwy(auth_key="YOUR_AUTH_KEY")',
    "",
    "response = client.chat.completions.create(",
    `    agent_id="${agentId}",`,
    '    user="YOUR_USER_QUESTION",',
    ")",
    "",
    "print(response.content)",
  ].join("\n");

export const getGtwyNodeCode = (agentId) =>
  [
    'const { Gtwy } = require("gtwy-sdk");',
    "",
    'const client = new Gtwy({ authKey: "YOUR_AUTH_KEY" });',
    "",
    "const response = await client.chat.completions.create({",
    `  agentId: "${agentId}",`,
    '  user: "YOUR_USER_QUESTION",',
    "});",
    "",
    "console.log(response.content);",
  ].join("\n");

export const getGtwyJavaCode = (agentId) =>
  [
    "import ai.gtwy.Gtwy;",
    "import ai.gtwy.models.ChatCompletion;",
    "import ai.gtwy.params.ChatCompletionParams;",
    "",
    "public class Main {",
    "    public static void main(String[] args) {",
    '        Gtwy client = Gtwy.builder().authKey("YOUR_AUTH_KEY").build();',
    "",
    "        ChatCompletionParams params = ChatCompletionParams.builder()",
    `            .agentId("${agentId}")`,
    '            .user("YOUR_USER_QUESTION")',
    "            .build();",
    "",
    "        ChatCompletion response = client.chat().completions().create(params);",
    "        System.out.println(response.getContent());",
    "    }",
    "}",
  ].join("\n");

export const getGtwySdkCode = (languageId, agentId) => {
  switch (languageId) {
    case "node":
      return getGtwyNodeCode(agentId);
    case "java":
      return getGtwyJavaCode(agentId);
    default:
      return getGtwyPythonCode(agentId);
  }
};

export const getGtwyPythonBatchCode = (agentId) =>
  [
    "from gtwy import Gtwy",
    "",
    'client = Gtwy(auth_key="YOUR_AUTH_KEY")',
    "",
    "batch_job = client.chat.completions.batch.create(",
    `    agent_id="${agentId}",`,
    '    batch=["YOUR QUESTION 1", "YOUR QUESTION 2", "YOUR QUESTION 3"],',
    "    batch_variables=[",
    '        {"message": "YOUR MESSAGE"},',
    '        {"name": "YOUR NAME"},',
    '        {"age": "YOUR AGE"},',
    "    ],",
    '    webhook={"url": "YOUR_WEBHOOK_URL", "headers": {}},',
    ")",
    "",
    "print(batch_job.id)",
  ].join("\n");

export const getGtwyNodeBatchCode = (agentId) =>
  [
    'const { Gtwy } = require("gtwy-sdk");',
    "",
    'const client = new Gtwy({ authKey: "YOUR_AUTH_KEY" });',
    "",
    "const batchJob = await client.chat.completions.batch.create({",
    `  agentId: "${agentId}",`,
    '  batch: ["YOUR QUESTION 1", "YOUR QUESTION 2", "YOUR QUESTION 3"],',
    "  batchVariables: [",
    '    { message: "YOUR MESSAGE" },',
    '    { name: "YOUR NAME" },',
    '    { age: "YOUR AGE" },',
    "  ],",
    '  webhook: { url: "YOUR_WEBHOOK_URL", headers: {} },',
    "});",
    "",
    "console.log(batchJob.id);",
  ].join("\n");

export const getGtwyJavaBatchCode = (agentId) =>
  [
    "import ai.gtwy.Gtwy;",
    "import ai.gtwy.models.BatchCompletion;",
    "import ai.gtwy.params.BatchCompletionParams;",
    "",
    "public class Main {",
    "    public static void main(String[] args) {",
    '        Gtwy client = Gtwy.builder().authKey("YOUR_AUTH_KEY").build();',
    "",
    "        BatchCompletionParams params = BatchCompletionParams.builder()",
    `            .agentId("${agentId}")`,
    '            .addBatch("YOUR QUESTION 1")',
    '            .addBatch("YOUR QUESTION 2")',
    '            .addBatch("YOUR QUESTION 3")',
    '            .webhookUrl("YOUR_WEBHOOK_URL")',
    "            .build();",
    "",
    "        BatchCompletion batchJob = client.chat().completions().batch().create(params);",
    "        System.out.println(batchJob.getId());",
    "    }",
    "}",
  ].join("\n");

export const getGtwySdkBatchCode = (languageId, agentId) => {
  switch (languageId) {
    case "node":
      return getGtwyNodeBatchCode(agentId);
    case "java":
      return getGtwyJavaBatchCode(agentId);
    default:
      return getGtwyPythonBatchCode(agentId);
  }
};

export const BATCH_PARAM_HEADERS = ["Parameter", "Type", "Description", "Required"];
export const BATCH_PARAM_DATA = [
  ["agent_id", "string", "The unique ID of the agent to process the request.", "true"],
  ["batch", "array of strings", "A list of user questions to process in batch.", "true"],
  ["batch_variables", "array of objects", "Variables for each corresponding batch item.", "true"],
  ["webhook", "object", "{ url, headers } — where the batch result is delivered once processing completes.", "true"],
];

export const getBatchResponseFormat = () =>
  JSON.stringify(
    {
      success: true,
      response: "Data will be sent on webhook within 24 Hours",
    },
    null,
    2
  );

export const PARAM_HEADERS = ["Parameter", "Type", "Description", "Required"];
export const PARAM_DATA = [
  ["agent_id", "string", "The unique ID of the agent to process the request.", "true"],
  ["user", "string", "The user's question (the query asked by the user).", "true"],
  ["thread_id", "string", "An ID to maintain conversation context across messages.", "false"],
  ["sub_thread_id", "string", "A sub-thread ID within the conversation. Defaults to thread_id.", "false"],
  ["variables", "object", "A key-value map of dynamic variables used inside the agent's prompt.", "false"],
  ["configuration", "object", "Per-request overrides for model, prompt, tools and more. See below.", "false"],
  ["settings", "object", "Per-request delivery and safety settings. See below.", "false"],
  ["version_id", "string", "Use a specific published/draft version of the agent instead of the default.", "false"],
  ["service", "string", "AI provider to use (openai, anthropic, gemini, groq, and others).", "false"],
  ["apikey", "string", "Override the AI provider API key configured on the agent.", "false"],
  ["user_urls", "array", 'Attachments as [{ url, type }] — type is "image", "audio", or "file".', "false"],
  ["auto_model_select", "boolean", "Let GTWY automatically pick the best model for the request.", "false"],
  ["cache_on", "boolean", "Enable response caching for this request.", "false"],
  ["stream", "boolean", "Stream the response back as it's generated.", "false"],
  ["extra_tools", "array", "Additional tools to make available for this request only.", "false"],
  ["built_in_tools", "array", 'Enable built-in tools, e.g. ["web_search"].', "false"],
  ["web_search_filters", "array", "Restrict built-in web search to specific domains.", "false"],
  ["orchestrator_flag", "boolean", "Log multi-agent transfers as a single orchestrator conversation.", "false"],
  ["environment", "string", "Environment to resolve the agent version from (e.g. prod, stage).", "false"],
];

export const CONFIGURATION_PARAM_HEADERS = ["Key", "Type", "Description"];
export const CONFIGURATION_PARAM_DATA = [
  ["model", "string", "Model name to use, e.g. gpt-4o. Overrides the agent's configured model."],
  ["prompt", "string", "System prompt/instructions. Overrides the agent's configured prompt."],
  ["tools", "array", "Function/tool definitions available to the model for this request."],
  ["tool_choice", "string | object", "Controls how the model selects from available tools."],
  ["response_type", "object", "{ is_template, template_id } — renders output using a rich-UI template."],
  ["is_rich_text", "boolean", "Return the response formatted as rich text."],
  ["temperature", "number", "Sampling temperature for the model."],
  ["max_tokens", "number", "Maximum tokens to generate in the response."],
];

export const SETTINGS_PARAM_HEADERS = ["Key", "Type", "Description"];
export const SETTINGS_PARAM_DATA = [
  [
    "response_format",
    "object",
    '{ type, cred } — delivery mode. "default" replies synchronously; "webhook" (cred: { url, headers }) delivers the result to your endpoint instead.',
  ],
  [
    "guardrails",
    "object",
    "{ guardrails_configuration, guardrails_custom_prompt } — content-safety rules enforced on this request.",
  ],
  ["maximum_iterations", "number", "Max tool-call rounds before the agent must respond (default 3)."],
];

export const getGtwySdkAccessorSnippet = (languageId) => {
  switch (languageId) {
    case "node":
      return [
        "response.content;           // AI response text",
        "response.model;             // model used",
        "response.messageId;         // message id",
        "response.usage.totalTokens; // total tokens used",
      ].join("\n");
    case "java":
      return [
        "response.getContent();                // AI response text",
        "response.getModel();                  // model used",
        "response.getMessageId();              // message id",
        "response.getUsage().getTotalTokens(); // total tokens used",
      ].join("\n");
    default:
      return [
        "response.content            # AI response text",
        "response.model              # model used",
        "response.message_id         # message id",
        "response.usage.total_tokens # total tokens used",
      ].join("\n");
  }
};

const NO_CALLS_MESSAGE = "No calls received yet — send a request using the code below to see it here.";

export const checkAgentHealth = async (agentId) => {
  if (!agentId) {
    return { status: "empty", agentId, message: NO_CALLS_MESSAGE };
  }

  try {
    const threads = await getThreads(agentId, 1);
    const latestThread = threads?.data?.[0];

    if (!latestThread?.thread_id) {
      return { status: "empty", agentId, message: NO_CALLS_MESSAGE };
    }

    const singleThreadResponse = await getSingleThreadData(
      latestThread.thread_id,
      agentId,
      latestThread.thread_id,
      1,
      undefined,
      undefined,
      undefined,
      1
    );
    const messages = singleThreadResponse?.data?.data || [];
    const latestMessage = messages[messages.length - 1];

    if (!latestMessage) {
      return { status: "empty", agentId, message: NO_CALLS_MESSAGE };
    }

    if (latestMessage.error) {
      return {
        status: "error",
        agentId,
        message: extractErrorMessage(latestMessage.error) || "The latest request failed.",
      };
    }

    return { status: "ok", agentId, message: "OK — the latest request succeeded." };
  } catch (error) {
    console.error(error);
    return { status: "error", agentId, message: "Couldn't check health right now." };
  }
};
