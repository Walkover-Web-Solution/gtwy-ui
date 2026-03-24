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
 * RowComponent
 */
export default function RowComponent({
  children,
  gap = 2,
  align = "center",
  justify = "start",
  wrap = false,
  padding,
  color,
  bg,
  background,
  border,
  rounded,
  shadow,
  className = "",
  style,
  renderNode: RNode,
  onAction,
}) {
  const safeStyle = safeStyleObj(style);
  const resolvedBg = bg ?? background;

  const alignMap = {
    start: "items-start",
    center: "items-center",
    end: "items-end",
    stretch: "items-stretch",
    baseline: "items-baseline",
  };
  const justifyMap = {
    start: "justify-start",
    center: "justify-center",
    end: "justify-end",
    between: "justify-between",
    around: "justify-around",
    evenly: "justify-evenly",
  };

  const { className: colorCls, style: colorStyle } = resolveColor(color);
  const { className: bgCls, style: bgStyle } = resolveBackground(resolvedBg);
  const shadowCls = resolveShadow(shadow);
  const { className: borderCls, style: borderStyle } = resolveBorder(border);
  const roundedCls = resolveRounded(rounded, !!(resolvedBg || border));
  const padStyle = resolvePadding(padding);

  return (
    <div
      className={`
                flex flex-row
                ${alignMap[align] ?? "items-center"}
                ${justifyMap[justify] ?? "justify-start"}
                ${wrap ? "flex-wrap" : "flex-nowrap"}
                ${bgCls} ${borderCls} ${roundedCls} ${shadowCls} ${colorCls}
                ${className}
            `}
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
