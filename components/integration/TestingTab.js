"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Send, Users, ArrowRight, X } from "lucide-react";
import { useCustomSelector } from "@/customHooks/customSelector";
import EmbedPreview from "./EmbedPreview";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import EventLogs, { createAddLog } from "@/components/integration/EventLogs";
import CodeMirror from "@uiw/react-codemirror";
import { json, jsonParseLinter } from "@codemirror/lang-json";
import { linter, lintGutter } from "@codemirror/lint";

const TestingTab = ({ data, isTestingMode }) => {
  const [eventLogs, setEventLogs] = useState([]);
  const addLog = createAddLog(setEventLogs);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);

  // Function test states
  const [sendData, setSendData] = useState("{}");
  const [isEmbedOpen, setIsEmbedOpen] = useState(false);
  const [portalTarget, setPortalTarget] = useState(null);

  useEffect(() => {
    if (isTestingMode) {
      const el = document.getElementById("testing-sidebar-content");
      setPortalTarget(el);
    } else {
      setPortalTarget(null);
    }
  }, [isTestingMode]);

  const { embedToken } = useCustomSelector((state) => ({
    embedToken: state?.integrationReducer?.embedTokens?.[data?.folder_id],
  }));

  // Log when embedToken is available
  useEffect(() => {
    if (embedToken) {
      addLog("success", "Embed token loaded from Redux");
    }
  }, [embedToken]);

  // Listen for gtwy message events
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data.type === "gtwy") {
        addLog("info", "Received gtwy event", event.data);

        // Track embed open/close state
        if (event.data.action === "opened") {
          setIsEmbedOpen(true);
        } else if (event.data.action === "closed") {
          setIsEmbedOpen(false);
        }
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  const testOpenGtwy = () => {
    try {
      if (typeof window.GtwyEmbed?.open === "function") {
        window.GtwyEmbed.open();
        setIsEmbedOpen(true);
        addLog("success", "window.GtwyEmbed.open() called successfully");
      } else {
        addLog("error", "window.GtwyEmbed.open is not available");
      }
    } catch (error) {
      addLog("error", "Error calling GtwyEmbed.open", error.message);
    }
  };

  const testCloseGtwy = () => {
    try {
      if (typeof window.GtwyEmbed?.close === "function") {
        window.GtwyEmbed.close();
        setIsEmbedOpen(false);
        addLog("success", "window.GtwyEmbed.close() called successfully");
      } else {
        addLog("error", "window.GtwyEmbed.close is not available");
      }
    } catch (error) {
      addLog("error", "Error calling GtwyEmbed.close", error.message);
    }
  };

  const testSendDataToGtwy = () => {
    try {
      // Parse JSON from textarea
      const dataToSend = JSON.parse(sendData);

      // Use openGtwy if embed is not open, otherwise use sendDataToGtwy
      if (!isEmbedOpen) {
        if (typeof window.openGtwy === "function") {
          window.openGtwy(dataToSend);
          setIsEmbedOpen(true);
          addLog("success", "window.openGtwy() called (embed was closed)", dataToSend);
        } else {
          addLog("error", "window.openGtwy is not available");
        }
      } else {
        if (typeof window.GtwyEmbed?.sendDataToGtwy === "function") {
          window.GtwyEmbed.sendDataToGtwy(dataToSend);
          addLog("success", "window.GtwyEmbed.sendDataToGtwy() called (embed was open)", dataToSend);
        } else {
          addLog("error", "window.GtwyEmbed.sendDataToGtwy is not available");
        }
      }
    } catch (error) {
      addLog("error", "Error parsing JSON or calling send data function", error.message);
    }
  };

  const getAllAgents = async () => {
    setIsLoadingAgents(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/embed/getAgents`, {
        method: "GET",
        headers: {
          Authorization: embedToken,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const agents = await response.json();
        addLog("success", "Successfully fetched all agents", agents);
      } else {
        const errorText = await response.text();
        addLog("error", `Failed to fetch agents: ${response.status}`, errorText);
      }
    } catch (error) {
      addLog("error", "Error fetching agents", error.message);
    } finally {
      setIsLoadingAgents(false);
    }
  };

  const clearLogs = () => setEventLogs([]);

  const controls = (
    <div className="space-y-3" data-testid="integration-testing-controls">
      {/* Basic Controls */}
      <div className="card bg-base-200" data-testid="integration-testing-basic-controls">
        <div className="card-body p-3">
          <h4 className="card-title text-sm">Basic Controls</h4>
          <div className="grid grid-cols-2 gap-2">
            <button
              data-testid="integration-testing-open-button"
              onClick={testOpenGtwy}
              className="btn btn-outline btn-xs gap-1"
            >
              <ArrowRight className="h-3 w-3" />
              Open
            </button>
            <button
              data-testid="integration-testing-close-button"
              onClick={testCloseGtwy}
              className="btn btn-error btn-xs gap-1"
            >
              <X className="h-3 w-3" />
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Send Data to Embed */}
      <div className="card bg-base-200" data-testid="integration-testing-send-data">
        <div className="card-body p-3">
          <h4 className="card-title text-sm">Send Data</h4>
          <div className="space-y-2">
            <div
              data-testid="integration-testing-send-data-input"
              className="border border-base-300 rounded overflow-hidden"
            >
              <CodeMirror
                value={sendData ?? ""}
                height="120px"
                extensions={[json(), linter(jsonParseLinter()), lintGutter()]}
                onChange={(val) => setSendData(val)}
                placeholder='{"agent_id": "..."}'
                className="text-xs"
              />
            </div>
            <button
              data-testid="integration-testing-send-data-button"
              onClick={testSendDataToGtwy}
              className="btn btn-outline btn-xs w-full gap-1"
            >
              <Send size={12} />
              Send Data
            </button>
          </div>
        </div>
      </div>

      {/* Get All Agents */}
      <div className="card bg-base-200" data-testid="integration-testing-get-agents">
        <div className="card-body p-3">
          <h4 className="card-title text-sm">Get All Agents</h4>
          <button
            data-testid="integration-testing-get-agents-button"
            onClick={getAllAgents}
            className="btn btn-outline btn-xs w-full gap-1"
            disabled={isLoadingAgents}
          >
            {isLoadingAgents ? (
              <>
                <span className="loading loading-spinner loading-xs"></span>Loading...
              </>
            ) : (
              <>
                <Users size={12} />
                Get Agents
              </>
            )}
          </button>
          <p className="text-xs text-base-content/50 mt-1">
            <code className="bg-base-300 px-1 rounded">GET /api/embed/getAgents</code>
          </p>
        </div>
      </div>

      {/* Event Logs */}
      <EventLogs logs={eventLogs} onClear={clearLogs} />
    </div>
  );

  const preview = (
    <div className="h-full bg-base-100">
      {embedToken ? (
        <EmbedPreview data={data} embedToken={embedToken} />
      ) : (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <span className="loading loading-spinner loading-lg"></span>
            <p className="mt-4 text-base-content/70">Loading embed token...</p>
          </div>
        </div>
      )}
    </div>
  );

  if (isTestingMode && portalTarget) {
    return (
      <>
        {createPortal(controls, portalTarget)}
        <div className="h-full">{preview}</div>
      </>
    );
  }

  return (
    <div className="h-full">
      <PanelGroup direction="horizontal">
        <Panel defaultSize={25} minSize={10}>
          <div className="h-full overflow-y-auto p-2">
            <div className="mb-3">
              <h3 className="text-lg font-semibold text-base-content mb-1">Testing Environment</h3>
              <p className="text-sm text-base-content/70">Test embed functions and interactions in real-time</p>
            </div>
            {controls}
          </div>
        </Panel>
        <PanelResizeHandle className="w-2 bg-base-300 hover:bg-base-content/20 transition-colors cursor-col-resize" />
        <Panel defaultSize={75} minSize={30}>
          {preview}
        </Panel>
      </PanelGroup>
    </div>
  );
};

export default TestingTab;
