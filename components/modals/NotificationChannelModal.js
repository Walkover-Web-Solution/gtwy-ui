"use client";
import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { Plus, Trash2, Webhook } from "lucide-react";
import toast from "react-hot-toast";
import Modal from "@/components/UI/Modal";
import { MODAL_TYPE } from "@/utils/enums";
import { closeModal, validateUrl } from "@/utils/utility";
import { saveNotificationChannelAction } from "@/store/action/notificationAction";

const emptyHeader = () => ({ key: "", value: "" });

// Create or edit a webhook channel. On edit, stored header values are never sent back to the
// browser: leaving the headers empty keeps the saved ones, entering any replaces them all.
function NotificationChannelModal({ channel }) {
  const dispatch = useDispatch();
  const isEdit = Boolean(channel?._id);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [headers, setHeaders] = useState([emptyHeader()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(channel?.name || "");
    setUrl(channel?.config?.url || "");
    setHeaders([emptyHeader()]);
  }, [channel]);

  const handleClose = () => closeModal(MODAL_TYPE.NOTIFICATION_CHANNEL_MODAL);

  const updateHeader = (index, field, value) =>
    setHeaders((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));

  const handleSave = async () => {
    if (!name.trim()) return toast.error("Give the channel a name");
    if (!validateUrl(url)) return toast.error("Enter a valid http(s) URL");

    const filledHeaders = headers.filter((row) => row.key.trim());
    const config = { url: url.trim() };
    if (filledHeaders.length) {
      config.headers = Object.fromEntries(filledHeaders.map((row) => [row.key.trim(), row.value]));
    }

    setSaving(true);
    const saved = await dispatch(
      saveNotificationChannelAction(
        channel?._id,
        isEdit ? { name: name.trim(), config } : { kind: "webhook", name: name.trim(), config }
      )
    );
    setSaving(false);
    if (saved) handleClose();
  };

  const savedHeaderNames = Object.keys(channel?.config?.headers || {});

  return (
    <Modal
      MODAL_ID={MODAL_TYPE.NOTIFICATION_CHANNEL_MODAL}
      onClose={handleClose}
      title={isEdit ? "Edit webhook channel" : "Add webhook channel"}
      description="Notifications are POSTed to this URL as JSON."
      icon={<Webhook size={16} className="text-primary" />}
      widthClass="w-[min(520px,92vw)]"
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
            data-testid="notification-channel-save"
          >
            {saving && <span className="loading loading-spinner loading-xs" />}
            {isEdit ? "Save" : "Add channel"}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <label className="flex flex-col w-full">
          <span className="text-xs font-medium mb-1">Name</span>
          <input
            className="input input-sm input-bordered w-full"
            value={name}
            maxLength={100}
            placeholder="e.g. Ops alerts"
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="flex flex-col w-full">
          <span className="text-xs font-medium mb-1">Webhook URL</span>
          <input
            className="input input-sm input-bordered w-full"
            value={url}
            placeholder="https://"
            onChange={(e) => setUrl(e.target.value)}
          />
        </label>
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium">Headers (optional)</span>
          {isEdit && savedHeaderNames.length > 0 && (
            <p className="text-xs text-base-content/60">
              Saved: {savedHeaderNames.join(", ")}. Leave these fields empty to keep them, or enter new headers to
              replace them.
            </p>
          )}
          {headers.map((row, index) => (
            <div key={index} className="flex gap-2">
              <input
                className="input input-sm input-bordered flex-1 min-w-0"
                placeholder="Header"
                value={row.key}
                onChange={(e) => updateHeader(index, "key", e.target.value)}
              />
              <input
                className="input input-sm input-bordered flex-1 min-w-0"
                placeholder="Value"
                type="password"
                autoComplete="off"
                value={row.value}
                onChange={(e) => updateHeader(index, "value", e.target.value)}
              />
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-square"
                aria-label="Remove header"
                onClick={() =>
                  setHeaders((rows) => (rows.length === 1 ? [emptyHeader()] : rows.filter((_, i) => i !== index)))
                }
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-ghost btn-xs w-fit gap-1"
            onClick={() => setHeaders((rows) => [...rows, emptyHeader()])}
          >
            <Plus size={12} />
            Add header
          </button>
        </div>
        <p className="text-xs text-base-content/50">Email and Slack channels are coming soon.</p>
      </div>
    </Modal>
  );
}

export default NotificationChannelModal;
