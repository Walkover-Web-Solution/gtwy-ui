import React, { useCallback, useMemo, useState } from "react";
import { MODAL_TYPE } from "@/utils/enums";
import { closeModal } from "@/utils/utility";
import { toast } from "react-toastify";
import Modal from "../UI/Modal";
import { useCustomSelector } from "@/customHooks/customSelector";
import { useDispatch } from "react-redux";
import { submitPostPublishFeedbackAction } from "@/store/action/bridgeAction";

function PostPublishFeedbackModal({ agentName = "", orgId = "" }) {
  const dispatch = useDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackData, setFeedbackData] = useState({
    feedback: "",
  });
  const { userdetails } = useCustomSelector((state) => ({
    userdetails: state.userDetailsReducer.userDetails,
  }));
  const isSubmitDisabled = useMemo(
    () => isSubmitting || !feedbackData.feedback.trim(),
    [isSubmitting, feedbackData.feedback]
  );

  const resetForm = useCallback(() => {
    setFeedbackData({
      feedback: "",
    });
  }, []);

  const handleClose = useCallback(() => {
    closeModal(MODAL_TYPE.POST_PUBLISH_FEEDBACK_MODAL);
    resetForm();
  }, [resetForm]);

  const handleSubmit = useCallback(async () => {
    if (!feedbackData.feedback.trim()) {
      toast.warn("Please add feedback before submitting.");
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        name: userdetails?.name,
        org_id: String(orgId || ""),
        feedback_text: feedbackData.feedback.trim(),
        email: userdetails?.email,
      };

      await dispatch(submitPostPublishFeedbackAction(payload));

      toast.success("Thank you! Your feedback has been recorded.");
      handleClose();
    } catch (error) {
      toast.error(error?.message || "Failed to submit feedback");
    } finally {
      setIsSubmitting(false);
    }
  }, [dispatch, feedbackData, handleClose, orgId, userdetails?.email, userdetails?.name]);

  return (
    <Modal MODAL_ID={MODAL_TYPE.POST_PUBLISH_FEEDBACK_MODAL} onClose={handleClose}>
      <div id="post-publish-feedback-modal-box" className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg">How was your publish experience?</h3>
        <p className="text-sm text-base-content/70 mt-1">
          Help us improve {agentName ? `for ${agentName}` : "the publishing flow"} by sharing quick feedback.
        </p>

        <div className="py-4 space-y-5">
          <div>
            <label className="label">
              <span className="label-text">What worked well / what can be better?</span>
            </label>
            <textarea
              id="post-publish-feedback-textarea"
              className="textarea bg-base-100 textarea-bordered w-full h-32"
              placeholder="Share your feedback..."
              value={feedbackData.feedback}
              onChange={(e) => setFeedbackData((prev) => ({ ...prev, feedback: e.target.value }))}
            />
          </div>
        </div>

        <div className="modal-action">
          <button
            id="post-publish-feedback-skip-button"
            className="btn btn-sm"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Skip
          </button>
          <button
            id="post-publish-feedback-submit-button"
            className="btn btn-sm btn-primary"
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
          >
            {isSubmitting ? "Submitting..." : "Submit Feedback"}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={handleClose}>close</button>
      </form>
    </Modal>
  );
}

export default PostPublishFeedbackModal;
