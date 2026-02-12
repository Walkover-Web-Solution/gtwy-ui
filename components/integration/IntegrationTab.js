"use client";

import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { useCustomSelector } from "@/customHooks/customSelector";
import { generateEmbedTokenAction } from "@/store/action/integrationAction";
import CopyButton from "../copyButton/CopyButton";

const IntegrationTab = ({ data }) => {
  const dispatch = useDispatch();
  const [embedToken, setEmbedToken] = useState("");
  const [copied, setCopied] = useState({});

  const gtwyAccessToken = useCustomSelector(
    (state) => state?.userDetailsReducer?.organizations?.[data?.org_id]?.meta?.gtwyAccessToken || ""
  );

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopied((prev) => ({ ...prev, [key]: false }));
    }, 2000);
  };

  useEffect(() => {
    const generateEmbedToken = async () => {
      if (!data?.org_id || !data?.embed_id || !gtwyAccessToken) {
        setEmbedToken("");
        return;
      }

      try {
        const response = await dispatch(
          generateEmbedTokenAction({
            access_token: gtwyAccessToken,
            folder_id: data.embed_id,
            org_id: data.org_id,
            user_id: "user_id",
          })
        );

        if (response?.data?.token) {
          setEmbedToken(response.data.token);
        } else {
          setEmbedToken("");
        }
      } catch (error) {
        console.error("Failed to generate embed token:", error);
        setEmbedToken("");
      }
    };

    generateEmbedToken();
  }, [data?.org_id, data?.embed_id, gtwyAccessToken, dispatch]);

  const jwtPayload = `{
  "org_id": "${data?.org_id}",
  "folder_id": "${data?.embed_id}",
  "user_id": "Your_user_id"
}`;

  const integrationScript = `<script
  id="gtwy-main-script"
  embedToken="${embedToken}"
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
window.openGtwy({"agent_name":"your gtwy agent name"}); // Create agent with specific name`;

  const interfaceData = `// Configure UI elements
window.GtwyEmbed.sendDataToGtwy({
  agent_name: "New Agent",  // Create bridge with agent name
  agent_id: "your_agent_id" // Redirect to specific agent
});`;

  const metaUpdateScript = `window.openGtwy({
  "agent_id": "your_agent_id",
  "meta": {
    "meta_data": "your_meta_data"
  }
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
    <div className="space-y-6">
      {/* Step 1: Generate Embed Token */}
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body">
          <h4 className="card-title text-base">Step 1: Generate Embed Token</h4>
          <div className="space-y-6">
            {/* JWT Payload */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">JWT Payload</span>
              </label>
              <div className="relative">
                <div className="mockup-code">
                  <pre data-prefix=">">
                    <code className="text-error">org_id=</code>
                    <code className="text-warning">{data?.org_id}</code>
                  </pre>
                  <pre data-prefix=">">
                    <code className="text-error">folder_id=</code>
                    <code className="text-warning">{data?.folder_id}</code>
                  </pre>
                  <pre data-prefix=">">
                    <code className="text-error">user_id=</code>
                    <code className="text-warning">"Your_user_id"</code>
                  </pre>
                </div>
                <CopyButton
                  data={jwtPayload}
                  onCopy={() => handleCopy(jwtPayload, "jwtToken")}
                  copied={copied.jwtToken}
                />
              </div>
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
                <div className="relative mt-3">
                  <div className="mockup-code">
                    <pre data-prefix=">">
                      <code className="text-error">Access Token: </code>
                      <code className="text-warning">{gtwyAccessToken}</code>
                    </pre>
                  </div>
                  <CopyButton
                    data={gtwyAccessToken}
                    onCopy={() => handleCopy(gtwyAccessToken, "accessKey")}
                    copied={copied.accessKey}
                  />
                </div>
              ) : (
                <div className="text-sm text-warning mt-3">Access token not available</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Step 2: Add Script */}
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body">
          <h4 className="card-title text-base">Step 2: Add Script</h4>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Add this script tag to your HTML</span>
            </label>
            <div className="relative">
              <div className="mockup-code">
                <pre data-prefix=">">
                  <code className="text-error">&lt;script</code>
                </pre>
                <pre data-prefix=">">
                  <code className="text-error"> id=</code>
                  <code className="text-warning">"gtwy-main-script"</code>
                </pre>
                <pre data-prefix=">">
                  <code className="text-error"> embedToken=</code>
                  <code className="text-warning pr-4">{embedToken || "Your embed token"}</code>
                </pre>
                <pre data-prefix=">">
                  <code className="text-error"> src=</code>
                  <code className="text-warning">
                    {process.env.NEXT_PUBLIC_ENV !== "PROD"
                      ? `${process.env.NEXT_PUBLIC_FRONTEND_URL}/gtwy_dev.js`
                      : `${process.env.NEXT_PUBLIC_FRONTEND_URL}/gtwy.js`}
                  </code>
                </pre>
                <pre data-prefix=">">
                  <code className="text-error"> parentId=</code>
                  <code className="text-warning">"Your_parent_id"</code>
                </pre>
                <pre data-prefix=">">
                  <code className="text-error"> agent_id=</code>
                  <code className="text-warning">"Your_agent_id"</code>
                </pre>
                <pre data-prefix=">">
                  <code className="text-error"> agent_name=</code>
                  <code className="text-warning">"Your_agent_name"</code>
                </pre>
                <pre data-prefix=">">
                  <code className="text-error">&gt;&lt;/script&gt;</code>
                </pre>
              </div>
              <CopyButton
                data={integrationScript}
                onCopy={() => handleCopy(integrationScript, "script")}
                copied={copied.script}
              />
            </div>
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
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body">
          <h4 className="card-title text-base">Configure Interface</h4>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Send Data to GTWY</span>
            </label>
            <div className="relative">
              <div className="mockup-code">
                <pre data-prefix=">">
                  <code className="text-error"> window.GtwyEmbed.sendDataToGtwy({`{`}</code>
                </pre>
                <pre data-prefix=">">
                  <code className="text-error"> agent_name: </code>
                  <code className="text-warning">"New Agent"</code>
                  <code>{", // Create bridge with agent name"}</code>
                </pre>
                <pre data-prefix=">">
                  <code className="text-error"> agent_id: </code>
                  <code className="text-warning">"your_agent_id"</code>
                  <code>{" // Redirect to specific agent"}</code>
                </pre>
                <pre data-prefix=">">
                  <code className="text-error"> {`});`}</code>
                </pre>
              </div>
              <CopyButton
                data={interfaceData}
                onCopy={() => handleCopy(interfaceData, "interfaceData")}
                copied={copied.interfaceData}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Step 3: Integration Functions */}
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body">
          <h4 className="card-title text-base">Step 3: Integration Functions</h4>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Available Functions</span>
            </label>
            <div className="relative">
              <div className="mockup-code">
                <pre data-prefix=">">
                  <code className="text-warning"> window.openGtwy()</code>
                  <code>{" //To open GTWY"}</code>
                </pre>
                <pre data-prefix=">">
                  <code className="text-warning"> window.closeGtwy()</code>
                  <code>{" //To Close GTWY"}</code>
                </pre>
                <pre data-prefix=">">
                  <code className="text-warning"> window.openGtwy({`{"agent_id":"your gtwy agentid"}`})</code>
                  <code>{" // Open GTWY with specific agent"}</code>
                </pre>
                <pre data-prefix=">">
                  <code className="text-warning"> window.openGtwy({`{"agent_name":"your agent name"}`})</code>
                  <code>{" // Create agent with specific name"}</code>
                </pre>
              </div>
              <CopyButton
                data={helperFunctions}
                onCopy={() => handleCopy(helperFunctions, "functions")}
                copied={copied.functions}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Add Meta Data */}
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body">
          <h4 className="card-title text-base">Add Meta Data</h4>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Use this script to add meta data to GTWY</span>
            </label>
            <div className="relative">
              <div className="mockup-code">
                <pre data-prefix=">">
                  <code className="text-error">
                    {" "}
                    window.GtwyEmbed.openGtwy(
                    {`{"agent_id":"your gtwy agentid" , "meta": {"meta_data": "your_meta_data"}}`})
                  </code>
                </pre>
              </div>
              <CopyButton
                data={metaUpdateScript}
                onCopy={() => handleCopy(metaUpdateScript, "metaUpdate")}
                copied={copied.metaUpdate}
              />
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
            <div className="relative">
              <div className="mockup-code">
                <pre data-prefix=">">
                  <code className="text-error"> {getDataUsingUserId}</code>
                </pre>
              </div>
              <p className="text-sm text-base-content/70 mt-4">
                Note: Pass <code className="bg-base-300 px-1 rounded">agent_id="your_agent_id"</code> in the params if
                you want to get the data of specific agent.
              </p>
              <CopyButton
                data={getDataUsingUserId}
                onCopy={() => handleCopy(getDataUsingUserId, "getDataUsingUserId")}
                copied={copied.getDataUsingUserId}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Event Listener */}
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body">
          <h4 className="card-title text-base">Add Event Listener</h4>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Add this script to receive GTWY events</span>
            </label>
            <div className="relative">
              <div className="mockup-code">
                <pre data-prefix=">">
                  <code className="text-error">&lt;script&gt;</code>
                </pre>
                <pre data-prefix=">">
                  <code className="text-error"> window.addEventListener('message', (event) =&gt; {`{`}</code>
                </pre>
                <pre data-prefix=">">
                  <code className="text-error"> if (event.data.type === 'gtwy') {`{`}</code>
                </pre>
                <pre data-prefix=">">
                  <code className="text-error"> console.log('Received gtwy event:', event.data);</code>
                </pre>
                <pre data-prefix=">">
                  <code className="text-error"> {`}`}</code>
                </pre>
                <pre data-prefix=">">
                  <code className="text-error"> {`});`}</code>
                </pre>
                <pre data-prefix=">">
                  <code className="text-error">&lt;/script&gt;</code>
                </pre>
              </div>
              <CopyButton
                data={eventListenerScript}
                onCopy={() => handleCopy(eventListenerScript, "eventListener")}
                copied={copied.eventListener}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationTab;
