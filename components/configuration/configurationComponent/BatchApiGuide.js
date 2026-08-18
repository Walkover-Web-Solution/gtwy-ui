import GenericTable from "@/components/table/Table";
import CodeBlock from "@/components/codeBlock/CodeBlock";
import Link from "next/link";
import React, { useState } from "react";
import LanguageDropdown from "./LanguageDropdown";
import {
  getCurlBatchCode,
  getGtwyPythonBatchCode,
  getGtwyNodeBatchCode,
  getGtwyJavaBatchCode,
  getGtwyPhpBatchCode,
  getBatchResponseFormat,
} from "./BatchApiGuideCodes";

const BATCH_LANGUAGES = [
  { id: "curl", label: "cURL", category: "cURL", prism: "bash" },
  { id: "gtwy-python", label: "Python", category: "GTWY SDK", prism: "python" },
  { id: "gtwy-node", label: "Node.js", category: "GTWY SDK", prism: "javascript" },
  { id: "gtwy-java", label: "Java", category: "GTWY SDK", prism: "java" },
  { id: "gtwy-php", label: "PHP", category: "GTWY SDK", prism: "php" },
];

const headers = ["Parameter", "Type", "Description", "Required"];

const data = [
  ["pauthkey", "string", "The key used to authenticate the request.", "true"],
  ["webhook", "object", "An object containing the webhook URL and headers to receive responses.", "true"],
  ["webhook.url", "string", "The URL where the response will be sent.", "true"],
  ["webhook.header", "object", "headers to include in the webhook request.", "true"],
  ["batch", "array of strings", "A list of user questions to process in batch.", "true"],
  ["agent_id", "string", "The unique ID of the agent to process the request.", "true"],
  ["batch_variables", "object", "An object containing variables for each batch item.", "true"],
];

const Section = ({ title, caption, children }) => (
  <div className="flex items-start flex-col justify-center">
    <h3 className="text-lg font-semibold">{title}</h3>
    <p className="text-sm text-gray-600 block">{caption}</p>
    {children}
  </div>
);

const CodeSnippet = ({ code, language = "bash", id }) => (
  <div data-testid={id} id={id} className="relative rounded-lg overflow-hidden border border-base-300">
    <CodeBlock className={`language-${language}`}>{code}</CodeBlock>
  </div>
);

const BatchApiGuide = ({ params, searchParams, isEmbedUser }) => {
  const [selectedLang, setSelectedLang] = useState("curl");

  const codeMap = {
    curl: getCurlBatchCode(params.id, searchParams?.version),
    "gtwy-python": getGtwyPythonBatchCode(params.id, isEmbedUser),
    "gtwy-node": getGtwyNodeBatchCode(params.id, isEmbedUser),
    "gtwy-java": getGtwyJavaBatchCode(params.id, isEmbedUser),
    "gtwy-php": getGtwyPhpBatchCode(params.id, isEmbedUser),
  };

  const activeLang = BATCH_LANGUAGES.find((l) => l.id === selectedLang) ?? BATCH_LANGUAGES[0];
  const activeCode = codeMap[selectedLang];

  return (
    <div
      data-testid="batch-api-guide-container"
      id="batch-api-guide-container"
      className="min-h-screen gap-4 flex flex-col"
    >
      <div
        data-testid="batch-api-guide-step1-section"
        id="batch-api-guide-step1-section"
        className="flex flex-col gap-4 p-4"
      >
        <Section title="Step 1" caption="Create `Auth key`" />
        <p className=" text-sm">
          Follow the on-screen instructions to create a new Auth key. Ignore if already created
          <br />{" "}
          <Link
            data-testid="batch-api-guide-create-authkey-link"
            id="batch-api-guide-create-authkey-link"
            href={`/org/${params.org_id}/pauthkey`}
            target="_blank"
            className="link link-primary"
          >
            Create Auth key
          </Link>
        </p>
      </div>
      <div
        data-testid="batch-api-guide-step2-section"
        id="batch-api-guide-step2-section"
        className="flex flex-col gap-4 p-4"
      >
        <div className="flex items-center justify-between">
          <Section title="Step 2" caption="Use the Batch API" />
          <LanguageDropdown languages={BATCH_LANGUAGES} selected={selectedLang} onChange={setSelectedLang} />
        </div>
        <CodeSnippet
          key={selectedLang}
          code={activeCode}
          language={activeLang.prism}
          id={`batch-api-guide-snippet-${selectedLang}`}
        />
        <GenericTable headers={headers} data={data} />
        <p className=" text-sm">
          <strong>Note:</strong> Ensure that the 'webhook_url' is correctly set to receive batch processing updates.
        </p>
      </div>
      <div
        data-testid="batch-api-guide-response-section"
        id="batch-api-guide-response-section"
        className="flex flex-col gap-4 p-4"
      >
        <Section title="Response Format" />
        <CodeSnippet code={getBatchResponseFormat()} language="json" id="batch-api-guide-response-code-block" />
      </div>
    </div>
  );
};

export default BatchApiGuide;
