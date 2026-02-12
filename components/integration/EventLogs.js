"use client";

import React, { useState, useEffect, useRef } from "react";
import { Trash2, Download } from "lucide-react";

const EventLogs = ({ data }) => {
  const [logs, setLogs] = useState([]);
  const logsEndRef = useRef(null);

  useEffect(() => {
    // Add initial log
    addLog("info", "Event logger initialized");

    // Listen for embed events
    const handleEmbedLoaded = (event) => {
      addLog("success", "Embed loaded successfully", event.detail);
    };

    const handleEmbedError = (event) => {
      addLog("error", "Embed error occurred", event.detail);
    };

    const handleMessageSent = (event) => {
      addLog("info", "Message sent", event.detail);
    };

    const handleMessageReceived = (event) => {
      addLog("info", "Message received", event.detail);
    };

    const handleAgentSelected = (event) => {
      addLog("info", "Agent selected", event.detail);
    };

    const handleConfigChanged = (event) => {
      addLog("warning", "Configuration changed", event.detail);
    };

    // Add event listeners
    window.addEventListener("gtwy:embed:loaded", handleEmbedLoaded);
    window.addEventListener("gtwy:embed:error", handleEmbedError);
    window.addEventListener("gtwy:message:sent", handleMessageSent);
    window.addEventListener("gtwy:message:received", handleMessageReceived);
    window.addEventListener("gtwy:agent:selected", handleAgentSelected);
    window.addEventListener("gtwy:config:changed", handleConfigChanged);

    // Cleanup
    return () => {
      window.removeEventListener("gtwy:embed:loaded", handleEmbedLoaded);
      window.removeEventListener("gtwy:embed:error", handleEmbedError);
      window.removeEventListener("gtwy:message:sent", handleMessageSent);
      window.removeEventListener("gtwy:message:received", handleMessageReceived);
      window.removeEventListener("gtwy:agent:selected", handleAgentSelected);
      window.removeEventListener("gtwy:config:changed", handleConfigChanged);
    };
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom when new logs are added
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const addLog = (type, message, data = null) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [
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

  const clearLogs = () => {
    setLogs([]);
    addLog("info", "Logs cleared");
  };

  const downloadLogs = () => {
    const logsText = logs
      .map((log) => {
        const dataStr = log.data ? `\nData: ${JSON.stringify(log.data, null, 2)}` : "";
        return `[${log.timestamp}] [${log.type.toUpperCase()}] ${log.message}${dataStr}`;
      })
      .join("\n\n");

    const blob = new Blob([logsText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gtwy-embed-logs-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getLogColor = (type) => {
    switch (type) {
      case "success":
        return "text-success";
      case "error":
        return "text-error";
      case "warning":
        return "text-warning";
      case "info":
      default:
        return "text-info";
    }
  };

  const getLogBadge = (type) => {
    switch (type) {
      case "success":
        return "badge-success";
      case "error":
        return "badge-error";
      case "warning":
        return "badge-warning";
      case "info":
      default:
        return "badge-info";
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-base-content/70">
          {logs.length} event{logs.length !== 1 ? "s" : ""} logged
        </div>
        <div className="flex gap-2">
          <button
            onClick={downloadLogs}
            className="btn btn-ghost btn-sm"
            disabled={logs.length === 0}
            title="Download logs"
          >
            <Download size={16} />
          </button>
          <button onClick={clearLogs} className="btn btn-ghost btn-sm" disabled={logs.length === 0} title="Clear logs">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Logs Container */}
      <div className="bg-base-300 rounded-lg p-4 h-96 overflow-y-auto font-mono text-xs">
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-base-content/50">
            No events logged yet. Interact with the embed to see events.
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="border-b border-base-content/10 pb-2">
                <div className="flex items-start gap-2">
                  <span className="text-base-content/50">{log.timestamp}</span>
                  <span className={`badge ${getLogBadge(log.type)} badge-sm`}>{log.type.toUpperCase()}</span>
                  <span className={getLogColor(log.type)}>{log.message}</span>
                </div>
                {log.data && (
                  <pre className="mt-1 ml-24 text-base-content/70 text-xs overflow-x-auto">
                    {JSON.stringify(log.data, null, 2)}
                  </pre>
                )}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>

      {/* Event Listener Info */}
      <div className="alert alert-info">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          className="stroke-current shrink-0 w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          ></path>
        </svg>
        <div>
          <h3 className="font-bold text-sm">Active Event Listeners</h3>
          <div className="text-xs space-y-1 mt-2">
            <p>
              • <code className="bg-base-300 px-1 rounded">gtwy:embed:loaded</code> - Embed initialization
            </p>
            <p>
              • <code className="bg-base-300 px-1 rounded">gtwy:embed:error</code> - Error events
            </p>
            <p>
              • <code className="bg-base-300 px-1 rounded">gtwy:message:sent</code> - User messages
            </p>
            <p>
              • <code className="bg-base-300 px-1 rounded">gtwy:message:received</code> - AI responses
            </p>
            <p>
              • <code className="bg-base-300 px-1 rounded">gtwy:agent:selected</code> - Agent selection
            </p>
            <p>
              • <code className="bg-base-300 px-1 rounded">gtwy:config:changed</code> - Configuration updates
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventLogs;
