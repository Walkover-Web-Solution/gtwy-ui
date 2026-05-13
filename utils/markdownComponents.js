"use client";
import React, { createContext, useContext, useRef } from "react";
import CodeBlock from "@/components/codeBlock/CodeBlock";
import remarkGfm from "remark-gfm";

const OrderedListContext = createContext(false);

export const mdRemarkPlugins = [remarkGfm];

export const mdProseClass = {
  dark: "prose prose-sm prose-invert max-w-none prose-p:my-1 prose-headings:mb-1 prose-headings:mt-2 prose-pre:p-0 prose-pre:bg-transparent prose-pre:my-2 prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline prose-code:before:content-none prose-code:after:content-none",
  light:
    "prose prose-sm max-w-none prose-p:my-1 prose-headings:mb-1 prose-headings:mt-2 prose-pre:p-0 prose-pre:bg-transparent prose-pre:my-2 prose-a:text-blue-500 prose-a:no-underline hover:prose-a:underline prose-code:before:content-none prose-code:after:content-none",
};

export function buildMdComponents({ isDark = false } = {}) {
  const linkClass =
    "text-blue-500 underline underline-offset-2 hover:text-blue-400 transition-colors duration-150 break-words";

  return {
    // ── Block elements ──────────────────────────────────────────────────────
    p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,

    ul: ({ children }) => (
      <OrderedListContext.Provider value={false}>
        <ul className="list-none pl-0 mb-2">{children}</ul>
      </OrderedListContext.Provider>
    ),

    ol: ({ children, start }) => {
      const counterRef = useRef(typeof start === "number" ? start - 1 : 0);
      counterRef.current = typeof start === "number" ? start - 1 : 0;
      return (
        <OrderedListContext.Provider value={{ counterRef }}>
          <ol className="list-none pl-0 mb-2">{children}</ol>
        </OrderedListContext.Provider>
      );
    },

    li: ({ children, ...props }) => {
      const olCtx = useContext(OrderedListContext);
      const isOrdered = Boolean(olCtx);

      if (isOrdered) {
        olCtx.counterRef.current += 1;
        const itemNumber = olCtx.counterRef.current;
        return (
          <li className="flex gap-2 leading-relaxed my-0" {...props}>
            <span
              className="shrink-0 min-w-[1.5rem] text-right opacity-70 select-none font-normal leading-relaxed"
              aria-hidden
            >
              {itemNumber}
              {"."}
            </span>
            <span className="flex-1 [&>p]:m-0 [&>p]:inline">{children}</span>
          </li>
        );
      }

      return (
        <li className="flex items-baseline gap-2 leading-relaxed my-0" {...props}>
          <span className="shrink-0 opacity-70 select-none text-[0.5em] translate-y-[-0.1em]" aria-hidden>
            ●
          </span>
          <span className="flex-1 [&>p]:m-0 [&>p]:inline">{children}</span>
        </li>
      );
    },

    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-base-content/30 pl-3 italic opacity-80 my-2">{children}</blockquote>
    ),

    h1: ({ children }) => <h1 className="text-xl font-bold mt-3 mb-1 leading-tight">{children}</h1>,
    h2: ({ children }) => <h2 className="text-lg font-semibold mt-3 mb-1 leading-tight">{children}</h2>,
    h3: ({ children }) => <h3 className="text-base font-semibold mt-2 mb-1 leading-tight">{children}</h3>,
    h4: ({ children }) => <h4 className="text-sm font-semibold mt-2 mb-0.5">{children}</h4>,

    // ── Inline elements ─────────────────────────────────────────────────────
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
        {children}
      </a>
    ),

    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,

    em: ({ children }) => <em className="italic">{children}</em>,

    // ── Pre: passthrough so default <pre> doesn't add extra styling ──────────
    pre: ({ children }) => <>{children}</>,

    // ── Code ─────────────────────────────────────────────────────────────────
    code: ({ node, className, children, ...props }) => {
      const raw = Array.isArray(children)
        ? children.map((c) => (typeof c === "string" ? c : "")).join("")
        : String(children ?? "");
      const isBlock = /language-\w+/.test(className || "") || raw.includes("\n");

      if (isBlock) {
        return (
          <CodeBlock inline={false} className={className || ""} isDark={isDark}>
            {raw.replace(/\n$/, "")}
          </CodeBlock>
        );
      }
      return (
        <code className="px-1.5 py-0.5 rounded text-[0.8em] font-mono bg-base-200 text-base-content" {...props}>
          {children}
        </code>
      );
    },

    // ── Tables (enabled by remark-gfm) ───────────────────────────────────────
    table: ({ children }) => (
      <div className="overflow-x-auto my-3 rounded-lg border border-base-content/15">
        <table className="w-full text-sm border-collapse">{children}</table>
      </div>
    ),

    thead: ({ children }) => (
      <thead className="bg-base-content/10 text-base-content/80 uppercase text-xs tracking-wide">{children}</thead>
    ),

    tbody: ({ children }) => <tbody className="divide-y divide-base-content/10">{children}</tbody>,

    tr: ({ children }) => <tr className="hover:bg-base-content/5 transition-colors">{children}</tr>,

    th: ({ children }) => <th className="px-4 py-2.5 text-left font-semibold whitespace-nowrap">{children}</th>,

    td: ({ children }) => <td className="px-4 py-2.5 align-top break-words">{children}</td>,
  };
}

export const mdComponentsDark = buildMdComponents({ isDark: true });

export const mdComponentsLight = buildMdComponents({ isDark: false });
