"use client";

/**
 * DividerComponent — horizontal divider line
 * {
 *   type: "Divider",
 *   label?: "OR",
 *   flush?: false,      ← if true, no horizontal margin — edge-to-edge
 *   opacity?: 15,       ← custom opacity 0-100 (default ~10)
 *   spacing?: "none|sm|md|lg",
 *   color?: "white|base|primary|accent|...",
 * }
 *
 * On dark/colored cards, use color:"white" or the parent's inherited white text
 * will draw the line at low opacity automatically.
 */
export default function DividerComponent({
  label,
  flush = false,
  opacity,
  spacing = "sm",
  color,
  className = "",
  style,
}) {
  const safeStyle = style && typeof style === "object" ? style : {};

  const spacingMap = { none: "my-0", sm: "my-2", md: "my-3", lg: "my-5" };

  /* ── Flush: negative horizontal margin to cancel parent's padding ── */
  const flushStyle = flush
    ? { marginLeft: "-999px", marginRight: "-999px", paddingLeft: "999px", paddingRight: "999px" }
    : {};

  /* ── Line color ── */
  const colorMap = {
    white: { borderColor: `rgba(255,255,255,${opacity !== undefined ? opacity / 100 : 0.15})` },
    base: {},
    primary: {},
    accent: {},
  };
  const lineStyle = color
    ? (colorMap[color] ?? {})
    : opacity !== undefined
      ? { borderColor: `rgba(0,0,0,${opacity / 100})` }
      : {};

  /* ── If no label, render a plain <hr>-style divider ── */
  if (!label) {
    return (
      <div className={`${spacingMap[spacing] ?? "my-2"} ${className}`} style={{ ...flushStyle, ...safeStyle }}>
        <div className="w-full border-t border-current opacity-10" style={lineStyle} />
      </div>
    );
  }

  /* ── Labelled divider ── */
  return (
    <div
      className={`flex items-center gap-2 ${spacingMap[spacing] ?? "my-2"} ${className}`}
      style={{ ...flushStyle, ...safeStyle }}
    >
      <div className="flex-1 border-t border-current opacity-10" style={lineStyle} />
      <span className="text-xs font-medium opacity-40">{label}</span>
      <div className="flex-1 border-t border-current opacity-10" style={lineStyle} />
    </div>
  );
}
