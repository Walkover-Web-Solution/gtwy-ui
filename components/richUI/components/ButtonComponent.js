"use client";
import { resolveAction } from "@/utils/templateEngine";

export default function ButtonComponent({
  label = "Button",
  variant = "primary",
  size = "sm",
  disabled = false,
  loading = false,
  // Declarative action (new)
  actionRef,
  actionDefs,
  scope, // injected by ListView when resolving an itemTemplate row
  // Legacy inline action
  onClickAction,
  payload, // node-level payload (used by onClickAction.type "submit")
  className = "",
  style,
  onAction,
}) {
  const safeStyle = style && typeof style === "object" ? style : {};
  const sizeMap = { xs: "btn-xs", sm: "btn-sm", md: "", lg: "btn-lg" };
  const variantMap = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    accent: "btn-accent",
    ghost: "btn-ghost",
    outline: "btn-outline",
    error: "btn-error",
    warning: "btn-warning",
    success: "btn-success",
    neutral: "btn-neutral",
  };

  const handleClick = async () => {
    if (disabled || loading) return;

    // ── Declarative actionRef path ───────────────────────────────────────
    if (actionRef) {
      const resolved = resolveAction(actionRef, actionDefs, scope ?? {});
      if (!resolved) return;

      switch (resolved.type) {
        case "reply":
          onAction?.({ type: "reply", text: resolved.value ?? label });
          return;

        case "event":
          onAction?.({
            type: "event",
            name: resolved.name,
            target: resolved.target,
            payload: resolved.payload ?? {},
          });
          // Also forward to parent window for embed contexts
          if (typeof window !== "undefined") {
            window.parent?.postMessage(
              {
                type: "GTWY_ACTION",
                name: resolved.name,
                target: resolved.target,
                payload: resolved.payload ?? {},
              },
              "*"
            );
          }
          return;

        default:
          console.warn("[ButtonComponent] Unknown resolved action type:", resolved.type);
          return;
      }
    }

    // ── Legacy inline onClickAction path ─────────────────────────────────
    if (!onClickAction) {
      return;
    }
    // `payload` prop = node-level payload (sibling of onClickAction in the JSON tree)
    const { type: actionType } = onClickAction;

    switch (actionType) {
      case "reply":
        onAction?.({ type: "reply", text: payload?.text ?? label, payload });
        break;

      case "sendDataToFrontend":
      // treat "submit" as an alias for sendDataToFrontend
      case "submit":
        if (typeof window !== "undefined") {
          window.parent?.postMessage({ type: "GTWY_ACTION", payload }, "*");
        }
        onAction?.({ type: "sendDataToFrontend", payload });
        break;

      default:
        console.warn("[ButtonComponent] Unknown onClickAction type:", actionType);
    }
  };

  const fullWidthCls = className?.includes("w-full") ? "w-full" : "";

  return (
    <button
      type="button"
      className={`
                btn ${variantMap[variant] ?? "btn-primary"} ${sizeMap[size] ?? "btn-sm"}
                ${loading ? "loading loading-spinner" : ""}
                rounded-xl font-medium tracking-wide transition-all duration-150
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-current
                ${fullWidthCls}
                ${className}
            `}
      style={safeStyle}
      disabled={disabled || loading}
      onClick={handleClick}
    >
      {!loading && label}
    </button>
  );
}
