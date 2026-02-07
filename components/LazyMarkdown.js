// components/LazyMarkdown.js
"use client";
import dynamic from "next/dynamic";

const ReactMarkdown = dynamic(
  () => import("react-markdown").catch(() => ({ default: () => <div>Loading markdown...</div> })),
  {
    ssr: false,
    loading: () => <div className="h-32 bg-gray-100 animate-pulse rounded" />,
    suspense: false,
  }
);

export default ReactMarkdown;
