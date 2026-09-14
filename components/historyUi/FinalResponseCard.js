"use client";

import React, { useMemo, useState } from "react";
import { Sparkles, Globe, ExternalLink, ChevronDown, Search } from "lucide-react";
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
  annotations = null,
}) {
  const { actualTheme } = useThemeManager();
  const isDark = actualTheme === "dark";
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const searchQueries = Array.isArray(annotations)
    ? [...new Set(annotations.filter((a) => a?.query && !a?.url).map((a) => a.query))]
    : [];
  const sources = Array.isArray(annotations) ? annotations.filter((a) => a?.url) : [];

  const hostnameOf = (url) => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  };

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

      {(searchQueries.length > 0 || sources.length > 0) && (
        <div data-testid="final-response-sources" className="mb-3 rounded-lg border border-base-content/10">
          <button
            type="button"
            onClick={() => setSourcesOpen((open) => !open)}
            className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-xs text-base-content/60 hover:text-base-content/80"
          >
            <Globe size={13} className="shrink-0" />
            <span className="flex-1 text-left">
              Searched the web{sources.length > 0 ? ` · ${sources.length} source${sources.length > 1 ? "s" : ""}` : ""}
            </span>
            <ChevronDown size={13} className={`shrink-0 transition-transform ${sourcesOpen ? "rotate-180" : ""}`} />
          </button>
          {sourcesOpen && (
            <div className="flex flex-col gap-3 border-t border-base-content/10 px-2.5 py-2.5">
              {searchQueries.length > 0 && (
                <div className="flex flex-col gap-1">
                  {searchQueries.map((q) => (
                    <div key={q} className="flex items-start gap-2 text-xs text-base-content/60">
                      <Search size={12} className="mt-0.5 shrink-0 text-base-content/35" />
                      <span className="italic">&ldquo;{q}&rdquo;</span>
                    </div>
                  ))}
                </div>
              )}
              {sources.length > 0 && (
                <div className="flex flex-col gap-0.5">
                  {sources.map((source, index) => (
                    <a
                      key={index}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group/source flex items-center gap-2.5 rounded-md px-1.5 py-1.5 transition-colors hover:bg-base-200/70"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-base-200 text-[10px] font-medium text-base-content/50">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-base-content/80">
                          {source.title || source.url}
                        </p>
                        <p className="truncate text-[11px] text-base-content/40">{hostnameOf(source.url)}</p>
                      </div>
                      <ExternalLink
                        size={12}
                        className="shrink-0 text-base-content/30 transition-colors group-hover/source:text-base-content/60"
                      />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
