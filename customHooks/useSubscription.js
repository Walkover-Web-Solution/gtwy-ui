"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { useDispatch } from "react-redux";
import {
  getBillingSubscriptionAction,
  startBillingCheckoutAction,
  subscribeBillingAction,
  cancelBillingAction,
  resumeBillingAction,
  retryBillingPaymentAction,
  getBillingPortalAction,
} from "@/store/action/billingAction";
import { consumeCheckoutReturn, peekCheckoutReturnIntent, rememberCheckoutReturn } from "@/utils/billingReturn";

const POLL_MAX_ATTEMPTS = 5;

const errorMessage = (err, fallback) => err?.response?.data?.message || fallback;

// Holds the billing/subscription state and actions (upgrade, complete subscription, retry,
// resume, billing portal) so both the status banner and the Pro plan card's CTA share one
// source of truth instead of duplicating the plan/price display.
export default function useSubscription({ onChanged } = {}) {
  const dispatch = useDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [pollGaveUp, setPollGaveUp] = useState(false);
  const pollRef = useRef(null);
  const prevStatusRef = useRef(null);
  const handledReturnRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await dispatch(getBillingSubscriptionAction());
      const data = res?.data ?? null;
      if (!data || typeof data.plan === "undefined") throw new Error("unexpected response");
      setView(data);
      setLoadError(null);
      setUnavailable(false);
      return data;
    } catch (err) {
      const code = err?.response?.status;
      if (code === 503 || code === 403 || code === 404) {
        setUnavailable(true);
      } else {
        setLoadError(errorMessage(err, "Could not load subscription details"));
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(async () => {
    await load();
    onChanged?.();
  }, [load, onChanged]);

  // Stripe sends the user back with ?checkout=success once a card is saved.
  // If they left via "Upgrade to Pro", finish the subscription for them now.
  const checkoutResult = searchParams.get("checkout");
  useEffect(() => {
    if (!checkoutResult || handledReturnRef.current) return;
    handledReturnRef.current = true;

    const params = new URLSearchParams(searchParams.toString());
    params.delete("checkout");
    const qs = params.toString();
    router.replace(`${window.location.pathname}${qs ? `?${qs}` : ""}`);

    const intent = consumeCheckoutReturn()?.intent ?? null;

    if (checkoutResult !== "success") {
      toast("Checkout was cancelled. No changes were made.");
      load();
      return;
    }
    if (intent !== "subscribe") {
      toast.success("Card saved.");
      refresh();
      return;
    }
    (async () => {
      setBusy("subscribe");
      try {
        await dispatch(subscribeBillingAction());
        toast.success("Card saved and subscription started. Pro activates as soon as the payment clears.");
      } catch (err) {
        // 409 = already subscribed / already pending; the refresh below shows the real state.
        if (err?.response?.status !== 409) {
          toast.error(errorMessage(err, "Card saved, but the subscription could not be started."));
        }
      } finally {
        setBusy(null);
        refresh();
      }
    })();
  }, [checkoutResult, load, refresh, router, searchParams, dispatch]);

  const status = view?.billing?.status;

  // Fallback for a Stripe return that lost ?checkout=success (e.g. redirect URL
  // configured without it): the card is saved and a fresh "Upgrade to Pro" intent
  // is still stored, so finish the subscription the user asked for.
  useEffect(() => {
    if (checkoutResult || handledReturnRef.current || status !== "awaiting_card") return;
    if (peekCheckoutReturnIntent() !== "subscribe") return;
    handledReturnRef.current = true;
    consumeCheckoutReturn();
    (async () => {
      setBusy("subscribe");
      try {
        await dispatch(subscribeBillingAction());
        toast.success("Subscription started. Pro activates as soon as the payment clears.");
      } catch (err) {
        if (err?.response?.status !== 409) {
          toast.error(errorMessage(err, "The subscription could not be started."));
        }
      } finally {
        setBusy(null);
        refresh();
      }
    })();
  }, [checkoutResult, status, refresh, dispatch]);

  // Poll while the first charge settles. When the status moves on, tell the
  // parent so plan and wallet balance refresh too.
  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = status ?? null;
    if (prev === "pending_first_payment" && status && status !== "pending_first_payment") {
      onChanged?.();
    }
  }, [status, onChanged]);

  useEffect(() => {
    clearTimeout(pollRef.current);
    setPollGaveUp(false);
    if (status !== "pending_first_payment") return;
    let attempt = 0;
    let cancelled = false;
    const tick = async () => {
      attempt += 1;
      if (attempt > POLL_MAX_ATTEMPTS) {
        setPollGaveUp(true);
        return;
      }
      await load();
      if (cancelled) return;
      pollRef.current = setTimeout(tick, Math.min(5000 * attempt, 30000));
    };
    pollRef.current = setTimeout(tick, 5000);
    return () => {
      cancelled = true;
      clearTimeout(pollRef.current);
    };
  }, [status, load]);

  const run = async (key, fn, { successMsg, failMsg, redirect, newTab, intent } = {}) => {
    setBusy(key);
    try {
      const res = await fn();
      if (redirect) {
        if (!res?.data?.url) throw new Error("no redirect url");
        if (intent) rememberCheckoutReturn(intent);
        if (newTab) {
          window.open(res.data.url, "_blank", "noopener,noreferrer");
          setBusy(null);
          return;
        }
        window.location.assign(res.data.url);
        return;
      }
      if (successMsg) toast.success(typeof successMsg === "function" ? successMsg(res?.data) : successMsg);
      await refresh();
      setBusy(null);
    } catch (err) {
      toast.error(errorMessage(err, failMsg));
      setBusy(null);
    }
  };

  const onUpgrade = () =>
    run("upgrade", () => dispatch(startBillingCheckoutAction()), {
      redirect: true,
      intent: "subscribe",
      failMsg: "Could not start checkout",
    });
  const onSubscribe = () =>
    run("subscribe", () => dispatch(subscribeBillingAction()), {
      successMsg: "Subscription started. We'll activate Pro as soon as the payment clears.",
      failMsg: "Could not start subscription",
    });
  const onResume = () =>
    run("resume", () => dispatch(resumeBillingAction()), {
      successMsg: "Subscription resumed.",
      failMsg: "Could not resume subscription",
    });
  // "Cancel" here means turn off auto-renew (cancel_at_period_end) — access continues
  // until the current period ends, it doesn't end the subscription immediately.
  const onCancelAutoRenew = () =>
    run("cancel", () => dispatch(cancelBillingAction()), {
      successMsg: "Auto-renew turned off. Pro stays active until the current period ends.",
      failMsg: "Could not turn off auto-renew",
    });
  const onRetry = () =>
    run("retry", () => dispatch(retryBillingPaymentAction()), {
      successMsg: (d) => (d?.status === "already_paid" ? "This invoice was already paid." : "Payment retry requested."),
      failMsg: "Could not retry payment",
    });
  const onPortal = () =>
    run("portal", () => dispatch(getBillingPortalAction()), {
      redirect: true,
      newTab: true,
      failMsg: "Could not open billing portal",
    });

  return {
    view,
    loading,
    unavailable,
    loadError,
    busy,
    pollGaveUp,
    status,
    load,
    onUpgrade,
    onSubscribe,
    onResume,
    onCancelAutoRenew,
    onRetry,
    onPortal,
  };
}
