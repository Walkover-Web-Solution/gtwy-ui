"use client";
import React, { useCallback, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { RotateCw } from "lucide-react";
import { useCustomSelector } from "@/customHooks/customSelector";
import { formatRelativeTime } from "@/utils/utility";
import { fetchNotificationDeliveriesAction, retryNotificationDeliveryAction } from "@/store/action/notificationAction";

const STATUS_STYLE = {
  sent: { label: "Sent", className: "badge-success" },
  pending: { label: "Retrying", className: "badge-warning" },
  sending: { label: "Sending", className: "badge-info" },
  failed: { label: "Failed", className: "badge-error" },
  throttled: { label: "Skipped (repeat limit)", className: "badge-ghost" },
  shadow: { label: "Not sent (test mode)", className: "badge-ghost" },
};

const STATUS_FILTERS = [
  { value: "", label: "All statuses" },
  { value: "failed", label: "Failed" },
  { value: "pending", label: "Retrying" },
  { value: "sent", label: "Sent" },
  { value: "throttled", label: "Skipped" },
];

function NotificationDeliveryLogTab({ catalogue, channels }) {
  const dispatch = useDispatch();
  const [status, setStatus] = useState("");
  const [retryingId, setRetryingId] = useState(null);
  const { items, total, page, loading } = useCustomSelector((state) => state?.notificationReducer?.deliveries || {});

  const load = useCallback(
    (nextPage = 1) => dispatch(fetchNotificationDeliveriesAction({ status: status || undefined, page: nextPage })),
    [dispatch, status]
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const eventLabels = Object.fromEntries(catalogue.map((event) => [event.event_type, event.label]));
  const channelNames = Object.fromEntries(channels.map((channel) => [channel._id, channel.name]));
  const rows = items || [];

  const retry = async (delivery) => {
    setRetryingId(delivery._id);
    const ok = await dispatch(retryNotificationDeliveryAction(delivery._id));
    setRetryingId(null);
    if (ok) load(1);
  };

  return (
    <div className="flex flex-col gap-3 max-w-3xl">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-base-content/60">Every send to a channel from the last 30 days.</p>
        <select
          className="select select-sm select-bordered w-auto"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter by status"
        >
          {STATUS_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {loading && !rows.length ? (
        <div className="flex justify-center items-center h-32">
          <div className="loading loading-spinner loading-md"></div>
        </div>
      ) : rows.length ? (
        <div className="flex flex-col gap-2">
          {rows.map((delivery) => {
            const style = STATUS_STYLE[delivery.status] || { label: delivery.status, className: "badge-ghost" };
            const canRetry = delivery.status === "failed" || delivery.status === "pending";
            const detail = delivery.error || (delivery.response_code ? `HTTP ${delivery.response_code}` : null);
            return (
              <div
                key={delivery._id}
                className="rounded-lg border border-base-300 p-3 bg-base-100"
                data-testid={`delivery-${delivery._id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold truncate">
                        {eventLabels[delivery.event_type] || delivery.event_type}
                      </p>
                      <span className={`badge badge-xs whitespace-nowrap ${style.className}`}>{style.label}</span>
                    </div>
                    <p className="text-xs text-base-content/60 mt-0.5">
                      To {channelNames[delivery.channel_id] || "a deleted channel"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span
                      className="text-xs text-base-content/40 tabular-nums"
                      title={new Date(delivery.createdAt).toLocaleString()}
                    >
                      {formatRelativeTime(delivery.createdAt)}
                    </span>
                    {canRetry && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs gap-1"
                        onClick={() => retry(delivery)}
                        disabled={retryingId === delivery._id}
                      >
                        {retryingId === delivery._id ? (
                          <span className="loading loading-spinner loading-xs" />
                        ) : (
                          <RotateCw size={12} />
                        )}
                        Retry
                      </button>
                    )}
                  </div>
                </div>
                {(detail || delivery.attempts > 1) && (
                  <p
                    className={`text-xs mt-2 break-words ${
                      delivery.status === "failed" || delivery.status === "pending"
                        ? "text-warning"
                        : "text-base-content/70"
                    }`}
                  >
                    {[detail, delivery.attempts > 1 ? `${delivery.attempts} attempts` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-base-300 p-6 text-left">
          <p className="text-sm font-medium">{status ? "No deliveries with this status" : "Nothing sent yet"}</p>
          <p className="text-xs text-base-content/60 mt-1">
            When a rule sends a notification to a channel, each attempt and its result shows up here.
          </p>
        </div>
      )}

      {rows.length < (total || 0) && (
        <button type="button" className="btn btn-ghost btn-sm w-fit" onClick={() => load(page + 1)} disabled={loading}>
          {loading ? <span className="loading loading-spinner loading-xs" /> : "Load more"}
        </button>
      )}
    </div>
  );
}

export default NotificationDeliveryLogTab;
