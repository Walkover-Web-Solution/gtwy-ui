"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getWalletBalance } from "@/config/walletApi";
import { WalletIcon } from "lucide-react";
const CREDIT_RATE_USD = 0.0025;

export default function WalletSidebarWidget({ orgId, showLabel = true }) {
  const router = useRouter();
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await getWalletBalance();
      setWallet(res?.data ?? null);
    } catch {
      setWallet(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Same rule as WalletCard: credits_ongoing_balance is the live number.
  const credits = wallet ? Number(wallet.credits_ongoing_balance ?? 0) : null;
  const grantedCredits = wallet ? Number(wallet.credits_balance ?? 0) : 0;
  const consumed = wallet ? Math.max(0, grantedCredits - credits) : 0;
  const referenceTotal = grantedCredits > 0 ? grantedCredits : (credits ?? 0) + consumed;
  const percentConsumed = referenceTotal > 0 ? Math.min(100, (consumed / referenceTotal) * 100) : 0;
  const percentRemaining = Math.max(0, 100 - percentConsumed);
  const rate = Number(wallet?.rate_amount ?? CREDIT_RATE_USD);
  const currency = wallet?.currency || "USD";

  const isNegative = credits !== null && credits < 0;
  const displayValue = loading ? "…" : credits === null ? "—" : Math.round(credits).toLocaleString();

  return (
    <button
      id="main-slider-wallet-widget"
      onClick={() => router.push(`/org/${orgId}/plans`)}
      className={`w-full flex flex-col gap-1.5 rounded-lg p-2.5 transition-colors hover:bg-base-200 text-base-content ${
        !showLabel ? "items-center" : ""
      }`}
      title={
        credits !== null
          ? `${credits.toLocaleString()} credits (≈ ${(credits * rate).toFixed(2)} ${currency})`
          : "Wallet"
      }
    >
      <div className={`flex items-center gap-3 ${!showLabel ? "justify-center" : "w-full"}`}>
        <div className={`shrink-0 ${isNegative ? "text-error" : "text-primary"}`}>
          <WalletIcon size={15} />
        </div>
        {showLabel && (
          <div className="flex items-center justify-between flex-1 min-w-0">
            <span className="text-xs truncate">Credits</span>
            <span className={`text-xs font-semibold ${isNegative ? "text-error" : "text-base-content"}`}>
              {displayValue}
            </span>
          </div>
        )}
      </div>
      {showLabel && referenceTotal > 0 && (
        <div className="h-1 w-full overflow-hidden rounded-full bg-base-300">
          <div className="h-full rounded-full bg-primary" style={{ width: `${percentRemaining}%` }} />
        </div>
      )}
    </button>
  );
}
