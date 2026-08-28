"use client";
import React from "react";
import { ChevronDown, ChevronRight, RotateCcw } from "lucide-react";
import {
  getHistoryDiff,
  formatTime,
  getTypeLabel,
  getChangesForPublish,
  isReverted,
  isSystemHistoryType,
} from "@/utils/configHistoryUtils";

function DiffBlock({ title, lines, tone }) {
  const color = tone === "before" ? "text-error" : "text-success";

  return (
    <div className="rounded-md border border-base-300/60 bg-base-200/40 p-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-base-content/45 mb-1.5">{title}</p>
      {!lines?.length ? (
        <p className="text-xs text-base-content/40 italic">No data</p>
      ) : (
        <div className="space-y-1">
          {lines.map((line, i) => (
            <p key={i} className={`text-xs font-mono break-words ${color}`}>
              <span className="text-base-content/70">{line.key}: </span>
              {line.text}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export function HistoryDiffPanel({ item, showRevert, onRevert, isReverting }) {
  const { beforeLines, afterLines } = getHistoryDiff(item);

  return (
    <div className="space-y-2.5">
      <DiffBlock title="Before" lines={beforeLines} tone="before" />
      <DiffBlock title="After" lines={afterLines} tone="after" />
      {showRevert && beforeLines.length > 0 && (
        <button
          type="button"
          onClick={() => onRevert?.(item)}
          disabled={isReverting}
          className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 disabled:opacity-50"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {isReverting ? "Reverting..." : "Revert this change"}
        </button>
      )}
    </div>
  );
}

function SystemEventPanel({ type, item }) {
  const message =
    type === "Agent created"
      ? "This agent was created."
      : type === "Version created"
        ? "A new version was created for this agent."
        : type === "Version deleted"
          ? `Version ${item?.version_id ? String(item.version_id).slice(0, 8) + "…" : ""} was deleted.`
          : "System event.";

  return (
    <div className="border-t border-base-300/70 pt-3">
      <p className="text-xs text-base-content/55">{message}</p>
      {type === "Version deleted" && item?.previous_value && (
        <p className="text-[11px] text-base-content/40 mt-1.5 font-mono break-words">
          {typeof item.previous_value === "string" ? item.previous_value : JSON.stringify(item.previous_value)}
        </p>
      )}
    </div>
  );
}

function PublishPanel({ item, labels, allHistory, onRevert, revertingId }) {
  const entries = getChangesForPublish(item, allHistory);

  return (
    <div className="space-y-3 border-t border-base-300/70 pt-3">
      {!entries.length ? (
        <p className="text-xs text-base-content/40 italic">No tracked field changes.</p>
      ) : (
        entries.map((changeItem) => (
          <div key={changeItem.id} className="rounded-md border border-base-300/60 bg-base-200/30 p-2.5 space-y-2">
            <div className="flex justify-between gap-2">
              <p className="text-xs font-medium">{getTypeLabel(changeItem.type, labels, changeItem)}</p>
              {changeItem.user_name && (
                <p className="text-[10px] text-base-content/45">
                  by {changeItem.user_name}
                  {changeItem.time ? ` · ${formatTime(changeItem.time)}` : ""}
                </p>
              )}
            </div>
            <HistoryDiffPanel
              item={changeItem}
              showRevert
              onRevert={onRevert}
              isReverting={revertingId === changeItem.id}
            />
          </div>
        ))
      )}
    </div>
  );
}

export function HistoryRow({
  item,
  labels,
  expanded,
  onToggle,
  showRevert,
  onRevert,
  isReverting,
  isDraft,
  allHistory,
  revertingId,
  showVersionMeta = false,
}) {
  const isPublish = item?.type === "Version published";
  const isSystemEvent = isSystemHistoryType(item?.type);
  const isDeleted = item?.type === "Version deleted";
  const canRevert = showRevert && !isPublish && !isSystemEvent;
  const label = getTypeLabel(item?.type, labels, item);
  const versionHint = showVersionMeta && item?.version_id ? ` · v${String(item.version_id).slice(0, 8)}` : "";

  return (
    <div
      className={`rounded-lg border bg-base-100 overflow-hidden ${isDraft ? "border-warning/20" : "border-base-300"}`}
    >
      <button type="button" onClick={onToggle} className="w-full text-left px-3 py-2.5 hover:bg-base-200/40">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 text-base-content/40">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold truncate">{label}</p>
              {isPublish ? (
                <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold bg-success text-success-content">
                  PUBLISHED
                </span>
              ) : isDeleted ? (
                <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold bg-error/15 text-error border border-error/30">
                  DELETED
                </span>
              ) : isSystemEvent ? (
                <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold bg-info/20 text-info border border-info/30">
                  CREATED
                </span>
              ) : isReverted(item) ? (
                <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold bg-base-300 text-base-content/70">
                  REVERTED
                </span>
              ) : null}
            </div>
            <p className="text-[11px] text-base-content/45 mt-0.5">
              {item?.user_name || "Unknown"} · {formatTime(item?.time)}
              {versionHint}
            </p>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3">
          {isPublish ? (
            <PublishPanel
              item={item}
              labels={labels}
              allHistory={allHistory}
              onRevert={onRevert}
              revertingId={revertingId}
            />
          ) : isSystemEvent ? (
            <SystemEventPanel type={item?.type} item={item} />
          ) : (
            <HistoryDiffPanel item={item} showRevert={canRevert} onRevert={onRevert} isReverting={isReverting} />
          )}
        </div>
      )}
    </div>
  );
}
