import React, { useState, useEffect } from "react";
import { X, Settings, CircleX } from "lucide-react";
import Modal from "../UI/Modal";
import { MODAL_TYPE } from "@/utils/enums";
import { toast } from "react-toastify";
import { closeModal } from "@/utils/utility";
import { useDispatch } from "react-redux";
import { updateBridgeAction } from "@/store/action/bridgeAction";

function MakePublicAgentModal({ bridgeId, agent_name, pageConfig, agentSummary }) {
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    availability: "public",
    description: "",
    publicUsers: [],
    newEmail: "",
  });

  const [isLoading, setIsLoading] = useState(false);

  // Update form data when pageConfig changes
  useEffect(() => {
    if (pageConfig) {
      setFormData({
        availability: pageConfig?.availability || "public",
        description: pageConfig?.description || agentSummary || "",
        publicUsers: pageConfig?.settings?.publicUsers || [],
        newEmail: "",
      });
    } else {
      setFormData({
        availability: "public",
        description: agentSummary || "",
        publicUsers: [],
        newEmail: "",
      });
    }
  }, [pageConfig, agentSummary]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const processedValue = value;

    setFormData((prev) => ({
      ...prev,
      [name]: processedValue,
    }));
  };

  const handleAddEmail = () => {
    if (!formData.newEmail?.includes("@")) {
      toast.warn("Please enter a valid email address.");
      return;
    }

    if (formData.publicUsers.includes(formData.newEmail)) {
      toast.warn("This email has already been added.");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      publicUsers: [...(prev.publicUsers || []), prev.newEmail],
      newEmail: "",
    }));
  };

  const handleRemoveUser = (indexToRemove) => {
    setFormData((prev) => ({
      ...prev,
      publicUsers: prev.publicUsers.filter((_, i) => i !== indexToRemove),
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const payload = {
        settings: {
          publicAgentConfig: {
            description: formData.description,
            availability: formData.availability,
            publicUsers: formData.availability === "private" ? formData.publicUsers : [],
            isPublicAgent: true,
          },
        },
      };

      await dispatch(
        updateBridgeAction({
          bridgeId,
          dataToSend: payload,
        })
      );

      toast.success("Public agent configuration saved successfully!");
      setIsLoading(false);
      closeMakePublicAgentModal();
    } catch (err) {
      setIsLoading(false);
      if (err?.response?.data?.detail?.includes("DuplicateKey")) {
        toast.error("This slug name already exists. Please choose a different one.");
      } else {
        toast.error(err.message || "Failed to save configuration.");
      }
    }
  };

  const closeMakePublicAgentModal = () => {
    setFormData({
      availability: "public",
      description: "",
      publicUsers: [],
      newEmail: "",
    });
    closeModal(MODAL_TYPE.MAKE_PUBLIC_AGENT);
  };

  return (
    <>
      <Modal MODAL_ID={MODAL_TYPE.MAKE_PUBLIC_AGENT}>
        <div className="modal-box w-full max-w-2xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-xl flex items-center gap-2">
              <Settings className="h-6 w-6 text-primary" />
              Make Public Agent
            </h3>
            <button
              className="btn btn-sm btn-circle btn-ghost"
              onClick={closeMakePublicAgentModal}
              disabled={isLoading}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="divider my-2"></div>

          <div className="space-y-6 py-4">
            {/* Agent Name Display */}
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-medium">Agent Name</span>
              </label>
              <input
                type="text"
                disabled
                value={agent_name || ""}
                className="input input-bordered input-sm w-full bg-base-200"
              />
            </div>

            {/* Description Field */}
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-medium">Description</span>
              </label>
              <textarea
                id="make-public-description-textarea"
                data-testid="make-public-description-textarea"
                name="description"
                placeholder="Enter a description for your public agent"
                className="textarea bg-base-100 textarea-bordered textarea-sm w-full h-24"
                value={formData.description}
                onChange={handleChange}
              />
            </div>

            {/* Visibility Field */}
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-medium">Visibility</span>
              </label>
              <select
                id="make-public-visibility-select"
                data-testid="make-public-visibility-select"
                className="select select-sm select-bordered w-full"
                name="availability"
                value={formData.availability}
                onChange={handleChange}
              >
                <option value="public">Public - Anyone can access</option>
                <option value="private">Private - Only allowed users can access</option>
              </select>
            </div>

            {/* Allowed Users Field */}
            {formData.availability === "private" && (
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-medium">Allowed Users</span>
                </label>

                {formData.publicUsers?.length > 0 && (
                  <div className="mb-4 p-4 bg-base-200/50 rounded-lg">
                    <p className="text-xs text-base-content/70 mb-3 font-medium">
                      Allowed Users ({formData.publicUsers.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {formData.publicUsers.map((user, index) => (
                        <div key={index} className="badge badge-outline gap-2 py-3 px-3">
                          <span className="text-sm">{user}</span>
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs"
                            onClick={() => handleRemoveUser(index)}
                          >
                            <CircleX size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="join w-full">
                  <input
                    type="email"
                    placeholder="Enter email address"
                    className="input input-bordered join-item flex-1 input-sm"
                    value={formData.newEmail || ""}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        newEmail: e.target.value,
                      }));
                    }}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddEmail();
                      }
                    }}
                  />
                  <button
                    id="make-public-add-user-button"
                    type="button"
                    className="btn btn-sm join-item"
                    onClick={handleAddEmail}
                    disabled={!formData.newEmail || !formData.newEmail.includes("@")}
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="divider my-2"></div>

          {/* Modal Actions */}
          <div className="flex gap-3 justify-end pt-4">
            <button
              id="make-public-modal-cancel-button"
              className="btn btn-sm"
              onClick={closeMakePublicAgentModal}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              id="make-public-modal-save-button"
              data-testid="make-public-modal-save-button"
              className="btn btn-primary btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleSave}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Saving...
                </>
              ) : (
                "Make Public"
              )}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default MakePublicAgentModal;
