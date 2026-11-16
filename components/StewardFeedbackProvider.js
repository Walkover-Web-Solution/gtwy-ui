"use client";

import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useCustomSelector } from "@/customHooks/customSelector";
import { getFromCookies } from "@/utils/utility";
import packageJson from "../package.json";

/** Exact Steward embed from product settings (publishable pk_* key). */
const STEWARD_WIDGET_SCRIPT_SRC = "https://steward.embarko.app/widget.js";
const STEWARD_WIDGET_DATA_KEY = "pk_eecf8f6a6ffe754bf82856b3877d60f706e2";
const SCRIPT_ID = "steward-feedback-script";
const MOUNT_SELECTOR = "#steward-feedback";

function isPanelUserSignedIn() {
  if (typeof window === "undefined") return false;
  return Boolean(getFromCookies("proxy_token") || sessionStorage.getItem("local_token"));
}

function stewardCall(command, payload) {
  if (typeof window === "undefined") return;
  const handler = window.Steward?.[command];
  if (typeof handler === "function") {
    handler(payload);
    return;
  }
  window.Steward = window.Steward || { q: [] };
  window.Steward.q = window.Steward.q || [];
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

    stewardCall("identify", identifyPayload);

    const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || packageJson.version;
    if (appVersion) {
      stewardCall("meta", { app_version: appVersion });
    }
  }, [enabled, userDetails, organizations, orgId, plan, planLabel]);

  useEffect(() => {
    if (!enabled) return;

    const appendScript = () => {
      if (scriptAppendedRef.current || document.getElementById(SCRIPT_ID)) {
        scriptAppendedRef.current = true;
        return;
      }
      if (!isPanelUserSignedIn()) return;

      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = STEWARD_WIDGET_SCRIPT_SRC;
      script.async = true;
      script.setAttribute("data-key", STEWARD_WIDGET_DATA_KEY);
      script.setAttribute("data-mount", MOUNT_SELECTOR);
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

  return null;
}