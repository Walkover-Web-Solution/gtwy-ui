"use client";

import Protected from "@/components/Protected";
import GenericTable from "@/components/table/Table";
import CodeBlock from "@/components/codeBlock/CodeBlock";
import Link from "next/link";
import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  getCurlCode,
  getPythonCode,
  getJavaScriptCode,
  getDotNetCode,
  getJavaCode,
  getGoCode,
  getCurlResponseFormat,
  getSdkResponseFormat,
} from "./ApiGuideCodes";

// Language config
const LANGUAGES = [
  { id: "curl", label: "cURL", prism: "bash", sdkResponse: false },
  { id: "javascript", label: "JavaScript", prism: "javascript", sdkResponse: true },
  { id: "python", label: "Python", prism: "python", sdkResponse: true },
  { id: "dotnet", label: ".NET", prism: "csharp", sdkResponse: true },
  { id: "java", label: "Java", prism: "java", sdkResponse: true },
  { id: "go", label: "Go", prism: "go", sdkResponse: true },
];

const PARAM_HEADERS = ["Parameter", "Type", "Description", "Required"];
const PARAM_DATA = [
  ["user", "string", "The user's question (the query asked by the user)", "true"],
  ["agent_id", "string", "The unique ID of the agent to process the request.", "true"],
  ["thread_id", "string", "The ID to maintain conversation context across messages.", "false"],
  ["response_type", "string", 'Specifies the format of the response: "text", "json".', "false"],
  ["variables", "object", "A key-value map of dynamic variables used in the agent's prompt.", "false"],
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

const LanguageDropdown = ({ selected, onChange }) => {
  const current = LANGUAGES.find((l) => l.id === selected) ?? LANGUAGES[0];

  return (
    <div className="dropdown dropdown-end" data-testid="language-dropdown">
      <div
        tabIndex={0}
        role="button"
        className="btn btn-sm btn-ghost border border-base-300 gap-1 rounded-lg bg-base-200"
        data-testid="language-dropdown-trigger"
      >
        {current.label}
        <ChevronDown className="w-3.5 h-3.5 opacity-60" />
      </div>
      <ul
        tabIndex={0}
        className="dropdown-content menu bg-base-100 rounded-box z-10 w-36 p-1 shadow border border-base-300 mt-1"
        data-testid="language-dropdown-menu"
      >
        {LANGUAGES.map((lang) => (
          <li key={lang.id}>
            <button
              type="button"
              data-testid={`language-option-${lang.id}`}
              onClick={() => {
                onChange(lang.id);
                document.activeElement?.blur();
              }}
              className={lang.id === selected ? "active" : ""}
            >
              {lang.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

const ApiGuide = ({ params, modelType, isEmbedUser, prompt = "" }) => {
  const [selectedLang, setSelectedLang] = useState("curl");

  const codeMap = {
    curl: getCurlCode(params.id, modelType, isEmbedUser, prompt),
    javascript: getJavaScriptCode(params.id, isEmbedUser, prompt),
    python: getPythonCode(params.id, isEmbedUser, prompt),
    dotnet: getDotNetCode(params.id, isEmbedUser, prompt),
    java: getJavaCode(params.id, isEmbedUser, prompt),
    go: getGoCode(params.id, isEmbedUser, prompt),
  };

  const activeLang = LANGUAGES.find((l) => l.id === selectedLang) ?? LANGUAGES[0];
  const activeCode = codeMap[selectedLang];
  const responseFmt = activeLang.sdkResponse ? getSdkResponseFormat() : getCurlResponseFormat();

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
            <LanguageDropdown selected={selectedLang} onChange={setSelectedLang} />
          </div>

          <CodeSnippet
            key={selectedLang}
            code={activeCode}
            language={activeLang.prism}
            id={`api-guide-snippet-${selectedLang}`}
          />

          <GenericTable headers={PARAM_HEADERS} data={PARAM_DATA} />
          <p className="text-sm">
            <strong>Note:</strong> If <code>response_type</code> is omitted the response will be JSON by default.
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
        </div>
      </div>
    </>
  );
};

export default Protected(ApiGuide);
