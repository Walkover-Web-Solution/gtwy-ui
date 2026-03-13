/**
 * styleUtils.js — shared style resolution for richUI components.
 */

// ─────────────────────────────────────────────────────────────────────────────
// PADDING
// ─────────────────────────────────────────────────────────────────────────────
const NAMED_PADDING = { none: 0, xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

export function resolvePadding(padding) {
  if (padding === undefined || padding === null) return {};
  if (typeof padding === "number") return { padding: `${Math.round(padding * 4)}px` };
  if (typeof padding === "string") {
    const px = NAMED_PADDING[padding];
    return px !== undefined ? { padding: `${px}px` } : {};
  }
  if (typeof padding === "object") {
    const s = {};
    const px = (v) => `${Math.round(v * 4)}px`;
    if (padding.x !== undefined) {
      s.paddingLeft = px(padding.x);
      s.paddingRight = px(padding.x);
    }
    if (padding.y !== undefined) {
      s.paddingTop = px(padding.y);
      s.paddingBottom = px(padding.y);
    }
    if (padding.top !== undefined) s.paddingTop = px(padding.top);
    if (padding.bottom !== undefined) s.paddingBottom = px(padding.bottom);
    if (padding.left !== undefined) s.paddingLeft = px(padding.left);
    if (padding.right !== undefined) s.paddingRight = px(padding.right);
    return s;
  }
  return {};
}

// ─────────────────────────────────────────────────────────────────────────────
// COLORS & MAPPING
// To avoid Tailwind purging, we map common names to hex OR return the name if it's a known Tailwind token.
// ─────────────────────────────────────────────────────────────────────────────
const COLOR_NAME_TO_HEX = {
  // Basic
  white: "#ffffff",
  black: "#000000",
  transparent: "transparent",
  // Green
  "green-50": "#f0fdf4",
  "green-100": "#dcfce7",
  "green-200": "#bbf7d0",
  "green-300": "#86efac",
  "green-400": "#4ade80",
  "green-500": "#22c55e",
  "green-600": "#16a34a",
  "green-700": "#15803d",
  // Red
  "red-50": "#fef2f2",
  "red-100": "#fee2e2",
  "red-200": "#fecaca",
  "red-300": "#fca5a5",
  "red-400": "#f87171",
  "red-500": "#ef4444",
  "red-600": "#dc2626",
  "red-700": "#b91c1c",
  // Blue
  "blue-50": "#eff6ff",
  "blue-100": "#dbeafe",
  "blue-200": "#bfdbfe",
  "blue-300": "#93c5fd",
  "blue-400": "#60a5fa",
  "blue-500": "#3b82f6",
  "blue-600": "#2563eb",
  "blue-700": "#1d4ed8",
  // Gray
  "gray-50": "#f9fafb",
  "gray-100": "#f3f4f6",
  "gray-200": "#e5e7eb",
  "gray-300": "#d1d5db",
  "gray-400": "#9ca3af",
  "gray-500": "#6b7280",
  "gray-600": "#4b5563",
  "gray-700": "#374151",
};

const SEMANTIC_COLOR_MAP = {
  default: "text-current",
  inherit: "text-inherit",
  muted: "text-base-content/60",
  dim: "text-base-content/50",
  subtle: "text-base-content/40",
  primary: "text-primary",
  accent: "text-accent",
  secondary: "text-secondary",
  success: "text-success",
  error: "text-error",
  warning: "text-warning",
};

/**
 * Returns { className, style } for a color value (text color)
 */
export function resolveColor(color, fallback = "") {
  if (!color) return { className: fallback, style: {} };

  // Semantic maps
  if (SEMANTIC_COLOR_MAP[color]) return { className: SEMANTIC_COLOR_MAP[color], style: {} };

  // Alpha-N
  const alphaMatch = /^alpha-(\d+)$/.exec(color);
  if (alphaMatch) {
    return { className: "", style: { color: `rgba(255,255,255,${parseInt(alphaMatch[1], 10) / 100})` } };
  }

  // Hex / RGB / Color Name
  const hex = COLOR_NAME_TO_HEX[color];
  if (hex || /^#|^rgb|^hsl/.test(color)) {
    return { className: "", style: { color: hex || color } };
  }

  // Default to a class (though it might be purged if not common)
  return { className: `text-${color}`, style: {} };
}

// ─────────────────────────────────────────────────────────────────────────────
// BACKGROUND
// ─────────────────────────────────────────────────────────────────────────────
const SEMANTIC_BG_MAP = {
  "base-100": "bg-base-100",
  "base-200": "bg-base-200",
  "base-300": "bg-base-300",
  primary: "bg-primary/10",
  accent: "bg-accent/10",
  secondary: "bg-secondary/10",
  success: "bg-success/10",
  error: "bg-error/10",
  warning: "bg-warning/10",
  surface: "bg-base-100",
  "surface-elevated": "bg-base-100 shadow-xl",
  "surface-secondary": "bg-base-200/50",
  "surface-variant": "bg-base-300/40",
  glass: "bg-white/10 backdrop-blur-md border border-white/20",
  "glass-dark": "bg-black/20 backdrop-blur-md border border-white/10",
  transparent: "bg-transparent",
};

export function resolveBackground(bg) {
  if (!bg) return { className: "", style: {} };

  // CSS Gradients
  if (/^(linear|radial|conic)-gradient/.test(bg)) {
    return { className: "", style: { background: bg } };
  }

  // Alpha-N
  const alphaMatch = /^alpha-(\d+)$/.exec(bg);
  if (alphaMatch) {
    return { className: "", style: { backgroundColor: `rgba(255,255,255,${parseInt(alphaMatch[1], 10) / 100})` } };
  }

  // Semantic maps
  if (SEMANTIC_BG_MAP[bg]) return { className: SEMANTIC_BG_MAP[bg], style: {} };

  // Hex / Color Name
  const hex = COLOR_NAME_TO_HEX[bg];
  if (hex || /^#|^rgb|^hsl/.test(bg)) {
    return { className: "", style: { backgroundColor: hex || bg } };
  }

  // Default to a class
  return { className: `bg-${bg}`, style: {} };
}

// ─────────────────────────────────────────────────────────────────────────────
// DIMENSIONS & RADIUS
// ─────────────────────────────────────────────────────────────────────────────
const ROUNDED_MAP = {
  none: "rounded-none",
  xs: "rounded-sm",
  sm: "rounded-md",
  md: "rounded-xl",
  lg: "rounded-2xl",
  xl: "rounded-3xl",
  "2xl": "rounded-[2rem]",
  full: "rounded-full",
};

export function resolveRounded(rounded, autoRound = false) {
  if (rounded) return ROUNDED_MAP[rounded] ?? `rounded-${rounded}`;
  return autoRound ? "rounded-2xl" : "";
}

export function resolveDimension(value) {
  if (value === undefined || value === null) return undefined;
  if (value === "full") return "100%";
  if (value === "auto") return "auto";
  if (typeof value === "number") return `${value}px`;

  // Map tailwind-like sizes (xs, sm, md, lg, xl, 2xl, 3xl) to px for Lucide
  const sizeMap = { xs: 12, sm: 16, md: 20, lg: 24, xl: 28, "2xl": 32, "3xl": 40, "4xl": 48 };
  if (sizeMap[value]) return sizeMap[value];

  return value; // "60%", "200px" etc.
}

// ─────────────────────────────────────────────────────────────────────────────
// BORDER & SHADOW & SAFE STYLE
// ─────────────────────────────────────────────────────────────────────────────
export function resolveBorder(border) {
  if (!border) return { className: "", style: {} };
  if (border === true) return { className: "border border-base-content/10", style: {} };
  if (typeof border === "object") {
    const style = {};
    const color = border.color || "rgba(var(--bc), 0.1)"; // fallback to semantic base-content
    const sides = { top: "borderTop", bottom: "borderBottom", left: "borderLeft", right: "borderRight", all: "border" };
    Object.entries(border).forEach(([k, v]) => {
      if (sides[k] && v) {
        const s = typeof v === "object" ? v.size || 1 : 1;
        style[sides[k]] = `${s}px solid ${color}`;
      }
    });
    return { className: "", style };
  }
  return { className: `border-${border}`, style: {} };
}

const SHADOW_MAP = {
  none: "",
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg shadow-black/5",
  xl: "shadow-xl shadow-black/10",
  "2xl": "shadow-2xl shadow-black/20",
};
export function resolveShadow(shadow) {
  if (!shadow) return "";
  return SHADOW_MAP[shadow] ?? `shadow-${shadow}`;
}

export function safeStyleObj(style) {
  return style && typeof style === "object" ? style : {};
}
