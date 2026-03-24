"use client";
import { useState } from "react";
import { resolvePadding, resolveColor, resolveBackground, resolveRounded, safeStyleObj } from "../styleUtils";

export default function TextComponent({
  value = "",
  size = "sm",
  weight = "normal",
  color,
  align,
  textAlign, // alias for align
  truncate = false,
  lines,
  bg,
  padding,
  rounded,
  italic = false,
  underline = false,
  width,
  editable,
  className = "",
  style,
  onAction,
}) {
  const safeStyle = safeStyleObj(style);
  const [editValue, setEditValue] = useState(String(value));

  /* ── Size ── */
  const sizeMap = { xs: "text-xs", sm: "text-sm", base: "text-base", lg: "text-lg", xl: "text-xl", "2xl": "text-2xl" };
  const weightMap = { normal: "font-normal", medium: "font-medium", semibold: "font-semibold", bold: "font-bold" };

  const resolvedAlign = align ?? textAlign ?? "left";
  const alignMap = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
    end: "text-right",
    justify: "text-justify",
  };

  /* ── Color, bg, padding, rounded ── */
  const { className: colorCls, style: colorStyle } = resolveColor(color, "text-base-content/80");
  const { className: bgCls, style: bgStyle } = resolveBackground(bg);
  const padStyle = resolvePadding(padding);
  const roundedCls = rounded ? resolveRounded(rounded) : bg || padding ? "rounded-md" : "";

  /* ── Width ── */
  const widthStyle =
    width === "full" ? { width: "100%" } : width ? { width: typeof width === "number" ? `${width}px` : width } : {};

  /* ── Line clamp ── */
  const clampStyle = lines
    ? { WebkitLineClamp: lines, display: "-webkit-box", WebkitBoxOrient: "vertical", overflow: "hidden" }
    : {};

  const sharedCls = `
        ${sizeMap[size] ?? "text-sm"}
        ${weightMap[weight] ?? "font-normal"}
        ${alignMap[resolvedAlign] ?? "text-left"}
        ${colorCls}
        ${bgCls} ${roundedCls}
        ${italic ? "italic" : ""}
        ${underline ? "underline" : ""}
        ${truncate ? "truncate" : ""}
        leading-relaxed
        ${className}
    `;

  /* ── Editable mode ── */
  if (editable) {
    const { name, placeholder, required = false, type = "text" } = editable;

    function handleBlur(e) {
      const v = e.target.value;
      setEditValue(v);
      onAction?.({ type: "fieldChange", name, value: v });
    }

    return (
      <input
        type={type}
        defaultValue={editValue}
        required={required}
        placeholder={placeholder}
        onBlur={handleBlur}
        className={`
                    bg-transparent border-0 border-b border-base-content/20
                    focus:border-primary focus:outline-none
                    ${sharedCls}
                    h-auto py-0.5
                `}
        style={{ ...widthStyle, ...padStyle, ...clampStyle, ...colorStyle, ...bgStyle, ...safeStyle }}
        aria-label={name}
      />
    );
  }

  /* ── Static text ── */
  return (
    <p
      className={sharedCls}
      style={{ ...widthStyle, ...padStyle, ...clampStyle, ...colorStyle, ...bgStyle, ...safeStyle }}
    >
      {String(value)}
    </p>
  );
}
