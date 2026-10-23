import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

// Masks an MCP auth value like a password, with a toggle to show it.
const McpSecretInput = ({ value, onChange, className = "", disabled, ...inputProps }) => {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className={`relative ${className}`}>
      <input
        autoComplete="off"
        {...inputProps}
        type={revealed ? "text" : "password"}
        className="input input-sm w-full pr-8 focus:ring-1 ring-primary/40"
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
      {value && (
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-base-content/50 hover:text-base-content"
          onClick={() => setRevealed((prev) => !prev)}
          title={revealed ? "Hide value" : "Show value"}
          aria-label={revealed ? "Hide value" : "Show value"}
          tabIndex={-1}
        >
          {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      )}
    </div>
  );
};

export default McpSecretInput;
