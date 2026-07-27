"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { WalletIcon } from "@/components/Icons";
import { getWalletBalance } from "@/config/walletApi";

// $1 = 400 credits (docs/billing-idempotency-outbox-credit-system.md §4).
const CREDIT_RATE_USD = 0.0025;
// Balance is display-only here; poll modestly so the sidebar doesn't drift too
// far from reality between navigations without hammering the Node API.
const POLL_INTERVAL_MS = 60_000;

// Sidebar wallet indicator — shows the org's current credit balance and links
// to the plans/top-up page. Reads via the Node wallet API
// (GET /api/lago/wallet/:org_id, config/walletApi.js), same source of truth as
// the WalletCard on the settings page.
export default function WalletSidebarWidget({ orgId, showLabel = true }) {
  const router = useRouter();
  const [credits, setCredits] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!orgId) return;
    try {
      const res = await getWalletBalance(orgId);
      setCredits(res?.data ? Number(res.data.credits_balance ?? 0) : null);
    } catch {
      // Silent in the sidebar — the settings page WalletCard surfaces the
      // detailed error state; here we just fall back to a neutral display.
      setCredits(null);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  const isNegative = credits !== null && credits < 0;
  const displayValue = loading ? "…" : credits === null ? "—" : Math.round(credits).toLocaleString();

  return (
    <button
      id="main-slider-wallet-widget"
      onClick={() => router.push(`/org/${orgId}/plans`)}
      className={`w-full flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-base-200 text-base-content ${
        !showLabel ? "justify-center" : ""
      }`}
      title={
        credits !== null
          ? `${credits.toLocaleString()} credits (≈ $${(credits * CREDIT_RATE_USD).toFixed(2)})`
          : "Wallet"
      }
    >
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
    </button>
  );
}
