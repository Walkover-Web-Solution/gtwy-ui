"use client";

import React, { useRef, useState, useLayoutEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

/**
 * ExpandCollapse
 *
 * A reusable wrapper that collapses tall content behind a gradient shade.
 * Clicking the shade (or the "Show more" button) expands to full height.
 * A "Collapse" button appears at the bottom when expanded.
 *
 * Props:
 *  - children        : ReactNode — content to wrap
 *  - collapsedHeight : number   — max px height when collapsed (default: 180)
 *  - fadeHeight      : number   — height of the gradient overlay in px (default: 80)
 *  - collapseLabel   : string   — text for the collapse button (default: "Collapse")
 *  - expandLabel     : string   — text for the expand trigger (default: "Show more")
 *  - className       : string   — extra classes on the root wrapper
 *  - alwaysShow      : boolean  — if true, always render controls even if content is short (default: false)
 */
export function ExpandCollapse({
  children,
  collapsedHeight = 180,
  fadeHeight = 80,
  collapseLabel = "Collapse",
  expandLabel = "Show more",
  className = "",
  alwaysShow = false,
  style = {},
}) {
  const [expanded, setExpanded] = useState(false);
  const [needsCollapse, setNeedsCollapse] = useState(true);
  const contentRef = useRef(null);

  // Measure actual content height after render
  useLayoutEffect(() => {
    if (!contentRef.current) return;
    const measure = () => {
      if (contentRef.current) {
        setNeedsCollapse(contentRef.current.scrollHeight > collapsedHeight);
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [collapsedHeight, children]);

  const showControls = alwaysShow || needsCollapse;

  return (
    <div className={`relative w-full ${className}`} style={style}>
      {/* Content wrapper — clipped when collapsed */}
      <div
        ref={contentRef}
        style={{
          maxHeight: expanded || !showControls ? "none" : `${collapsedHeight}px`,
          overflow: "hidden",
          transition: expanded ? "max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1)" : "none",
        }}
      >
        {children}
      </div>

      {/* Gradient shade overlay — visible only when collapsed and content is tall */}
      {showControls && !expanded && (
        <div
          className="absolute bottom-0 left-0 right-0 flex flex-col items-center justify-end cursor-pointer group/shade"
          style={{ height: `${fadeHeight}px` }}
          onClick={() => setExpanded(true)}
          title={expandLabel}
        >
          {/* Gradient fade — light mode fades to a light shade, dark mode fades to a dark shade */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent to-[#f5f5f5] dark:to-[#1f1f1f]" />

          {/* Show-more button on top of the gradient */}
          <button
            type="button"
            className="relative z-10 mb-2 inline-flex items-center gap-1.5 rounded-full border border-base-content/15 bg-base-100 px-3 py-1 text-xs font-medium text-base-content/70 shadow-sm transition-all duration-200 hover:border-base-content/30 hover:bg-base-200 hover:text-base-content group-hover/shade:-translate-y-0.5"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(true);
            }}
          >
            <ChevronDown size={12} className="shrink-0" />
            {expandLabel}
          </button>
        </div>
      )}

      {/* Collapse button — shown at the bottom after expanding */}
      {showControls && expanded && (
        <div className="flex justify-center mt-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border border-base-content/15 bg-base-100 px-3 py-1 text-xs font-medium text-base-content/60 shadow-sm transition-all duration-200 hover:border-base-content/30 hover:bg-base-200 hover:text-base-content hover:-translate-y-0.5 active:scale-95"
            onClick={() => setExpanded(false)}
          >
            <ChevronUp size={12} className="shrink-0" />
            {collapseLabel}
          </button>
        </div>
      )}
    </div>
  );
}

export default ExpandCollapse;
