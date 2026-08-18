"use client";

import Protected from "@/components/Protected";
import GenericTable from "@/components/table/Table";
import CodeBlock from "@/components/codeBlock/CodeBlock";
import Link from "next/link";
import React, { useState } from "react";
import LanguageDropdown from "./LanguageDropdown";
import {
  getCurlCode,
  getPythonCode,
  getJavaScriptCode,
  getDotNetCode,
  getJavaCode,
  getGoCode,
  getGtwyPythonCode,
  getGtwyNodeCode,
  getGtwyJavaCode,
  getGtwyPhpCode,
  getCurlResponseFormat,
  getSdkResponseFormat,
} from "./ApiGuideCodes";

// Language config — three distinct categories, always shown grouped in this
// order in the dropdown (see LanguageDropdown.js):
//   1. cURL           — raw HTTP against /chat/completion.
//   2. OpenAI SDK     — the official `openai` package, pointed at our
//                       OpenAI-compatible shim (/api/v2/model/openai). For
//                       teams already standardized on the OpenAI SDK.
//   3. GTWY SDK       — our own official packages (gtwy-sdk on PyPI/npm,
//                       ai.gtwy:gtwy-sdk on Maven, gtwy/gtwy-sdk on
//                       Packagist), calling /chat/completion directly.
// `responseFormat: "openai"` examples get OpenAI's response shape back.
// `responseFormat: "raw"` examples (cURL, and all GTWY SDK tabs) get GTWY's
// native response shape back — the SDKs just wrap that same shape in typed
// accessors (see `accessors` below, shown in the Response Format section).
const LANGUAGES = [
  { id: "curl", label: "cURL", category: "cURL", prism: "bash", responseFormat: "raw" },
  {
    id: "javascript",
    label: "JavaScript",
    category: "OpenAI SDK",
    prism: "javascript",
    responseFormat: "openai",
  },
  { id: "python", label: "Python", category: "OpenAI SDK", prism: "python", responseFormat: "openai" },
  { id: "dotnet", label: ".NET", category: "OpenAI SDK", prism: "csharp", responseFormat: "openai" },
  { id: "java", label: "Java", category: "OpenAI SDK", prism: "java", responseFormat: "openai" },
  { id: "go", label: "Go", category: "OpenAI SDK", prism: "go", responseFormat: "openai" },
  {
    id: "gtwy-python",
    label: "Python",
    category: "GTWY SDK",
    prism: "python",
    responseFormat: "raw",
    accessors: [
      "response.content        # reply text (None if queued)",
      "response.model          # model that produced the reply",
      "response.usage.total_tokens",
      "response.usage.cost",
      "response.queued         # True if delivered async (webhook)",
      "response.message_id",
    ],
  },
  {
    id: "gtwy-node",
    label: "Node.js",
    category: "GTWY SDK",
    prism: "javascript",
    responseFormat: "raw",
    accessors: [
      "response.content        // reply text (null if queued)",
      "response.model          // model that produced the reply",
      "response.usage.totalTokens",
      "response.usage.cost",
      "response.queued         // true if delivered async (webhook)",
      "response.messageId",
    ],
  },
  {
    id: "gtwy-java",
    label: "Java",
    category: "GTWY SDK",
    prism: "java",
    responseFormat: "raw",
    accessors: [
      "response.getContent()      // reply text (null if queued)",
      "response.getModel()        // model that produced the reply",
      "response.getUsage().getTotalTokens()",
      "response.getUsage().getCost()",
      "response.isQueued()        // true if delivered async (webhook)",
      "response.getMessageId()",
    ],
  },
  {
    id: "gtwy-php",
    label: "PHP",
    category: "GTWY SDK",
    prism: "php",
    responseFormat: "raw",
    accessors: [
      "$response->content         // reply text (null if queued)",
      "$response->model           // model that produced the reply",
      "$response->usage->totalTokens()",
      "$response->usage->cost()",
      "$response->queued          // true if delivered async (webhook)",
      "$response->messageId",
    ],
  },
];

// Every field the completion route actually supports, kept in sync with the
// gtwy-sdk SKILLS.md reference (all 4 languages document the same set).
const PARAM_HEADERS = ["Parameter", "Type", "Description", "Required"];
const PARAM_DATA = [
  ["user", "string", "The user's question (the query asked by the user).", "true"],
  ["agent_id", "string", "The unique ID of the agent to process the request.", "true"],
  ["thread_id", "string", "Carries conversation memory across calls. Omit for a stateless one-off call.", "false"],
  ["sub_thread_id", "string", "A finer-grained slice within a thread.", "false"],
  ["version_id", "string", "Pin the call to a specific version of the agent.", "false"],
  ["variables", "object", "A key-value map of dynamic variables used in the agent's prompt.", "false"],
  ["variables_path", "string", "Dot-path filter selecting a subset of `variables` to apply.", "false"],
  ["configuration", "object", "Per-call model overrides — see the breakdown below.", "false"],
  ["service", "string", 'Model provider override, e.g. "openai", "anthropic", "groq".', "false"],
  ["apikey", "string", "Bring your own provider API key for this call.", "false"],
  ["user_urls", "array", "Attach images/audio by URL: [{ type, url }].", "false"],
  ["auto_model_select", "boolean", "Let GTWY automatically pick the best model for this call.", "false"],
  ["cache_on", "boolean", "Enable response caching for this call.", "false"],
  ["stream", "boolean", "Shorthand for configuration.stream.", "false"],
  ["settings", "object", "Controls delivery mode and a few advanced behaviors — see the breakdown below.", "false"],
  ["extra_tools", "array", "Extra function-calling tools available for this call only.", "false"],
  ["built_in_tools", "array", "Turn on GTWY's built-in tools (e.g. web search) for this call.", "false"],
  ["web_search_filters", "object", "Restrict a web-search tool call (domains, date range).", "false"],
  ["orchestrator_flag", "boolean", "Turn on multi-agent orchestration behavior for this call.", "false"],
  ["environment", "string", 'Run against a specific environment\'s version of the agent, e.g. "staging".', "false"],
];

const CONFIG_PARAM_DATA = [
  ["model", "string", 'Which model to use, e.g. "gpt-4o".'],
  ["type", "string", '"chat" (default), "embedding", or "image".'],
  ["prompt", "string", "Override the agent's stored system prompt for this call."],
  ["stream", "boolean", "Turn streaming on/off."],
  ["tools", "array", "Function-calling tools available to the model."],
  ["tool_choice", "string | object", '"auto", "none", "required", or a specific tool.'],
  ["response_type", "string | object", '"text" (default), "json_object", or "json_schema".'],
  ["fine_tune_model", "object", "Point at a specific fine-tuned model variant."],
  ["is_rich_text", "boolean", "Turn on rich-text formatting in the response."],
  ["mcp_config", "object", "Wire in MCP (Model Context Protocol) servers and their tools."],
  ["(sampling params)", "—", "temperature, top_p, max_tokens, etc. — which ones apply depends on the model."],
];

const SETTINGS_PARAM_DATA = [
  [
    "response_format",
    "object",
    'Delivery mode. Omit for a normal synchronous reply. Set { "type": "webhook", "cred": { "url": "..." } } to have GTWY POST the result to your own endpoint instead.',
  ],
  [
    "fall_back",
    "object",
    'Automatically fall back to a different model/service if the primary call fails: { "is_enable": true, "service": "openai", "model": "gpt-4o-mini" }.',
  ],
  ["maximum_iterations", "number", "Caps how many tool-call loops a single request can run through (default 3)."],
  [
    "guardrails",
    "object",
    'The guardrail policy actually checked against the user\'s message at runtime: { "is_enabled": true, "guardrails_configuration": { "toxicity": true, "bias": true } }.',
  ],
];

const Section = ({ title, caption }) => (
  <div className="flex items-start flex-col justify-center">
    <h3 className="text-lg font-semibold">{title}</h3>
    {caption && <p className="text-sm text-gray-600 block">{caption}</p>}
  </div>
);

const CodeSnippet = ({ code, language = "bash", id }) => (
  <div
    data-testid={id}
    id={id}
    className="relative rounded-lg overflow-hidden border border-base-300"
    style={{ animation: "snippetFadeIn 180ms ease-out" }}
  >
    <CodeBlock className={`language-${language}`}>{code}</CodeBlock>
  </div>
);

const ApiGuide = ({ params, modelType, isEmbedUser, prompt = "" }) => {
  const [selectedLang, setSelectedLang] = useState("curl");

  const codeMap = {
    curl: getCurlCode(params.id, modelType, isEmbedUser, prompt),
    javascript: getJavaScriptCode(params.id, isEmbedUser, prompt),
    python: getPythonCode(params.id, isEmbedUser, prompt),
    dotnet: getDotNetCode(params.id, isEmbedUser, prompt),
    java: getJavaCode(params.id, isEmbedUser, prompt),
    go: getGoCode(params.id, isEmbedUser, prompt),
    "gtwy-python": getGtwyPythonCode(params.id, isEmbedUser, prompt),
    "gtwy-node": getGtwyNodeCode(params.id, isEmbedUser, prompt),
    "gtwy-java": getGtwyJavaCode(params.id, isEmbedUser, prompt),
    "gtwy-php": getGtwyPhpCode(params.id, isEmbedUser, prompt),
  };

  const activeLang = LANGUAGES.find((l) => l.id === selectedLang) ?? LANGUAGES[0];
  const activeCode = codeMap[selectedLang];
  const responseFmt = activeLang.responseFormat === "openai" ? getSdkResponseFormat() : getCurlResponseFormat();

  return (
    <>
      <style>{`
        @keyframes snippetFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      <div data-testid="api-guide-container" id="api-guide-container" className="gap-6 flex flex-col">
        {/* Step 1 — Auth Key (non-embed only) */}
        {!isEmbedUser && (
          <div id="api-guide-step1-section" className="flex flex-col gap-2 p-4">
            <Section title="Step 1" caption="Create Auth Key" />
            <p className="text-sm">
              Follow the on-screen instructions to create a new Auth Key. Ignore if already created.{" "}
              <Link
                data-testid="api-guide-create-authkey-link"
                id="api-guide-create-authkey-link"
                href={`/org/${params.org_id}/pauthkey`}
                target="_blank"
                className="link link-primary"
              >
                Create Auth Key
              </Link>
            </p>
          </div>
        )}

        {/* Step 2 — Code */}
        <div data-testid="api-guide-step2-section" id="api-guide-step2-section" className="flex flex-col gap-4 p-4">
          <div className="flex items-center justify-between">
            <Section title={isEmbedUser ? "Step 1" : "Step 2"} caption="Use the API" />
            <LanguageDropdown languages={LANGUAGES} selected={selectedLang} onChange={setSelectedLang} />
          </div>

          <CodeSnippet
            key={selectedLang}
            code={activeCode}
            language={activeLang.prism}
            id={`api-guide-snippet-${selectedLang}`}
          />

          <GenericTable headers={PARAM_HEADERS} data={PARAM_DATA} />

          <Section title="Keys inside `configuration`" />
          <GenericTable headers={["Key", "Type", "Description"]} data={CONFIG_PARAM_DATA} />

          <Section title="Keys inside `settings`" />
          <GenericTable headers={["Key", "Type", "Description"]} data={SETTINGS_PARAM_DATA} />

          <p className="text-sm">
            <strong>Note:</strong> If <code>configuration.response_type</code> is omitted the response will be JSON by
            default.
          </p>
        </div>

        {/* Response Format */}
        <div
          data-testid="api-guide-response-section"
          id="api-guide-response-section"
          className="flex flex-col gap-4 p-4"
        >
          <Section title="Response Format" />
          <CodeSnippet
            key={`response-${selectedLang}`}
            code={responseFmt}
            language="json"
            id="api-guide-response-code-block"
          />

          {activeLang.accessors && (
            <>
              <p className="text-sm text-gray-600">
                Accessing the fields above through the <strong>{activeLang.label} GTWY SDK</strong>'s typed{" "}
                <code>response</code> object:
              </p>
              <CodeSnippet
                key={`accessors-${selectedLang}`}
                code={activeLang.accessors.join("\n")}
                language={activeLang.prism}
                id={`api-guide-accessors-${selectedLang}`}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default Protected(ApiGuide);
