"use client";
import {
  resolvePadding,
  resolveColor,
  resolveBackground,
  resolveRounded,
  resolveShadow,
  safeStyleObj,
} from "../styleUtils";

/**
 * TitleComponent
 */
export default function TitleComponent({
  value = "",
  level = 2,
  size,
  weight = "bold",
  color,
  align = "left",
  gradient = false,
  bg,
  padding,
  rounded,
  shadow,
  className = "",
  style,
}) {
  const safeStyle = safeStyleObj(style);
  const Tag = `h${Math.min(Math.max(Number(level), 1), 6)}`;

  const defaultSizeMap = {
    1: "text-3xl tracking-tight",
    2: "text-2xl tracking-tight",
    3: "text-xl",
    4: "text-lg",
    5: "text-base",
    6: "text-sm",
  };
  const sizeMap = {
    xs: "text-xs",
    sm: "text-sm",
    base: "text-base",
    lg: "text-lg",
    xl: "text-xl",
    "2xl": "text-2xl",
    "3xl": "text-3xl",
    "4xl": "text-4xl",
  };
  const sizeCls = size ? (sizeMap[size] ?? `text-${size}`) : (defaultSizeMap[level] ?? "text-xl");

  const weightMap = {
    normal: "font-normal",
    medium: "font-medium",
    semibold: "font-semibold",
    bold: "font-bold",
    extrabold: "font-extrabold",
  };
  const alignMap = { left: "text-left", center: "text-center", right: "text-right" };

  const gradientCls = gradient
    ? "bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent"
    : "";

  const { className: colorCls, style: colorStyle } = gradient
    ? { className: "", style: {} }
    : resolveColor(color, "text-base-content");

  const { className: bgCls, style: bgStyle } = resolveBackground(bg);
  const padStyle = resolvePadding(padding);
  const roundedCls = resolveRounded(rounded, !!(bg || padding));
  const shadowCls = resolveShadow(shadow);

  return (
    <Tag
      className={`${sizeCls} ${weightMap[weight] ?? "font-bold"} ${alignMap[align] ?? "text-left"} ${colorCls} ${gradientCls} ${bgCls} ${roundedCls} ${shadowCls} leading-tight ${className}`}
      style={{ ...padStyle, ...colorStyle, ...bgStyle, ...safeStyle }}
    >
      {String(value)}
    </Tag>
  );
}
