import React, { useCallback, useEffect, useRef, useState } from "react";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import js from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";
import jsx from "react-syntax-highlighter/dist/esm/languages/prism/jsx";
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import css from "react-syntax-highlighter/dist/esm/languages/prism/css";
import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

SyntaxHighlighter.registerLanguage("javascript", js);
SyntaxHighlighter.registerLanguage("jsx", jsx);
SyntaxHighlighter.registerLanguage("json", json);
SyntaxHighlighter.registerLanguage("typescript", typescript);
SyntaxHighlighter.registerLanguage("python", python);
SyntaxHighlighter.registerLanguage("css", css);
SyntaxHighlighter.registerLanguage("bash", bash);
SyntaxHighlighter.registerLanguage("shell", bash);

function CodeBlock({ inline, className, children, ...props }) {
  const match = /language-(\w+)/.exec(className || "");
  const [copyStatus, setCopyStatus] = useState("Copy");
  const resetTimerRef = useRef(null);
  const codeString = String(children).replace(/\n$/, "");

  // DaisyUI / Tailwind based container classes
  const blockClasses = `text-sm w-full rounded-lg border border-base-300 bg-base-200 text-base-content overflow-hidden`;

  const languageMap = {
    js: "JavaScript",
    javascript: "JavaScript",
    jsx: "JSX",
    ts: "TypeScript",
    tsx: "TSX",
    typescript: "TypeScript",
    py: "Python",
    python: "Python",
    json: "JSON",
    css: "CSS",
    bash: "Bash",
    shell: "Shell",
  };

  const languageLabel = match
    ? languageMap[match[1]?.toLowerCase()] || match[1]?.replace(/^\w/, (s) => s.toUpperCase())
    : "";

  const handleCopy = useCallback(async () => {
    const fallbackCopy = (text) => {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        document.execCommand("copy");
        setCopyStatus("Copied!");
      } catch {
        setCopyStatus("Failed");
      } finally {
        document.body.removeChild(textarea);
      }
    };

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(codeString);
        setCopyStatus("Copied!");
      } else {
        fallbackCopy(codeString);
      }
    } catch {
      setCopyStatus("Failed");
    }

    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => setCopyStatus("Copy"), 2000);
  }, [codeString]);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  return !inline && match ? (
    <div id="code-block-container" className={blockClasses}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-base-300 bg-base-100/70">
        <span className="text-xs font-semibold uppercase tracking-wider text-base-content/70">
          {languageLabel || "Code"}
        </span>
        <button
          id="code-block-copy-button"
          type="button"
          onClick={handleCopy}
          className="btn btn-ghost btn-xs font-medium text-xs px-2 py-1 text-base-content"
        >
          {copyStatus}
        </button>
      </div>
      <SyntaxHighlighter
        startingLineNumber
        style={vscDarkPlus}
        language={match[1]}
        wrapLongLines={true}
        customStyle={{
          margin: 0,
          padding: "1rem",
        }}
        codeTagProps={{
          style: {
            whiteSpace: "pre-wrap",
            fontFamily:
              'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          },
        }}
        PreTag="div"
        {...props}
      >
        {codeString}
      </SyntaxHighlighter>
    </div>
  ) : (
    <code
      className={`${className || ""} px-1.5 py-0.5 rounded text-xs sm:text-sm font-mono font-normal bg-base-200 text-base-content`}
      {...props}
    >
      {children}
    </code>
  );
}

export default CodeBlock;
