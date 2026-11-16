"use client";

import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useCustomSelector } from "@/customHooks/customSelector";
import { getFromCookies } from "@/utils/utility";
import packageJson from "../package.json";

const SCRIPT_ID = "steward-feedback-script";
const MOUNT_SELECTOR = "#steward-feedback";

function isPanelUserSignedIn() {
  if (typeof window === "undefined") return false;
  return Boolean(getFromCookies("proxy_token") || sessionStorage.getItem("local_token"));
}

function ensureStewardQueue() {
  if (typeof window === "undefined") return;
  window.Steward = window.Steward || { q: [] };
}

function stewardQueuePush(command, payload) {
  ensureStewardQueue();
  window.Steward.q.push([command, payload]);
}

/**
 * Loads the Steward feedback widget once for signed-in panel users and keeps identify/meta in sync.
 */
export default function StewardFeedbackProvider({ enabled = true }) {
  const scriptAppendedRef = useRef(false);
  const lastIdentifyKeyRef = useRef(null);

  const params = useParams();
  const orgId = params?.org_id;

  const { userDetails, organizations, plan, planLabel } = useCustomSelector((state) => ({
    userDetails: state.userDetailsReducer.userDetails,
    organizations: state.userDetailsReducer.organizations,
    plan: state.planReducer?.plan,
    planLabel: state.planReducer?.label,
  }));

  useEffect(() => {
    if (!enabled) return;

    const scriptSrc = process.env.NEXT_PUBLIC_STEWARD_FEEDBACK_SCRIPT_SRC?.trim();
    const dataKey = process.env.NEXT_PUBLIC_STEWARD_FEEDBACK_KEY?.trim();
    if (!scriptSrc || !dataKey) return;

    const appendScript = () => {
      if (scriptAppendedRef.current || document.getElementById(SCRIPT_ID)) {
        scriptAppendedRef.current = true;
        return;
      }
      if (!isPanelUserSignedIn()) return;

      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = scriptSrc;
      script.async = true;
      script.setAttribute("data-key", dataKey);
      if (document.querySelector(MOUNT_SELECTOR)) {
        script.setAttribute("data-mount", MOUNT_SELECTOR);
      }
      document.body.appendChild(script);
      scriptAppendedRef.current = true;
    };

    appendScript();
    if (scriptAppendedRef.current) return;

    const observer = new MutationObserver(() => {
      appendScript();
      if (scriptAppendedRef.current) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !isPanelUserSignedIn()) return;
    if (!userDetails?.id || !userDetails?.email) return;

    const org = orgId ? organizations?.[orgId] : undefined;
    const identifyPayload = {
      id: userDetails.id,
      email: userDetails.email,
      name: userDetails.name,
      company: org?.name,
      plan: planLabel || plan || undefined,
    };

    const identifyKey = JSON.stringify(identifyPayload);
    if (lastIdentifyKeyRef.current === identifyKey) return;
    lastIdentifyKeyRef.current = identifyKey;

    stewardQueuePush("identify", identifyPayload);

    const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || packageJson.version;
    if (appVersion) {
      stewardQueuePush("meta", { app_version: appVersion });
    }
  }, [enabled, userDetails, organizations, orgId, plan, planLabel]);

  return null;
}