import React, { useEffect, useRef, useState } from "react";
import { Server } from "lucide-react";
import Modal from "../UI/Modal";
import McpSecretInput from "../configuration/configurationComponent/McpSecretInput";
import { MODAL_TYPE } from "@/utils/enums";
import { closeModal } from "@/utils/utility";

const MCP_MODAL_ID = MODAL_TYPE.MCP_SERVER_MODAL;
const HEADER_NAME_PATTERN = /^[A-Za-z0-9!#$%&'*+.^_`|~-]+$/;
const EMPTY_HEADER = { key: "", value: "" };

// An MCP server carries a single auth header. Reads it back into the modal's auth mode:
// "Authorization: Bearer ..." is shown as a bearer token, any other header as a custom header.
const authStateFromHeaders = (headers) => {
  const [entry] = Object.entries(headers || {});
  if (!entry) return { authType: "none", token: "", header: EMPTY_HEADER };
  const [key, value] = entry;
  if (key.toLowerCase() === "authorization" && /^bearer\s+/i.test(value || "")) {
    return { authType: "bearer", token: value.replace(/^bearer\s+/i, ""), header: EMPTY_HEADER };
  }
  return { authType: "custom", token: "", header: { key, value: value ?? "" } };
};

const McpServerModal = ({ initialData, isEditing, onSave, isSaving = false }) => {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [authType, setAuthType] = useState("none");
  const [token, setToken] = useState("");
  const [header, setHeader] = useState(EMPTY_HEADER);

  const initialDataRef = useRef(initialData);
  initialDataRef.current = initialData;

  useEffect(() => {
    const dialog = document.getElementById(MCP_MODAL_ID);
    if (!dialog) return;

    const syncFromInitialData = () => {
      setName(initialDataRef.current?.name || "");
      setUrl(initialDataRef.current?.url || "");
      const authState = authStateFromHeaders(initialDataRef.current?.headers);
      setAuthType(authState.authType);
      setToken(authState.token);
      setHeader(authState.header);
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
    setAuthType("none");
    setToken("");
    setHeader(EMPTY_HEADER);
    setError("");
  };

  const updateHeader = (field, value) => {
    setHeader((prev) => ({ ...prev, [field]: value }));
    if (error) setError("");
  };

  // Returns { headers } or { error } for the selected auth mode.
  const buildHeaders = () => {
    if (authType === "bearer") {
      const trimmedToken = token.trim();
      if (!trimmedToken) return { error: "Enter a bearer token or choose No auth." };
      return { headers: { Authorization: `Bearer ${trimmedToken}` } };
    }
    if (authType === "custom") {
      const key = header.key.trim();
      const value = header.value.trim();
      if (!key || !value) return { error: "Enter both a header name and a value, or choose No auth." };
      if (!HEADER_NAME_PATTERN.test(key)) return { error: `"${key}" is not a valid header name.` };
      return { headers: { [key]: value } };
    }
    return { headers: {} };
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
    const { headers, error: headerError } = buildHeaders();
    if (headerError) {
      setError(headerError);
      return;
    }
    setError("");
    const server = { name: trimmedName.replace(/ /g, "_"), url: trimmedUrl };
    if (Object.keys(headers).length) server.headers = headers;
    await onSave(server);
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
        <div className="form-control">
          <label htmlFor="mcp-server-modal-auth-type" className="label !px-0">
            <span className="text-sm font-medium">Authentication</span>
          </label>
          <select
            id="mcp-server-modal-auth-type"
            data-testid="mcp-server-modal-auth-type"
            className="select select-sm w-full"
            value={authType}
            onChange={(e) => {
              setAuthType(e.target.value);
              if (error) setError("");
            }}
            disabled={isSaving}
          >
            <option value="none">No auth</option>
            <option value="bearer">Bearer token</option>
            <option value="custom">Custom header</option>
          </select>
        </div>
        {authType === "bearer" && (
          <div className="form-control">
            <label htmlFor="mcp-server-modal-token" className="label !px-0">
              <span className="text-sm font-medium">Token</span>
            </label>
            <McpSecretInput
              id="mcp-server-modal-token"
              data-testid="mcp-server-modal-token"
              placeholder="Token"
              className="w-full"
              value={token}
              onChange={(e) => {
                setToken(e.target.value);
                if (error) setError("");
              }}
              disabled={isSaving}
            />
            <p className="text-xs text-base-content/60 mt-1">
              Sent as <code>Authorization: Bearer &lt;token&gt;</code>.
            </p>
          </div>
        )}
        {authType === "custom" && (
          <div className="flex items-center gap-2" data-testid="mcp-server-modal-header">
            <input
              autoComplete="off"
              data-testid="mcp-server-modal-header-key"
              type="text"
              placeholder="Header name, e.g. X-Api-Key"
              className="input input-sm flex-1 min-w-0 focus:ring-1 ring-primary/40"
              value={header.key}
              onChange={(e) => updateHeader("key", e.target.value)}
              disabled={isSaving}
            />
            <McpSecretInput
              data-testid="mcp-server-modal-header-value"
              placeholder="Value"
              className="flex-1 min-w-0"
              value={header.value}
              onChange={(e) => updateHeader("value", e.target.value)}
              disabled={isSaving}
            />
          </div>
        )}
        <p className="text-xs text-base-content/60" data-testid="mcp-server-modal-runtime-auth-hint">
          To send a different token per user, pass it with each request as{" "}
          <code>{`"mcp_auth": { "${name.trim().replace(/ /g, "_") || "server_name"}": "<token>" }`}</code>. It replaces
          the auth set here.
        </p>
        {error && <p className="text-xs text-error">{error}</p>}
      </div>
    </Modal>
  );
};

export default McpServerModal;
