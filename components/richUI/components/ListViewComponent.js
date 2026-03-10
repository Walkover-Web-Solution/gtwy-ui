"use client";

import { resolveNode } from "@/utils/templateEngine";

const ITEM_REF_RE = /^\{\{item\.(\w+)\}\}$/;
const ITEM_INLINE_RE = /\{\{item\.(\w+)\}\}/g;

/** Legacy placeholder resolver for Mode B (no templateEngine dependency) */
function resolveItemPlaceholders(node, item) {
  if (typeof node === "string") {
    const full = node.trim().match(ITEM_REF_RE);
    if (full) return item[full[1]] ?? node;
    return node.replace(ITEM_INLINE_RE, (_, k) => String(item[k] ?? ""));
  }
  if (Array.isArray(node)) return node.map((n) => resolveItemPlaceholders(n, item));
  if (node && typeof node === "object") {
    const out = {};
    for (const [k, v] of Object.entries(node)) out[k] = resolveItemPlaceholders(v, item);
    return out;
  }
  return node;
}

export default function ListViewComponent({
  binding,
  itemAlias = "item",
  idField = "id",
  items = [],
  itemTemplate = null,
  children,
  gap = 2,
  direction = "vertical",
  dividers = false,
  hover = true,
  emptyText = "No items to display.",
  className = "",
  style,
  onAction,
  actionDefs,
  renderNode: RNode,
}) {
  const safeStyle = style && typeof style === "object" ? style : {};

  // If direction is not explicitly vertical, and we are binding 'buttons' or have an alias 'button', default to horizontal
  const resolvedDir =
    direction || (binding?.includes("button") || itemAlias?.includes("button") ? "horizontal" : "vertical");

  const directionCls =
    resolvedDir === "horizontal" ? "flex-row flex-wrap" : resolvedDir === "grid" ? "grid grid-cols-2" : "flex-col";

  // ─── Mode C: pre-resolved children (backward compat / AI flow) ───────────
  if (Array.isArray(children) && children.length > 0) {
    return (
      <div className={`flex ${directionCls} ${className}`} style={{ gap: `${gap * 4}px`, ...safeStyle }}>
        {children.map((child, i) => {
          const childWithProps = dividers ? { ...child, divider: true } : child;
          // If it's a list of buttons horizontally, we probably don't want each inner ListViewItem to have a hover block
          if (resolvedDir === "horizontal" && childWithProps.type === "ListViewItem") {
            childWithProps.hover = false;
          }
          return <RNode key={child?.id ?? i} node={childWithProps} onAction={onAction} actionDefs={actionDefs} />;
        })}
      </div>
    );
  }

  // ─── Resolve the data array ───────────────────────────────────────────────
  let dataArray = [];
  let extraScope = {}; // non-array sibling keys (e.g. "buttons")

  if (binding && items && typeof items === "object" && !Array.isArray(items)) {
    // Generic binding mode: extract array from the data bag
    dataArray = Array.isArray(items[binding]) ? items[binding] : [];
    // Everything else in the bag goes into the scope too (e.g. buttons, headers)
    for (const [k, v] of Object.entries(items)) {
      if (k !== binding) extraScope[k] = v;
    }
  } else if (Array.isArray(items)) {
    dataArray = items;
  }

  // ─── Empty state ─────────────────────────────────────────────────────────
  if (!itemTemplate && dataArray.length === 0) {
    return <p className="text-sm text-base-content/50 italic py-4 text-center">{emptyText}</p>;
  }

  // ─── Mode A/B: itemTemplate + data array ──────────────────────────────────
  if (itemTemplate && dataArray.length > 0) {
    return (
      <div
        className={`${resolvedDir === "grid" ? "grid grid-cols-2" : `flex ${directionCls}`} ${className}`}
        style={{ gap: `${gap * 4}px`, ...safeStyle }}
      >
        {dataArray.map((item, i) => {
          const key = item?.[idField] ?? item?.id ?? i;

          // Build scope: itemAlias → item data, plus any extra scope fields (buttons, etc.)
          const scope = { [itemAlias]: item, ...extraScope };

          // Use new templateEngine for generic binding, legacy resolver for plain arrays
          const resolved = binding ? resolveNode(itemTemplate, scope) : resolveItemPlaceholders(itemTemplate, item);

          return (
            <div
              key={key}
              className={`
                                ${hover && resolvedDir !== "horizontal" ? "transition-colors duration-150 hover:bg-base-200/60 rounded-xl" : ""}
                                ${dividers ? "border-b border-base-200 last:border-0" : ""}
                            `}
            >
              <RNode node={resolved} onAction={onAction} actionDefs={actionDefs} />
            </div>
          );
        })}
      </div>
    );
  }

  // ─── Fallback auto-render from item keys (no itemTemplate) ───────────────
  if (dataArray.length > 0) {
    return (
      <div
        className={`${resolvedDir === "grid" ? "grid grid-cols-2" : `flex ${directionCls}`} ${className}`}
        style={{ gap: `${gap * 4}px`, ...safeStyle }}
      >
        {dataArray.map((item, i) => {
          const key = item?.[idField] ?? item?.id ?? i;
          return (
            <div
              key={key}
              className={`
                                flex items-center gap-3 p-3 rounded-xl
                                ${hover ? "transition-colors duration-150 hover:bg-base-200/60" : ""}
                                ${dividers ? "border-b border-base-200 last:border-0" : ""}
                            `}
            >
              {item.image && (
                <img
                  src={item.image}
                  alt={item.title ?? ""}
                  className="w-10 h-10 object-cover rounded-lg flex-shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              )}
              <div className="flex flex-col flex-1 min-w-0">
                {item.title && <span className="text-sm font-semibold text-base-content truncate">{item.title}</span>}
                {item.subtitle && <span className="text-xs text-base-content/60 truncate">{item.subtitle}</span>}
              </div>
              {item.badge && <span className="badge badge-primary badge-sm font-medium shrink-0">{item.badge}</span>}
              {item.value && !item.badge && (
                <span className="text-sm font-semibold text-base-content/70 shrink-0 tabular-nums">{item.value}</span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Nothing to render
  return <p className="text-sm text-base-content/50 italic py-4 text-center">{emptyText}</p>;
}
