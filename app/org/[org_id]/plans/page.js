"use client";
import { useParams } from "next/navigation";
import React, { Suspense, useCallback, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { WalletIcon } from "@/components/Icons";
import { getWalletBalance, getMyPlan, getPlans } from "@/config/walletApi";
import { getPlanAction } from "@/store/action/planAction";
import SubscriptionCard from "@/components/wallet/SubscriptionCard";
import { formatPlanAmount, planIntervalLabel } from "@/utils/billingPrice";

export const runtime = "edge";
const CREDIT_RATE_USD = 0.0025;

const isPaidPlan = (code) => typeof code === "string" && code.toLowerCase().includes("paid");

export default function PlansPage() {
  useParams(); // org_id comes from the route only for display context; the API resolves org from the auth token.
  const dispatch = useDispatch();
  const [wallet, setWallet] = useState(null);
  const [plan, setPlan] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [billingAvailable, setBillingAvailable] = useState(true);

  // Only the first load shows a placeholder; refreshes after a billing action swap values in place.
  const loadWallet = useCallback(async () => {
    try {
      const res = await getWalletBalance();
      setWallet(res?.data ?? null);
    } catch {
      setWallet(null);
    } finally {
      setLoadingWallet(false);
    }
  }, []);

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

  const currentCredits = Number(wallet?.credits_ongoing_balance ?? 0);
  const grantedCredits = Number(wallet?.credits_balance ?? 0);
  const rate = Number(wallet?.rate_amount ?? CREDIT_RATE_USD);
  const currency = wallet?.currency || "USD";
  const isNegative = currentCredits < 0;
  const consumed = Math.max(0, grantedCredits - currentCredits);
  const referenceTotal = grantedCredits > 0 ? grantedCredits : currentCredits + consumed;
  const percentRemaining = referenceTotal > 0 ? Math.max(0, Math.min(100, 100 - (consumed / referenceTotal) * 100)) : 0;

  return (
    <main className="max-w-3xl mx-auto p-4 my-16">
      <div className="flex items-center gap-3 mb-2">
        <WalletIcon className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-semibold">Plans & Credits</h1>
      </div>
      <p className="text-sm text-base-content/60 mb-8">
        Usage is billed per call at the actual provider cost, drawn from this workspace's credit balance.
        {billingAvailable && " Upgrade to Pro for a monthly credit top-up and access to every model."}
      </p>

      <div className="flex flex-col gap-6">
        <section className="rounded-2xl border border-base-200 bg-base-100 p-6 shadow-sm">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm text-base-content/60">Current balance</p>
              <p
                className={`mt-1 text-3xl font-semibold leading-none tracking-tight ${isNegative ? "text-error" : ""}`}
              >
                {loadingWallet ? (
                  <span className="loading loading-dots loading-sm" />
                ) : wallet === null ? (
                  <span className="text-lg font-medium text-base-content/50">No wallet provisioned yet</span>
                ) : (
                  <>
                    {currentCredits.toLocaleString()}
                    <span className="text-sm font-normal text-base-content/50"> credits</span>
                  </>
                )}
              </p>
              {wallet !== null && !loadingWallet && (
                <p className="mt-1.5 text-sm text-base-content/50">
                  ≈ {(currentCredits * rate).toFixed(2)} {currency}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-base-content/60">Current plan</p>
              <p className="mt-1 text-lg font-semibold">
                {loadingPlan ? <span className="loading loading-dots loading-xs" /> : plan?.label || "—"}
              </p>
            </div>
          </div>

          {wallet !== null && !loadingWallet && referenceTotal > 0 && (
            <div className="mt-5">
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-medium text-base-content/70">Remaining this cycle</span>
                <span className="text-base-content/50">
                  {consumed.toLocaleString()} of {referenceTotal.toLocaleString()} used
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-primary/10">
                <div
                  className={`h-full rounded-full transition-all ${isNegative ? "bg-error" : "bg-primary"}`}
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

        <Suspense fallback={null}>
          <SubscriptionCard onChanged={onBillingChanged} onAvailabilityChange={setBillingAvailable} />
        </Suspense>

        <section>
          <h2 className="text-lg font-semibold mb-3">Available plans</h2>
          {loadingPlans ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[0, 1].map((i) => (
                <div key={i} className="skeleton h-32 rounded-2xl" />
              ))}
            </div>
          ) : plans.length === 0 ? (
            <p className="text-sm text-base-content/60">No plans available.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {plans.map((p) => {
                const isCurrent = p.plan_code === plan?.plan;
                const paid = isPaidPlan(p.plan_code);
                const monthly = Number(p.monthly_credits) || null;
                const grant = Number(p.credit_grant) || null;
                const priceLabel =
                  formatPlanAmount(p.price) ?? (paid ? null : formatPlanAmount({ amount_cents: 0, currency: "USD" }));
                return (
                  <div
                    key={p.plan_code}
                    className={`rounded-2xl border p-5 flex flex-col gap-3 ${
                      isCurrent ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-base-200 bg-base-100"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">{p.display_name}</p>
                      {isCurrent && <span className="badge badge-primary badge-sm">Current</span>}
                    </div>
                    <p className="text-2xl font-semibold leading-none tracking-tight">
                      {priceLabel ?? <span className="text-base-content/40">—</span>}
                      <span className="text-sm font-normal text-base-content/50"> / {planIntervalLabel(p.price)}</span>
                    </p>
                    <ul className="text-sm text-base-content/70 space-y-1">
                      {paid && monthly && <li>{monthly.toLocaleString()} credits topped up monthly</li>}
                      {!paid && grant && <li>{grant.toLocaleString()} credits included</li>}
                      <li>{paid ? "Access to every model" : "Pay-as-you-go at provider cost"}</li>
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <p className="text-sm text-base-content/60">
          {billingAvailable
            ? "Need more credits than Pro provides, or a custom plan? Reach out to your account contact."
            : "Need more credits or want to change your plan? Reach out to your account contact."}
        </p>
      </div>
    </main>
  );
}
