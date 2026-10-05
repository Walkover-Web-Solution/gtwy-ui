const INTERVAL_LABEL = { weekly: "week", monthly: "month", quarterly: "quarter", yearly: "year" };

// price = { amount_cents, currency, interval } as returned by the billing API; null when Lago is unreachable.
export const formatPlanAmount = (price) => {
  if (!price || !Number.isFinite(Number(price.amount_cents))) return null;
  const amount = Number(price.amount_cents) / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: price.currency || "USD",
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount} ${price.currency || ""}`.trim();
  }
};

export const planIntervalLabel = (price) => INTERVAL_LABEL[price?.interval] ?? "month";
