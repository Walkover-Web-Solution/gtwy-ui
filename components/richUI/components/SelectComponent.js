"use client";
import { useState } from "react";
import { resolveColor, safeStyleObj } from "../styleUtils";

/**
 * SelectComponent
 */
export default function SelectComponent({
  name,
  label,
  options = [],
  defaultValue,
  variant = "ghost",
  size = "sm",
  disabled = false,
  color,
  placeholder,
  align = "end",
  width,
  className = "",
  style,
  onAction,
}) {
  const safeStyle = safeStyleObj(style);
  const [value, setValue] = useState(defaultValue ?? "");

  const variantMap = {
    bordered: "select-bordered",
    ghost: "select-ghost bg-base-200/60",
    outline: "select-bordered border-2",
    primary: "select-primary",
    accent: "select-accent",
  };

  const sizeMap = { xs: "select-xs", sm: "select-sm", md: "", lg: "select-lg" };

  const widthStyle =
    width === "full" ? { width: "100%" } : width ? { width: typeof width === "number" ? `${width}px` : width } : {};

  const { className: colorCls, style: colorStyle } = resolveColor(color);

  function handleChange(e) {
    const newVal = e.target.value;
    setValue(newVal);
    onAction?.({ type: "selectChange", name, value: newVal });
  }

  return (
    <div
      className={`flex flex-col ${align === "end" ? "items-end" : align === "center" ? "items-center" : "items-start"} ${className}`}
      style={{ ...widthStyle, ...safeStyle }}
    >
      {label && <label className="label-text text-xs font-semibold text-base-content/50 mb-0.5 block">{label}</label>}
      <select
        value={value}
        onChange={handleChange}
        disabled={disabled}
        className={`
                    select ${variantMap[variant] ?? "select-ghost"}
                    ${sizeMap[size] ?? "select-sm"}
                    ${colorCls}
                    rounded-xl font-medium
                    focus:outline-none focus:ring-2 focus:ring-primary/30
                    transition-all duration-150
                    disabled:opacity-50 disabled:cursor-not-allowed
                    max-w-xs
                `}
        style={{ ...widthStyle, ...colorStyle, textAlignLast: align === "end" ? "right" : "left" }}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
