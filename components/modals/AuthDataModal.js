import React, { useState } from "react";
import Modal from "../UI/Modal";
import { MODAL_TYPE } from "@/utils/enums";
import { closeModal } from "@/utils/utility";
import { CheckIcon, CopyIcon, ExternalLinkIcon, GlobeIcon, KeyIcon, ShieldIcon } from "../Icons";
import { Lock } from "lucide-react";

const AuthDataModal = ({ data }) => {
  const [copiedField, setCopiedField] = useState("");

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(""), 2000);
  };

  const footerContent = (
    <button
      data-testid="auth-data-close-button"
      id="auth-data-close-button"
      onClick={() => {
        closeModal(MODAL_TYPE?.AUTH_DATA_MODAL);
      }}
      className="btn btn-sm"
    >
      Close
    </button>
  );

  return (
    <Modal
      MODAL_ID={MODAL_TYPE?.AUTH_DATA_MODAL}
      onClose={() => closeModal(MODAL_TYPE.AUTH_DATA_MODAL)}
      title="Authentication Details"
      description="View OAuth configuration details"
      icon={<Lock size={16} className="text-trace-gold" />}
      widthClass="w-[min(42rem,92vw)]"
      footer={footerContent}
    >
      {/* Content */}
      <div className="space-y-6 mt-2">
        {/* Route Name */}
        <div className="form-control">
          <label className="label">
            <span className="flex items-center space-x-2">
              <ShieldIcon className="h-4 w-4 text-base-content/50" />
              <span>Route Name</span>
            </span>
          </label>
          <div className="join w-full">
            <input
              autoComplete="off"
              data-testid="auth-data-route-name-input"
              id="auth-data-route-name-input"
              type="text"
              value={data?.name || ""}
              readOnly
              className="input join-item flex-1 bg-base-200"
            />
            <button
              data-testid="auth-data-copy-route-name-button"
              id="auth-data-copy-route-name-button"
              onClick={() => copyToClipboard(data?.name || "", "name")}
              className="btn btn-primary text-white hover:bg-primary-focus join-item"
            >
              {copiedField === "name" ? (
                <CheckIcon className="h-4 w-4 text-success" />
              ) : (
                <CopyIcon className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Client ID */}
        <div className="form-control">
          <label className="label">
            <span className="flex items-center space-x-2">
              <KeyIcon className="h-4 w-4 text-base-content/50" />
              <span>Client ID</span>
            </span>
          </label>
          <div className="join w-full">
            <input
              autoComplete="off"
              data-testid="auth-data-client-id-input"
              id="auth-data-client-id-input"
              type="text"
              value={data?.client_id || ""}
              readOnly
              className="input join-item flex-1 bg-base-200 font-mono text-sm"
            />
            <button
              data-testid="auth-data-copy-client-id-button"
              id="auth-data-copy-client-id-button"
              onClick={() => copyToClipboard(data?.client_id || "", "client_id")}
              className="btn btn-primary text-white hover:bg-primary-focus join-item"
            >
              {copiedField === "client_id" ? (
                <CheckIcon className="h-4 w-4 text-success" />
              ) : (
                <CopyIcon className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Redirection URL */}
        <div className="form-control">
          <label className="label">
            <span className="flex items-center space-x-2">
              <GlobeIcon className="h-4 w-4 text-base-content/50" />
              <span>Redirection URL</span>
            </span>
          </label>
          <div className="join w-full">
            <input
              autoComplete="off"
              data-testid="auth-data-redirection-url-input"
              id="auth-data-redirection-url-input"
              type="text"
              value={data?.redirection_url || ""}
              readOnly
              className="input join-item flex-1 bg-base-200"
            />
            <button
              data-testid="auth-data-copy-redirection-url-button"
              id="auth-data-copy-redirection-url-button"
              onClick={() => copyToClipboard(data?.redirection_url || "", "redirection_url")}
              className="btn btn-primary text-white hover:bg-primary-focus join-item"
            >
              {copiedField === "redirection_url" ? (
                <CheckIcon className="h-4 w-4 text-success" />
              ) : (
                <CopyIcon className="h-4 w-4" />
              )}
            </button>
            {data?.redirection_url && (
              <a
                data-testid="auth-data-open-redirection-url-link"
                id="auth-data-open-redirection-url-link"
                href={data.redirection_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary text-white hover:bg-primary-focus join-item"
              >
                <ExternalLinkIcon className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default AuthDataModal;
