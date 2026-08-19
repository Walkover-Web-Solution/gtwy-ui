"use client";
import React, { useEffect, useState, useCallback } from "react";
import { WalletIcon } from "@/components/Icons";
import { getWalletBalance, createTopupCheckout } from "@/config/walletApi";
import { toast } from "react-toastify";

// $1 = 400 credits (docs/billing-idempotency-outbox-credit-system.md §4). Used only as a
// fallback when the API doesn't hand back a rate_amount for this wallet.
const CREDIT_RATE_USD = 0.0025;

// Meter: fill carries the "used" amount, the unfilled track is a lighter step of the
// same ramp so the whole bar reads as one state (blue-on-blue), never two hues.
const WalletMeter = ({ percent, consumed, total }) => (
  <div>
    <div className="flex items-baseline justify-between">
      <span className="text-xs font-medium text-base-content/70">Used this cycle</span>
      <span className="text-xs text-base-content/50">
        {consumed.toLocaleString()} / {total.toLocaleString()} credits
      </span>
    </div>
    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-primary/10">
      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
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
  const balanceCents = Number(wallet?.balance_cents ?? 0);
  const ongoing = Number(wallet?.credits_ongoing_balance ?? 0);
  const ongoingCents = Number(wallet?.ongoing_balance_cents ?? 0);
  const consumed = Math.max(0, -ongoing);
  const referenceTotal = credits + consumed;
  const percentConsumed = referenceTotal > 0 ? Math.min(100, (consumed / referenceTotal) * 100) : 0;
  const currency = wallet?.currency || "USD";
  const rate = Number(wallet?.rate_amount ?? CREDIT_RATE_USD);
  const usdEquivalent = (credits * rate).toFixed(2);
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
    <div className="rounded-2xl border border-base-200 bg-base-100 p-6 shadow-sm">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          <WalletIcon className="h-4 w-4" />
        </span>
        <h2 className="text-base font-semibold text-base-content">Wallet & credits</h2>
      </div>

      {loading ? (
        <div className="mt-6 flex items-center gap-3 text-sm text-base-content/50">
          <span className="loading loading-spinner loading-sm" /> Loading balance…
        </div>
      ) : error ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-error">
          {error}
          <button className="btn btn-xs btn-ghost" onClick={load}>
            Retry
          </button>
        </div>
      ) : wallet === null ? (
        <p className="mt-6 text-sm text-base-content/50">No wallet provisioned for this workspace yet.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-base-content/50">Available balance</p>
              <p
                className={`mt-1 text-[2.75rem] font-semibold leading-none tracking-tight ${
                  isNegative ? "text-error" : "text-base-content"
                }`}
              >
                {credits.toLocaleString()}
              </p>
              <p className="mt-1.5 text-sm text-base-content/50">
                {credits.toLocaleString()} credits ≈ {usdEquivalent} {currency}
              </p>
            </div>
            {wallet?.expiration_at && (
              <p className="text-xs text-base-content/40">
                Expires {new Date(wallet.expiration_at).toLocaleDateString()}
              </p>
            )}
          </div>

          {isNegative && (
            <p className="rounded-lg bg-error/10 px-3 py-2 text-xs font-medium text-error">
              Balance is negative — top up to avoid new requests being blocked.
            </p>
          )}

          {consumed > 0 && <WalletMeter percent={percentConsumed} consumed={consumed} total={referenceTotal} />}

          <dl className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-base-content/50">
            <div className="flex items-center gap-1.5">
              <dt>Balance</dt>
              <dd className="font-medium text-base-content/70">{balanceCents.toLocaleString()}¢</dd>
            </div>
            <div className="flex items-center gap-1.5">
              <dt>Ongoing balance</dt>
              <dd className={`font-medium ${ongoing < 0 ? "text-error" : "text-base-content/70"}`}>
                {ongoing.toLocaleString()} credits ({ongoingCents.toLocaleString()}¢)
              </dd>
            </div>
          </dl>

          <div className="flex flex-wrap items-center gap-3 border-t border-base-200 pt-5">
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
            <p className="text-xs text-base-content/40">A 5% platform fee applies to top-ups.</p>
          </div>
        </div>
      )}
    </div>
  );
}
