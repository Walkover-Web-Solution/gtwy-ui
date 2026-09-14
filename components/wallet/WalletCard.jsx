"use client";
import React, { useEffect, useState, useCallback } from "react";
import { getWalletBalance } from "@/config/walletApi";
import { WalletIcon } from "lucide-react";

const CREDIT_RATE_USD = 0.0025;
const WalletMeter = ({ percentRemaining, credits, total }) => (
  <div>
    <div className="flex items-baseline justify-between">
      <span className="text-xs font-medium text-base-content/70">Remaining this cycle</span>
      <span className="text-xs text-base-content/50">
        {credits.toLocaleString()} / {total.toLocaleString()} credits
      </span>
    </div>
    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-primary/10">
      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percentRemaining}%` }} />
    </div>
  </div>
);

export default function WalletCard({ orgId }) {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getWalletBalance();
      setWallet(res?.data ?? null);
    } catch {
      setError("Could not load wallet balance");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const credits = Number(wallet?.credits_ongoing_balance ?? 0);
  const grantedCredits = Number(wallet?.credits_balance ?? 0);
  const balanceCents = Number(wallet?.balance_cents ?? 0);
  const ongoingCents = Number(wallet?.ongoing_balance_cents ?? 0);
  const consumed = Math.max(0, grantedCredits - credits);
  const referenceTotal = grantedCredits > 0 ? grantedCredits : credits + consumed;
  const percentConsumed = referenceTotal > 0 ? Math.min(100, (consumed / referenceTotal) * 100) : 0;
  const percentRemaining = Math.max(0, 100 - percentConsumed);
  const currency = wallet?.currency || "USD";
  const rate = Number(wallet?.rate_amount ?? CREDIT_RATE_USD);
  const usdEquivalent = (credits * rate).toFixed(2);
  const isNegative = credits < 0;

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
              Balance is negative — new requests may be blocked until the workspace is topped up.
            </p>
          )}

          {referenceTotal > 0 && (
            <WalletMeter percentRemaining={percentRemaining} credits={credits} total={referenceTotal} />
          )}

          <dl className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-base-content/50">
            <div className="flex items-center gap-1.5">
              <dt>Granted balance</dt>
              <dd className="font-medium text-base-content/70">
                {grantedCredits.toLocaleString()} credits ({balanceCents.toLocaleString()}¢)
              </dd>
            </div>
            <div className="flex items-center gap-1.5">
              <dt>Ongoing balance (¢)</dt>
              <dd className={`font-medium ${credits < 0 ? "text-error" : "text-base-content/70"}`}>
                {ongoingCents.toLocaleString()}¢
              </dd>
            </div>
          </dl>

          <p className="border-t border-base-200 pt-4 text-xs text-base-content/40">
            Adding credits isn't available yet — reach out to your account contact to top up this workspace.
          </p>
        </div>
      )}
    </div>
  );
}
