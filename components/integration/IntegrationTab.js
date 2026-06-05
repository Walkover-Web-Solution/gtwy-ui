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
  "user_id": "Your_user_id"
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
            <CodeBlock className="language-jsx">{integrationScript}</CodeBlock>
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
    </div>
  );
};

export default IntegrationTab;
