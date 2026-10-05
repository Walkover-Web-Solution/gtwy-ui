import React, { useEffect, useRef, useState } from "react";
import { Server } from "lucide-react";
import Modal from "../UI/Modal";
import { MODAL_TYPE } from "@/utils/enums";
import { closeModal } from "@/utils/utility";

const MCP_MODAL_ID = MODAL_TYPE.MCP_SERVER_MODAL;

const McpServerModal = ({ initialData, isEditing, onSave, isSaving = false }) => {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const initialDataRef = useRef(initialData);
  initialDataRef.current = initialData;

  useEffect(() => {
    const dialog = document.getElementById(MCP_MODAL_ID);
    if (!dialog) return;

    const syncFromInitialData = () => {
      setName(initialDataRef.current?.name || "");
      setUrl(initialDataRef.current?.url || "");
      setError("");
    };

    if (dialog.hasAttribute("open")) syncFromInitialData();

    const observer = new MutationObserver(() => {
      if (dialog.hasAttribute("open")) syncFromInitialData();
    });
    observer.observe(dialog, { attributes: true, attributeFilter: ["open"] });

    return () => observer.disconnect();
  }, []);

  const resetForm = () => {
    setName("");
    setUrl("");
    setError("");
  };

  const handleClose = () => {
    if (isSaving) return;
    resetForm();
    closeModal(MCP_MODAL_ID);
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    const trimmedUrl = url.trim();
    if (!trimmedName || !trimmedUrl) {
      setError("Both name and server URL are required.");
      return;
    }
    try {
      new URL(trimmedUrl);
    } catch {
      setError("Enter a valid server URL.");
      return;
    }
    setError("");
    await onSave({ name: trimmedName.replace(/ /g, "_"), url: trimmedUrl });
    resetForm();
  };

  const footerContent = (
    <div className="flex gap-2 justify-end">
      <button
        data-testid="mcp-server-modal-cancel-button"
        id="mcp-server-modal-cancel-button"
        type="button"
        className="btn btn-sm"
        onClick={handleClose}
        disabled={isSaving}
      >
        Cancel
      </button>
      <button
        data-testid="mcp-server-modal-save-button"
        id="mcp-server-modal-save-button"
        type="button"
        className="btn btn-sm btn-primary"
        onClick={handleSave}
        disabled={isSaving || !name.trim() || !url.trim()}
      >
        {isSaving && <span className="loading loading-spinner loading-xs" />}
        {isEditing ? "Save changes" : "Add MCP server"}
      </button>
    </div>
  );

  return (
    <Modal
      MODAL_ID={MCP_MODAL_ID}
      onClose={handleClose}
      title={isEditing ? "Edit MCP Server" : "Add MCP Server"}
      description="Connect an MCP server so this agent can use its tools at runtime."
      icon={<Server size={16} className="text-trace-gold" />}
      widthClass="w-[min(480px,92vw)]"
      footer={footerContent}
    >
      <div data-testid="mcp-server-modal-container" id="mcp-server-modal-container" className="flex flex-col gap-4">
        <div className="form-control">
          <label htmlFor="mcp-server-modal-name" className="label !px-0">
            <span className="text-sm font-medium">Name</span>
          </label>
          <input
            autoComplete="off"
            autoFocus
            id="mcp-server-modal-name"
            data-testid="mcp-server-modal-name"
            type="text"
            placeholder="my-mcp"
            className="input input-sm w-full focus:ring-1 ring-primary/40"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError("");
            }}
            disabled={isSaving}
          />
        </div>
        <div className="form-control">
          <label htmlFor="mcp-server-modal-url" className="label !px-0">
            <span className="text-sm font-medium">Server URL</span>
          </label>
          <input
            autoComplete="off"
            id="mcp-server-modal-url"
            data-testid="mcp-server-modal-url"
            type="url"
            placeholder="https://mcp.example.com/..."
            className="input input-sm w-full focus:ring-1 ring-primary/40"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (error) setError("");
            }}
            disabled={isSaving}
          />
        </div>
        {error && <p className="text-xs text-error">{error}</p>}
      </div>
    </Modal>
  );
};

export default McpServerModal;
