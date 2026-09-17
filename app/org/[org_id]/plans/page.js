"use client";
import { useParams } from "next/navigation";
import React, { Suspense, useCallback, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { Check, CreditCard, ExternalLink, RefreshCw, AlertTriangle, X } from "lucide-react";
import { getMyPlan, getPlans } from "@/config/walletApi";
import { getPlanAction } from "@/store/action/planAction";
import { getWalletAction } from "@/store/action/walletAction";
import { useCustomSelector } from "@/customHooks/customSelector";
import useSubscription from "@/customHooks/useSubscription";
import { formatPlanAmount, planIntervalLabel } from "@/utils/billingPrice";

export const runtime = "edge";

const isPaidPlan = (code) => typeof code === "string" && code.toLowerCase().includes("paid");

const STATUS_COPY = {
  awaiting_card: { text: "Your card is saved. Complete the subscription to activate Pro." },
  pending_first_payment: { text: "Your first payment is being processed. This usually takes under a minute." },
  past_due: { text: "Your last renewal payment failed. Update your card and retry to keep Pro." },
  canceled: { text: "Your Pro subscription has ended. This workspace is on the Free plan." },
  card_failed: { text: "Your first payment failed and the workspace stayed on Free. Update your card and try again." },
};

function StatusBanner({ sub }) {
  const { view, status, busy, pollGaveUp, onRetry, load } = sub;
  const billing = view?.billing ?? {};
  const isError = status === "card_failed" || status === "past_due";

  // A dismissed error stays hidden only for this exact error — a fresh failure
  // (new status, or the same status recurring after a retry) shows again.
  const [dismissedKey, setDismissedKey] = useState(null);
  const errorKey = isError ? `${status}:${billing.last_payment_error?.message ?? ""}` : null;
  useEffect(() => {
    if (!isError) setDismissedKey(null);
  }, [isError]);

  const copy = STATUS_COPY[status];
  if (!copy) return null;
  if (isError && dismissedKey === errorKey) return null;
  const graceUntil = billing.grace_until
    ? new Date(billing.grace_until).toLocaleDateString(undefined, { dateStyle: "medium" })
    : null;
  const showPaymentError = billing.last_payment_error?.message && isError;
  const polling = status === "pending_first_payment";

  return (
    <div
      className={`flex gap-3.5 rounded-2xl border p-4 ${
        isError ? "border-error/30 bg-error/10" : "border-base-200 bg-base-100"
      }`}
    >
      <div
        className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg ${
          isError ? "bg-error/20" : "bg-base-200"
        }`}
      >
        <AlertTriangle className={`h-3.5 w-3.5 ${isError ? "text-error" : "text-base-content/50"}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className={`mb-1 text-sm font-semibold ${isError ? "text-error" : "text-base-content"}`}>
          {copy.text}
          {status === "past_due" && graceUntil && ` Access continues until ${graceUntil}.`}
        </div>
        {showPaymentError && (
          <div className="text-xs text-error/80">Stripe said: {billing.last_payment_error.message}</div>
        )}
        {polling && (
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-base-content/60">
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
          </div>
        )}
        {status === "past_due" && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={busy !== null} onClick={onRetry} className="btn btn-sm btn-primary">
              {busy === "retry" ? "Retrying…" : "Retry payment"}
            </button>
          </div>
        )}
      </div>
      {isError && (
        <button
          type="button"
          onClick={() => setDismissedKey(errorKey)}
          className="btn btn-ghost btn-xs btn-square shrink-0"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export default function PlansPage() {
  return (
    <Suspense fallback={null}>
      <PlansPageInner />
    </Suspense>
  );
}

function PlansPageInner() {
  useParams(); // org_id comes from the route only for display context; the API resolves org from the auth token.
  const dispatch = useDispatch();
  const { wallet, loadingWallet } = useCustomSelector((state) => ({
    wallet: state.walletReducer?.data,
    loadingWallet: !state.walletReducer?.loaded,
  }));
  const [plan, setPlan] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [loadingPlans, setLoadingPlans] = useState(true);

  const loadWallet = useCallback(() => dispatch(getWalletAction()), [dispatch]);

  const loadPlan = useCallback(async () => {
    try {
      const res = await getMyPlan();
      setPlan(res?.data ?? null);
    } catch {
      setPlan(null);
    } finally {
      setLoadingPlan(false);
    }
  }, []);

  const loadPlans = useCallback(async () => {
    try {
      const res = await getPlans();
      setPlans(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setPlans([]);
    } finally {
      setLoadingPlans(false);
    }
  }, []);

  useEffect(() => {
    loadWallet();
    loadPlan();
    loadPlans();
  }, [loadWallet, loadPlan, loadPlans]);

  const onBillingChanged = useCallback(() => {
    loadWallet();
    loadPlan();
    dispatch(getPlanAction());
  }, [loadWallet, loadPlan, dispatch]);

  const sub = useSubscription({ onChanged: onBillingChanged });
  const billingAvailable = !sub.unavailable;

  const currentCredits = Number(wallet?.credits_ongoing_balance ?? 0);
  const grantedCredits = Number(wallet?.credits_balance ?? 0);
  const isNegative = currentCredits < 0;
  const consumed = Math.max(0, grantedCredits - currentCredits);
  const referenceTotal = grantedCredits > 0 ? grantedCredits : currentCredits + consumed;
  const percentRemaining = referenceTotal > 0 ? Math.max(0, Math.min(100, 100 - (consumed / referenceTotal) * 100)) : 0;
  const periodEnd = sub.view?.billing?.current_period_end
    ? new Date(sub.view.billing.current_period_end).toLocaleDateString(undefined, { dateStyle: "medium" })
    : null;
  // Same rule as the plan cards: don't advertise the paid plan as current until the
  // subscription is actually active, not just started.
  const planPendingConfirmation = isPaidPlan(plan?.plan) && sub.status !== "active";
  const currentPlanLabel = planPendingConfirmation
    ? plans.find((p) => !isPaidPlan(p.plan_code))?.display_name || "Free"
    : plan?.label;

  return (
    <main className="mx-auto flex max-w-[1000px] flex-col gap-6 p-6 pb-16">
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-[600px]">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[.14em] text-base-content/50">Billing</div>
          <h1 className="mb-2.5 text-[34px] font-bold leading-[1.1] tracking-[-.025em]">Plans &amp; Credits</h1>
          <p className="text-[14.5px] leading-[1.6] text-base-content/60">
            Usage is billed per call at actual provider cost, drawn from this workspace&apos;s credit balance.
            {billingAvailable && " Upgrade to Pro for a monthly top-up and access to every model."}
          </p>
        </div>
      </header>

      {billingAvailable && <StatusBanner sub={sub} />}

      <section className="relative overflow-hidden rounded-2xl border border-base-200 bg-base-100 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between">
          <div>
            <div className="mb-3 text-xs font-medium text-base-content/50">Current balance</div>
            <div className="flex items-baseline gap-2">
              {loadingWallet ? (
                <span className="loading loading-dots loading-sm" />
              ) : wallet === null ? (
                <span className="text-lg font-medium text-base-content/50">No wallet provisioned yet</span>
              ) : (
                <>
                  <span
                    className={`font-mono text-[46px] font-semibold leading-none tracking-[-.03em] ${
                      isNegative ? "text-error" : ""
                    }`}
                  >
                    {currentCredits.toLocaleString()}
                  </span>
                  <span className="text-sm text-base-content/50">credits</span>
                </>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="mb-1.5 text-xs text-base-content/50">Current plan</div>
            {loadingPlan ? (
              <span className="loading loading-dots loading-xs" />
            ) : (
              <span className="inline-block rounded-full border border-base-300 bg-base-200 px-3 py-1 text-[12.5px] font-semibold">
                {currentPlanLabel || "—"}
              </span>
            )}
          </div>
        </div>

        {wallet !== null && !loadingWallet && referenceTotal > 0 && (
          <div className="mt-6">
            <div className="mb-2 flex justify-between text-xs text-base-content/50">
              <span>Remaining this cycle</span>
              <span className="font-mono">
                {consumed.toLocaleString()} of {referenceTotal.toLocaleString()} used
              </span>
            </div>
            <div className="h-[7px] overflow-hidden rounded-full bg-base-200">
              <div
                className={`h-full rounded-full ${isNegative ? "bg-error" : "bg-primary"}`}
                style={{ width: `${percentRemaining}%` }}
              />
            </div>
          </div>
        )}

        {isNegative && (
          <p className="mt-4 rounded-lg bg-error/10 px-3 py-2.5 text-sm font-medium text-error">
            Balance is negative — new requests may be blocked until this workspace is topped up.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="text-[19px] font-semibold tracking-[-.015em]">Available plans</h2>
          <span className="text-[12.5px] text-base-content/50">Monthly pricing, cancel any time</span>
        </div>

        {loadingPlans ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="skeleton h-32 rounded-2xl" />
            ))}
          </div>
        ) : plans.length === 0 ? (
          <p className="text-sm text-base-content/60">No plans available.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {plans.map((p) => {
              const paid = isPaidPlan(p.plan_code);
              // For the paid plan, don't flip the UI over to "Current" until the subscription
              // is actually active — getMyPlan can report "paid" the moment checkout starts,
              // well before the first payment has actually cleared.
              const isCurrent = paid
                ? p.plan_code === plan?.plan && sub.status === "active"
                : p.plan_code === plan?.plan;
              const monthly = Number(p.monthly_credits) || null;
              const grant = Number(p.credit_grant) || null;
              const priceLabel =
                formatPlanAmount(p.price) ?? (paid ? null : formatPlanAmount({ amount_cents: 0, currency: "USD" }));
              const features = [
                paid && monthly ? `${monthly.toLocaleString()} credits topped up monthly` : null,
                !paid && grant ? `${grant.toLocaleString()} credits included` : null,
                paid ? "Access to every model" : "Pay-as-you-go at provider cost",
                paid ? "Invoices & usage in billing portal" : null,
              ].filter(Boolean);

              // The paid plan card's CTA is the real subscription action (wired through
              // useSubscription) instead of a second "Subscription" card duplicating it.
              let cta = null;
              if (isCurrent) {
                cta = { label: "Current plan", onClick: null, variant: "outline" };
              } else if (paid && billingAvailable) {
                if (sub.status === "card_failed") {
                  // The first payment failed outright — no subscription to retry or complete,
                  // the card itself needs to be replaced before trying again.
                  cta = {
                    label: sub.busy === "upgrade" ? "Redirecting…" : "Update card",
                    onClick: sub.onUpgrade,
                    variant: "primary",
                  };
                } else if (sub.status === "canceled" || sub.view?.can_retry) {
                  cta = {
                    label: sub.busy === "retry" ? "Retrying…" : "Retry payment",
                    onClick: sub.onRetry,
                    variant: "primary",
                  };
                } else if (sub.view?.can_resume) {
                  cta = {
                    label: sub.busy === "resume" ? "Resuming…" : "Resume subscription",
                    onClick: sub.onResume,
                    variant: "primary",
                  };
                } else if (sub.view?.can_subscribe) {
                  cta = {
                    label: sub.busy === "subscribe" ? "Completing…" : "Complete subscription",
                    onClick: sub.onSubscribe,
                    variant: "primary",
                  };
                } else {
                  cta = {
                    label: sub.busy === "upgrade" ? "Redirecting…" : "Upgrade to Pro",
                    onClick: sub.onUpgrade,
                    variant: "primary",
                  };
                }
              } else if (paid) {
                cta = { label: "Upgrade to Pro", onClick: null, variant: "outline" };
              } else {
                cta = { label: "Included", onClick: null, variant: "outline" };
              }

              return (
                <div
                  key={p.plan_code}
                  className={`relative flex flex-col overflow-hidden rounded-2xl border p-6 ${
                    paid
                      ? "border-primary/40 bg-primary/5 shadow-[0_0_0_1px_rgba(0,0,0,0.02)]"
                      : "border-base-200 bg-base-100"
                  }`}
                >
                  {paid && !isCurrent && (
                    <span className="absolute right-5 top-0 rounded-b-lg bg-primary px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[.05em] text-primary-content">
                      Recommended
                    </span>
                  )}
                  <div className="flex items-center gap-2.5">
                    <span className="text-base font-semibold">{p.display_name}</span>
                    {isCurrent && (
                      <span className="rounded-full border border-base-300 bg-base-200 px-2 py-0.5 text-[10.5px] font-semibold text-base-content/60">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="mt-[7px] min-h-[34px] text-[12.5px] leading-[1.5] text-base-content/50">
                    {paid ? "Monthly top-up and the full model garden." : p.description || ""}
                  </div>
                  <div className="mb-1 mt-4 flex items-baseline gap-1.5">
                    <span className="font-mono text-[38px] font-semibold leading-none tracking-[-.03em]">
                      {priceLabel ?? <span className="text-base-content/40">—</span>}
                    </span>
                    <span className="text-[13px] text-base-content/50">/ {planIntervalLabel(p.price)}</span>
                  </div>
                  <div className="h-4 text-[11.5px] text-base-content/40">
                    {paid ? "Billed monthly" : "No card required"}
                  </div>
                  <div className="my-5 flex flex-col gap-2.5">
                    {features.map((f) => (
                      <div key={f} className="flex items-start gap-2.5 text-[13px] leading-[1.45] text-base-content/70">
                        <Check className="mt-0.5 h-[15px] w-[15px] shrink-0 text-primary" strokeWidth={2.6} />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    disabled={!cta.onClick || sub.busy !== null}
                    onClick={cta.onClick ?? undefined}
                    className={`btn btn-sm mt-auto h-auto rounded-[10px] py-2.5 text-[13px] font-semibold ${
                      cta.variant === "primary" ? "btn-primary" : "btn-outline"
                    }`}
                  >
                    {cta.label}
                  </button>
                </div>
              );
            })}

            {/* Static "Scale" plan — no backend plan_code, always shown, opens Calendly. */}
            <div className="relative flex flex-col overflow-hidden rounded-2xl border border-base-200 bg-base-100 p-6">
              <div className="flex items-center gap-2.5">
                <span className="text-base font-semibold">Scale</span>
              </div>
              <div className="mt-[7px] min-h-[34px] text-[12.5px] leading-[1.5] text-base-content/50">
                Contracted volume, SSO and support SLAs.
              </div>
              <div className="mb-1 mt-4 flex items-baseline gap-1.5">
                <span className="font-mono text-[38px] font-semibold leading-none tracking-[-.03em]">Custom</span>
              </div>
              <div className="h-4 text-[11.5px] text-base-content/40">Annual agreement</div>
              <div className="my-5 flex flex-col gap-2.5">
                {["Committed credit pool", "SSO & audit logs", "Dedicated support channel"].map((f) => (
                  <div key={f} className="flex items-start gap-2.5 text-[13px] leading-[1.45] text-base-content/70">
                    <Check className="mt-0.5 h-[15px] w-[15px] shrink-0 text-primary" strokeWidth={2.6} />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                data-cal-namespace="30min"
                data-cal-link="human-gtwy-ai/book-a-demo-with-gtwy"
                data-cal-origin="https://cal.id"
                data-cal-config='{"layout":"month_view"}'
                className="btn btn-outline btn-sm mt-auto h-auto rounded-[10px] py-2.5 text-[13px] font-semibold"
              >
                Talk to sales
              </button>
            </div>
          </div>
        )}
      </section>

      {billingAvailable && (
        <section className="grid grid-cols-1 gap-4 rounded-2xl border border-base-200 bg-base-100 p-6 sm:grid-cols-[1fr_auto]">
          <div>
            <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold">
              <CreditCard className="h-4 w-4 text-base-content/50" />
              Manage billing
            </div>
            <div className="text-[12.5px] leading-[1.55] text-base-content/50">
              View invoices, update your card, or manage your subscription in the billing portal.
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={!sub.view?.can_manage}
              onClick={sub.onPortal}
              className="btn btn-outline btn-sm h-auto gap-1.5 rounded-[10px] py-2.5 text-[12.5px] font-semibold"
            >
              Invoices & usage
              <ExternalLink className="h-[13px] w-[13px]" />
            </button>
          </div>
        </section>
      )}

      {billingAvailable && sub.view?.plan === "paid" && sub.status !== "canceled" && (
        <section className="grid grid-cols-1 gap-4 rounded-2xl border border-base-200 bg-base-100 p-6 sm:grid-cols-[1fr_auto]">
          <div>
            <div className="text-sm font-semibold">Auto-renew</div>
            <div className="mt-1 text-[12.5px] leading-[1.55] text-base-content/50">
              {sub.view?.billing?.cancel_at_period_end
                ? `Off — Pro will end${periodEnd ? ` on ${periodEnd}` : " at the close of the current period"}.`
                : `On — your saved card is charged automatically each cycle${periodEnd ? `, next on ${periodEnd}` : ""}.`}
            </div>
          </div>
          <div className="flex items-center justify-end">
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={!sub.view?.billing?.cancel_at_period_end}
              disabled={sub.busy !== null}
              onChange={(e) => (e.target.checked ? sub.onResume() : sub.onCancelAutoRenew())}
              aria-label="Auto-renew"
            />
          </div>
        </section>
      )}

      <p className="text-sm text-base-content/60">
        {billingAvailable
          ? "Need more credits than Pro provides, or a custom plan? Reach out to your account contact."
          : "Need more credits or want to change your plan? Reach out to your account contact."}
      </p>
    </main>
  );
}
