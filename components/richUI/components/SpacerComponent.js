"use client";
import { safeStyleObj } from "../styleUtils";

export default function SpacerComponent({ size, direction, className = "", style }) {
  const safeStyle = safeStyleObj(style);

  // If neither size nor direction is specified, default to a flexible push spacer
  const resolvedDir = size === undefined && direction === undefined ? "flex" : (direction ?? "vertical");

  if (resolvedDir === "flex") {
    return <div className={`flex-1 min-w-0 min-h-0 ${className}`} aria-hidden="true" />;
  }

  const px = typeof size === "number" ? size : parseInt(size, 10) || 16;

  return (
    <div
      className={`flex-shrink-0 ${className}`}
      style={resolvedDir === "horizontal" ? { width: px, ...safeStyle } : { height: px, ...safeStyle }}
      aria-hidden="true"
    />
  );
}
