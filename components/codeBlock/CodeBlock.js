"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseNestedJson } from "@/utils/utility";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import js from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import jsx from "react-syntax-highlighter/dist/esm/languages/prism/jsx";
import ts from "react-syntax-highlighter/dist/esm/languages/prism/typescript";
import tsx from "react-syntax-highlighter/dist/esm/languages/prism/tsx";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";
import css from "react-syntax-highlighter/dist/esm/languages/prism/css";
import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash";
import java from "react-syntax-highlighter/dist/esm/languages/prism/java";
import csharp from "react-syntax-highlighter/dist/esm/languages/prism/csharp";
import go from "react-syntax-highlighter/dist/esm/languages/prism/go";
import markdown from "react-syntax-highlighter/dist/esm/languages/prism/markdown";
import sql from "react-syntax-highlighter/dist/esm/languages/prism/sql";
import php from "react-syntax-highlighter/dist/esm/languages/prism/php";

SyntaxHighlighter.registerLanguage("javascript", js);
SyntaxHighlighter.registerLanguage("js", js);
SyntaxHighlighter.registerLanguage("jsx", jsx);
SyntaxHighlighter.registerLanguage("typescript", ts);
SyntaxHighlighter.registerLanguage("ts", ts);
SyntaxHighlighter.registerLanguage("tsx", tsx);
SyntaxHighlighter.registerLanguage("python", python);
SyntaxHighlighter.registerLanguage("py", python);
SyntaxHighlighter.registerLanguage("json", json);
SyntaxHighlighter.registerLanguage("css", css);
SyntaxHighlighter.registerLanguage("bash", bash);
SyntaxHighlighter.registerLanguage("shell", bash);
SyntaxHighlighter.registerLanguage("sh", bash);
SyntaxHighlighter.registerLanguage("java", java);
SyntaxHighlighter.registerLanguage("csharp", csharp);
SyntaxHighlighter.registerLanguage("cs", csharp);
SyntaxHighlighter.registerLanguage("go", go);
SyntaxHighlighter.registerLanguage("markdown", markdown);
SyntaxHighlighter.registerLanguage("md", markdown);
SyntaxHighlighter.registerLanguage("sql", sql);
SyntaxHighlighter.registerLanguage("php", php);

function useIsDark() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof document === "undefined") return true;
    return document.documentElement.getAttribute("data-theme") !== "light";
  });
  useEffect(() => {
    const el = document.documentElement;
    const observer = new MutationObserver(() => {
      setIsDark(el.getAttribute("data-theme") !== "light");
    });
    observer.observe(el, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

function CodeBlock({ inline, className, children, showCopy = true, plain = false, ...props }) {
  const match = /language-(\w+)/.exec(className || "");
  const [copyStatus, setCopyStatus] = useState("Copy");
  const [viewMode, setViewMode] = useState("code");
  const resetTimerRef = useRef(null);
  const codeString = String(children).replace(/\n$/, "");
  const isDark = useIsDark();
  const hlTheme = isDark ? oneDark : oneLight;

  const isHtml = !!(
    (match &&
      (match[1]?.toLowerCase() === "html" ||
        match[1]?.toLowerCase() === "xml" ||
        match[1]?.toLowerCase() === "svg" ||
        match[1]?.toLowerCase() === "xhtml")) ||
    (codeString.trim().startsWith("<") && /<[a-z1-6]/i.test(codeString.trim()))
  );

  const formattedCodeString = useMemo(() => {
    const trimmed = codeString.trim();
    const isJsonLang = match && match[1]?.toLowerCase() === "json";
    const looksLikeJson =
      !match &&
      ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]")));

    if (isJsonLang || looksLikeJson) {
      try {
        const parsed = JSON.parse(trimmed);
        const cleaned = parseNestedJson(parsed);
        return JSON.stringify(cleaned, null, 2);
      } catch {
        return codeString;
      }
    }
    return codeString;
  }, [codeString, match]);

  useEffect(() => {
    setViewMode("code");
  }, [codeString]);

  const iframeSrcDoc = useMemo(() => {
    if (viewMode !== "preview" || !isHtml) return "";

    if (codeString.toLowerCase().includes("<head>")) {
      return codeString.replace(/<head>/i, `<head>`);
    }
    return `\${codeString}`;
  }, [codeString, viewMode, isHtml]);

  if (!inline && match && plain) {
    return (
      <SyntaxHighlighter
        language={match[1]}
        style={{
          ...hlTheme,
          'pre[class*="language-"]': { ...hlTheme['pre[class*="language-"]'], background: "transparent" },
          'code[class*="language-"]': { ...hlTheme['code[class*="language-"]'], background: "transparent" },
        }}
        wrapLongLines
        customStyle={{ margin: 0, padding: "12px 14px", fontSize: "11px", background: "transparent" }}
        codeTagProps={{
          style: {
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            background: "transparent",
          },
        }}
        PreTag="div"
        {...props}
      >
        {formattedCodeString}
      </SyntaxHighlighter>
    );
  }

  // DaisyUI / Tailwind based container classes
  // In light mode use a very subtle background so the block doesn't look heavy on the white page
  const blockClasses = isDark
    ? `text-sm w-full rounded-lg border border-base-300 bg-base-200 text-base-content overflow-hidden`
    : `text-sm w-full rounded-lg border border-base-200 bg-base-100 text-base-content overflow-hidden`;

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
    csharp: "C#",
    java: "Java",
    go: "Go",
    php: "PHP",
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
        await navigator.clipboard.writeText(formattedCodeString);
        setCopyStatus("Copied!");
      } else {
        fallbackCopy(formattedCodeString);
      }
    } catch {
      setCopyStatus("Failed");
    }

    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => setCopyStatus("Copy"), 2000);
  }, [formattedCodeString]);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  return !inline ? (
    <div data-testid="code-block-container" id="code-block-container" className={blockClasses}>
      <div
        className={`flex items-center justify-between px-3 py-2 border-b ${isDark ? "border-base-300 bg-base-100/70" : "border-base-200 bg-base-200/40"}`}
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-base-content/70">
          {languageLabel || "Code"}
        </span>
        <div className="flex items-center gap-3">
          {isHtml && (
            <div
              className={`flex items-center rounded-md p-0.5 gap-0.5 ${isDark ? "bg-base-300/50" : "bg-base-200/50"}`}
            >
              <button
                type="button"
                onClick={() => setViewMode("code")}
                className={`px-2.5 py-0.5 text-xs font-medium rounded transition-all ${
                  viewMode === "code"
                    ? "bg-base-100 text-base-content shadow-sm"
                    : "text-base-content/60 hover:text-base-content"
                }`}
              >
                Code
              </button>
              <button
                type="button"
                onClick={() => setViewMode("preview")}
                className={`px-2.5 py-0.5 text-xs font-medium rounded transition-all ${
                  viewMode === "preview"
                    ? "bg-base-100 text-base-content shadow-sm"
                    : "text-base-content/60 hover:text-base-content"
                }`}
              >
                Preview
              </button>
            </div>
          )}
          {showCopy && (
            <button
              data-testid="code-block-copy-button"
              id="code-block-copy-button"
              type="button"
              onClick={handleCopy}
              className="btn btn-ghost btn-xs font-medium text-xs px-2 py-1 text-base-content"
            >
              {copyStatus}
            </button>
          )}
        </div>
      </div>
      {viewMode === "preview" ? (
        <div className="w-full bg-white relative animate-fade-in" style={{ height: "400px" }}>
          <iframe
            srcDoc={iframeSrcDoc}
            title="HTML Preview"
            className="w-full h-full border-0 bg-white"
            sandbox="allow-scripts allow-modals"
          />
        </div>
      ) : (
        <SyntaxHighlighter
          language={match ? match[1] : undefined}
          style={{
            ...hlTheme,
            'pre[class*="language-"]': {
              ...hlTheme['pre[class*="language-"]'],
              background: "transparent",
              // Soften light-mode token colours slightly
              ...(isDark ? {} : { color: "#374151" }),
            },
            'code[class*="language-"]': { ...hlTheme['code[class*="language-"]'], background: "transparent" },
            // Soften specific token colours in light mode so they aren't too saturated
            ...(isDark
              ? {}
              : {
                  ".token.string": { color: "#059669" }, // emerald-600 — softer than default red-orange
                  ".token.number": { color: "#0284c7" }, // sky-600
                  ".token.boolean": { color: "#7c3aed" }, // violet-600
                  ".token.null": { color: "#9ca3af" }, // gray-400
                  ".token.property": { color: "#b45309" }, // amber-700
                  ".token.punctuation": { color: "#6b7280" }, // gray-500
                }),
          }}
          wrapLongLines
          customStyle={{ margin: 0, padding: "1rem", fontSize: "0.8125rem", background: "transparent" }}
          codeTagProps={{
            style: {
              fontFamily:
                'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              background: "transparent",
            },
          }}
          PreTag="div"
        >
          {formattedCodeString}
        </SyntaxHighlighter>
      )}
    </div>
  ) : (
    <code
      className={`${className || ""} px-1.5 py-0.5 rounded text-xs sm:text-sm font-mono bg-base-200 text-base-content`}
      {...props}
    >
      {children}
    </code>
  );
}

export default CodeBlock;
