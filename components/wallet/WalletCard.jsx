"use client";
import React, { useEffect, useState, useCallback } from "react";
import { WalletIcon } from "@/components/Icons";
import { getWalletBalance, createTopupCheckout } from "@/config/walletApi";
import { toast } from "react-toastify";

// $1 = 400 credits (docs/billing-idempotency-outbox-credit-system.md §4).
const CREDIT_RATE_USD = 0.0025;
// The 1000-credit signup grant is the reference "full" mark for the donut when
// no explicit ceiling exists. Purely visual.
const DONUT_REFERENCE_CREDITS = 1000;

// Reuses the conic-gradient donut pattern from AgentUsageLimitModal.
const WalletDonut = ({ percent, label }) => (
  <div className="relative h-24 w-24 flex-shrink-0">
    <div
      className="h-full w-full rounded-full border border-base-300 bg-base-200/50"
      style={{
        background: `conic-gradient(#3b82f6 ${percent}%, rgba(59,130,246,0.1) ${percent}% 100%)`,
      }}
    />
    <div className="absolute inset-[8px] flex items-center justify-center rounded-full bg-base-100 text-sm font-bold text-base-content/80">
      {label}
    </div>
  </div>
);

export default function WalletCard({ orgId }) {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [topupAmount, setTopupAmount] = useState("");
  const [isToppingUp, setIsToppingUp] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getWalletBalance(orgId);
      setWallet(res?.data ?? null);
    } catch {
      setError("Could not load wallet balance");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (orgId) load();
  }, [orgId, load]);

  const credits = Number(wallet?.credits_balance ?? 0);
  const usdEquivalent = (credits * CREDIT_RATE_USD).toFixed(2);
  const percent = Math.min(100, Math.max(0, (credits / DONUT_REFERENCE_CREDITS) * 100));
  const isNegative = credits < 0;

  const handleTopup = useCallback(async () => {
    const amount = parseFloat(topupAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid top-up amount");
      return;
    }
    setIsToppingUp(true);
    try {
      const res = await createTopupCheckout(orgId, amount);
      // The backend hands off to the payment gateway's hosted checkout.
      if (res?.data?.checkout_url) {
        window.location.href = res.data.checkout_url;
      } else {
        toast.info("Top-up initiated");
        setTopupAmount("");
      }
    } catch {
      toast.error("Failed to start top-up");
    } finally {
      setIsToppingUp(false);
    }
  }, [orgId, topupAmount]);

  return (
    <div className="bg-base-100 rounded-lg shadow p-6 mt-6">
      <div className="flex items-center gap-3 mb-6">
        <WalletIcon className="h-6 w-6 text-primary" />
        <h2 className="text-xl font-semibold">Wallet & Credits</h2>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span className="loading loading-spinner loading-sm" /> Loading balance…
        </div>
      ) : error ? (
        <div className="text-sm text-error">
          {error}{" "}
          <button className="btn btn-xs btn-ghost" onClick={load}>
            Retry
          </button>
        </div>
      ) : wallet === null ? (
        <p className="text-sm text-gray-500">No wallet provisioned for this workspace yet.</p>
      ) : (
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <WalletDonut percent={percent} label={`${Math.round(credits)}`} />
          <div className="flex-1">
            <p className="text-sm text-gray-500">Current balance</p>
            <p className={`text-2xl font-bold ${isNegative ? "text-error" : "text-base-content"}`}>
              {credits.toLocaleString()} credits
            </p>
            <p className="text-sm text-gray-500">≈ ${usdEquivalent} USD</p>
            {isNegative && (
              <p className="mt-1 text-xs text-error">
                Balance is negative — top up to avoid new requests being blocked.
              </p>
            )}
            {wallet?.expiration_at && (
              <p className="mt-1 text-xs text-gray-400">
                Granted credits expire {new Date(wallet.expiration_at).toLocaleDateString()}
              </p>
            )}

            <div className="mt-4 flex items-center gap-2">
              <div className="join">
                <span className="join-item btn btn-sm btn-disabled">$</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Amount (USD)"
                  className="join-item input input-sm input-bordered w-36"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                />
              </div>
              <button className="btn btn-primary btn-sm" onClick={handleTopup} disabled={isToppingUp}>
                {isToppingUp ? "Starting…" : "Add credits"}
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-400">A 5% platform fee applies to top-ups.</p>
          </div>
        </div>
      )}
    </div>
  );
}
