export const PRO_FEATURES = [
  "Monthly credit top-up",
  "Access to every model",
  "Invoices & usage in the billing portal",
];

export const STATUS_COPY = {
  awaiting_card: { tone: "info", text: "Your card is saved. Complete the subscription to activate Pro." },
  pending_first_payment: {
    tone: "info",
    text: "Your first payment is being processed. This usually takes under a minute.",
  },
  past_due: { tone: "warning", text: "Your last renewal payment failed. Update your card and retry to keep Pro." },
  canceled: { tone: "neutral", text: "Your Pro subscription has ended. This workspace is on the Free plan." },
  card_failed: {
    tone: "error",
    text: "Your first payment failed and the workspace stayed on Free. Update your card and try again.",
  },
};

export const STATUS_PILL = {
  active: { label: "Active", cls: "badge-success" },
  pending_first_payment: { label: "Payment pending", cls: "badge-info" },
  awaiting_card: { label: "Card saved", cls: "badge-info" },
  past_due: { label: "Past due", cls: "badge-warning" },
  card_failed: { label: "Payment failed", cls: "badge-error" },
};

export const TONE_CLASS = {
  info: "bg-info/10 text-info",
  warning: "bg-warning/10 text-warning",
  error: "bg-error/10 text-error",
  neutral: "bg-base-200 text-base-content/70",
};
