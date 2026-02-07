import { CheckCircleIcon, CopyIcon } from "@/components/Icons";
import React, { useState } from "react";

const CopyButton = ({ data, btnStyle = "text-base-100" }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboardSendData = () => {
    // Your clipboard copy logic here
    navigator.clipboard.writeText(data || "");

    // Show the copied message
    setCopied(true);

    // Hide the copied message after 2 seconds
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <div id="copy-button-container" className="absolute  right-5 top-5">
      {copied ? (
        <span className="text-sm text-success flex flex-row items-center gap-2 t">
          <CheckCircleIcon size={14} />
          Copied!
        </span>
      ) : (
        <button
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
