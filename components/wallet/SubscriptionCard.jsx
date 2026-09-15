"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import { CreditCard } from "lucide-react";
import {
  getBillingSubscription,
  startBillingCheckout,
  subscribeBilling,
  cancelBilling,
  resumeBilling,
  retryBillingPayment,
  getBillingPortal,
} from "@/config/billingApi";
import { consumeCheckoutReturn, rememberCheckoutReturn } from "@/utils/billingReturn";

const PAID_PRICE_USD = 20;

const STATUS_COPY = {
  none: null,
  awaiting_card: { tone: "info", text: "Your card is saved. Complete the subscription to activate Pro." },
  pending_first_payment: {
    tone: "info",
    text: "Your first payment is being processed. This usually takes under a minute.",
  },
  active: null,
  past_due: { tone: "warning", text: "Your last renewal payment failed. Update your card and retry to keep Pro." },
  canceled: { tone: "neutral", text: "Your Pro subscription has ended. This workspace is on the Free plan." },
  card_failed: {
    tone: "error",
    text: "Your first payment failed and the workspace stayed on Free. Update your card and try again.",
  },
};

const TONE_CLASS = {
  info: "bg-info/10 text-info",
  warning: "bg-warning/10 text-warning",
  error: "bg-error/10 text-error",
  neutral: "bg-base-200 text-base-content/70",
};

const errorMessage = (err, fallback) => err?.response?.data?.message || fallback;

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" }) : null);

export default function SubscriptionCard({ onChanged }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [busy, setBusy] = useState(null);
  const cancelDialogRef = useRef(null);
  const pollRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await getBillingSubscription();
      const data = res?.data ?? null;
      if (!data || typeof data.plan === "undefined") throw new Error("unexpected response");
      setView(data);
      setLoadError(null);
      setUnavailable(false);
    } catch (err) {
      const code = err?.response?.status;
      if (code === 503 || code === 403 || code === 404) {
        setUnavailable(true);
      } else {
        setLoadError(errorMessage(err, "Could not load subscription details"));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(async () => {
    await load();
    onChanged?.();
  }, [load, onChanged]);

  // Stripe sends the user back here with ?checkout=success once a card is saved.
  // If they left via "Upgrade to Pro", finish the subscription for them now.
  const checkoutResult = searchParams.get("checkout");
  useEffect(() => {
    if (!checkoutResult) return;
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
      load();
      return;
    }
    (async () => {
      setBusy("subscribe");
      try {
        await subscribeBilling();
        toast.success("Card saved and subscription started. Pro activates as soon as the payment clears.");
      } catch (err) {
        if (err?.response?.status !== 409)
          toast.error(errorMessage(err, "Card saved, but the subscription could not be started."));
      } finally {
        setBusy(null);
        refresh();
      }
    })();
  }, [checkoutResult, load, refresh, router, searchParams]);

  // The first charge settles via webhook, so poll until the status moves —
  // 5s → 30s backoff, give up after ~5 minutes so a missing webhook can't poll forever.
  const status = view?.billing?.status;
  useEffect(() => {
    clearTimeout(pollRef.current);
    if (status !== "pending_first_payment") return;
    let attempt = 0;
    const tick = async () => {
      attempt += 1;
      if (attempt > 20) return;
      await load();
      pollRef.current = setTimeout(tick, Math.min(5000 * attempt, 30000));
    };
    pollRef.current = setTimeout(tick, 5000);
    return () => clearTimeout(pollRef.current);
  }, [status, load]);

  const run = async (key, fn, { successMsg, failMsg, redirect, intent } = {}) => {
    setBusy(key);
    try {
      const res = await fn();
      if (redirect && res?.data?.url) {
        if (intent) rememberCheckoutReturn(intent);
        window.location.assign(res.data.url);
        return;
      }
      if (successMsg) toast.success(typeof successMsg === "function" ? successMsg(res?.data) : successMsg);
      await refresh();
    } catch (err) {
      toast.error(errorMessage(err, failMsg));
    } finally {
      setBusy(null);
    }
  };

  const onCheckout = (intent = "card") =>
    run("checkout", startBillingCheckout, { redirect: true, intent, failMsg: "Could not start checkout" });
  const onUpgrade = () => onCheckout("subscribe");
  const onSubscribe = () =>
    run("subscribe", subscribeBilling, {
      successMsg: "Subscription started. We'll activate Pro as soon as the payment clears.",
      failMsg: "Could not start subscription",
    });
  const onCancel = () => {
    cancelDialogRef.current?.close();
    run("cancel", cancelBilling, {
      successMsg: (d) =>
        d?.deferred && d?.ends_at
          ? `Pro stays active until ${fmtDate(d.ends_at)}, then this workspace moves to Free.`
          : "Subscription cancelled.",
      failMsg: "Could not cancel subscription",
    });
  };
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
  const periodEnd = fmtDate(billing.current_period_end);
  const graceUntil = fmtDate(billing.grace_until);
  const monthlyCredits = billing.monthly_credits;

  const Btn = ({ k, onClick, children, className = "btn-outline" }) => (
    <button className={`btn btn-sm ${className}`} onClick={onClick} disabled={busy !== null}>
      {busy === k && <span className="loading loading-spinner loading-xs" />}
      {children}
    </button>
  );

  return (
    <div className="rounded-2xl border border-base-200 bg-base-100 p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CreditCard className="h-4 w-4" />
          </span>
          <h2 className="text-base font-semibold text-base-content">Subscription</h2>
        </div>
        {!loading && (
          <span className={`badge ${onPaid ? "badge-primary" : "badge-ghost"}`}>
            {onPaid ? "Pro" : "Free"}
            {cancelling && " · cancelling"}
          </span>
        )}
      </div>

      {loading ? (
        <div className="mt-6 flex items-center gap-3 text-sm text-base-content/50">
          <span className="loading loading-spinner loading-sm" /> Loading subscription…
        </div>
      ) : loadError ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-error">
          {loadError}
          <button className="btn btn-xs btn-ghost" onClick={load}>
            Retry
          </button>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-5">
          {banner && (
            <p className={`rounded-lg px-3 py-2 text-sm font-medium ${TONE_CLASS[banner.tone]}`}>
              {banner.text}
              {billing.status === "past_due" && graceUntil && ` Access continues until ${graceUntil}.`}
            </p>
          )}

          {billing.last_payment_error?.message &&
            (billing.status === "past_due" || billing.status === "card_failed") && (
              <p className="text-xs text-base-content/50">Stripe said: {billing.last_payment_error.message}</p>
            )}

          {billing.requires_action_url && (
            <a className="btn btn-sm btn-warning w-fit" href={billing.requires_action_url}>
              Complete card verification
            </a>
          )}

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-base-content/50">Pro plan</p>
              <p className="mt-1 text-2xl font-semibold leading-none tracking-tight">
                ${PAID_PRICE_USD}
                <span className="text-sm font-normal text-base-content/50"> / month</span>
              </p>
              {monthlyCredits && (
                <p className="mt-1.5 text-sm text-base-content/50">
                  {Number(monthlyCredits).toLocaleString()} credits topped up every month, plus access to all models.
                </p>
              )}
            </div>
            {onPaid && periodEnd && (
              <p className="text-xs text-base-content/50">
                {cancelling ? "Ends" : "Renews"} {periodEnd}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {!onPaid && view?.can_checkout && !view?.can_subscribe && (
              <Btn k="checkout" onClick={onUpgrade} className="btn-primary">
                Upgrade to Pro
              </Btn>
            )}
            {view?.can_subscribe && (
              <Btn k="subscribe" onClick={onSubscribe} className="btn-primary">
                Complete subscription
              </Btn>
            )}
            {view?.can_retry && (
              <Btn k="retry" onClick={onRetry} className="btn-primary">
                Retry payment
              </Btn>
            )}
            {view?.can_resume && (
              <Btn k="resume" onClick={onResume} className="btn-primary">
                Resume subscription
              </Btn>
            )}
            {view?.can_checkout && (billing.has_payment_method || onPaid || view?.can_subscribe) && (
              <Btn k="checkout" onClick={() => onCheckout("card")}>
                {billing.has_payment_method ? "Update card" : "Add card"}
              </Btn>
            )}
            {view?.can_manage && (
              <Btn k="portal" onClick={onPortal}>
                Invoices & usage
              </Btn>
            )}
            {view?.can_cancel && (
              <Btn k="cancel" onClick={() => cancelDialogRef.current?.showModal()} className="btn-ghost text-error">
                Cancel subscription
              </Btn>
            )}
          </div>

          {!onPaid && !view?.can_subscribe && (
            <p className="text-xs text-base-content/40">
              You'll be taken to Stripe to add your card. Once it's saved you'll come back here and the first $
              {PAID_PRICE_USD} is charged automatically.
            </p>
          )}
        </div>
      )}

      <dialog ref={cancelDialogRef} className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-semibold">Cancel Pro subscription?</h3>
          <p className="py-3 text-sm text-base-content/70">
            Pro stays active until the end of the current billing period
            {periodEnd ? ` (${periodEnd})` : ""}. After that the workspace moves to the Free plan. Remaining credits are
            kept. You can resume any time before then.
          </p>
          <div className="modal-action">
            <button className="btn btn-sm btn-ghost" onClick={() => cancelDialogRef.current?.close()}>
              Keep Pro
            </button>
            <button className="btn btn-sm btn-error" onClick={onCancel}>
              Cancel subscription
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </div>
  );
}
