"use client";
import React, { useEffect, useMemo, useState } from "react";
import { CheckCheck } from "lucide-react";
import useNotificationInbox from "@/customHooks/useNotificationInbox";
import NotificationList from "@/components/notifications/NotificationList";

const SEVERITY_OPTIONS = [
  { value: "", label: "All severities" },
  { value: "critical", label: "Critical" },
  { value: "warning", label: "Warning" },
  { value: "info", label: "Info" },
];

function NotificationInboxTab({ orgId, catalogue }) {
  const { items, agentNames, unreadCount, loading, hasMore, refresh, loadMore, markRead, markAllRead, openAgent } =
    useNotificationInbox(orgId);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [severity, setSeverity] = useState("");
  const [eventType, setEventType] = useState("");

  useEffect(() => {
    refresh();
  }, [refresh]);

  const visibleItems = useMemo(
    () =>
      items.filter(
        (item) =>
          (!unreadOnly || !item.read) &&
          (!severity || item.severity === severity) &&
          (!eventType || item.event_type === eventType)
      ),
    [items, unreadOnly, severity, eventType]
  );
  const filtered = unreadOnly || severity || eventType;

  return (
    <div className="flex flex-col gap-3 max-w-3xl">
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="select select-sm select-bordered w-auto"
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          aria-label="Filter by severity"
        >
          {SEVERITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          className="select select-sm select-bordered w-auto max-w-[14rem]"
          value={eventType}
          onChange={(e) => setEventType(e.target.value)}
          aria-label="Filter by event"
        >
          <option value="">All events</option>
          {catalogue.map((event) => (
            <option key={event.event_type} value={event.event_type}>
              {event.label}
            </option>
          ))}
        </select>
        <label className="label cursor-pointer gap-2">
          <input
            type="checkbox"
            className="toggle toggle-sm"
            checked={unreadOnly}
            onChange={(e) => setUnreadOnly(e.target.checked)}
          />
          <span className="text-sm">Unread only</span>
        </label>
        {unreadCount > 0 && (
          <button type="button" className="btn btn-ghost btn-sm gap-1 ml-auto" onClick={markAllRead}>
            <CheckCheck size={14} />
            Mark all as read
          </button>
        )}
      </div>

      {loading && !items.length ? (
        <div className="flex justify-center items-center h-40">
          <div className="loading loading-spinner loading-md"></div>
        </div>
      ) : (
        <>
          <NotificationList
            items={visibleItems}
            agentNames={agentNames}
            onItemClick={markRead}
            onOpenAgent={openAgent}
            emptyTitle={filtered ? "No notifications match these filters" : undefined}
            emptyHint={filtered ? "Change or clear the filters above to see more." : undefined}
          />
          {hasMore && (
            <button type="button" className="btn btn-ghost btn-sm w-fit" onClick={loadMore} disabled={loading}>
              {loading ? <span className="loading loading-spinner loading-xs" /> : "Load older notifications"}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default NotificationInboxTab;
