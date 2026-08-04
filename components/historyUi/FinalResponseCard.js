"use client";

import React, { useMemo } from "react";
import { Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { ExpandCollapse } from "@/components/UI/ExpandCollapse";
import { mdComponentsLight, mdComponentsDark, mdRemarkPlugins } from "@/utils/markdownComponents";
import CodeBlock from "@/components/codeBlock/CodeBlock";
import { useThemeManager } from "@/customHooks/useThemeManager";
import { parseNestedJson } from "@/utils/utility";

/**
 * Final AI response card — transparent and borderless.
 * - If content is valid JSON: renders a formatted, collapsible JSON code block.
 * - Otherwise: renders as ReactMarkdown with ExpandCollapse for long content.
 */
export function FinalResponseCard({
  attachments = null,
  content,
  isHtml = false,
  editButton = null,
  hasToolCalls = false,
}) {
  const { actualTheme } = useThemeManager();
  const isDark = actualTheme === "dark";

  // Try to parse as JSON — only if it looks like an object or array
  const parsedJson = useMemo(() => {
    if (!content || isHtml) return null;
    const trimmed = content.trim();
    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
      try {
        return parseNestedJson(JSON.parse(trimmed));
      } catch {
        return null;
      }
    }
    return null;
  }, [content, isHtml]);

  const mdComponents = isDark ? mdComponentsDark : mdComponentsLight;

  return (
    <div
      data-testid="final-response-card"
      className="w-full relative text-sm text-slate-900 dark:text-zinc-100 group"
      style={{ wordBreak: "break-word" }}
    >
      {/* Header */}
      {hasToolCalls && (
        <div className="flex items-center gap-1.5 text-[#c07e2c] dark:text-[#C9A84C] font-bold text-xs tracking-wider uppercase mt-2 mb-3 select-none">
          <Sparkles size={13} className="shrink-0" />
          <span>Final Response</span>
        </div>
      )}

      {attachments}

      {/* Body container */}
      {parsedJson !== null ? (
        // ── JSON content: formatted code block with ExpandCollapse ──
        <div data-testid="final-response-content" className="w-full max-w-full overflow-hidden">
          <ExpandCollapse
            collapsedHeight={300}
            fadeHeight={90}
            expandLabel="Show more"
            collapseLabel="Collapse"
            style={{ "--expand-collapse-fade": isDark ? "oklch(var(--b2) / 0.97)" : "oklch(var(--b1) / 0.97)" }}
          >
            <CodeBlock className="language-json" showCopy={true} isDark={isDark}>
              {JSON.stringify(parsedJson, null, 2)}
            </CodeBlock>
          </ExpandCollapse>
        </div>
      ) : (
        // ── Markdown / HTML content ──
        <ExpandCollapse collapsedHeight={300} fadeHeight={90} expandLabel="Show more" collapseLabel="Collapse">
          <div data-testid="final-response-content">
            <div>
              {isHtml ? (
                <CodeBlock className="language-html" isDark={isDark} showCopy={true}>
                  {content}
                </CodeBlock>
              ) : (
                <ReactMarkdown components={mdComponents} remarkPlugins={mdRemarkPlugins}>
                  {content}
                </ReactMarkdown>
              )}
            </div>
          </div>
        </ExpandCollapse>
      )}

      {editButton}
    </div>
  );
}
