import React, { useState } from "react";
import Modal from "../UI/Modal";
import { MODAL_TYPE } from "@/utils/enums";
import { closeModal } from "@/utils/utility";
import { CheckIcon, CloseIcon, CopyIcon, ExternalLinkIcon, GlobeIcon, KeyIcon, ShieldIcon } from "../Icons";

const AuthDataModal = ({ data }) => {
  const [copiedField, setCopiedField] = useState("");

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(""), 2000);
  };

  return (
    <Modal MODAL_ID={MODAL_TYPE?.AUTH_DATA_MODAL} onClose={() => closeModal(MODAL_TYPE.AUTH_DATA_MODAL)}>
      <div id="auth-data-modal-container" className="modal-box max-w-2xl w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ShieldIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Authentication Details</h2>
              <p className="text-sm text-base-content/70">View OAuth configuration details</p>
            </div>
          </div>
          <button
            id="auth-data-close-x-button"
            className="btn btn-sm btn-circle btn-ghost"
            onClick={() => {
              closeModal(MODAL_TYPE?.AUTH_DATA_MODAL);
            }}
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Route Name */}
          <div className="form-control">
            <label className="label">
              <span className="label-text flex items-center space-x-2">
                <ShieldIcon className="h-4 w-4 text-base-content/50" />
                <span>Route Name</span>
              </span>
            </label>
            <div className="join w-full">
              <input
                id="auth-data-route-name-input"
                type="text"
                value={data?.name || ""}
                readOnly
                className="input input-bordered join-item flex-1 bg-base-200"
              />
              <button
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
              <span className="label-text flex items-center space-x-2">
                <KeyIcon className="h-4 w-4 text-base-content/50" />
                <span>Client ID</span>
              </span>
            </label>
            <div className="join w-full">
              <input
                id="auth-data-client-id-input"
                type="text"
                value={data?.client_id || ""}
                readOnly
                className="input input-bordered join-item flex-1 bg-base-200 font-mono text-sm"
              />
              <button
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
              <span className="label-text flex items-center space-x-2">
                <GlobeIcon className="h-4 w-4 text-base-content/50" />
                <span>Redirection URL</span>
              </span>
            </label>
            <div className="join w-full">
              <input
                id="auth-data-redirection-url-input"
                type="text"
                value={data?.redirection_url || ""}
                readOnly
                className="input input-bordered join-item flex-1 bg-base-200"
              />
              <button
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

        {/* Footer */}
        <div className="modal-action">
          <button
            id="auth-data-close-button"
            onClick={() => {
              closeModal(MODAL_TYPE?.AUTH_DATA_MODAL);
            }}
            className="btn btn-sm"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AuthDataModal;
