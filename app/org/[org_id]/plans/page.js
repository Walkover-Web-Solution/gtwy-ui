"use client";
import { useParams } from "next/navigation";
import React, { Suspense, useCallback, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { Check, CreditCard, ExternalLink, RefreshCw, AlertTriangle, Loader2, X, Zap } from "lucide-react";
import { getMyPlan, getPlans, getCreditPacks, buyCredits, getRecentInvoices } from "@/config/walletApi";
import { getPlanAction } from "@/store/action/planAction";
import { getWalletAction } from "@/store/action/walletAction";
import { useCustomSelector } from "@/customHooks/customSelector";
import useSubscription from "@/customHooks/useSubscription";
import { formatPlanAmount, planIntervalLabel } from "@/utils/billingPrice";
import { rememberCheckoutReturn } from "@/utils/billingReturn";
import { toast } from "react-hot-toast";
import ConfirmationModal from "@/components/UI/ConfirmationModal";
import { MODAL_TYPE } from "@/utils/enums";
import { openModal, closeModal } from "@/utils/utility";

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
      className={`flex gap-3.5 rounded-2xl border p-4 ${isError ? "border-error/30 bg-error/10" : "border-base-300 bg-base-100"}`}
    >
      <div
        className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg ${
          isError ? "bg-error/20" : polling ? "bg-primary/10" : "bg-base-200"
        }`}
      >
        {polling ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
        ) : (
          <AlertTriangle className={`h-3.5 w-3.5 ${isError ? "text-error" : "text-base-content/50"}`} />
        )}
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
                <button type="button" className="link link-primary inline-flex items-center gap-1" onClick={load}>
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
            <button
              type="button"
              disabled={busy !== null}
              onClick={onRetry}
              className="h-auto rounded-[10px] border-0 bg-primary px-3.5 py-2 text-[13px] font-semibold text-primary-content disabled:opacity-60"
            >
              {busy === "retry" ? "Retrying…" : "Retry payment"}
            </button>
          </div>
        )}
      </div>
      {isError && (
        <button
          type="button"
          onClick={() => setDismissedKey(errorKey)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-0 bg-transparent text-error hover:bg-error/20"
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
  const [creditPacks, setCreditPacks] = useState(null);
  const [loadingPacks, setLoadingPacks] = useState(true);
  const [buyingUsd, setBuyingUsd] = useState(null);
  const [pendingPack, setPendingPack] = useState(null);
  const [invoices, setInvoices] = useState(null);
  const [loadingInvoices, setLoadingInvoices] = useState(true);

  const loadWallet = useCallback(() => dispatch(getWalletAction()), [dispatch]);

  const loadCreditPacks = useCallback(async () => {
    setLoadingPacks(true);
    try {
      const res = await getCreditPacks();
      setCreditPacks(res?.data ?? null);
    } catch {
      setCreditPacks(null);
    } finally {
      setLoadingPacks(false);
    }
  }, []);

  const confirmBuyCredits = useCallback((pack) => {
    setPendingPack(pack);
    openModal(MODAL_TYPE.BUY_CREDITS_MODAL);
  }, []);

  const handleBuyCredits = useCallback(
    async (usd) => {
      closeModal(MODAL_TYPE.BUY_CREDITS_MODAL);
      setBuyingUsd(usd);
      try {
        const res = await buyCredits(usd);
        // A card not yet on file gets a Stripe checkout link instead of an
        // immediate charge — same redirect dance as subscribe/upgrade: stash
        // where we left from (billing/page.js sends the user back here) then
        // hand the tab to Stripe.
        if (res?.data?.status === "payment_required" && res?.data?.url) {
          rememberCheckoutReturn("credits");
          window.location.assign(res.data.url);
          return;
        }
        toast.success(res?.message || "Card is being charged; credits arrive once it clears.");
        loadWallet();
      } catch (err) {
        toast.error(err?.response?.data?.message || "Could not start the purchase, please try again.");
      } finally {
        setBuyingUsd(null);
      }
    },
    [loadWallet]
  );

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

  const loadInvoices = useCallback(async () => {
    try {
      const res = await getRecentInvoices();
      setInvoices(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setInvoices(null);
    } finally {
      setLoadingInvoices(false);
    }
  }, []);

  useEffect(() => {
    loadWallet();
    loadPlan();
    loadPlans();
    loadCreditPacks();
    loadInvoices();
  }, [loadWallet, loadPlan, loadPlans, loadCreditPacks, loadInvoices]);

  const onBillingChanged = useCallback(() => {
    loadWallet();
    loadPlan();
    loadInvoices();
    dispatch(getPlanAction());
  }, [loadWallet, loadPlan, loadInvoices, dispatch]);

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
  // getMyPlan (Lago-enforced) is the source of truth for which plan the org is
  // actually on — the subscription status only adds context (the banner above,
  // and each plan card's CTA), it never overrides what plan is "current".
  const currentPlanLabel = plan?.label;

  return (
    <main className="min-h-screen bg-base-200 text-base-content">
      <div className="mx-auto flex max-w-[1000px] flex-col gap-6 p-6 pb-16">
        <header className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-[600px]">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[.14em] text-base-content/50">
              Billing
            </div>
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
                      className={`font-mono text-[46px] font-medium leading-none tracking-[-.03em] ${
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
              <progress
                className={`progress w-full ${isNegative ? "progress-error" : "progress-primary"}`}
                value={percentRemaining}
                max="100"
              />
              <div className="mt-2.5 text-[11.5px] text-base-content/40">Unused credits do not roll over</div>
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
                // getMyPlan (Lago-enforced) is the source of truth for the current plan;
                // see the comment on currentPlanLabel above.
                const isCurrent = p.plan_code === plan?.plan;
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
                  } else if (sub.status === "awaiting_card" && sub.view?.can_subscribe) {
                    // can_subscribe alone only means "a payment method is on file" — that also
                    // becomes true after buying a credit pack, which attaches a card without the
                    // customer ever starting a Pro checkout. Only "awaiting_card" means they did.
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
                      <span className="font-mono text-[38px] font-medium leading-none tracking-[-.03em]">
                        {priceLabel ?? <span className="text-base-content/40">—</span>}
                      </span>
                      <span className="text-[13px] text-base-content/50">/ {planIntervalLabel(p.price)}</span>
                    </div>
                    <div className="h-4 text-[11.5px] text-base-content/40">
                      {paid ? "Billed monthly" : "No card required"}
                    </div>
                    <div className="my-5 flex flex-col gap-2.5">
                      {features.map((f) => (
                        <div
                          key={f}
                          className="flex items-start gap-2.5 text-[13px] leading-[1.45] text-base-content/70"
                        >
                          <Check className="mt-0.5 h-[15px] w-[15px] shrink-0 text-primary" strokeWidth={2.6} />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      disabled={!cta.onClick || sub.busy !== null}
                      onClick={cta.onClick ?? undefined}
                      className={
                        cta.variant === "primary"
                          ? "mt-auto h-auto rounded-[10px] border-0 bg-primary py-2.5 text-[13px] font-semibold text-primary-content hover:brightness-110 disabled:opacity-60"
                          : "mt-auto h-auto cursor-default rounded-[10px] border border-base-content/25 bg-transparent py-2.5 text-[13px] font-semibold text-base-content opacity-60"
                      }
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
                  <span className="font-mono text-[38px] font-medium leading-none tracking-[-.03em]">Custom</span>
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
                  className="mt-auto h-auto rounded-[10px] border border-base-content/25 bg-transparent py-2.5 text-[13px] font-semibold text-base-content hover:bg-base-content hover:text-base-100"
                >
                  Talk to sales
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-base-200 bg-base-100 p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[19px] font-semibold tracking-[-.015em]">
                <Zap className="h-4 w-4 text-base-content/50" />
                Buy extra credits
              </div>
              <div className="mt-1 text-[12.5px] text-base-content/50">
                One-time purchase, paid through Stripe. Works on any plan.
              </div>
            </div>
            {creditPacks?.rate_per_credit && (
              <span className="font-mono text-xs text-base-content/50">
                {Math.round(1 / Number(creditPacks.rate_per_credit)).toLocaleString()} credits = $1.00
              </span>
            )}
          </div>

          {loadingPacks ? (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-[210px] rounded-2xl" />
              ))}
            </div>
          ) : !creditPacks?.packs?.length ? (
            <p className="mt-5 text-[12.5px] text-base-content/50">
              {creditPacks?.can_buy === false
                ? "Save a card to your workspace before buying extra credits."
                : "No credit packs are available on your current plan."}
            </p>
          ) : (
            <div className="mt-5 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
              {creditPacks.packs.map((pack, i) => {
                // A visual nudge toward a sensible middle tier — not a claim about price or
                // bonus credits, which the backend doesn't offer (every pack is a flat
                // credits = usd / rate, no tiered discount).
                const isSuggested =
                  creditPacks.packs.length > 2 && i === Math.floor((creditPacks.packs.length - 1) / 2);
                return (
                  <div
                    key={pack.usd}
                    className="relative flex flex-col items-center rounded-2xl border border-base-200 bg-base-200/40 px-4 py-8 text-center"
                  >
                    {isSuggested && (
                      <span className="absolute right-3 top-3 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.05em] text-primary-content">
                        Popular
                      </span>
                    )}
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-base-100 shadow-sm">
                      <Zap className="h-[26px] w-[26px] text-base-content/60" />
                    </span>
                    <span className="mt-5 text-[32px] font-bold leading-none tracking-[-.03em]">${pack.usd}</span>
                    <span className="mt-2 text-[15px] text-base-content/60">
                      {pack.credits.toLocaleString()} credits
                    </span>
                    <button
                      type="button"
                      disabled={!creditPacks.can_buy || buyingUsd !== null}
                      onClick={() => confirmBuyCredits(pack)}
                      className="mt-4 h-auto w-full rounded-lg border border-base-content/20 bg-base-100 py-2.5 text-[12.5px] font-semibold text-base-content hover:bg-base-content hover:text-base-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-base-100 disabled:hover:text-base-content"
                    >
                      {buyingUsd === pack.usd ? <span className="loading loading-spinner loading-xs" /> : "Buy now"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <p className="mt-4 text-[11.5px] text-base-content/45">
            Secured by Stripe · card charged once · credits land in your wallet instantly
          </p>

          {creditPacks?.can_buy === false && creditPacks?.packs?.length > 0 && (
            <p className="mt-3 text-[12px] text-base-content/40">Save a card to your workspace to enable purchases.</p>
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
                className="inline-flex h-auto items-center gap-1.5 rounded-[10px] border border-base-content/25 bg-transparent px-3.5 py-2.5 text-[12.5px] font-semibold text-base-content disabled:cursor-not-allowed disabled:opacity-45"
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
              <button
                type="button"
                role="switch"
                aria-checked={!sub.view?.billing?.cancel_at_period_end}
                aria-label="Auto-renew"
                disabled={sub.busy !== null}
                onClick={() => (sub.view?.billing?.cancel_at_period_end ? sub.onResume() : sub.onCancelAutoRenew())}
                className={`relative h-6 w-11 shrink-0 rounded-full border-0 p-0 transition-colors disabled:opacity-60 ${
                  sub.view?.billing?.cancel_at_period_end ? "bg-base-content/25" : "bg-primary"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-base-100 shadow transition-[left] ${
                    sub.view?.billing?.cancel_at_period_end ? "left-0.5" : "left-[22px]"
                  }`}
                />
              </button>
            </div>
          </section>
        )}

        {billingAvailable && invoices && invoices.length > 0 && (
          <section className="overflow-hidden rounded-2xl border border-base-200 bg-base-100">
            <div className="flex items-baseline justify-between px-6 pb-3 pt-5">
              <div className="text-sm font-semibold">Recent payments</div>
              <span className="text-xs text-base-content/50">Full history in the billing portal</span>
            </div>
            {loadingInvoices ? (
              <div className="skeleton m-6 h-16 rounded-xl" />
            ) : (
              invoices.map((inv) => (
                <div
                  key={inv.id ?? `${inv.date}-${inv.description}`}
                  className="grid grid-cols-[110px_1fr_auto_auto] items-center gap-4 border-t border-base-200 px-6 py-3 text-[13px]"
                >
                  <span className="text-base-content/60">
                    {inv.date ? new Date(inv.date).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—"}
                  </span>
                  <span>{inv.description}</span>
                  <span
                    className={`w-fit justify-self-start rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      inv.status === "Paid"
                        ? "bg-success/15 text-success"
                        : inv.status === "Failed"
                          ? "bg-error/12 text-error"
                          : "bg-base-200 text-base-content/70"
                    }`}
                  >
                    {inv.status}
                  </span>
                  <span className="min-w-16 text-right font-mono">
                    {formatPlanAmount({ amount_cents: inv.amount_cents, currency: inv.currency })}
                  </span>
                </div>
              ))
            )}
          </section>
        )}

        <p className="text-sm text-base-content/60">
          {billingAvailable
            ? "Need more credits than Pro provides, or a custom plan? Reach out to your account contact."
            : "Need more credits or want to change your plan? Reach out to your account contact."}
        </p>

        <ConfirmationModal
          modalType={MODAL_TYPE.BUY_CREDITS_MODAL}
          title="Buy credits"
          message={
            pendingPack
              ? `Add ${pendingPack.credits.toLocaleString()} credits to this workspace for $${pendingPack.usd}, charged to your saved card?`
              : ""
          }
          confirmText="Yes, buy credits"
          cancelText="Cancel"
          confirmButtonClass="btn-primary"
          onConfirm={() => pendingPack && handleBuyCredits(pendingPack.usd)}
          onCancel={() => closeModal(MODAL_TYPE.BUY_CREDITS_MODAL)}
          onClose={() => closeModal(MODAL_TYPE.BUY_CREDITS_MODAL)}
        />
      </div>
    </main>
  );
}
