"use client";

import React, { useState } from "react";
import { Trash2, Copy, Check } from "lucide-react";

const LOG_BADGE = {
  success: "badge-success",
  error: "badge-error",
  warning: "badge-warning",
  info: "badge-info",
};

const LOG_COLOR = {
  success: "text-success",
  error: "text-error",
  warning: "text-warning",
  info: "text-info",
};

const EventLogs = ({ logs = [], onClear, maxHeight = "max-h-48" }) => {
  const [copiedIndex, setCopiedIndex] = useState(null);

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="card bg-base-200">
      <div className="card-body p-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="card-title text-sm">Event Logs</h4>
          <button onClick={onClear} className="btn btn-ghost btn-xs gap-1" disabled={logs.length === 0}>
            <Trash2 className="h-3 w-3" />
            Clear
          </button>
        </div>
        <div className={`space-y-1 ${maxHeight} overflow-y-auto`}>
          {logs.length === 0 ? (
            <p className="text-xs text-base-content/50 text-center py-4">No events yet</p>
          ) : (
            logs.map((log, index) => (
              <div key={log.id} className="bg-base-100 rounded p-2">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`badge badge-xs ${LOG_BADGE[log.type] || "badge-ghost"}`}>{log.type}</span>
                    <span className="text-xs text-base-content/60">{log.timestamp}</span>
                  </div>
                  {log.data && (
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(log.data, null, 2), index)}
                      className="btn btn-ghost btn-xs"
                    >
                      {copiedIndex === index ? (
                        <Check className="h-3 w-3 text-success" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  )}
                </div>
                <p className={`text-xs ${LOG_COLOR[log.type] || "text-base-content"}`}>{log.message}</p>
                {log.data && (
                  <pre className="mt-1 text-base-content/70 text-xs overflow-x-auto">
                    {typeof log.data === "string" ? log.data : JSON.stringify(log.data, null, 2)}
                  </pre>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export const createAddLog =
  (setLogs) =>
  (type, message, data = null) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { id: Date.now() + Math.random(), type, message, data, timestamp }]);
  };

export default EventLogs;
