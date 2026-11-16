"use client";

import React, { useCallback, useMemo, useState } from "react";
import { MessageSquareMore } from "lucide-react";
import { useParams } from "next/navigation";
import { MODAL_TYPE } from "@/utils/enums";
import { closeModal, getFromCookies } from "@/utils/utility";
import { useCustomSelector } from "@/customHooks/customSelector";
import { submitStewardPanelFeedback } from "@/utils/stewardFeedbackApi";
import Modal from "../UI/Modal";
import LoadingSpinner from "../LoadingSpinner";

function isPanelUserSignedIn() {
  if (typeof window === "undefined") return false;
  return Boolean(getFromCookies("proxy_token") || sessionStorage.getItem("local_token"));
}

const PanelFeedbackModal = () => {
  const params = useParams();
  const orgId = params?.org_id;

  const { userDetails, organizations, plan, planLabel } = useCustomSelector((state) => ({
    userDetails: state.userDetailsReducer.userDetails,
    organizations: state.userDetailsReducer.organizations,
    plan: state.planReducer?.plan,
    planLabel: state.planReducer?.label,
  }));

  const [text, setText] = useState("");
  const [phase, setPhase] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const signedIn = isPanelUserSignedIn();
  const org = orgId ? organizations?.[orgId] : undefined;

  const userPayload = useMemo(
    () => ({
      id: userDetails?.id,
      email: userDetails?.email,
      name: userDetails?.name,
      company: org?.name,
      plan: planLabel || plan || undefined,
    }),
    [userDetails, org, plan, planLabel]
  );

  const resetForm = useCallback(() => {
    setText("");
    setPhase("idle");
    setErrorMessage("");
  }, []);

  const handleClose = useCallback(() => {
    closeModal(MODAL_TYPE.PANEL_FEEDBACK_MODAL);
    resetForm();
  }, [resetForm]);

  const handleSubmit = useCallback(async () => {
    const trimmed = text.trim();
    if (trimmed.length < 3) {
      setErrorMessage("Write a few words about what you need or what went wrong.");
      setPhase("error");
      return;
    }
    if (!signedIn || !userPayload?.id || !userPayload?.email) {
      setErrorMessage("Sign in to send feedback.");
      setPhase("error");
      return;
    }

    setPhase("loading");
    setErrorMessage("");

    const meta = {};
    const appVersion = process.env.NEXT_PUBLIC_APP_VERSION;
    if (appVersion) meta.app_version = appVersion;

    try {
      await submitStewardPanelFeedback({
        text: trimmed,
        user: userPayload,
        meta,
      });
      setPhase("success");
    } catch (err) {
      setErrorMessage(err?.message || "Could not send feedback.");
      setPhase("error");
    }
  }, [text, signedIn, userPayload]);

  const footerContent =
    phase === "success" ? (
      <button type="button" className="btn btn-sm btn-primary" onClick={handleClose}>
        Close
      </button>
    ) : (
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-sm" onClick={handleClose} disabled={phase === "loading"}>
          Cancel
        </button>
        <button
          type="button"
          id="panel-feedback-send-button"
          className="btn btn-sm btn-primary"
          onClick={handleSubmit}
          disabled={phase === "loading" || !text.trim()}
        >
          {phase === "loading" ? "Sending…" : "Send"}
        </button>
      </div>
    );

  if (!signedIn) {
    return (
      <dialog data-testid={MODAL_TYPE.PANEL_FEEDBACK_MODAL} id={MODAL_TYPE.PANEL_FEEDBACK_MODAL} className="modal" />
    );
  }

  return (
    <Modal
      MODAL_ID={MODAL_TYPE.PANEL_FEEDBACK_MODAL}
      onClose={handleClose}
      title="Request a feature or report a bug"
      description="Tell us what you need or what went wrong — we route it to the team."
      icon={<MessageSquareMore size={16} className="text-trace-gold" />}
      widthClass="w-[min(420px,92vw)]"
      footer={footerContent}
    >
      <div id="panel-feedback-modal-body" className="flex flex-col gap-3">
        {phase === "success" ? (
          <p className="text-sm text-success" role="status">
            Thanks, we got it.
          </p>
        ) : phase === "loading" ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            <label className="sr-only" htmlFor="panel-feedback-textarea">
              Feedback
            </label>
            <textarea
              id="panel-feedback-textarea"
              data-testid="panel-feedback-textarea"
              className="textarea textarea-bordered w-full min-h-[120px] text-sm text-base-content bg-base-100 resize-y"
              placeholder="What would you like, or what went wrong?"
              maxLength={4000}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (phase === "error") {
                  setPhase("idle");
                  setErrorMessage("");
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
              }}
              disabled={phase === "loading"}
            />
            {phase === "error" && errorMessage ? (
              <p className="text-sm text-error" role="alert">
                {errorMessage}
              </p>
            ) : null}
          </>
        )}
      </div>
    </Modal>
  );
};

export default PanelFeedbackModal;
