"use client";
import {
  resolvePadding,
  resolveBackground,
  resolveRounded,
  resolveShadow,
  resolveBorder,
  resolveDimension,
  resolveColor,
  safeStyleObj,
} from "../styleUtils";

/**
 * BoxComponent — generic container / spacer / progress track
 * {
 *   type: "Box",
 *   children?: [...],
 *   padding?: ...,
 *   bg?: "base-100|alpha-15|white|linear-gradient(...)|...",
 *   background?: (alias for bg),
 *   color?: "...",
 *   border?: true | { top, bottom, ... },
 *   rounded?: "sm|md|lg|xl|full",
 *   radius?: (alias for rounded — used in new JSON format),
 *   shadow?: "sm|md|lg",
 *   width?: number(px) | "60%" | "full" | "auto",
 *   height?: number(px) | "100%" | "full" | "auto",
 * }
 */
export default function BoxComponent({
  children,
  padding,
  bg,
  background,
  color,
  border,
  rounded,
  radius,
  shadow,
  width,
  height,
  className = "",
  style,
  renderNode: RNode,
  onAction,
}) {
  const safeStyle = safeStyleObj(style);

  const resolvedBg = background ?? bg;
  const resolvedRounded = radius ?? rounded;

  const { className: bgCls, style: bgStyle } = resolveBackground(resolvedBg);
  const { className: colorCls, style: colorStyle } = resolveColor(color);
  const shadowCls = resolveShadow(shadow);
  const { className: borderCls, style: borderStyle } = resolveBorder(border);
  const roundedCls = resolveRounded(resolvedRounded, !!(resolvedBg || border || shadow));
  const padStyle = resolvePadding(padding);

  const resolvedWidth = resolveDimension(width);
  const resolvedHeight = resolveDimension(height);
  const dimStyle = {
    ...(resolvedWidth !== undefined ? { width: resolvedWidth } : {}),
    ...(resolvedHeight !== undefined ? { height: resolvedHeight } : {}),
  };

  const isEmpty = !Array.isArray(children) || children.length === 0;
  const isSpacer = isEmpty && !resolvedBg && !border && !shadow && !padding && !resolvedWidth && !resolvedHeight;

  if (isSpacer) {
    return <div className={`flex-1 min-w-0 ${className}`} aria-hidden="true" />;
  }

  return (
    <div
      className={`
                ${bgCls} ${colorCls} ${borderCls} ${roundedCls} ${shadowCls}
                ${className}
            `}
      style={{
        ...bgStyle,
        ...colorStyle,
        ...padStyle,
        ...dimStyle,
        ...borderStyle,
        ...safeStyle,
      }}
    >
      {!isEmpty && children.map((child, i) => <RNode key={child?.id ?? i} node={child} onAction={onAction} />)}
    </div>
  );
}
