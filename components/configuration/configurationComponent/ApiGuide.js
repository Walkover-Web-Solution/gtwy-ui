import CopyButton from "@/components/copyButton/CopyButton";
import Protected from "@/components/Protected";
import GenericTable from "@/components/table/Table";
import Link from "next/link";
import React from "react";
import { extractPromptVariables } from "@/utils/utility";

const ComplitionApi = (bridgeId, modelType, isEmbedUser, prompt = "") => {
  const url = `${process.env.NEXT_PUBLIC_PYTHON_SERVER_WITH_PROXY_URL}/api/v2/model/chat/completion`;
  const headers = isEmbedUser
    ? `--header 'Content-Type: application/json'`
    : `--header 'pauthkey: YOUR_GENERATED_PAUTHKEY' \\
  --header 'Content-Type: application/json'`;

  // Extract variables from prompt
  const usedVariables = extractPromptVariables(prompt);

  // Generate variables object with example values
  const variablesObject =
    usedVariables.length > 0
      ? usedVariables.map((variable) => `    "${variable}": "YOUR_${variable.toUpperCase()}_VALUE"`).join(",\n")
      : "    // No variables found in prompt";

  const body = `{
  ${modelType === "embedding" ? '"text": "YOUR_TEXT_HERE",' : '"user": "YOUR_USER_QUESTION",'}
  "agent_id": "${bridgeId}",
  "thread_id": "YOUR_THREAD_ID",
  "response_type": "text", // optional
  "variables": {
${variablesObject}
  }
}`;

  return `curl --location '${url}' \\\n  ${headers} \\\n  --data '${body}'`;
};
const headers = ["Parameter", "Type", "Description", "Required"];
const data = [
  ["user", "string", "The user's question ( the query asked by the user)", "true"],
  ["agent_id", "string", "The unique ID of the agent to process the request.", "true"],
  ["thread_id", "string", "The ID to maintain conversation context across messages.", "false"],
  ["response_type", "string", 'Specifies the format of the response: "text", "json".', "false"],
  ["variables", "object", "A key-value map of dynamic variables used in the agent's prompt.", "false"],
];

const ResponseFormat = () => {
  return `{
    "success": true,
    "response": {
         "data": {
            "id": "chatcmpl-d7a6874d-a82f-4cb5-8a40-1c899722c64f",
            "content": "Response from the AI assistant",
            "model": "Your selected model",
            "role": "assistant",
            "tools_data": {},
            "fallback": false,
            "finish_reason": "completed",
            "message_id": "abdd920a-ec69-11f0-b14a-928ade59a1ee"
         },
         "usage": {
            "total_tokens": 500,
            "input_tokens": 300,
            "output_tokens": 200,
            "cached_tokens": 0,
            "cache_read_input_tokens": 0,
            "cache_creation_input_tokens": 0,
            "reasoning_tokens": 0,
            "cost": 0.0025
         }
    }
  }`;
};
const Section = ({ title, caption, children }) => (
  <div className="flex items-start flex-col justify-center">
    <h3 className="text-lg font-semibold">{title}</h3>
    <p className="text-sm text-gray-600 block">{caption}</p>
    {children}
  </div>
);

const ApiGuide = ({ params, searchParams, modelType, isEmbedUser, prompt = "" }) => {
  return (
    <div id="api-guide-container" className="min-h-screen gap-4 flex flex-col">
      {!isEmbedUser && (
        <div id="api-guide-step1-section" className="flex flex-col gap-4 p-4">
          <Section title="Step 1" caption="Create Auth Key" />
          <p className=" text-sm">
            Follow the on-screen instructions to create a new Auth Key. Ignore if already created
            <br />{" "}
            <Link
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
      <div id="api-guide-step2-section" className="flex flex-col gap-4 p-4">
        <Section title={`${isEmbedUser ? "Step 1" : "Step 2"}`} caption="Use the API" />
        <div id="api-guide-curl-code-block" className="mockup-code relative">
          <CopyButton data={ComplitionApi(params.id, modelType, isEmbedUser, prompt)} />
          <pre className="break-words whitespace-pre-wrap">
            <code>{ComplitionApi(params.id, modelType, isEmbedUser, prompt)}</code>
          </pre>
        </div>
        <GenericTable headers={headers} data={data} />
        <p className=" text-sm">
          <strong>Note:</strong> If the value of response_type is undefined, the output will be in JSON format by
          default.
        </p>
      </div>
      <div id="api-guide-response-section" className="flex flex-col gap-4 p-4">
        <Section title="Response Format" />
        <div id="api-guide-response-code-block" className="mockup-code relative">
          <CopyButton data={ResponseFormat()} />
          <pre className="break-words whitespace-pre-wrap">
            <code>{ResponseFormat()}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};

export default Protected(ApiGuide);
