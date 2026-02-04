import CopyButton from "@/components/copyButton/CopyButton";
import GenericTable from "@/components/table/Table";
import Link from "next/link";
import React from "react";

const BatchApi = (bridgeId, versionId) => {
  return (
    `curl --location '${process.env.NEXT_PUBLIC_PYTHON_SERVER_WITH_PROXY_URL}/api/v2/model/batch/chat/completion' \\\n` +
    `--header 'pauthkey: YOUR_GENERATED_PAUTHKEY' \\\n` +
    `--header 'Content-Type: application/json' \\\n` +
    `--data '{\n` +
    `    "webhook": {\n` +
    `        "url": "YOUR WEBHOOK URL",\n` +
    `        "header": {}\n` +
    `    },\n` +
    `    "batch": [\n` +
    `        "YOUR QUESTION 1",\n` +
    `        "YOUR QUESTION 2",\n` +
    `        "YOUR QUESTION 3"\n` +
    `    ],\n` +
    `    "agent_id": "${bridgeId || ""}",\n` +
    `    "batch_variables": [\n` +
    `        {\n` +
    `            "message": "YOUR MESSAGE"\n` +
    `        },\n` +
    `        {\n` +
    `            "name": "YOUR NAME"\n` +
    `        },\n` +
    `        {\n` +
    `            "age": "YOUR AGE"\n` +
    `        }\n` +
    `    ]\n` +
    `}'`
  );
};
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

const BatchResponseFormat = () => {
  return `{
    "success": true,
    "response": "Data will be sent on webhook within 24 Hours"
  }`;
};

const Section = ({ title, caption, children }) => (
  <div className="flex items-start flex-col justify-center">
    <h3 className="text-lg font-semibold">{title}</h3>
    <p className="text-sm text-gray-600 block">{caption}</p>
    {children}
  </div>
);

const BatchApiGuide = ({ params, searchParams }) => {
  return (
    <div id="batch-api-guide-container" className="min-h-screen gap-4 flex flex-col">
      <div id="batch-api-guide-step1-section" className="flex flex-col gap-4 p-4">
        <Section title="Step 1" caption="Create `Auth key`" />
        <p className=" text-sm">
          Follow the on-screen instructions to create a new Auth key. Ignore if already created
          <br />{" "}
          <Link
            id="batch-api-guide-create-authkey-link"
            href={`/org/${params.org_id}/pauthkey`}
            target="_blank"
            className="link link-primary"
          >
            Create Auth key
          </Link>
        </p>
      </div>
      <div id="batch-api-guide-step2-section" className="flex flex-col gap-4 p-4">
        <Section title="Step 2" caption="Use the Batch API" />
        <div id="batch-api-guide-curl-code-block" className="mockup-code relative">
          <CopyButton data={BatchApi(params.id, searchParams?.version)} />
          <pre className="break-words whitespace-pre-wrap ml-4">
            <code>{BatchApi(params.id, searchParams?.version)}</code>
          </pre>
        </div>
        <GenericTable headers={headers} data={data} />
        <p className=" text-sm">
          <strong>Note:</strong> Ensure that the 'webhook_url' is correctly set to receive batch processing updates.
        </p>
      </div>
      <div id="batch-api-guide-response-section" className="flex flex-col gap-4 p-4">
        <Section title="Response Format" />
        <div id="batch-api-guide-response-code-block" className="mockup-code relative">
          <CopyButton data={BatchResponseFormat()} />
          <pre className="break-words whitespace-pre-wrap">
            <code>{BatchResponseFormat()}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};

export default BatchApiGuide;
