"use client";
import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { Pencil, Trash2 } from "lucide-react";
import DeleteModal from "@/components/UI/DeleteModal";
import NotificationRuleModal from "@/components/modals/NotificationRuleModal";
import useDeleteOperation from "@/customHooks/useDeleteOperation";
import { MODAL_TYPE } from "@/utils/enums";
import { openModal } from "@/utils/utility";
import { deleteNotificationRuleAction, toggleNotificationRuleAction } from "@/store/action/notificationAction";

const SEVERITY_LABEL = { info: "All severities", warning: "Warning and above", critical: "Critical only" };

function NotificationRulesTab({ rules, loading, catalogue, channels, agents }) {
  const dispatch = useDispatch();
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const { isDeleting, executeDelete } = useDeleteOperation(MODAL_TYPE.DELETE_NOTIFICATION_RULE_MODAL);

  const eventLabels = Object.fromEntries(catalogue.map((event) => [event.event_type, event.label]));
  const channelNames = Object.fromEntries(channels.map((channel) => [channel._id, channel.name]));
  const agentNames = Object.fromEntries(agents.map((agent) => [agent._id, agent.name]));

  const openEditor = (rule) => {
    setEditing(rule);
    openModal(MODAL_TYPE.NOTIFICATION_RULE_MODAL);
  };

  const describeEvents = (rule) =>
    rule.event_types.includes("*")
      ? "All events"
      : rule.event_types.map((type) => eventLabels[type] || type).join(", ");
  const describeAgents = (rule) =>
    rule.agents.includes("all") ? "All agents" : rule.agents.map((id) => agentNames[id] || "Unknown agent").join(", ");

  return (
    <div className="flex flex-col gap-3 max-w-3xl">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-base-content/60">Rules decide which events are sent to which channels.</p>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => openEditor(null)}
          data-testid="new-rule"
        >
          + New rule
        </button>
      </div>

      {loading && !rules.length ? (
        <div className="flex justify-center items-center h-32">
          <div className="loading loading-spinner loading-md"></div>
        </div>
      ) : rules.length ? (
        <div className="flex flex-col gap-2">
          {rules.map((rule) => (
            <div
              key={rule._id}
              className={`rounded-lg border border-base-300 p-3 bg-base-100 ${rule.enabled ? "" : "opacity-60"}`}
              data-testid={`rule-${rule._id}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{rule.name}</p>
                  <p className="text-xs text-base-content/60 mt-0.5 break-words">{describeEvents(rule)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="checkbox"
                    className="toggle toggle-sm"
                    checked={rule.enabled}
                    onChange={() => dispatch(toggleNotificationRuleAction(rule))}
                    aria-label={rule.enabled ? "Turn rule off" : "Turn rule on"}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs btn-square"
                    aria-label="Edit rule"
                    onClick={() => openEditor(rule)}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs btn-square"
                    aria-label="Delete rule"
                    onClick={() => {
                      setToDelete(rule);
                      openModal(MODAL_TYPE.DELETE_NOTIFICATION_RULE_MODAL);
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-base-content/70">
                <span>{describeAgents(rule)}</span>
                <span>{SEVERITY_LABEL[rule.min_severity] || SEVERITY_LABEL.info}</span>
                <span>
                  To:{" "}
                  {rule.channel_ids.length ? (
                    rule.channel_ids.map((id) => channelNames[id] || "Deleted channel").join(", ")
                  ) : (
                    <span className="text-warning">no channel, nothing is sent</span>
                  )}
                </span>
                {rule.legacy_alert_id && <span className="badge badge-ghost badge-xs">From Alerts</span>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-base-300 p-6 text-left">
          <p className="text-sm font-medium">No rules yet</p>
          <p className="text-xs text-base-content/60 mt-1">
            Notifications already appear in the inbox. Add a rule to also send them to a webhook, for example agent
            errors to your on-call tool.
          </p>
        </div>
      )}

      <NotificationRuleModal rule={editing} catalogue={catalogue} channels={channels} agents={agents} />
      <DeleteModal
        modalType={MODAL_TYPE.DELETE_NOTIFICATION_RULE_MODAL}
        onConfirm={() => executeDelete(() => dispatch(deleteNotificationRuleAction(toDelete._id)))}
        title="Delete rule"
        description={`Delete the rule "${toDelete?.name}"? Matching events will no longer be sent to its channels.`}
        loading={isDeleting}
        isAsync={true}
      />
    </div>
  );
}

export default NotificationRulesTab;
