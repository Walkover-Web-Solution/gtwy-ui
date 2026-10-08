import { MODAL_TYPE } from "@/utils/enums";
import React, { useState } from "react";
import Modal from "../UI/Modal";
import { getInvitedUsers, inviteUser } from "@/config/index";
import toast from "react-hot-toast";
import { closeModal, RequiredItem } from "@/utils/utility";
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
    <Modal
      MODAL_ID={MODAL_TYPE.INVITE_USER}
      onClose={handleClose}
      title="Invite Team Member"
      description="Send an invitation to join your organization"
      icon={<UserPlus size={16} className="text-trace-gold" />}
      widthClass="w-[min(480px,92vw)]"
    >
      <form
        id="invite-user-modal-container"
        onSubmit={(e) => {
          e.preventDefault();
          handleInviteSubmit();
        }}
        className="flex flex-col gap-4"
      >
        <div className="form-control w-full">
          <label className="label">
            <span className="font-medium">
              Email Address <RequiredItem />
            </span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail size={16} className="text-base-content/40" />
            </div>
            <input
              autoComplete="off"
              data-testid="invite-user-email-input"
              id="invite-user-email-input"
              type="email"
              value={email}
              onChange={handleEmailChange}
              placeholder="Enter email address"
              className="input w-full pl-10"
              disabled={isInviting}
              required
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-base-content/10">
          <button
            data-testid="invite-user-cancel-button"
            id="invite-user-cancel-button"
            type="button"
            onClick={handleClose}
            className="btn btn-sm"
            disabled={isInviting}
          >
            Cancel
          </button>
          <button
            data-testid="invite-user-send-button"
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
