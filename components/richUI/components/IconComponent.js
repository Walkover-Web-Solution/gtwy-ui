"use client";
// eslint-disable-next-line import/namespace
import * as LucideIcons from "lucide-react";
import { Info } from "lucide-react";
import { resolveDimension, resolveColor, safeStyleObj } from "../styleUtils";

export default function IconComponent({ name = "Info", size = "md", color, className = "", style }) {
  const safeStyle = safeStyleObj(style);

  const formattedName = name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("");

  // eslint-disable-next-line import/namespace
  const Icon = LucideIcons[formattedName] || Info;

  // Resolve size and color
  // resolvedSize will be a number (e.g. 40 for "3xl" or 24 for "lg")
  const resolvedSize = resolveDimension(size) || 20;

  // resolveColor returns { className, style }
  const { className: colorCls, style: colorStyle } = resolveColor(color, "text-current");

  return (
    <span
      className={`inline-flex items-center justify-center ${colorCls} ${className}`}
      style={{
        width: `${resolvedSize}px`,
        height: `${resolvedSize}px`,
        ...colorStyle,
        ...safeStyle,
      }}
    >
      <Icon size={resolvedSize} className="w-full h-full" aria-hidden="true" />
    </span>
  );
}
