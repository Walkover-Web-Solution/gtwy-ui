"use client";
/**
 * BadgeComponent — small status pill/chip
 * { type: "Badge", label: "New", variant?: "primary|secondary|accent|error|warning|success|ghost|outline|neutral",
 *   size?: "xs|sm|md|lg", dot?: false, className?: "" }
 */
export default function BadgeComponent({
  label = "",
  variant = "primary",
  size = "sm",
  dot = false,
  className = "",
  style,
}) {
  const safeStyle = style && typeof style === "object" ? style : {};

  const variantMap = {
    primary: "badge-primary",
    secondary: "badge-secondary",
    accent: "badge-accent",
    ghost: "badge-ghost",
    outline: "badge-outline",
    error: "badge-error",
    warning: "badge-warning",
    success: "badge-success",
    neutral: "badge-neutral",
  };

  const sizeMap = { xs: "badge-xs text-[10px]", sm: "badge-sm", md: "", lg: "badge-lg" };

  return (
    <span
      className={`badge ${variantMap[variant] ?? "badge-primary"} ${sizeMap[size] ?? ""} font-medium gap-1 ${className}`}
      style={safeStyle}
    >
      {dot && <span className="inline-block w-1.5 h-1.5 rounded-full bg-current opacity-80" />}
      {label}
    </span>
  );
}
