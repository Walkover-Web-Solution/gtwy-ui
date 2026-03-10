"use client";
import { resolveColor, safeStyleObj } from "../styleUtils";

/**
 * CaptionComponent
 */
export default function CaptionComponent({
  value = "",
  color = "default",
  size = "xs",
  weight = "medium",
  align = "left",
  className = "",
  style,
}) {
  const safeStyle = safeStyleObj(style);

  const sizeMap = { xs: "text-xs", sm: "text-sm", base: "text-base" };
  const weightMap = { normal: "font-normal", medium: "font-medium", semibold: "font-semibold" };
  const alignMap = { left: "text-left", center: "text-center", right: "text-right", end: "text-right" };

  const { className: colorCls, style: colorStyle } = resolveColor(color, "text-current");

  return (
    <span
      className={`${sizeMap[size] ?? "text-xs"} ${weightMap[weight] ?? "font-medium"} ${alignMap[align] ?? "text-left"} ${colorCls} leading-none ${className}`}
      style={{ ...colorStyle, ...safeStyle }}
    >
      {String(value)}
    </span>
  );
}
