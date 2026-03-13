"use client";
import { useState } from "react";
import { resolveColor, resolvePadding, safeStyleObj } from "../styleUtils";

/**
 * DatePickerComponent — simple inline date / date-range input.
 */
export default function DatePickerComponent({
  name,
  label,
  labelStart = "From",
  labelEnd = "To",
  placeholder = "YYYY-MM-DD",
  defaultValue,
  range = false,
  variant = "ghost",
  align = "start",
  disabled = false,
  min,
  max,
  color,
  padding,
  className = "",
  style,
  onAction,
}) {
  const safeStyle = safeStyleObj(style);

  /* ── Initial values ── */
  const initSingle = typeof defaultValue === "string" ? defaultValue : "";
  const initStart = defaultValue?.start ?? "";
  const initEnd = defaultValue?.end ?? "";

  const [singleVal, setSingleVal] = useState(initSingle);
  const [startVal, setStartVal] = useState(initStart);
  const [endVal, setEndVal] = useState(initEnd);

  /* ── Helpers ── */
  const variantMap = {
    bordered: "border-base-content/20 bg-transparent focus:border-primary/50",
    ghost: "border-transparent bg-base-content/10 focus:bg-base-content/20 focus:border-base-content/30",
    outline: "border-2 border-base-content/20 bg-transparent focus:border-primary/50",
  };

  const { className: colorCls, style: colorStyle } = resolveColor(color, "text-inherit");
  const padStyle = resolvePadding(padding);

  const inputCls = `
        px-3 py-1.5 text-sm rounded-xl outline-none transition-all
        border text-current appearance-none
        ${variantMap[variant] ?? variantMap.ghost}
        disabled:opacity-50 disabled:cursor-not-allowed
        w-full max-w-[160px]
        ${colorCls}
        scheme-dark:dark
    `;

  const labelCls = `text-[10px] font-bold text-base-content/40 uppercase tracking-tight mb-0.5 block`;

  /* ── Custom CSS for the native date icon to be white in dark theme ── */
  const colorFilterStyle = {
    filter: "invert(1) brightness(2)", // Makes the black calendar icon white
    colorScheme: "dark",
  };

  /* ── Dispatch helpers ── */
  function handleSingle(e) {
    const val = e.target.value;
    setSingleVal(val);
    onAction?.({ type: "dateChange", name, value: val });
  }

  function handleStart(e) {
    const val = e.target.value;
    setStartVal(val);
    onAction?.({ type: "dateChange", name, value: { start: val, end: endVal } });
  }

  function handleEnd(e) {
    const val = e.target.value;
    setEndVal(val);
    onAction?.({ type: "dateChange", name, value: { start: startVal, end: val } });
  }

  /* ── Render ── */
  if (range) {
    return (
      <div className={`flex flex-col ${className}`} style={{ ...padStyle, ...safeStyle }}>
        {label && (
          <span className={`text-xs font-semibold text-base-content/60 mb-2 ${align === "end" ? "text-right" : ""}`}>
            {label}
          </span>
        )}
        <div className={`flex items-center gap-2 ${align === "end" ? "justify-end" : "justify-start"}`}>
          <div className="flex flex-col">
            <label className={labelCls}>{labelStart}</label>
            <input
              type="date"
              value={startVal}
              min={min}
              max={endVal || max}
              disabled={disabled}
              onChange={handleStart}
              className={inputCls}
              style={{ ...colorStyle, ...colorFilterStyle }}
            />
          </div>
          <span className="text-base-content/20 mt-4 font-light">→</span>
          <div className="flex flex-col">
            <label className={labelCls}>{labelEnd}</label>
            <input
              type="date"
              value={endVal}
              min={startVal || min}
              max={max}
              disabled={disabled}
              onChange={handleEnd}
              className={inputCls}
              style={{ ...colorStyle, ...colorFilterStyle }}
            />
          </div>
        </div>
      </div>
    );
  }

  /* Single date */
  return (
    <div
      className={`flex flex-col ${align === "end" ? "items-end text-right" : "items-start text-left"} ${className}`}
      style={{ ...padStyle, ...safeStyle }}
    >
      {label && <label className={labelCls}>{label}</label>}
      <input
        type="date"
        value={singleVal}
        placeholder={placeholder}
        min={min}
        max={max}
        disabled={disabled}
        onChange={handleSingle}
        className={inputCls}
        style={{ ...colorStyle, ...colorFilterStyle, textAlign: align === "end" ? "right" : "left" }}
      />
    </div>
  );
}
