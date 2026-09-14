"use client";
import { useParams } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import { WalletIcon } from "@/components/Icons";
import { getWalletBalance, getMyPlan, getPlans } from "@/config/walletApi";

export const runtime = "edge";
const CREDIT_RATE_USD = 0.0025;

export default function PlansPage() {
  useParams(); // org_id comes from the route only for display context; the API resolves org from the auth token.
  const [wallet, setWallet] = useState(null);
  const [plan, setPlan] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [loadingPlans, setLoadingPlans] = useState(true);

  const loadWallet = useCallback(async () => {
    setLoadingWallet(true);
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
    setLoadingPlan(true);
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
    setLoadingPlans(true);
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

  const currentCredits = Number(wallet?.credits_ongoing_balance ?? 0);
  const grantedCredits = Number(wallet?.credits_balance ?? 0);
  const rate = Number(wallet?.rate_amount ?? CREDIT_RATE_USD);
  const currency = wallet?.currency || "USD";
  const isNegative = currentCredits < 0;
  const consumed = Math.max(0, grantedCredits - currentCredits);

  return (
    <main className="max-w-3xl mx-auto p-4 my-16">
      <div className="flex items-center gap-3 mb-2">
        <WalletIcon className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-semibold">Plans & Credits</h1>
      </div>
      <p className="text-sm text-gray-500 mb-8">
        Usage is billed per call at the actual provider cost, drawn from this workspace's credit balance — there's no
        recurring subscription to manage.
      </p>

      <div className="bg-base-100 rounded-lg shadow p-6 mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-sm text-gray-500">Current balance</p>
          <p className={`text-2xl font-bold ${isNegative ? "text-error" : ""}`}>
            {loadingWallet
              ? "…"
              : wallet === null
                ? "No wallet provisioned yet"
                : `${currentCredits.toLocaleString()} credits`}
            {wallet !== null && !loadingWallet && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                ≈ {(currentCredits * rate).toFixed(2)} {currency}
              </span>
            )}
          </p>
          {consumed > 0 && (
            <p className="text-xs text-gray-500 mt-1">{consumed.toLocaleString()} credits used this cycle</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Current plan</p>
          <p className="text-lg font-semibold">{loadingPlan ? "…" : plan?.label || "—"}</p>
        </div>
      </div>

      {isNegative && (
        <p className="rounded-lg bg-error/10 px-4 py-3 text-sm font-medium text-error mb-6">
          Balance is negative — new requests may be blocked until this workspace is topped up.
        </p>
      )}

      <h2 className="text-lg font-semibold mb-3">Available plans</h2>
      {loadingPlans ? (
        <p className="text-sm text-gray-500 mb-6">Loading plans…</p>
      ) : plans.length === 0 ? (
        <p className="text-sm text-gray-500 mb-6">No plans available.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {plans.map((p) => {
            const isCurrent = p.plan_code === plan?.plan;
            return (
              <div
                key={p.plan_code}
                className={`rounded-lg border p-4 flex flex-col gap-1 ${
                  isCurrent ? "border-primary bg-primary/5" : "border-base-200 bg-base-100"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{p.display_name}</p>
                  {isCurrent && <span className="badge badge-primary badge-sm">Current</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-sm text-gray-500">
        Need more credits or want to change your plan? Reach out to your account contact — self-serve top-up isn't
        available in the app yet.
      </p>
    </main>
  );
}
