"use client";

import React from "react";
import { useCustomSelector } from "@/customHooks/customSelector";
import CodeBlock from "@/components/codeBlock/CodeBlock";

const IntegrationTab = ({ data }) => {
  const embedToken = "";
  const gtwyAccessToken = useCustomSelector(
    (state) => state?.userDetailsReducer?.organizations?.[data?.org_id]?.meta?.gtwyAccessToken || ""
  );

  const jwtPayload = `{
  "org_id": "${data?.org_id}",
  "folder_id": "${data?.folder_id}",
  "unique_identifier": "Your_unique_identifier",
  "meta": {
    "name": "Your_user_name",
    "email": "Your_user_email"
  }
}`;

  const integrationScript = `<script
  id="gtwy-main-script"
  embedToken="${embedToken || "Add your embed token here"}"
  src="${
    process.env.NEXT_PUBLIC_ENV !== "PROD"
      ? `${process.env.NEXT_PUBLIC_FRONTEND_URL}/gtwy_dev.js`
      : `${process.env.NEXT_PUBLIC_FRONTEND_URL}/gtwy.js`
  }"
  parentId="Your_parent_id"
  agent_id="Your_agent_id"
  agent_name="Your_agent_name"
></script>`;

  const helperFunctions = `window.openGtwy() //To open GTWY;
window.closeGtwy() //To Close GTWY;
window.openGtwy({"agent_id":"your gtwy agentid"}); // Open GTWY with specific agent
window.openGtwy({"agent_name":"your gtwy agent name"}); // Create agent with specific name
window.openGtwy({"agent_purpose":"your agent purpose"}) // Create agent with specific purpose`;

  const interfaceData = `// Configure UI elements
window.GtwyEmbed.sendDataToGtwy({
  agent_name: "New Agent",  // Create bridge with agent name
  agent_id: "your_agent_id" // Redirect to specific agent
  agent_purpose: "your_agent_purpose" // Create Agent with given purpose
});`;

  const eventListenerScript = `<script>
window.addEventListener('message', (event) => {
  if (event.data.type === 'gtwy') {
    console.log('Received gtwy event:', event.data);
  }
});
</script>`;

  const getDataUsingUserId = `curl --location ${process.env.NEXT_PUBLIC_SERVER_URL}/api/embed/getAgents \\
-H 'Authorization: your_embed_token'`;

  // Served from the GTWY portal's `public/`, so the panel and the site hand out the same skill file.
  const skillHref = "https://gtwy.ai/gtwy-embed-skill.md";

  const skillInstallSnippet = `mkdir -p .claude/skills/gtwy-embed-integration

curl -o .claude/skills/gtwy-embed-integration/SKILL.md \\
  ${skillHref}`;

  const skillPromptSnippet = `"Add the GTWY embed to my app \u2014 sign the token
 on my backend and open it from the Agents button."`;

  const tableData = [
    ["parentId", "To open GTWY in a specific container"],
    ["agent_id", "To open agent in a specific agent"],
    ["agent_name", "To create an agent with a specific name, or redirect if the agent already exists."],
  ];

  return (
    <div className="space-y-6" data-testid="integration-tab">
      {/* Step 1: Generate Embed Token */}
      <div className="card bg-base-100 border border-base-300" data-testid="integration-tab-step1">
        <div className="card-body">
          <h4 className="card-title text-base">Step 1: Generate Embed Token</h4>
          <div className="space-y-6">
            {/* JWT Payload */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">JWT Payload</span>
              </label>
              <CodeBlock className="language-json">{jwtPayload}</CodeBlock>
            </div>

            {/* Access Token */}
            <div className="form-control">
              <label className="label flex flex-col items-start space-y-1">
                <span className="label-text font-medium">Access Token (Signed with RS256)</span>
              </label>
              <div className="text-sm text-base-content/70 leading-relaxed ml-1">
                RS256 is an asymmetric signing algorithm defined in
                <a
                  href="https://datatracker.ietf.org/doc/html/rfc7518#section-3.1"
                  className="text-blue-600 underline ml-1"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  RFC 7518
                </a>
              </div>
              {gtwyAccessToken ? (
                <div className="mt-3">
                  <CodeBlock className="language-text">{gtwyAccessToken}</CodeBlock>
                </div>
              ) : (
                <div className="text-sm text-warning mt-3">Access token not available</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Step 2: Add Script */}
      <div className="card bg-base-100 border border-base-300" data-testid="integration-tab-step2">
        <div className="card-body">
          <h4 className="card-title text-base">Step 2: Add Script</h4>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Add this script tag to your HTML</span>
            </label>
            <CodeBlock className="language-jsx" fromIntegration={true}>
              {integrationScript}
            </CodeBlock>
          </div>
          <div className="overflow-x-auto mt-4">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map(([key, desc], idx) => (
                  <tr key={idx}>
                    <td className="font-mono text-sm">{key}</td>
                    <td className="text-sm">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Configure Interface */}
      <div className="card bg-base-100 border border-base-300" data-testid="integration-tab-configure-interface">
        <div className="card-body">
          <h4 className="card-title text-base">Configure Interface</h4>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Send Data to GTWY</span>
            </label>
            <CodeBlock className="language-javascript">{interfaceData}</CodeBlock>
          </div>
        </div>
      </div>

      {/* Step 3: Integration Functions */}
      <div className="card bg-base-100 border border-base-300" data-testid="integration-tab-step3">
        <div className="card-body">
          <h4 className="card-title text-base">Step 3: Integration Functions</h4>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Available Functions</span>
            </label>
            <CodeBlock className="language-javascript">{helperFunctions}</CodeBlock>
          </div>
        </div>
      </div>

      {/* Add Meta Data */}
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body">
          <h4 className="card-title text-base">Add Meta Data</h4>
          <div className="form-control space-y-4">
            <div>
              <label className="label">
                <span className="label-text font-medium">Merge meta (spreads new meta over existing)</span>
              </label>
              <CodeBlock className="language-javascript">{`window.openGtwy({\n  "agent_id": "your_agent_id",\n  "meta": {\n    "key": "value"\n  }\n});`}</CodeBlock>
            </div>
            <div>
              <label className="label">
                <span className="label-text font-medium">Replace meta (overwrites all existing meta)</span>
              </label>
              <CodeBlock className="language-javascript">{`window.openGtwy({\n  "agent_id": "your_agent_id",\n  "replaceMeta": {\n    "key": "value"\n  }\n});`}</CodeBlock>
            </div>
          </div>
        </div>
      </div>

      {/* Get Agent Data Using User ID */}
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body">
          <h4 className="card-title text-base">Get Agent Data Using User ID</h4>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Use this script to get data using user id</span>
            </label>
            <div>
              <CodeBlock className="language-bash">{getDataUsingUserId}</CodeBlock>
              <p className="text-sm text-base-content/70 mt-4">
                Note: Pass <CodeBlock inline>agent_id="your_agent_id"</CodeBlock> in the params if you want to get the
                data of specific agent.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Event Listener */}
      <div className="card bg-base-100 border border-base-300" data-testid="integration-tab-event-listener">
        <div className="card-body">
          <h4 className="card-title text-base">Add Event Listener</h4>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Add this script to receive GTWY events</span>
            </label>
            <CodeBlock className="language-jsx">{eventListenerScript}</CodeBlock>
          </div>
        </div>
      </div>

      {/* Set up with a coding agent */}
      <div className="card bg-base-100 border border-base-300" data-testid="integration-tab-skill">
        <div className="card-body">
          <h4 className="card-title text-base">Or hand it to your coding agent</h4>
          <p className="text-sm text-base-content/70 leading-relaxed">
            Every step above — the token signing, both script variants, the{" "}
            <CodeBlock inline>window.GtwyEmbed</CodeBlock> calls, the event payloads and the configuration options — is
            written up as an agent skill. Drop it into your repo and your coding agent does the integration with the
            real API shapes in front of it, instead of guessing.
          </p>

          <ul className="text-sm text-base-content/70 list-disc list-inside space-y-1 mt-2">
            <li>Knows which script variant to use — and asks rather than guessing</li>
            <li>Keeps the signing key server-side by default</li>
            <li>Wires the drafted/published events back to your database</li>
          </ul>

          <div className="form-control mt-4">
            <label className="label">
              <span className="label-text">
                Run this at the root of the project you want GTWY embedded in. It works with Claude Code and any agent
                that reads skill files from the repo.
              </span>
            </label>
            <CodeBlock className="language-bash">{skillInstallSnippet}</CodeBlock>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Then just ask</span>
            </label>
            <CodeBlock className="language-text">{skillPromptSnippet}</CodeBlock>
          </div>

          <div className="card-actions">
            <a className="btn btn-sm btn-outline" href={skillHref} target="_blank" rel="noopener noreferrer" download>
              Download SKILL.md
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationTab;
