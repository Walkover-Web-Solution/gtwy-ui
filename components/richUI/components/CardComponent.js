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
 * CardComponent
 */
export default function CardComponent({
  children,
  variant = "elevated",
  size = "md",
  theme,
  padding,
  color,
  bg,
  background,
  shadow,
  rounded = "xl",
  border,
  confirm,
  cancel,
  className = "",
  style,
  renderNode: RNode,
  onAction,
}) {
  const safeStyle = safeStyleObj(style);
  const resolvedBg = background ?? bg;

  const isDark = theme === "dark";
  const themeCls = isDark ? "text-white" : "";

  const { className: bgCls, style: bgStyle } = resolveBackground(resolvedBg);

  const variantPresets = {
    elevated: { bgCls2: "bg-base-100", shadowCls2: "shadow-lg", borderCls2: "border border-base-200/60" },
    outlined: { bgCls2: "bg-base-100", shadowCls2: "", borderCls2: "border-2 border-base-300" },
    flat: { bgCls2: "bg-base-200", shadowCls2: "", borderCls2: "" },
    ghost: { bgCls2: "bg-transparent", shadowCls2: "", borderCls2: "" },
  };
  const preset = variantPresets[variant] ?? variantPresets.elevated;

  const finalBgCls = bgCls || preset.bgCls2;
  const shadowCls = shadow ? resolveShadow(shadow) : preset.shadowCls2;

  const { className: colorCls, style: colorStyle } = resolveColor(color);

  const { className: borderCls, style: borderStyle } =
    border !== undefined ? resolveBorder(border) : { className: preset.borderCls2, style: {} };

  const roundedCls = resolveRounded(rounded, false) || "rounded-2xl";

  const defaultPaddingBySize = { xs: "xs", sm: "sm", md: "md", lg: "lg" };
  const resolvedPadding = padding !== undefined ? padding : (defaultPaddingBySize[size] ?? "md");
  const padStyle = resolvePadding(resolvedPadding);

  const hasFooter = confirm || cancel;

  return (
    <div
      className={`
                overflow-hidden transition-all duration-300
                ${roundedCls} ${finalBgCls} ${shadowCls} ${borderCls} ${themeCls} ${colorCls}
                ${className}
            `}
      style={{ ...bgStyle, ...borderStyle, ...colorStyle, ...safeStyle }}
    >
      <div
        className="flex flex-col"
        style={{
          ...padStyle,
          gap: size === "xs" ? "8px" : size === "sm" ? "12px" : "16px",
        }}
      >
        {Array.isArray(children)
          ? children.map((child, i) => <RNode key={child?.id ?? i} node={child} onAction={onAction} />)
          : children && <RNode node={children} onAction={onAction} />}
      </div>

      {hasFooter && (
        <div
          className={`
                        flex items-center justify-end gap-3 px-5 py-4 border-t 
                        ${isDark ? "bg-white/5 border-white/10" : "bg-base-200/30 border-base-200"}
                    `}
        >
          {cancel && (
            <button
              type="button"
              className={`btn btn-sm rounded-xl font-semibold transition-transform active:scale-95 ${isDark ? "btn-ghost text-white/70 hover:bg-white/10" : "btn-ghost text-base-content/70"}`}
              onClick={() => onAction?.({ ...(cancel.action ?? {}), type: cancel.action?.type ?? "request.discard" })}
            >
              {cancel.label ?? "Cancel"}
            </button>
          )}
          {confirm && (
            <button
              type="button"
              className={`btn btn-sm rounded-xl font-bold shadow-md hover:shadow-lg transition-all active:scale-95 ${isDark ? "bg-white text-black hover:bg-white/90 border-0" : "btn-primary"}`}
              onClick={() => onAction?.({ ...(confirm.action ?? {}), type: confirm.action?.type ?? "request.submit" })}
            >
              {confirm.label ?? "Confirm"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
