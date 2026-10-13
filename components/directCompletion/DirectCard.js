"use client";
import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

// Card used by every section of the direct playground's config panel. With `collapsible`,
// the header toggles the body and `summary` is shown while it is collapsed.
const DirectCard = ({
  icon: Icon,
  title,
  description,
  actions,
  summary,
  collapsible = false,
  defaultOpen = true,
  testId,
  children,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const isOpen = !collapsible || open;

  const heading = (
    <div className="flex items-center gap-3 min-w-0">
      {Icon && (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-base-content/10 bg-base-200 text-base-content/70">
          <Icon size={15} />
        </span>
      )}
      <div className="min-w-0 text-left">
        <h3 className="text-sm font-semibold text-base-content leading-tight">{title}</h3>
        {description && <p className="text-xs text-base-content/55 leading-snug">{description}</p>}
      </div>
    </div>
  );

  return (
    <section data-testid={testId} className="border border-base-content/10 bg-base-100">
      <div className="flex items-center gap-3 px-4 py-3">
        {collapsible ? (
          <button
            type="button"
            className="flex flex-1 min-w-0 cursor-pointer items-center"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
          >
            {heading}
          </button>
        ) : (
          <div className="flex-1 min-w-0">{heading}</div>
        )}
        {actions && isOpen && <div className="flex items-center gap-1 shrink-0">{actions}</div>}
        {collapsible && (
          <button
            type="button"
            className="flex shrink-0 cursor-pointer items-center gap-2"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? `Collapse ${typeof title === "string" ? title : "section"}` : "Expand section"}
          >
            {!open && summary && <span className="text-xs text-base-content/55">{summary}</span>}
            <ChevronDown
              size={16}
              className={`text-base-content/50 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </div>
      {isOpen && <div className="border-t border-base-content/10 px-4 py-4">{children}</div>}
    </section>
  );
};

export default DirectCard;
