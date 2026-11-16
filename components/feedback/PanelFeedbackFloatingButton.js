"use client";

import { MessageSquareMore } from "lucide-react";
import { MODAL_TYPE } from "@/utils/enums";
import { isStewardPanelFeedbackEnabled } from "@/utils/stewardFeedbackApi";
import { getFromCookies, openModal } from "@/utils/utility";

function isPanelUserSignedIn() {
  if (typeof window === "undefined") return false;
  return Boolean(getFromCookies("proxy_token") || sessionStorage.getItem("local_token"));
}

/** Floating entry when the panel has no persistent sidebar (e.g. /org org picker). */
export default function PanelFeedbackFloatingButton() {
  if (!isStewardPanelFeedbackEnabled() || !isPanelUserSignedIn()) return null;

  return (
    <button
      type="button"
      id="panel-feedback-floating-button"
      aria-label="Feedback"
      title="Feedback"
      className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-base-content/15 bg-primary text-primary-content shadow-lg transition-transform hover:-translate-y-0.5"
      onClick={() => openModal(MODAL_TYPE.PANEL_FEEDBACK_MODAL)}
    >
      <MessageSquareMore size={20} strokeWidth={2} />
    </button>
  );
}
