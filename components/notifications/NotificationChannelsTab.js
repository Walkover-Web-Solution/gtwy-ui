"use client";
import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { Pencil, Send, Trash2, Webhook } from "lucide-react";
import DeleteModal from "@/components/UI/DeleteModal";
import NotificationChannelModal from "@/components/modals/NotificationChannelModal";
import useDeleteOperation from "@/customHooks/useDeleteOperation";
import { MODAL_TYPE } from "@/utils/enums";
import { formatRelativeTime, openModal } from "@/utils/utility";
import {
  deleteNotificationChannelAction,
  saveNotificationChannelAction,
  testNotificationChannelAction,
} from "@/store/action/notificationAction";

const channelStatus = (channel) => {
  if (!channel.enabled) return { label: "Disabled", className: "badge-error" };
  if (channel.consecutive_failures > 0) return { label: "Failing", className: "badge-warning" };
  return { label: "Active", className: "badge-success" };
};

function NotificationChannelsTab({ channels, loading, rules }) {
  const dispatch = useDispatch();
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [testingId, setTestingId] = useState(null);
  const { isDeleting, executeDelete } = useDeleteOperation(MODAL_TYPE.DELETE_NOTIFICATION_CHANNEL_MODAL);

  const openEditor = (channel) => {
    setEditing(channel);
    openModal(MODAL_TYPE.NOTIFICATION_CHANNEL_MODAL);
  };

  const runTest = async (channel) => {
    setTestingId(channel._id);
    await dispatch(testNotificationChannelAction(channel._id));
    setTestingId(null);
  };

  const rulesUsing = (channelId) => rules.filter((rule) => rule.channel_ids.includes(channelId)).length;

  return (
    <div className="flex flex-col gap-3 max-w-3xl">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-base-content/60">Channels are where notifications are sent.</p>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => openEditor(null)}
          data-testid="new-channel"
        >
          + Add channel
        </button>
      </div>

      {loading && !channels.length ? (
        <div className="flex justify-center items-center h-32">
          <div className="loading loading-spinner loading-md"></div>
        </div>
      ) : channels.length ? (
        <div className="flex flex-col gap-2">
          {channels.map((channel) => {
            const status = channelStatus(channel);
            const usedBy = rulesUsing(channel._id);
            return (
              <div
                key={channel._id}
                className="rounded-lg border border-base-300 p-3 bg-base-100"
                data-testid={`channel-${channel._id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <Webhook size={16} className="text-base-content/50 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate">{channel.name}</p>
                        <span className={`badge badge-xs ${status.className}`}>{status.label}</span>
                      </div>
                      <p className="text-xs text-base-content/60 truncate mt-0.5">{channel.config?.url}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs gap-1"
                      onClick={() => runTest(channel)}
                      disabled={testingId === channel._id}
                    >
                      {testingId === channel._id ? (
                        <span className="loading loading-spinner loading-xs" />
                      ) : (
                        <Send size={12} />
                      )}
                      Test
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs btn-square"
                      aria-label="Edit channel"
                      onClick={() => openEditor(channel)}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs btn-square"
                      aria-label="Delete channel"
                      onClick={() => {
                        setToDelete(channel);
                        openModal(MODAL_TYPE.DELETE_NOTIFICATION_CHANNEL_MODAL);
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-base-content/70">
                  <span>{usedBy ? `Used by ${usedBy} rule${usedBy > 1 ? "s" : ""}` : "Not used by any rule"}</span>
                  {channel.last_success_at && <span>Last delivered {formatRelativeTime(channel.last_success_at)}</span>}
                </div>
                {!channel.enabled && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-error">
                    <span className="break-words">{channel.disabled_reason || "This channel is turned off."}</span>
                    <button
                      type="button"
                      className="btn btn-xs btn-outline"
                      onClick={() => dispatch(saveNotificationChannelAction(channel._id, { enabled: true }))}
                    >
                      Turn back on
                    </button>
                  </div>
                )}
                {channel.enabled && channel.consecutive_failures > 0 && channel.last_error && (
                  <p className="mt-2 text-xs text-warning break-words">
                    Last {channel.consecutive_failures} deliveries failed: {channel.last_error}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-base-300 p-6 text-left">
          <p className="text-sm font-medium">No channels yet</p>
          <p className="text-xs text-base-content/60 mt-1">
            Add a webhook URL (your on-call tool, a workflow, or your own endpoint), then create a rule that sends
            events to it.
          </p>
        </div>
      )}

      <NotificationChannelModal channel={editing} />
      <DeleteModal
        modalType={MODAL_TYPE.DELETE_NOTIFICATION_CHANNEL_MODAL}
        onConfirm={() => executeDelete(() => dispatch(deleteNotificationChannelAction(toDelete._id)))}
        title="Delete channel"
        description={`Delete "${toDelete?.name}"? Rules that use it will stop sending there.`}
        loading={isDeleting}
        isAsync={true}
      />
    </div>
  );
}

export default NotificationChannelsTab;
