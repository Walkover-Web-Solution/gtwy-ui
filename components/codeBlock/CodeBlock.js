"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
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

function CodeBlock({ inline, className, children, ...props }) {
  const match = /language-(\w+)/.exec(className || "");
  const [copyStatus, setCopyStatus] = useState("Copy");
  const resetTimerRef = useRef(null);
  const codeString = String(children).replace(/\n$/, "");
  const isDark = useIsDark();
  const hlTheme = isDark ? oneDark : oneLight;

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
    csharp: "C#",
    java: "Java",
    go: "Go",
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
    <div data-testid="code-block-container" id="code-block-container" className={blockClasses}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-base-300 bg-base-100/70">
        <span className="text-xs font-semibold uppercase tracking-wider text-base-content/70">
          {languageLabel || "Code"}
        </span>
        <button
          data-testid="code-block-copy-button"
          id="code-block-copy-button"
          type="button"
          onClick={handleCopy}
          className="btn btn-ghost btn-xs font-medium text-xs px-2 py-1 text-base-content"
        >
          {copyStatus}
        </button>
      </div>
      <SyntaxHighlighter
        language={match[1]}
        style={{
          ...hlTheme,
          'pre[class*="language-"]': { ...hlTheme['pre[class*="language-"]'], background: "transparent" },
          'code[class*="language-"]': { ...hlTheme['code[class*="language-"]'], background: "transparent" },
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
        {codeString}
      </SyntaxHighlighter>
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
