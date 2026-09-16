"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import { Check, CreditCard, ExternalLink, RefreshCw } from "lucide-react";
import {
  getBillingSubscription,
  startBillingCheckout,
  subscribeBilling,
  resumeBilling,
  retryBillingPayment,
  getBillingPortal,
} from "@/config/billingApi";
import { consumeCheckoutReturn, peekCheckoutReturnIntent, rememberCheckoutReturn } from "@/utils/billingReturn";
import { PRO_FEATURES, STATUS_COPY, STATUS_PILL, TONE_CLASS } from "@/utils/subscriptionCardConstants";
import { formatPlanAmount, planIntervalLabel } from "@/utils/billingPrice";

// Polling schedule for the first charge, which settles via webhook: 5s → 30s
// backoff, about 5 minutes total so a lost webhook can't poll forever.
const POLL_MAX_ATTEMPTS = 20;

const errorMessage = (err, fallback) => err?.response?.data?.message || fallback;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" }) : null);

// Hoisted so React keeps the same element type between renders (an inline
// component would remount every button on each state change).
const ActionButton = ({ id, busy, onClick, children, className = "btn-outline" }) => (
  <button type="button" className={`btn btn-sm ${className}`} onClick={onClick} disabled={busy !== null}>
    {busy === id ? <span className="loading loading-spinner loading-xs" /> : null}
    {children}
  </button>
);

export default function SubscriptionCard({ onChanged, onAvailabilityChange }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [pollGaveUp, setPollGaveUp] = useState(false);
  const pollRef = useRef(null);
  const prevStatusRef = useRef(null);
  const handledReturnRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await getBillingSubscription();
      const data = res?.data ?? null;
      if (!data || typeof data.plan === "undefined") throw new Error("unexpected response");
      setView(data);
      setLoadError(null);
      setUnavailable(false);
      return data;
    } catch (err) {
      const code = err?.response?.status;
      if (code === 503 || code === 403 || code === 404) {
        setUnavailable(true);
      } else {
        setLoadError(errorMessage(err, "Could not load subscription details"));
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    onAvailabilityChange?.(!unavailable);
  }, [unavailable, onAvailabilityChange]);

  const refresh = useCallback(async () => {
    await load();
    onChanged?.();
  }, [load, onChanged]);

  // Stripe sends the user back with ?checkout=success once a card is saved.
  // If they left via "Upgrade to Pro", finish the subscription for them now.
  const checkoutResult = searchParams.get("checkout");
  useEffect(() => {
    if (!checkoutResult || handledReturnRef.current) return;
    handledReturnRef.current = true;

    const params = new URLSearchParams(searchParams.toString());
    params.delete("checkout");
    const qs = params.toString();
    router.replace(`${window.location.pathname}${qs ? `?${qs}` : ""}`);

    const intent = consumeCheckoutReturn()?.intent ?? null;

    if (checkoutResult !== "success") {
      toast.info("Checkout was cancelled. No changes were made.");
      load();
      return;
    }
    if (intent !== "subscribe") {
      toast.success("Card saved.");
      refresh();
      return;
    }
    (async () => {
      setBusy("subscribe");
      try {
        await subscribeBilling();
        toast.success("Card saved and subscription started. Pro activates as soon as the payment clears.");
      } catch (err) {
        // 409 = already subscribed / already pending; the refresh below shows the real state.
        if (err?.response?.status !== 409) {
          toast.error(errorMessage(err, "Card saved, but the subscription could not be started."));
        }
      } finally {
        setBusy(null);
        refresh();
      }
    })();
  }, [checkoutResult, load, refresh, router, searchParams]);

  const status = view?.billing?.status;

  // Fallback for a Stripe return that lost ?checkout=success (e.g. redirect URL
  // configured without it): the card is saved and a fresh "Upgrade to Pro" intent
  // is still stored, so finish the subscription the user asked for.
  useEffect(() => {
    if (checkoutResult || handledReturnRef.current || status !== "awaiting_card") return;
    if (peekCheckoutReturnIntent() !== "subscribe") return;
    handledReturnRef.current = true;
    consumeCheckoutReturn();
    (async () => {
      setBusy("subscribe");
      try {
        await subscribeBilling();
        toast.success("Subscription started. Pro activates as soon as the payment clears.");
      } catch (err) {
        if (err?.response?.status !== 409) {
          toast.error(errorMessage(err, "The subscription could not be started."));
        }
      } finally {
        setBusy(null);
        refresh();
      }
    })();
  }, [checkoutResult, status, refresh]);

  // Poll while the first charge settles. When the status moves on, tell the
  // parent so plan and wallet balance refresh too.
  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = status ?? null;
    if (prev === "pending_first_payment" && status && status !== "pending_first_payment") {
      onChanged?.();
    }
  }, [status, onChanged]);

  useEffect(() => {
    clearTimeout(pollRef.current);
    setPollGaveUp(false);
    if (status !== "pending_first_payment") return;
    let attempt = 0;
    let cancelled = false;
    const tick = async () => {
      attempt += 1;
      if (attempt > POLL_MAX_ATTEMPTS) {
        setPollGaveUp(true);
        return;
      }
      await load();
      if (cancelled) return;
      pollRef.current = setTimeout(tick, Math.min(5000 * attempt, 30000));
    };
    pollRef.current = setTimeout(tick, 5000);
    return () => {
      cancelled = true;
      clearTimeout(pollRef.current);
    };
  }, [status, load]);

  const run = async (key, fn, { successMsg, failMsg, redirect, intent } = {}) => {
    setBusy(key);
    try {
      const res = await fn();
      if (redirect) {
        if (!res?.data?.url) throw new Error("no redirect url");
        if (intent) rememberCheckoutReturn(intent);
        // Keep the button in its busy state while the browser navigates away.
        window.location.assign(res.data.url);
        return;
      }
      if (successMsg) toast.success(typeof successMsg === "function" ? successMsg(res?.data) : successMsg);
      await refresh();
      setBusy(null);
    } catch (err) {
      toast.error(errorMessage(err, failMsg));
      setBusy(null);
    }
  };

  const onUpgrade = () =>
    run("upgrade", startBillingCheckout, { redirect: true, intent: "subscribe", failMsg: "Could not start checkout" });
  const onSubscribe = () =>
    run("subscribe", subscribeBilling, {
      successMsg: "Subscription started. We'll activate Pro as soon as the payment clears.",
      failMsg: "Could not start subscription",
    });
  const onResume = () =>
    run("resume", resumeBilling, { successMsg: "Subscription resumed.", failMsg: "Could not resume subscription" });
  const onRetry = () =>
    run("retry", retryBillingPayment, {
      successMsg: (d) => (d?.status === "already_paid" ? "This invoice was already paid." : "Payment retry requested."),
      failMsg: "Could not retry payment",
    });
  const onPortal = () => run("portal", getBillingPortal, { redirect: true, failMsg: "Could not open billing portal" });

  if (unavailable) return null;

  const billing = view?.billing ?? {};
  const onPaid = view?.plan === "paid";
  const cancelling = Boolean(billing.cancel_at_period_end);
  const banner = STATUS_COPY[billing.status] ?? null;
  const pill = onPaid && cancelling ? { label: "Cancelling", cls: "badge-warning" } : STATUS_PILL[billing.status];
  const periodEnd = fmtDate(billing.current_period_end);
  const graceUntil = fmtDate(billing.grace_until);
  const paidPlan = view?.paid_plan ?? {};
  const monthlyCredits = Number(paidPlan.monthly_credits ?? billing.monthly_credits) || null;
  const priceLabel = formatPlanAmount(paidPlan.price);
  const intervalLabel = planIntervalLabel(paidPlan.price);
  const paidPlanName = paidPlan.display_name || "Pro";
  const showPaymentError =
    billing.last_payment_error?.message && (billing.status === "past_due" || billing.status === "card_failed");
  const showUpgrade = !onPaid && view?.can_checkout && !view?.can_subscribe;
  const polling = billing.status === "pending_first_payment";

  return (
    <section className="rounded-2xl border border-base-200 bg-base-100 p-6 shadow-sm">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CreditCard className="h-4 w-4" />
          </span>
          <h2 className="text-base font-semibold text-base-content">Subscription</h2>
        </div>
        {!loading && !loadError && (
          <div className="flex items-center gap-2">
            {pill && <span className={`badge badge-sm badge-outline ${pill.cls}`}>{pill.label}</span>}
            <span className={`badge ${onPaid ? "badge-primary" : "badge-ghost"}`}>{onPaid ? "Pro" : "Free"}</span>
          </div>
        )}
      </header>

      {loading ? (
        <div className="mt-6 flex items-center gap-3 text-sm text-base-content/50">
          <span className="loading loading-spinner loading-sm" /> Loading subscription…
        </div>
      ) : loadError ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-error">
          {loadError}
          <button type="button" className="btn btn-xs btn-ghost" onClick={load}>
            Retry
          </button>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-5">
          {banner && (
            <div className={`rounded-lg px-3 py-2.5 text-sm font-medium ${TONE_CLASS[banner.tone]}`}>
              <p>
                {banner.text}
                {billing.status === "past_due" && graceUntil && ` Access continues until ${graceUntil}.`}
              </p>
              {showPaymentError && (
                <p className="mt-1 text-xs font-normal opacity-80">Stripe said: {billing.last_payment_error.message}</p>
              )}
              {polling && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs font-normal opacity-80">
                  {pollGaveUp ? (
                    <>
                      Still waiting on the payment provider.
                      <button type="button" className="link inline-flex items-center gap-1" onClick={load}>
                        <RefreshCw className="h-3 w-3" /> Check again
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="loading loading-spinner loading-xs" /> Checking for the payment automatically…
                    </>
                  )}
                </p>
              )}
            </div>
          )}

          {billing.requires_action_url && (
            <a className="btn btn-sm btn-warning w-fit" href={billing.requires_action_url}>
              Complete card verification <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}

          <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-start">
            <div>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="text-sm font-medium text-base-content/70">{paidPlanName} plan</p>
                {onPaid && periodEnd && (
                  <p className="text-xs text-base-content/50">
                    {cancelling ? "Ends" : "Renews"} {periodEnd}
                  </p>
                )}
              </div>
              <p className="mt-1 text-3xl font-semibold leading-none tracking-tight">
                {priceLabel ?? <span className="text-base-content/40">—</span>}
                <span className="text-sm font-normal text-base-content/50"> / {intervalLabel}</span>
              </p>
              <ul className="mt-4 space-y-1.5 text-sm text-base-content/70">
                {[
                  monthlyCredits ? `${monthlyCredits.toLocaleString()} credits topped up every month` : PRO_FEATURES[0],
                  ...PRO_FEATURES.slice(1),
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-2 md:min-w-[200px]">
              {showUpgrade && (
                <ActionButton id="upgrade" busy={busy} onClick={onUpgrade} className="btn-primary">
                  Upgrade to Pro
                </ActionButton>
              )}
              {view?.can_subscribe && (
                <ActionButton id="subscribe" busy={busy} onClick={onSubscribe} className="btn-primary">
                  Complete subscription
                </ActionButton>
              )}
              {view?.can_retry && (
                <ActionButton id="retry" busy={busy} onClick={onRetry} className="btn-primary">
                  Retry payment
                </ActionButton>
              )}
              {view?.can_resume && (
                <ActionButton id="resume" busy={busy} onClick={onResume} className="btn-primary">
                  Resume subscription
                </ActionButton>
              )}
              {view?.can_manage && (
                <ActionButton id="portal" busy={busy} onClick={onPortal}>
                  Invoices & usage <ExternalLink className="h-3.5 w-3.5" />
                </ActionButton>
              )}
            </div>
          </div>

          {showUpgrade && (
            <p className="text-xs text-base-content/50">
              You'll be taken to Stripe to add your card. Once it's saved you'll come back here and the first
              {priceLabel ? ` ${priceLabel}` : " payment"} is charged automatically.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
