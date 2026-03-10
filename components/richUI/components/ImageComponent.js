"use client";
import { resolveDimension, safeStyleObj } from "../styleUtils";

export default function ImageComponent({
  src,
  alt = "",
  width,
  height,
  size,
  objectFit = "cover",
  rounded = "xl",
  aspect,
  shadow = false,
  className = "",
  style,
}) {
  const safeStyle = safeStyleObj(style);

  const resolvedWidth = resolveDimension(size ?? width);
  const resolvedHeight = resolveDimension(size ?? height);

  const roundedMap = {
    none: "",
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    xl: "rounded-xl",
    "2xl": "rounded-2xl",
    full: "rounded-full",
  };
  const aspectMap = { video: "aspect-video", square: "aspect-square", auto: "" };
  const shadowCls = shadow ? "shadow-md" : "";

  const dimStyle = {
    ...(resolvedWidth !== undefined ? { width: resolvedWidth } : !aspect && !width && !size ? { width: "100%" } : {}),
    ...(resolvedHeight !== undefined ? { height: resolvedHeight } : {}),
  };

  if (!src) {
    return (
      <div
        className={`bg-base-300 animate-pulse ${roundedMap[rounded] ?? "rounded-xl"} ${aspectMap[aspect] ?? (height ? "" : "aspect-video")} ${className}`}
        style={{ ...dimStyle, minHeight: height || 120, ...safeStyle }}
        aria-label="Loading image"
      />
    );
  }

  const getDirectSrc = (url) => {
    if (!url) return url;
    return url;
  };

  const finalSrc = getDirectSrc(src);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={finalSrc}
      alt={alt}
      loading="lazy"
      className={`object-${objectFit} ${roundedMap[rounded] ?? "rounded-xl"} ${aspectMap[aspect] ?? (!height && !size ? "aspect-video" : "")} ${shadowCls} max-w-full ${className}`}
      style={{ ...dimStyle, ...safeStyle }}
      onError={(e) => {
        if (e.currentTarget.src.startsWith("data:")) return;
        e.currentTarget.src =
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1' stroke-linecap='round' stroke-linejoin='round' opacity='0.3'%3E%3Crect width='18' height='18' x='3' y='3' rx='2' ry='2'%3E%3C/rect%3E%3Ccircle cx='9' cy='9' r='2'%3E%3C/circle%3E%3Cpath d='m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21'%3E%3C/path%3E%3C/svg%3E";
        e.currentTarget.className += " opacity-20 p-8 bg-base-200 border border-dashed border-base-300";
        e.currentTarget.style.minHeight = "160px";
        e.currentTarget.style.objectFit = "contain";
      }}
    />
  );
}
