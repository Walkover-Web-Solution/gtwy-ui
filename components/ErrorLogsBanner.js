"use client";
import React, { useCallback, useState } from "react";
import { useDispatch } from "react-redux";
import { AlertTriangle, X, ChevronDown, ChevronUp, Trash2, Copy } from "lucide-react";
import { useCustomSelector } from "@/customHooks/customSelector";
import { clearErrorLogs, removeErrorLog } from "@/store/reducer/errorLogsReducer";

const formatTime = (ts) => {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return "";
  }
};

const statusBadge = (status) => {
  if (!status) return "bg-base-300 text-base-content/70";
  if (status >= 500) return "bg-error/20 text-error";
  if (status >= 400) return "bg-warning/20 text-warning";
  return "bg-info/20 text-info";
};

function ErrorRow({ log, onRemove }) {
  const copy = useCallback(
    (e) => {
      e.stopPropagation();
      try {
        navigator.clipboard?.writeText(JSON.stringify(log, null, 2));
      } catch {
        /* ignore */
      }
    },
    [log]
  );

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-error/20 last:border-b-0 hover:bg-error/5 min-w-0">
      <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono flex-shrink-0 ${statusBadge(log.status)}`}>
        {log.status || "NET"}
      </span>
      {log.method && (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-base-200 text-base-content/80 flex-shrink-0">
          {log.method}
        </span>
      )}
      <span className="text-xs text-base-content truncate flex-1 min-w-0" title={log.message}>
        {log.message}
      </span>
      {log.url && (
        <span className="text-[10px] text-base-content/60 truncate hidden md:inline max-w-[40%]" title={log.url}>
          {log.url}
        </span>
      )}
      <span className="text-[10px] text-base-content/50 hidden sm:inline flex-shrink-0">
        {formatTime(log.timestamp)}
      </span>
      <button
        className="btn btn-ghost btn-xs px-1 text-base-content/60 hover:text-base-content flex-shrink-0"
        onClick={copy}
        title="Copy error as JSON"
      >
        <Copy size={11} />
      </button>
      <button
        className="btn btn-ghost btn-xs px-1 text-error flex-shrink-0"
        onClick={() => onRemove(log.id)}
        title="Remove this error"
      >
        <X size={13} />
      </button>
    </div>
  );
}

export default function ErrorLogsBanner() {
  const dispatch = useDispatch();
  const logs = useCustomSelector((state) => state?.errorLogsReducer?.logs) || [];
  const [expanded, setExpanded] = useState(false);

  const handleRemove = useCallback((id) => dispatch(removeErrorLog(id)), [dispatch]);
  const handleClearAll = useCallback(() => dispatch(clearErrorLogs()), [dispatch]);

  if (!logs.length) return null;

  // Collapsed: show only the newest error. Expanded: show all, in a scrollable box.
  const visible = expanded ? logs : logs.slice(0, 1);

  return (
    <div
      className="w-full bg-error/5 border-b border-error/30"
      role="alert"
      aria-live="polite"
      data-testid="navbar-error-banner"
    >
      {/* Header row */}
      <div className="flex items-center gap-2 px-3 py-1 border-b border-error/20 bg-error/10">
        <AlertTriangle size={14} className="text-error flex-shrink-0" />
        <span className="text-xs font-semibold text-error">
          {logs.length} error{logs.length > 1 ? "s" : ""}
        </span>
        <span className="text-[10px] text-base-content/50 hidden sm:inline">session only</span>

        <div className="ml-auto flex items-center gap-1">
          {logs.length > 1 && (
            <button
              className="btn btn-ghost btn-xs gap-1"
              onClick={() => setExpanded((v) => !v)}
              title={expanded ? "Collapse" : "Expand to see all errors"}
              data-testid="navbar-error-banner-toggle"
            >
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              <span className="text-[10px]">{expanded ? "Collapse" : `Show all (${logs.length})`}</span>
            </button>
          )}
          <button
            className="btn btn-ghost btn-xs gap-1 text-error"
            onClick={handleClearAll}
            title="Clear all errors"
            data-testid="navbar-error-banner-clear"
          >
            <Trash2 size={12} />
            <span className="text-[10px] hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>

      {/* Error rows */}
      <div className={expanded ? "max-h-64 overflow-y-auto" : ""}>
        {visible.map((log) => (
          <ErrorRow key={log.id} log={log} onRemove={handleRemove} />
        ))}
      </div>
    </div>
  );
}
