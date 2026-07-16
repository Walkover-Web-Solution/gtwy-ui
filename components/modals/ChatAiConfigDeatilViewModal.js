import { MODAL_TYPE } from "@/utils/enums";
import { closeModal } from "@/utils/utility";
import { CopyIcon } from "@/components/Icons";
import React, { useMemo, useState } from "react";
import Modal from "../UI/Modal";
import CodeBlock from "@/components/codeBlock/CodeBlock";
import { SlidersHorizontal, Brain } from "lucide-react";

// ---------------------------------------------------------------------------
// Helpers (used by the generic fallback modal path)
// ---------------------------------------------------------------------------

const flattenMessage = (message) => {
  if (typeof message !== "object" || message === null) {
    return { message };
  }
  const result = {};
  const flatten = (obj, parentKey = "") => {
    Object.keys(obj).forEach((key) => {
      const newKey = parentKey ? `${parentKey}.${key}` : key;
      if (typeof obj[key] === "object" && obj[key] !== null) {
        flatten(obj[key], newKey);
      } else {
        result[newKey] = obj[key];
      }
    });
  };
  flatten(message);
  return result;
};

const formatValue = (value) => {
  if (typeof value === "string" && value.startsWith("**") && value.includes("\n")) {
    return value.split("\n").map((line, index) => (
      <p key={index} className={line.startsWith("**") ? "font-bold" : ""}>
        {line}
      </p>
    ));
  }
  return String(value);
};

const renderFlattenedMessage = (message) => {
  const flattened = flattenMessage(message);
  return Object.entries(flattened).map(([key, value]) => (
    <div key={key} className="mb-2 last:mb-0">
      <span className="font-medium">{key}:</span> {formatValue(value)}
    </div>
  ));
};

// ---------------------------------------------------------------------------
// JsonSection — one collapsible code block
// ---------------------------------------------------------------------------

function JsonSection({ label, data, count, fullHeight = false }) {
  const jsonString = useMemo(() => JSON.stringify(data, null, 2), [data]);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="overflow-hidden rounded-lg border border-base-content/10">
      <div
        className="flex items-center justify-between gap-2 border-b border-base-content/10 px-3 py-2"
        style={{ background: "var(--ai-config-section-header)" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-base-content">{label}</span>
          {count != null && (
            <span className="rounded-full bg-trace-gold/90 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {count}
            </span>
          )}
        </div>
        <button
          type="button"
          data-testid="ai-config-section-copy-button"
          onClick={handleCopy}
          className="btn btn-ghost btn-xs text-[10px] px-2 py-0.5 h-auto min-h-0 font-medium text-base-content/75 hover:bg-base-content/10 flex items-center gap-1"
        >
          <CopyIcon size={11} />
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <div
        className={`${fullHeight ? "h-auto" : "max-h-64"} overflow-auto`}
        style={{ background: "var(--ai-config-section-bg)" }}
      >
        <CodeBlock plain className="language-json">
          {jsonString}
        </CodeBlock>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// AiConfigPanel — fully dynamic: scalars → Parameters, arrays/objects → own section
// ---------------------------------------------------------------------------

// Keys that should always get their own section regardless of type
const SECTION_KEYS = new Set(["input", "messages", "tools", "functions"]);

function AiConfigPanel({ config }) {
  if (!config || typeof config !== "object") return null;

  const sections = [];
  const parameters = {};

  Object.entries(config).forEach(([key, value]) => {
    if (SECTION_KEYS.has(key) || Array.isArray(value) || (typeof value === "object" && value !== null)) {
      const label = key.replace(/_/g, " ");
      const count = Array.isArray(value) ? value.length : null;
      sections.push({ key, label, data: value, count });
    } else {
      parameters[key] = value;
    }
  });

  return (
    <div className="flex flex-col gap-4">
      {Object.keys(parameters).length > 0 && <JsonSection label="Parameters" data={parameters} />}
      {sections.map(({ key, label, data, count }) => (
        <JsonSection key={key} label={label} data={data} count={count} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main modal component
// ---------------------------------------------------------------------------

const ChatAiConfigDeatilViewModal = ({ modalContent, modalTitle }) => {
  const [copied, setCopied] = useState(false);

  const isLatencyView = modalTitle === "Latency Details" || modalTitle === "Latency";

  const isMemoryView = modalTitle === "Memory";

  const isAiConfigView =
    modalTitle === "AI Configuration" ||
    (modalContent &&
      typeof modalContent === "object" &&
      !Array.isArray(modalContent) &&
      (modalContent.input || modalContent.messages || modalContent.tools || modalContent.functions));

  const isPrimitiveContent =
    typeof modalContent === "string" || typeof modalContent === "number" || typeof modalContent === "boolean";

  const copyData = typeof modalContent === "string" ? modalContent : JSON.stringify(modalContent, null, 2);

  const contentEntries = isPrimitiveContent ? [["Prompt", modalContent]] : Object.entries(modalContent || {});

  const handleCopy = (data) => {
    navigator.clipboard.writeText(data || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Latency view ────────────────────────────────────────────────────────
  if (isLatencyView) {
    return (
      <Modal
        MODAL_ID={MODAL_TYPE.CHAT_DETAILS_VIEW_MODAL}
        onClose={() => closeModal(MODAL_TYPE.CHAT_DETAILS_VIEW_MODAL)}
        title={modalTitle || "Latency Details"}
        icon={<SlidersHorizontal size={16} className="text-trace-gold" />}
        widthClass="w-[min(720px,92vw)]"
      >
        <JsonSection label="Latency" data={modalContent} fullHeight={true} />
      </Modal>
    );
  }

  // ── Memory view ─────────────────────────────────────────────────────────
  if (isMemoryView) {
    return (
      <Modal
        MODAL_ID={MODAL_TYPE.CHAT_DETAILS_VIEW_MODAL}
        onClose={() => closeModal(MODAL_TYPE.CHAT_DETAILS_VIEW_MODAL)}
        title={modalTitle || "Memory"}
        icon={<Brain size={16} className="text-trace-gold" />}
        widthClass="w-[min(720px,92vw)]"
      >
        <AiConfigPanel config={modalContent} />
      </Modal>
    );
  }

  // ── AI Config view ──────────────────────────────────────────────────────
  if (isAiConfigView) {
    return (
      <Modal
        MODAL_ID={MODAL_TYPE.CHAT_DETAILS_VIEW_MODAL}
        onClose={() => closeModal(MODAL_TYPE.CHAT_DETAILS_VIEW_MODAL)}
        title={modalTitle || "AI Configuration"}
        icon={<SlidersHorizontal size={16} className="text-trace-gold" />}
        widthClass="w-[min(720px,92vw)]"
      >
        <AiConfigPanel config={modalContent} />
      </Modal>
    );
  }

  const footerContent = (
    <div className="flex gap-2 justify-end w-full">
      <button
        type="button"
        data-testid="chat-details-copy-button"
        onClick={() => handleCopy(copyData)}
        className="btn btn-sm btn-ghost text-warning gap-1 flex items-center"
      >
        <CopyIcon size={14} />
        {copied ? "Copied!" : "Copy"}
      </button>
      <button
        data-testid="chat-details-close-button"
        id="chat-details-close-button"
        className="btn btn-sm"
        onClick={() => closeModal(MODAL_TYPE.CHAT_DETAILS_VIEW_MODAL)}
      >
        Close
      </button>
    </div>
  );

  // ── Generic fallback view ───────────────────────────────────────────────
  return (
    <Modal
      MODAL_ID={MODAL_TYPE.CHAT_DETAILS_VIEW_MODAL}
      onClose={() => closeModal(MODAL_TYPE.CHAT_DETAILS_VIEW_MODAL)}
      title={modalTitle || "Detailed View"}
      icon={<SlidersHorizontal size={16} className="text-trace-gold" />}
      widthClass="w-[min(1152px,92vw)]"
      footer={footerContent}
    >
      <div
        data-testid="chat-details-content-container"
        id="chat-details-content-container"
        className="bg-base-200 rounded-lg p-6 h-auto overflow-auto relative"
      >
        {modalContent &&
          contentEntries.map(([key, value]) => (
            <div key={key} className="mb-6 last:mb-0">
              <h4 className="text-lg font-semibold mb-2">{key}</h4>
              {Array.isArray(value) ? (
                <ul className="space-y-2 ml-4">
                  {value.map((item, index) => (
                    <li key={index} className="break-words">
                      <div className="bg-base-100 p-4 rounded-lg shadow-inner break-words whitespace-pre-wrap relative">
                        {typeof item === "object" && item !== null && key === "messages" ? (
                          renderFlattenedMessage(item)
                        ) : (
                          <span className="text-base-content/80">
                            {typeof item === "object" && item !== null ? JSON.stringify(item, null, 2) : String(item)}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="bg-base-100 p-4 rounded-lg shadow-inner relative">
                  {typeof value === "object" && value !== null ? (
                    <pre className="text-base-content/80 break-words whitespace-pre-wrap">
                      {JSON.stringify(value, null, 2)}
                    </pre>
                  ) : (
                    <pre className="text-base-content/80 break-words whitespace-pre-wrap">
                      {formatValue(String(value))}
                    </pre>
                  )}
                </div>
              )}
            </div>
          ))}
      </div>
    </Modal>
  );
};

export default ChatAiConfigDeatilViewModal;
