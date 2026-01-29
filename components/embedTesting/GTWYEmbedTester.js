"use client";

import React, { useEffect, useRef, useState } from "react";
import Modal from "@/components/UI/Modal";
import { MODAL_TYPE } from "@/utils/enums";
import { openModal, closeModal } from "@/utils/utility";

const GTWYEmbedTester = () => {
  const scriptRef = useRef(null);
  const [embedToken, setEmbedToken] = useState("");
  const [isEmbedLoaded, setIsEmbedLoaded] = useState(false);
  const [eventLogs, setEventLogs] = useState([]);
  const eventLogRef = useRef(null);

  const [agentIdInput, setAgentIdInput] = useState("");
  const [metaInput, setMetaInput] = useState("");
  const [agentPurpose, setAgentPurpose] = useState("");
  const [agentNameInput, setAgentNameInput] = useState("");
  const [sendDataAgentName, setSendDataAgentName] = useState("");
  const [sendDataAgentId, setSendDataAgentId] = useState("");
  const [sendDataMetadata, setSendDataMetadata] = useState("");
  const [getAgentIdInput, setGetAgentIdInput] = useState("");

  const addLog = (type, message, data = null) => {
    const timestamp = new Date().toLocaleTimeString();
    setEventLogs((prev) => [...prev, { timestamp, type, message, data }]);
  };

  useEffect(() => {
    if (eventLogRef.current) {
      eventLogRef.current.scrollTop = eventLogRef.current.scrollHeight;
    }
  }, [eventLogs]);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.type) {
        addLog("event", `Received: ${event.data.type}`, event.data);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const loadEmbed = () => {
    if (!embedToken.trim()) {
      return;
    }

    if (scriptRef.current) {
      scriptRef.current.remove();
      scriptRef.current = null;
    }

    const script = document.createElement("script");
    script.id = "gtwy-main-script";
    script.src = "http://localhost:3000/gtwy_embed_local.js";
    script.setAttribute("embedToken", embedToken);
    script.setAttribute("parentId", "gtwy-parent-container");

    script.onload = () => {
      setIsEmbedLoaded(true);
      addLog("success", "GTWY Embed loaded successfully");
    };

    script.onerror = () => {
      addLog("error", "Failed to load GTWY Embed");
      setIsEmbedLoaded(false);
    };

    document.body.appendChild(script);
    scriptRef.current = script;
    addLog("info", "Loading GTWY Embed script...");
  };

  const unloadEmbed = () => {
    if (scriptRef.current) {
      scriptRef.current.remove();
      scriptRef.current = null;
    }
    if (window.GtwyEmbed) delete window.GtwyEmbed;
    if (window.openGtwy) delete window.openGtwy;
    if (window.closeGtwy) delete window.closeGtwy;
    setIsEmbedLoaded(false);
    addLog("info", "GTWY Embed unloaded");
  };

  useEffect(() => {
    return () => {
      if (scriptRef.current) {
        scriptRef.current.remove();
      }
      if (window.GtwyEmbed) {
        delete window.GtwyEmbed;
      }
      if (window.openGtwy) {
        delete window.openGtwy;
      }
      if (window.closeGtwy) {
        delete window.closeGtwy;
      }
    };
  }, []);

  const openGtwy = () => {
    if (!isEmbedLoaded || !window.openGtwy) {
      return;
    }
    window.openGtwy();
    addLog("action", "Called: window.openGtwy()");
  };

  const closeGtwy = () => {
    if (!isEmbedLoaded || !window.closeGtwy) {
      return;
    }
    window.closeGtwy();
    addLog("action", "Called: window.closeGtwy()");
  };

  const openWithAgent = () => {
    if (!isEmbedLoaded) {
      return;
    }
    openModal(MODAL_TYPE.GTWY_OPEN_WITH_AGENT_MODAL);
  };

  const handleOpenAgent = () => {
    if (!agentIdInput.trim()) {
      return;
    }

    const params = { agent_id: agentIdInput.trim() };

    if (metaInput.trim()) {
      try {
        params.meta = JSON.parse(metaInput);
      } catch {
        return;
      }
    }

    if (window.openGtwy) {
      window.openGtwy(params);
      addLog("action", "Called: window.openGtwy() with params", params);
      closeModal(MODAL_TYPE.GTWY_OPEN_WITH_AGENT_MODAL);
      setAgentIdInput("");
      setMetaInput("");
    }
  };

  const createAgentWithPurpose = () => {
    if (!isEmbedLoaded) {
      return;
    }
    openModal(MODAL_TYPE.GTWY_CREATE_AGENT_PURPOSE_MODAL);
  };

  const handleCreateAgent = () => {
    if (!agentPurpose.trim()) {
      return;
    }
    if (window.GtwyEmbed?.sendDataToGtwy) {
      window.GtwyEmbed.sendDataToGtwy({ agent_purpose: agentPurpose });
      addLog("action", `Called: sendDataToGtwy({ agent_purpose: "${agentPurpose}" })`);
      closeModal(MODAL_TYPE.GTWY_CREATE_AGENT_PURPOSE_MODAL);
      setAgentPurpose("");
    }
  };

  const createAgentWithName = () => {
    if (!isEmbedLoaded) {
      return;
    }
    openModal(MODAL_TYPE.GTWY_CREATE_AGENT_NAME_MODAL);
  };

  const handleCreateAgentWithName = () => {
    if (!agentNameInput.trim()) {
      return;
    }
    if (window.openGtwy) {
      window.openGtwy({ agent_name: agentNameInput.trim() });
      addLog("action", `Called: window.openGtwy({ agent_name: "${agentNameInput}" })`);
      closeModal(MODAL_TYPE.GTWY_CREATE_AGENT_NAME_MODAL);
      setAgentNameInput("");
    }
  };

  const openSendDataModal = () => {
    if (!isEmbedLoaded) {
      return;
    }
    openModal(MODAL_TYPE.GTWY_SEND_DATA_MODAL);
  };

  const handleSendData = () => {
    if (!sendDataAgentName.trim() && !sendDataAgentId.trim() && !sendDataMetadata.trim()) {
      return;
    }

    const dataToSend = {};
    if (sendDataAgentName.trim()) {
      dataToSend.agent_name = sendDataAgentName.trim();
    }
    if (sendDataAgentId.trim()) {
      dataToSend.agent_id = sendDataAgentId.trim();
    }
    if (sendDataMetadata.trim()) {
      try {
        const metadata = JSON.parse(sendDataMetadata);
        Object.assign(dataToSend, metadata);
      } catch {
        return;
      }
    }

    if (window.GtwyEmbed?.sendDataToGtwy) {
      window.GtwyEmbed.sendDataToGtwy(dataToSend);
      addLog("action", "Called: window.GtwyEmbed.sendDataToGtwy()", dataToSend);
      closeModal(MODAL_TYPE.GTWY_SEND_DATA_MODAL);
      setSendDataAgentName("");
      setSendDataAgentId("");
      setSendDataMetadata("");
    }
  };

  const openGetAgentsModal = () => {
    if (!embedToken.trim()) {
      return;
    }
    openModal(MODAL_TYPE.GTWY_GET_AGENTS_MODAL);
  };

  const handleGetAgents = async () => {
    if (!embedToken.trim()) {
      return;
    }

    try {
      const url = new URL("https://dev-db.gtwy.ai/api/embed/getAgents");
      if (getAgentIdInput.trim()) {
        url.searchParams.append("agent_id", getAgentIdInput.trim());
      }

      addLog("info", "Fetching agent data...", { url: url.toString() });

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: embedToken.trim(),
        },
      });

      const data = await response.json();

      if (response.ok) {
        addLog("success", "Agent data fetched successfully", data);
      } else {
        addLog("error", "Failed to fetch agent data", data);
      }
    } catch (error) {
      addLog("error", "Error fetching agent data", { error: error.message });
    }

    closeModal(MODAL_TYPE.GTWY_GET_AGENTS_MODAL);
    setGetAgentIdInput("");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
      {/* Left Panel - Configuration, Controls & Event Logs */}
      <div className="lg:col-span-1 flex flex-col h-full gap-3 overflow-hidden">
        {/* Configuration & Controls - Scrollable */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-base-100">
          <div className="space-y-3 pr-2">
            {/* Embed Token Card */}
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body p-4">
                <h2 className="card-title text-lg mb-3">1. Load Embed</h2>
                <div className="space-y-3">
                  <textarea
                    className="textarea textarea-bordered w-full resize-none font-mono text-xs"
                    rows="3"
                    placeholder="Paste JWT embed token here..."
                    value={embedToken}
                    onChange={(e) => setEmbedToken(e.target.value)}
                    disabled={isEmbedLoaded}
                  />
                  <div className="flex gap-2">
                    <button onClick={loadEmbed} disabled={isEmbedLoaded} className="btn btn-outline btn-sm flex-1">
                      {isEmbedLoaded ? "✓ Loaded" : "Load"}
                    </button>
                    <button onClick={unloadEmbed} disabled={!isEmbedLoaded} className="btn btn-outline btn-sm flex-1">
                      Unload
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div
                      className={`w-2 h-2 rounded-full ${isEmbedLoaded ? "bg-success animate-pulse" : "bg-base-300"}`}
                    ></div>
                    <span className="text-base-content/70">{isEmbedLoaded ? "Ready" : "Not Loaded"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Programmatic Controls */}
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body p-4">
                <h2 className="card-title text-lg mb-3">2. Window Controls</h2>
                <div className="space-y-2">
                  <button onClick={openGtwy} disabled={!isEmbedLoaded} className="btn btn-outline btn-sm w-full">
                    Open GTWY
                  </button>
                  <button onClick={closeGtwy} disabled={!isEmbedLoaded} className="btn btn-outline btn-sm w-full">
                    Close GTWY
                  </button>
                  <button onClick={openWithAgent} disabled={!isEmbedLoaded} className="btn btn-outline btn-sm w-full">
                    Open with Agent ID
                  </button>
                </div>
              </div>
            </div>

            {/* Agent Creation */}
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body p-4">
                <h2 className="card-title text-lg mb-3">3. Agent Creation</h2>
                <div className="space-y-2">
                  <button
                    onClick={createAgentWithName}
                    disabled={!isEmbedLoaded}
                    className="btn btn-outline btn-sm w-full"
                  >
                    Create Agent with Name
                  </button>
                  <button
                    onClick={createAgentWithPurpose}
                    disabled={!isEmbedLoaded}
                    className="btn btn-outline btn-sm w-full"
                  >
                    Create Agent with Purpose
                  </button>
                  <button
                    onClick={openSendDataModal}
                    disabled={!isEmbedLoaded}
                    className="btn btn-outline btn-sm w-full"
                  >
                    Send Data to GTWY
                  </button>
                </div>
              </div>
            </div>

            {/* API Testing */}
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body p-4">
                <h2 className="card-title text-lg mb-3">4. API Testing</h2>
                <div className="space-y-2">
                  <button
                    onClick={openGetAgentsModal}
                    disabled={!embedToken.trim()}
                    className="btn btn-outline btn-sm w-full"
                  >
                    Get Agent Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Event Logs - Fixed at bottom of left panel */}
        <div className="card bg-base-100 shadow-lg flex-none" style={{ height: "280px" }}>
          <div className="card-body p-4 flex flex-col h-full">
            <div className="flex justify-between items-center mb-2 flex-none">
              <h2 className="card-title text-base">Event Logs</h2>
              <button onClick={() => setEventLogs([])} className="btn btn-ghost btn-xs">
                Clear
              </button>
            </div>
            <div
              ref={eventLogRef}
              className="bg-neutral rounded-lg p-3 flex-1 overflow-y-auto font-mono text-xs text-neutral-content"
            >
              {eventLogs.length === 0 ? (
                <p className="text-neutral-content/50">No events yet...</p>
              ) : (
                eventLogs.map((log, index) => (
                  <div key={index} className="mb-2">
                    <span className="text-neutral-content/50">[{log.timestamp}]</span>{" "}
                    <span
                      className={
                        log.type === "success"
                          ? "text-success"
                          : log.type === "error"
                            ? "text-error"
                            : log.type === "action"
                              ? "text-info"
                              : log.type === "event"
                                ? "text-warning"
                                : "text-neutral-content/70"
                      }
                    >
                      {log.message}
                    </span>
                    {log.data && (
                      <pre className="text-neutral-content/70 ml-4 mt-1 text-xs">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Embed Preview (Full Height) */}
      <div className="lg:col-span-2 flex flex-col h-full overflow-hidden">
        {/* Embed Preview */}
        <div className="card bg-base-100 shadow-lg flex-1 flex flex-col overflow-hidden">
          <div className="card-body p-4 flex flex-col h-full">
            <h2 className="card-title text-base mb-2 flex-none">Embed Preview</h2>
            <div className="relative border-2 border-dashed border-base-300 rounded-lg flex-1 bg-base-200 overflow-hidden">
              <div id="gtwy-parent-container" className="w-full h-full" />
              {!isEmbedLoaded && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <svg
                      className="w-16 h-16 text-base-content/30 mx-auto mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p className="text-base-content/50">Load the embed to see preview</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <Modal MODAL_ID={MODAL_TYPE.GTWY_OPEN_WITH_AGENT_MODAL}>
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">Open with Agent ID</h3>
          <div className="space-y-3">
            <div>
              <label className="label">
                <span className="label-text font-semibold">Agent ID</span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full font-mono text-sm"
                placeholder="e.g., 697355123bcf08ee26fa36bf"
                value={agentIdInput}
                onChange={(e) => setAgentIdInput(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <div className="modal-action">
            <button onClick={handleOpenAgent} className="btn btn-outline">
              Open
            </button>
            <button
              onClick={() => {
                closeModal(MODAL_TYPE.GTWY_OPEN_WITH_AGENT_MODAL);
                setAgentIdInput("");
                setMetaInput("");
              }}
              className="btn btn-ghost"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      <Modal MODAL_ID={MODAL_TYPE.GTWY_CREATE_AGENT_NAME_MODAL}>
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">Create Agent with Name</h3>
          <input
            type="text"
            className="input input-bordered w-full"
            placeholder="Enter agent name"
            value={agentNameInput}
            onChange={(e) => setAgentNameInput(e.target.value)}
            autoFocus
          />
          <div className="modal-action">
            <button onClick={handleCreateAgentWithName} className="btn btn-outline">
              Create
            </button>
            <button
              onClick={() => {
                closeModal(MODAL_TYPE.GTWY_CREATE_AGENT_NAME_MODAL);
                setAgentNameInput("");
              }}
              className="btn btn-ghost"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      <Modal MODAL_ID={MODAL_TYPE.GTWY_SEND_DATA_MODAL}>
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">Send Data to GTWY</h3>
          <div className="space-y-3">
            <div>
              <label className="label">
                <span className="label-text font-semibold">Agent Name - Optional</span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder="e.g., New Agent"
                value={sendDataAgentName}
                onChange={(e) => setSendDataAgentName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="label">
                <span className="label-text font-semibold">Agent ID - Optional</span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full font-mono text-sm"
                placeholder="e.g., 697355123bcf08ee26fa36bf"
                value={sendDataAgentId}
                onChange={(e) => setSendDataAgentId(e.target.value)}
              />
            </div>
          </div>
          <div className="modal-action">
            <button onClick={handleSendData} className="btn btn-outline">
              Send
            </button>
            <button
              onClick={() => {
                closeModal(MODAL_TYPE.GTWY_SEND_DATA_MODAL);
                setSendDataAgentName("");
                setSendDataAgentId("");
                setSendDataMetadata("");
              }}
              className="btn btn-ghost"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      <Modal MODAL_ID={MODAL_TYPE.GTWY_GET_AGENTS_MODAL}>
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">Get Agent Data</h3>
          <div className="space-y-3">
            <div>
              <label className="label">
                <span className="label-text font-semibold">Agent ID - Optional</span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full font-mono text-sm"
                placeholder="e.g., 697355123bcf08ee26fa36bf"
                value={getAgentIdInput}
                onChange={(e) => setGetAgentIdInput(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <div className="modal-action">
            <button onClick={handleGetAgents} className="btn btn-outline">
              Fetch Data
            </button>
            <button
              onClick={() => {
                closeModal(MODAL_TYPE.GTWY_GET_AGENTS_MODAL);
                setGetAgentIdInput("");
              }}
              className="btn btn-ghost"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      <Modal MODAL_ID={MODAL_TYPE.GTWY_CREATE_AGENT_PURPOSE_MODAL}>
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">Create Agent with Purpose</h3>
          <textarea
            className="textarea textarea-bordered w-full resize-none"
            rows="4"
            placeholder="Enter the purpose of the agent..."
            value={agentPurpose}
            onChange={(e) => setAgentPurpose(e.target.value)}
            autoFocus
          />
          <div className="modal-action">
            <button onClick={handleCreateAgent} className="btn btn-outline">
              Create
            </button>
            <button
              onClick={() => {
                closeModal(MODAL_TYPE.GTWY_CREATE_AGENT_PURPOSE_MODAL);
                setAgentPurpose("");
              }}
              className="btn btn-ghost"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default GTWYEmbedTester;
