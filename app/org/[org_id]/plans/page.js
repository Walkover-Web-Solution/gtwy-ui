"use client";
import { useParams } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { WalletIcon, CheckIcon } from "@/components/Icons";
import { getWalletBalance, createTopupCheckout } from "@/config/walletApi";

export const runtime = "edge";

// $1 = 400 credits (docs/billing-idempotency-outbox-credit-system.md §4).
const CREDIT_RATE_USD = 0.0025;
// A 5% platform fee applies to every top-up (doc §6) — shown so the net credits
// figure on each card matches what the wallet will actually receive, not the
// raw gross/rate math a user might otherwise expect.
const PLATFORM_FEE_RATE = 0.05;

const creditsForAmount = (usd) => Math.round(((usd * (1 - PLATFORM_FEE_RATE)) / CREDIT_RATE_USD) * 100) / 100;

// Credit packages. These aren't Lago subscription plans — GTWY bills usage
// directly from the wallet (doc §4, "why manual debit, not automatic
// metering"); a "plan" here is a top-up bundle, presented the way users expect
// a pricing page to look.
const CREDIT_PACKAGES = [
  { id: "starter", label: "Starter", amountUsd: 10, highlight: false, blurb: "Good for trying things out" },
  { id: "growth", label: "Growth", amountUsd: 50, highlight: true, blurb: "Best value for active projects" },
  { id: "scale", label: "Scale", amountUsd: 200, highlight: false, blurb: "For high-volume workloads" },
];

export default function PlansPage() {
  const { org_id } = useParams();
  const [wallet, setWallet] = useState(null);
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [purchasingId, setPurchasingId] = useState(null);
  const [customAmount, setCustomAmount] = useState("");

  const loadWallet = useCallback(async () => {
    if (!org_id) return;
    setLoadingWallet(true);
    try {
      const res = await getWalletBalance(org_id);
      setWallet(res?.data ?? null);
    } catch {
      setWallet(null);
    } finally {
      setLoadingWallet(false);
    }
  }, [org_id]);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  const startCheckout = useCallback(
    async (amountUsd, id) => {
      const amount = parseFloat(amountUsd);
      if (!Number.isFinite(amount) || amount <= 0) {
        toast.error("Enter a valid amount");
        return;
      }
      setPurchasingId(id);
      try {
        const res = await createTopupCheckout(org_id, amount);
        if (res?.data?.checkout_url) {
          window.location.href = res.data.checkout_url;
        } else {
          toast.success("Top-up started — your balance will update shortly.");
        }
      } catch {
        toast.error("Failed to start checkout");
      } finally {
        setPurchasingId(null);
      }
    },
    [org_id]
  );

  const currentCredits = Number(wallet?.credits_balance ?? 0);

  return (
    <main className="max-w-5xl mx-auto p-4 my-16">
      <div className="flex items-center gap-3 mb-2">
        <WalletIcon className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-semibold">Plans & Credits</h1>
      </div>
      <p className="text-sm text-gray-500 mb-8">
        Add credits to your workspace wallet. Usage is billed per call at the actual provider cost — there's no
        recurring subscription to manage.
      </p>

      <div className="bg-base-100 rounded-lg shadow p-6 mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-sm text-gray-500">Current balance</p>
          <p className="text-2xl font-bold">
            {loadingWallet ? "…" : `${currentCredits.toLocaleString()} credits`}
            <span className="text-sm font-normal text-gray-500 ml-2">
              ≈ ${(currentCredits * CREDIT_RATE_USD).toFixed(2)} USD
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="join">
            <span className="join-item btn btn-sm btn-disabled">$</span>
            <input
              type="number"
              min="1"
              step="1"
              placeholder="Custom amount"
              className="join-item input input-sm input-bordered w-40"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
            />
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => startCheckout(customAmount, "custom")}
            disabled={purchasingId === "custom"}
          >
            {purchasingId === "custom" ? "Starting…" : "Add credits"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {CREDIT_PACKAGES.map((pkg) => (
          <div
            key={pkg.id}
            className={`rounded-lg p-6 shadow flex flex-col ${
              pkg.highlight ? "border-2 border-primary bg-base-100" : "border border-base-300 bg-base-100"
            }`}
          >
            {pkg.highlight && <span className="badge badge-primary badge-sm self-start mb-2">Most popular</span>}
            <h2 className="text-lg font-semibold">{pkg.label}</h2>
            <p className="text-sm text-gray-500 mb-4">{pkg.blurb}</p>
            <p className="text-3xl font-bold mb-1">${pkg.amountUsd}</p>
            <p className="text-sm text-gray-500 mb-4">≈ {creditsForAmount(pkg.amountUsd).toLocaleString()} credits</p>

            <ul className="text-sm space-y-2 mb-6 flex-1">
              <li className="flex items-center gap-2">
                <CheckIcon size={14} className="text-primary shrink-0" /> Pay-as-you-go, no expiry on usage
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon size={14} className="text-primary shrink-0" /> Works across every model & provider
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon size={14} className="text-primary shrink-0" /> 5% platform fee applied at purchase
              </li>
            </ul>

            <button
              className={`btn btn-sm w-full ${pkg.highlight ? "btn-primary" : "btn-outline"}`}
              onClick={() => startCheckout(pkg.amountUsd, pkg.id)}
              disabled={purchasingId === pkg.id}
            >
              {purchasingId === pkg.id ? "Starting…" : `Buy ${pkg.label}`}
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
