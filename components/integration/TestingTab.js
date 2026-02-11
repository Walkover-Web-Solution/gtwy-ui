"use client";

import React, { useState, useEffect } from "react";
import { Send, Users } from "lucide-react";
import { useDispatch } from "react-redux";
import { useCustomSelector } from "@/customHooks/customSelector";
import { generateEmbedTokenAction } from "@/store/action/integrationAction";
import EmbedPreview from "./EmbedPreview";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

const TestingTab = ({ data }) => {
  const dispatch = useDispatch();
  const [eventLogs, setEventLogs] = useState([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
  const [embedToken, setEmbedToken] = useState("");
  const [isLoadingToken, setIsLoadingToken] = useState(true);

  // Function test states
  const [sendData, setSendData] = useState("{}");
  const [isEmbedOpen, setIsEmbedOpen] = useState(false);

  const { currentUser } = useCustomSelector((state) => ({
    currentUser: state.userDetailsReducer.userDetails,
  }));

  const addLog = (type, message, data = null) => {
    const timestamp = new Date().toLocaleTimeString();
    setEventLogs((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        type,
        message,
        data,
        timestamp,
      },
    ]);
  };

  // Fetch embed token on mount
  useEffect(() => {
    const fetchEmbedToken = async () => {
      if (!data?.org_id || !data?.folder_id) {
        setIsLoadingToken(false);
        return;
      }

      try {
        setIsLoadingToken(true);
        const response = await dispatch(
          generateEmbedTokenAction({
            user_id: "test_user",
            folder_id: data.folder_id,
          })
        );
        console.log(response, "response");
        if (response?.data?.embedToken) {
          setEmbedToken(response.data.embedToken);
          addLog("success", "Embed token generated successfully");
        } else {
          addLog("error", "Failed to generate embed token");
        }
      } catch (error) {
        addLog("error", "Error generating embed token", error.message);
      } finally {
        setIsLoadingToken(false);
      }
    };

    fetchEmbedToken();
  }, [data?.org_id, data?.folder_id, currentUser?.id]);

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
      const response = await fetch("http://localhost:7072/api/embed/getAgents", {
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

  const clearLogs = () => {
    setEventLogs([]);
  };

  const getResultColor = (type) => {
    switch (type) {
      case "success":
        return "text-success";
      case "error":
        return "text-error";
      case "warning":
        return "text-warning";
      default:
        return "text-info";
    }
  };

  const getResultBadge = (type) => {
    switch (type) {
      case "success":
        return "badge-success";
      case "error":
        return "badge-error";
      case "warning":
        return "badge-warning";
      default:
        return "badge-info";
    }
  };

  return (
    <div className="h-full -m-6">
      <PanelGroup direction="horizontal">
        {/* Left Side - Testing Controls */}
        <Panel defaultSize={50} minSize={30}>
          <div className="h-full overflow-y-auto p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-base-content mb-2">Testing Environment</h3>
              <p className="text-sm text-base-content/70">Test embed functions and interactions in real-time</p>
            </div>

            {/* Basic Controls */}
            <div className="card bg-base-200">
              <div className="card-body">
                <h4 className="card-title text-base">Basic Controls</h4>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={testOpenGtwy} className="btn btn-primary btn-sm gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                    Open Embed
                  </button>
                  <button onClick={testCloseGtwy} className="btn btn-error btn-sm gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Close Embed
                  </button>
                </div>
              </div>
            </div>

            {/* Send Data to Embed */}
            <div className="card bg-base-200">
              <div className="card-body">
                <h4 className="card-title text-base">Send Data to Embed</h4>
                <div className="space-y-3">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Data (JSON)</span>
                    </label>
                    <textarea
                      placeholder='{"agent_id": "your_agent_id", "agent_name": "Agent Name", "agent_purpose": "Purpose", "meta": {"key": "value"}}'
                      className="textarea textarea-bordered textarea-sm font-mono text-xs"
                      rows={6}
                      value={sendData}
                      onChange={(e) => setSendData(e.target.value)}
                    />
                    <label className="label">
                      <span className="label-text-alt text-base-content/60">
                        Enter JSON data to send to the embed (agent_id, agent_name, agent_purpose, meta, etc.)
                      </span>
                    </label>
                  </div>
                  <button onClick={testSendDataToGtwy} className="btn btn-primary btn-sm w-full gap-2">
                    <Send size={16} />
                    Send Data
                  </button>
                </div>
              </div>
            </div>

            {/* Get All Agents */}
            <div className="card bg-base-200">
              <div className="card-body">
                <h4 className="card-title text-base">Get All Agents</h4>
                <p className="text-xs text-base-content/70 mb-3">Fetch all available agents from the API</p>
                <button
                  onClick={getAllAgents}
                  className="btn btn-primary btn-sm w-full gap-2"
                  disabled={isLoadingAgents}
                >
                  {isLoadingAgents ? (
                    <>
                      <span className="loading loading-spinner loading-xs"></span>
                      Loading...
                    </>
                  ) : (
                    <>
                      <Users size={16} />
                      Get All Agents
                    </>
                  )}
                </button>
                <div className="text-xs text-base-content/70 mt-2">
                  <p>
                    • <code className="bg-base-300 px-1 rounded">GET /api/embed/getAgents</code>
                  </p>
                </div>
              </div>
            </div>

            {/* Event Logs */}
            <div className="card bg-base-200">
              <div className="card-body">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="card-title text-base">Event Logs</h4>
                  <button onClick={clearLogs} className="btn btn-ghost btn-xs" disabled={eventLogs.length === 0}>
                    Clear
                  </button>
                </div>
                <div className="bg-base-300 rounded-lg p-4 h-64 overflow-y-auto font-mono text-xs">
                  {eventLogs.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-base-content/50">
                      No events logged yet. Interact with the embed or test functions.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {eventLogs.map((log) => (
                        <div key={log.id} className="border-b border-base-content/10 pb-2">
                          <div className="flex items-start gap-2">
                            <span className="text-base-content/50">{log.timestamp}</span>
                            <span className={`badge ${getResultBadge(log.type)} badge-sm`}>
                              {log.type.toUpperCase()}
                            </span>
                            <span className={getResultColor(log.type)}>{log.message}</span>
                          </div>
                          {log.data && (
                            <pre className="mt-1 ml-24 text-base-content/70 text-xs overflow-x-auto">
                              {typeof log.data === "string" ? log.data : JSON.stringify(log.data, null, 2)}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Panel>

        {/* Resize Handle */}
        <PanelResizeHandle className="w-2 bg-base-300 hover:bg-primary transition-colors cursor-col-resize" />

        {/* Right Side - Live Preview */}
        <Panel defaultSize={50} minSize={30}>
          <div className="h-full bg-base-100">
            {isLoadingToken ? (
              <div className="flex items-center justify-center h-full">
                <span className="loading loading-spinner loading-lg"></span>
              </div>
            ) : embedToken ? (
              <EmbedPreview data={data} embedToken={embedToken} />
            ) : (
              <div className="flex items-center justify-center h-full text-base-content/60">
                <p>Failed to load embed token. Please try again.</p>
              </div>
            )}
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
};

export default TestingTab;
