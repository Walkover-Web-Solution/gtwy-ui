const KEY = "billing_checkout_return";
const TTL_MS = 60 * 60 * 1000;

const safe = (fn) => {
  try {
    return fn();
  } catch {
    return null;
  }
};

// Lago only supports one static Stripe redirect URL, so remember where the user
// left from. localStorage survives Stripe opening in a new tab; sessionStorage is the
// same-tab fast path.
export const rememberCheckoutReturn = (intent) => {
  const payload = JSON.stringify({ intent, returnUrl: window.location.pathname, at: Date.now() });
  safe(() => sessionStorage.setItem(KEY, payload));
  safe(() => localStorage.setItem(KEY, payload));
};

export const consumeCheckoutReturn = () => {
  const raw = safe(() => sessionStorage.getItem(KEY)) ?? safe(() => localStorage.getItem(KEY));
  safe(() => sessionStorage.removeItem(KEY));
  safe(() => localStorage.removeItem(KEY));
  const parsed = safe(() => JSON.parse(raw));
  if (!parsed || Date.now() - parsed.at > TTL_MS) return null;
  return parsed;
};

const peek = () => {
  const raw = safe(() => sessionStorage.getItem(KEY)) ?? safe(() => localStorage.getItem(KEY));
  const parsed = safe(() => JSON.parse(raw));
  if (!parsed || Date.now() - parsed.at > TTL_MS) return null;
  return parsed;
};

export const peekCheckoutReturnUrl = () => {
  const parsed = peek();
  return typeof parsed?.returnUrl === "string" && parsed.returnUrl.startsWith("/org/") ? parsed.returnUrl : null;
};

export const peekCheckoutReturnIntent = () => peek()?.intent ?? null;
