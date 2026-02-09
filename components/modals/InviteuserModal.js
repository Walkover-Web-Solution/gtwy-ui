import { MODAL_TYPE } from "@/utils/enums";
import React, { useState } from "react";
import Modal from "../UI/Modal";
import { getInvitedUsers, inviteUser } from "@/config/index";
import { toast } from "react-toastify";
import { closeModal } from "@/utils/utility";
import { Mail, UserPlus } from "lucide-react";

const InviteUserModal = () => {
  const [email, setEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
  };

  const isEmailValid = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleInviteSubmit = async () => {
    if (!isEmailValid(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setIsInviting(true);

    try {
      const response = await inviteUser({ user: { email: email } });
      if (response.status === "success") {
        await getInvitedUsers(1, 20, "");
        toast.success(`Invitation sent to ${email} successfully!`);
        setEmail("");
        handleClose();
      } else {
        toast.error("Failed to send invitation.");
      }
    } catch {
      toast.error("An error occurred while sending the invitation.");
    } finally {
      setIsInviting(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setIsInviting(false);
    closeModal(MODAL_TYPE.INVITE_USER);
  };

  return (
    <Modal MODAL_ID={MODAL_TYPE.INVITE_USER} onClose={handleClose}>
      <form
        id="invite-user-modal-container"
        onSubmit={(e) => {
          e.preventDefault();
          handleInviteSubmit();
        }}
        className="modal-box max-w-md"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <UserPlus size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Invite Team Member</h3>
              <p className="text-sm text-base-content/60">Send an invitation to join your organization</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="mb-6">
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text font-medium">
                Email Address <span className="text-error">*</span>
              </span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail size={16} className="text-base-content/40" />
              </div>
              <input
                id="invite-user-email-input"
                type="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="Enter email address"
                className="input input-bordered w-full pl-10"
                disabled={isInviting}
                required
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t border-base-300">
          <button
            id="invite-user-cancel-button"
            type="button"
            onClick={handleClose}
            className="btn btn-sm"
            disabled={isInviting}
          >
            Cancel
          </button>
          <button
            id="invite-user-send-button"
            type="submit"
            disabled={isInviting || !email.trim()}
            className={`btn btn-primary btn-sm ${isInviting ? "loading" : ""}`}
          >
            {isInviting ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Sending...
              </>
            ) : (
              <>
                <UserPlus size={16} />
                Send Invite
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default InviteUserModal;
