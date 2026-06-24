"use client";

import React from "react";

const pillBase = [
  "inline-flex items-center gap-[6px]",
  "px-2.5 py-1",
  "rounded-md",
  "border",
  "cursor-pointer select-none",
  "transition-all duration-150",
].join(" ");

const pillInactive = [
  "bg-[var(--pill-bg)] hover:bg-[var(--pill-bg-hover)]",
  "border-base-content/10 hover:border-base-content/25",
].join(" ");

const pillActive = [
  "bg-trace-gold-bg hover:bg-trace-gold-bg/80",
  "border-trace-gold-border hover:border-trace-gold/50",
].join(" ");

export function ThreadActionPill({
  active = false,
  onClick,
  icon: Icon,
  children,
  badge,
  trailing: Trailing,
  trailingClassName = "",
  iconClassName = "",
  testId,
  id,
  className = "",
  type = "button",
  title,
  disabled = false,
}) {
  return (
    <button
      type={type}
      data-testid={testId}
      id={id}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`${pillBase} ${active ? pillActive : pillInactive} ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
    >
      {Icon ? (
        <Icon
          size={13}
          className={`shrink-0 ${active ? "text-trace-gold opacity-90" : "text-base-content/80"} ${iconClassName}`}
          strokeWidth={1.75}
        />
      ) : null}

      <span
        className={`text-xs font-semibold tracking-[0.06em] uppercase ${
          active ? "text-trace-gold" : "text-base-content/90"
        }`}
      >
        {children}
      </span>

      {badge != null ? (
        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-trace-gold/15 text-trace-gold shrink-0 ml-1 select-none">
          {badge}
        </span>
      ) : null}

      {Trailing ? (
        <Trailing
          size={13}
          className={`shrink-0 ${active ? "text-trace-gold opacity-80" : "text-base-content/60"} ${trailingClassName}`}
          strokeWidth={1.75}
        />
      ) : null}
    </button>
  );
}

/** Inline panel for variables — bg-base-100 with border rows. */
export function ThreadInlinePanel({ children, className = "" }) {
  return (
    <div
      className={`mt-2 block overflow-hidden rounded-xl border border-base-content/10 dark:border-base-content/20 dark:bg-base-200 ${className}`}
    >
      {children}
    </div>
  );
}

/** System prompt panel — bg-base-200 with muted readable text. */
export function ThreadSystemPromptPanel({ children, className = "" }) {
  return (
    <div
      className={`mt-2 block overflow-hidden rounded-xl border border-base-content/10 ${className}`}
      style={{ background: "var(--pill-bg)" }}
    >
      <div className="px-5 py-4 text-sm leading-relaxed text-base-content whitespace-pre-wrap break-words">
        {children}
      </div>
    </div>
  );
}
