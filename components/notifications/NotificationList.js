"use client";
import React from "react";
import { Bell, ExternalLink } from "lucide-react";
import { formatRelativeTime } from "@/utils/utility";

const SEVERITY_DOT = {
  critical: "bg-error",
  warning: "bg-warning",
  info: "bg-info",
};

// One list for the bell slider and the Inbox tab. Unread items are tinted; clicking marks read.
function NotificationList({ items, agentNames = {}, onItemClick, onOpenAgent, emptyTitle, emptyHint }) {
  if (!items.length) {
    return (
      <div className="flex flex-col items-start gap-1 py-10 px-1 text-left">
        <Bell className="w-8 h-8 text-base-content/20 mb-2" />
        <p className="text-sm font-medium text-base-content/70">{emptyTitle || "No notifications yet"}</p>
        <p className="text-xs text-base-content/50">
          {emptyHint || "Agent errors, usage limits and announcements will show up here as they happen."}
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2 text-base-content">
      {items.map((item) => {
        const agentName = item.agent_id ? agentNames[item.agent_id] || "Agent" : null;
        return (
          <li
            key={item._id}
            data-testid={`notification-item-${item._id}`}
            onClick={() => onItemClick?.(item)}
            className={`px-3 py-2.5 rounded-lg border border-base-300 border-l-2 cursor-pointer transition-colors ${
              item.read ? "bg-base-100 border-l-base-300" : "bg-primary/5 border-l-primary hover:bg-primary/10"
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${SEVERITY_DOT[item.severity] || SEVERITY_DOT.info}`}
                  title={item.severity}
                />
                <span className="text-sm font-semibold truncate">{item.title}</span>
              </div>
              <span
                className="text-xs text-base-content/40 shrink-0 tabular-nums"
                title={new Date(item.createdAt).toLocaleString()}
              >
                {formatRelativeTime(item.createdAt)}
              </span>
            </div>
            <p className="text-xs text-base-content/60 break-words line-clamp-3">{item.message}</p>
            {(agentName || !item.org_id) && (
              <div className="flex items-center gap-2 mt-2">
                {!item.org_id && <span className="badge badge-xs badge-ghost">Announcement</span>}
                {agentName && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenAgent?.(item);
                    }}
                  >
                    {agentName}
                    <ExternalLink size={11} />
                  </button>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default NotificationList;
