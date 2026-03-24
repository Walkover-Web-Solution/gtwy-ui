import { CheckCircleIcon, CopyIcon } from "@/components/Icons";
import React, { useState } from "react";

const CopyButton = ({ data, btnStyle = "text-base-100", onCopy = null }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboardSendData = () => {
    navigator.clipboard.writeText(data || "");

    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);

    if (onCopy) {
      onCopy();
    }
  };

  return (
    <div data-testid="copy-button-container" id="copy-button-container" className="absolute  right-5 top-5">
      {copied ? (
        <span className="text-sm text-success flex flex-row items-center gap-2 t">
          <CheckCircleIcon size={14} />
          Copied!
        </span>
      ) : (
        <button
          data-testid="copy-button"
          id="copy-button"
          onClick={copyToClipboardSendData}
          className={`${btnStyle} flex flex-row items-center gap-2 text-warning`}
        >
          <CopyIcon size={14} />
          Copy
        </button>
      )}
    </div>
  );
};

export default CopyButton;
