// components/LazyMarkdown.js
"use client";
import dynamic from "next/dynamic";

const ReactMarkdown = dynamic(() => import("react-markdown").catch(() => ({ default: () => <div></div> })), {
  ssr: false,
  loading: () => <div data-testid="lazy-markdown-loading" className="h-32 bg-base-100 animate-pulse rounded" />,
  suspense: false,
});

export default ReactMarkdown;
