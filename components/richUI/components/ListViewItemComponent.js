"use client";

export default function ListViewItemComponent({
  children,
  divider = false,
  hover = true,
  className = "",
  style,
  renderNode: RNode,
  onAction,
}) {
  const safeStyle = style && typeof style === "object" ? style : {};

  if (!Array.isArray(children) || children.length === 0) return null;

  return (
    <div
      className={`
                relative
                ${hover ? "transition-colors duration-150 hover:bg-base-200/60 rounded-xl" : ""}
                ${divider ? "border-b border-base-200 last:border-0" : ""}
                ${className}
            `}
      style={safeStyle}
    >
      {children.map((child, i) => (
        <RNode key={child?.id ?? i} node={child} onAction={onAction} />
      ))}
    </div>
  );
}
