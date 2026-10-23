import React, { useEffect, useRef, useState } from "react";
import { Plus, Server, Trash2 } from "lucide-react";
import Modal from "../UI/Modal";
import { MODAL_TYPE } from "@/utils/enums";
import { closeModal } from "@/utils/utility";

const MCP_MODAL_ID = MODAL_TYPE.MCP_SERVER_MODAL;
const HEADER_NAME_PATTERN = /^[A-Za-z0-9!#$%&'*+.^_`|~-]+$/;
const EMPTY_HEADER_ROW = { key: "", value: "" };

// Reads saved headers back into the modal's auth mode: a lone
// "Authorization: Bearer ..." is shown as a bearer token, anything else as custom headers.
const authStateFromHeaders = (headers) => {
  const entries = Object.entries(headers || {});
  if (!entries.length) return { authType: "none", token: "", headerRows: [EMPTY_HEADER_ROW] };
  const [key, value] = entries[0];
  if (entries.length === 1 && key.toLowerCase() === "authorization" && /^bearer\s+/i.test(value || "")) {
    return { authType: "bearer", token: value.replace(/^bearer\s+/i, ""), headerRows: [EMPTY_HEADER_ROW] };
  }
  return { authType: "custom", token: "", headerRows: entries.map(([k, v]) => ({ key: k, value: v ?? "" })) };
};

const McpServerModal = ({ initialData, isEditing, onSave, isSaving = false }) => {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [authType, setAuthType] = useState("none");
  const [token, setToken] = useState("");
  const [headerRows, setHeaderRows] = useState([EMPTY_HEADER_ROW]);

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
      setHeaderRows(authState.headerRows);
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
    setHeaderRows([EMPTY_HEADER_ROW]);
    setError("");
  };

  const updateHeaderRow = (index, field, value) => {
    setHeaderRows((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
    if (error) setError("");
  };

  const removeHeaderRow = (index) => {
    setHeaderRows((rows) => (rows.length > 1 ? rows.filter((_, i) => i !== index) : [EMPTY_HEADER_ROW]));
  };

  // Returns { headers } or { error } for the selected auth mode.
  const buildHeaders = () => {
    if (authType === "bearer") {
      const trimmedToken = token.trim();
      if (!trimmedToken) return { error: "Enter a bearer token or choose No auth." };
      return { headers: { Authorization: `Bearer ${trimmedToken}` } };
    }
    if (authType === "custom") {
      const headers = {};
      for (const row of headerRows) {
        const key = row.key.trim();
        const value = row.value.trim();
        if (!key && !value) continue;
        if (!key || !value) return { error: "Each header needs both a name and a value." };
        if (!HEADER_NAME_PATTERN.test(key)) return { error: `"${key}" is not a valid header name.` };
        headers[key] = value;
      }
      if (!Object.keys(headers).length) return { error: "Add at least one header or choose No auth." };
      return { headers };
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
            <option value="custom">Custom headers</option>
          </select>
        </div>
        {authType === "bearer" && (
          <div className="form-control">
            <label htmlFor="mcp-server-modal-token" className="label !px-0">
              <span className="text-sm font-medium">Token</span>
            </label>
            <input
              autoComplete="off"
              id="mcp-server-modal-token"
              data-testid="mcp-server-modal-token"
              type="password"
              placeholder="sk-... or {{mcp_token}}"
              className="input input-sm w-full focus:ring-1 ring-primary/40"
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
          <div className="flex flex-col gap-2" data-testid="mcp-server-modal-headers">
            {headerRows.map((row, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  autoComplete="off"
                  data-testid={`mcp-server-modal-header-key-${index}`}
                  type="text"
                  placeholder="Header name"
                  className="input input-sm flex-1 min-w-0 focus:ring-1 ring-primary/40"
                  value={row.key}
                  onChange={(e) => updateHeaderRow(index, "key", e.target.value)}
                  disabled={isSaving}
                />
                <input
                  autoComplete="off"
                  data-testid={`mcp-server-modal-header-value-${index}`}
                  type="password"
                  placeholder="Value or {{variable}}"
                  className="input input-sm flex-1 min-w-0 focus:ring-1 ring-primary/40"
                  value={row.value}
                  onChange={(e) => updateHeaderRow(index, "value", e.target.value)}
                  disabled={isSaving}
                />
                <button
                  type="button"
                  data-testid={`mcp-server-modal-header-remove-${index}`}
                  className="btn btn-ghost btn-sm p-1 hover:bg-red-100 hover:text-error"
                  onClick={() => removeHeaderRow(index)}
                  disabled={isSaving}
                  title="Remove header"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button
              type="button"
              data-testid="mcp-server-modal-header-add"
              className="btn btn-ghost btn-xs self-start gap-1"
              onClick={() => setHeaderRows((rows) => [...rows, EMPTY_HEADER_ROW])}
              disabled={isSaving}
            >
              <Plus size={12} />
              Add header
            </button>
          </div>
        )}
        {authType !== "none" && (
          <p className="text-xs text-base-content/60">
            Use <code>{"{{variable_name}}"}</code> to pass the value per request through <code>variables</code>, so each
            caller can send its own token.
          </p>
        )}
        {error && <p className="text-xs text-error">{error}</p>}
      </div>
    </Modal>
  );
};

export default McpServerModal;
