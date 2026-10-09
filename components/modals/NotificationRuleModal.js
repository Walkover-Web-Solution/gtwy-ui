"use client";
import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { ListFilter } from "lucide-react";
import toast from "react-hot-toast";
import Modal from "@/components/UI/Modal";
import { MODAL_TYPE } from "@/utils/enums";
import { closeModal } from "@/utils/utility";
import { saveNotificationRuleAction } from "@/store/action/notificationAction";

const METRICS_EVENT = "agent.metrics_limit_reached";

const blankForm = () => ({
  name: "",
  allEvents: false,
  eventTypes: [],
  minSeverity: "info",
  allAgents: true,
  agents: [],
  channelIds: [],
  throttle: "",
  limit: "",
  limitMetric: "cost",
});

const formFromRule = (rule) => ({
  name: rule.name,
  allEvents: rule.event_types?.includes("*"),
  eventTypes: (rule.event_types || []).filter((type) => type !== "*"),
  minSeverity: rule.min_severity || "info",
  allAgents: (rule.agents || []).includes("all"),
  agents: (rule.agents || []).filter((agent) => agent !== "all"),
  channelIds: rule.channel_ids || [],
  throttle: rule.throttle_seconds ?? "",
  limit: rule.limit ?? "",
  limitMetric: rule.limit_metric || "cost",
});

const toggleIn = (list, value) => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);

const CheckboxList = ({ options, selected, onToggle, empty }) =>
  options.length ? (
    <div className="max-h-44 overflow-y-auto rounded-lg border border-base-300 divide-y divide-base-200">
      {options.map((option) => (
        <label key={option.value} className="flex items-start gap-2 px-3 py-2 cursor-pointer hover:bg-base-200">
          <input
            type="checkbox"
            className="checkbox checkbox-sm mt-0.5"
            checked={selected.includes(option.value)}
            onChange={() => onToggle(option.value)}
          />
          <span className="min-w-0">
            <span className="text-sm block">{option.label}</span>
            {option.hint && (
              <span className="text-xs text-base-content/50 block [overflow-wrap:anywhere]">{option.hint}</span>
            )}
          </span>
        </label>
      ))}
    </div>
  ) : (
    <p className="text-xs text-base-content/50">{empty}</p>
  );

// Create or edit a rule: which events, from which agents, go to which channels.
function NotificationRuleModal({ rule, catalogue, channels, agents }) {
  const dispatch = useDispatch();
  const isEdit = Boolean(rule?._id);
  const [form, setForm] = useState(blankForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(rule?._id ? formFromRule(rule) : blankForm());
  }, [rule]);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const handleClose = () => closeModal(MODAL_TYPE.NOTIFICATION_RULE_MODAL);
  const showLimit = form.eventTypes.includes(METRICS_EVENT) && !form.allEvents;

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Give the rule a name");
    if (!form.allEvents && !form.eventTypes.length) return toast.error("Pick at least one event");
    if (!form.allAgents && !form.agents.length) return toast.error("Pick at least one agent, or choose all agents");
    if (!form.channelIds.length) return toast.error("Pick at least one channel");

    const payload = {
      name: form.name.trim(),
      event_types: form.allEvents ? ["*"] : form.eventTypes,
      min_severity: form.minSeverity,
      agents: form.allAgents ? ["all"] : form.agents,
      channel_ids: form.channelIds,
      throttle_seconds: form.throttle === "" ? null : Number(form.throttle),
      limit: showLimit && form.limit !== "" ? Number(form.limit) : null,
      limit_metric: showLimit && form.limit !== "" ? form.limitMetric : null,
    };

    setSaving(true);
    const saved = await dispatch(saveNotificationRuleAction(rule?._id, payload));
    setSaving(false);
    if (saved) handleClose();
  };

  return (
    <Modal
      MODAL_ID={MODAL_TYPE.NOTIFICATION_RULE_MODAL}
      onClose={handleClose}
      title={isEdit ? "Edit rule" : "New rule"}
      description="Choose which events are sent to which channels."
      icon={<ListFilter size={16} className="text-primary" />}
      widthClass="w-[min(560px,92vw)]"
      footer={
        <div className="flex gap-2">
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleClose} disabled={saving}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleSave}
            disabled={saving}
            data-testid="notification-rule-save"
          >
            {saving && <span className="loading loading-spinner loading-xs" />}
            {isEdit ? "Save" : "Create rule"}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <label className="flex flex-col w-full">
          <span className="text-xs font-medium mb-1">Name</span>
          <input
            className="input input-sm input-bordered w-full"
            value={form.name}
            maxLength={100}
            placeholder="e.g. Errors to on-call"
            onChange={(e) => set("name", e.target.value)}
          />
        </label>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Events</span>
            <label className="label cursor-pointer gap-2 py-0">
              <span className="text-xs">All events</span>
              <input
                type="checkbox"
                className="toggle toggle-xs"
                checked={form.allEvents}
                onChange={(e) => set("allEvents", e.target.checked)}
              />
            </label>
          </div>
          {!form.allEvents && (
            <CheckboxList
              options={catalogue.map((event) => ({
                value: event.event_type,
                label: event.label,
                hint: event.description,
              }))}
              selected={form.eventTypes}
              onToggle={(value) => set("eventTypes", toggleIn(form.eventTypes, value))}
              empty="Loading events…"
            />
          )}
        </div>

        {showLimit && (
          <div className="grid grid-cols-[minmax(0,1fr)_8rem] gap-2 items-end">
            <label className="flex flex-col">
              <span className="text-xs font-medium mb-1">Daily limit</span>
              <input
                type="number"
                min="0"
                className="input input-sm input-bordered w-full"
                value={form.limit}
                placeholder="e.g. 100"
                onChange={(e) => set("limit", e.target.value)}
              />
            </label>
            <select
              className="select select-sm select-bordered"
              value={form.limitMetric}
              onChange={(e) => set("limitMetric", e.target.value)}
              aria-label="Limit metric"
            >
              <option value="cost">Cost</option>
              <option value="tokens">Tokens</option>
              <option value="requests">Requests</option>
            </select>
          </div>
        )}

        <label className="flex flex-col w-full">
          <span className="text-xs font-medium mb-1">Minimum severity</span>
          <select
            className="select select-sm select-bordered w-full"
            value={form.minSeverity}
            onChange={(e) => set("minSeverity", e.target.value)}
          >
            <option value="info">Info and above (everything)</option>
            <option value="warning">Warning and above</option>
            <option value="critical">Critical only</option>
          </select>
        </label>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Agents</span>
            <label className="label cursor-pointer gap-2 py-0">
              <span className="text-xs">All agents</span>
              <input
                type="checkbox"
                className="toggle toggle-xs"
                checked={form.allAgents}
                onChange={(e) => set("allAgents", e.target.checked)}
              />
            </label>
          </div>
          {!form.allAgents && (
            <CheckboxList
              options={agents.map((agent) => ({ value: agent._id, label: agent.name }))}
              selected={form.agents}
              onToggle={(value) => set("agents", toggleIn(form.agents, value))}
              empty="No agents in this organization yet."
            />
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium">Send to</span>
          <CheckboxList
            options={channels.map((channel) => ({
              value: channel._id,
              label: channel.name,
              hint: channel.enabled ? channel.config?.url : "Disabled",
            }))}
            selected={form.channelIds}
            onToggle={(value) => set("channelIds", toggleIn(form.channelIds, value))}
            empty="No channels yet. Add one in the Channels tab first."
          />
        </div>

        <label className="flex flex-col w-full">
          <span className="text-xs font-medium mb-1">Repeat limit (seconds, optional)</span>
          <input
            type="number"
            min="0"
            max="86400"
            className="input input-sm input-bordered w-full"
            value={form.throttle}
            placeholder="Default: send every time for webhooks"
            onChange={(e) => set("throttle", e.target.value)}
          />
          <span className="text-xs text-base-content/50 mt-1">
            The same alert is sent at most once in this window, per channel.
          </span>
        </label>
      </div>
    </Modal>
  );
}

export default NotificationRuleModal;
