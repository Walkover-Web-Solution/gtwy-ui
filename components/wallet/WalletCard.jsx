"use client";
import React, { useEffect, useState, useCallback } from "react";
import { getWalletBalance, getCreditPacks, buyCredits } from "@/config/walletApi";
import { WalletIcon } from "lucide-react";
import { toast } from "react-hot-toast";

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
  const [creditPacks, setCreditPacks] = useState(null);
  const [packsLoading, setPacksLoading] = useState(true);
  const [buyingUsd, setBuyingUsd] = useState(null);

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

  const loadPacks = useCallback(async () => {
    setPacksLoading(true);
    try {
      const res = await getCreditPacks();
      setCreditPacks(res?.data ?? null);
    } catch {
      setCreditPacks(null);
    } finally {
      setPacksLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    loadPacks();
  }, [load, loadPacks]);

  const handleBuy = async (usd) => {
    setBuyingUsd(usd);
    try {
      const res = await buyCredits(usd);
      toast.success(res?.message || "Card is being charged; credits arrive once it clears.");
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not start the purchase, please try again.");
    } finally {
      setBuyingUsd(null);
    }
  };

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

          <div className="border-t border-base-200 pt-4">
            <p className="text-xs font-medium text-base-content/70">Buy more credits</p>

            {packsLoading ? (
              <div className="mt-3 flex items-center gap-2 text-xs text-base-content/50">
                <span className="loading loading-spinner loading-xs" /> Loading credit packs…
              </div>
            ) : !creditPacks?.packs?.length ? (
              <p className="mt-2 text-xs text-base-content/40">
                {creditPacks?.can_buy === false
                  ? "Save a card to your workspace before buying extra credits."
                  : "No credit packs are available on your current plan."}
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {creditPacks.packs.map((pack) => (
                  <button
                    key={pack.usd}
                    className="btn btn-sm btn-outline"
                    disabled={!creditPacks.can_buy || buyingUsd !== null}
                    onClick={() => handleBuy(pack.usd)}
                  >
                    {buyingUsd === pack.usd ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : (
                      <>
                        ${pack.usd}{" "}
                        <span className="text-base-content/50">· {pack.credits.toLocaleString()} credits</span>
                      </>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
