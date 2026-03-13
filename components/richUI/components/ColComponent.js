"use client";
import {
  resolvePadding,
  resolveBackground,
  resolveRounded,
  resolveShadow,
  resolveBorder,
  resolveColor,
  safeStyleObj,
} from "../styleUtils";

/**
 * ColComponent
 */
export default function ColComponent({
  children,
  gap = 2,
  width,
  align = "start",
  color,
  bg,
  padding,
  border,
  rounded,
  shadow,
  className = "",
  style,
  renderNode: RNode,
  onAction,
}) {
  const safeStyle = safeStyleObj(style);

  const alignMap = { start: "items-start", center: "items-center", end: "items-end", stretch: "items-stretch" };

  const widthMap = {
    auto: "flex-1 min-w-0",
    full: "w-full",
    "1/2": "w-1/2",
    "1/3": "w-1/3",
    "1/4": "w-1/4",
    "2/3": "w-2/3",
    "3/4": "w-3/4",
  };
  const widthCls = width ? (widthMap[width] ?? `w-${width}`) : "flex-1 min-w-0";

  const { className: colorCls, style: colorStyle } = resolveColor(color);
  const { className: bgCls, style: bgStyle } = resolveBackground(bg);
  const shadowCls = resolveShadow(shadow);
  const { className: borderCls, style: borderStyle } = resolveBorder(border);
  const roundedCls = resolveRounded(rounded, !!(bg || border));
  const padStyle = resolvePadding(padding);

  return (
    <div
      className={`flex flex-col ${alignMap[align] ?? "items-start"} ${widthCls} ${bgCls} ${borderCls} ${roundedCls} ${shadowCls} ${colorCls} ${className}`}
      style={{
        gap: `${gap * 4}px`,
        ...padStyle,
        ...bgStyle,
        ...colorStyle,
        ...borderStyle,
        ...safeStyle,
      }}
    >
      {Array.isArray(children) &&
        children.map((child, i) => <RNode key={child?.id ?? i} node={child} onAction={onAction} />)}
    </div>
  );
}
