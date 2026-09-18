"use client";
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { Loader2, BookOpen } from "lucide-react";
import AutoResizeTextarea from "@/components/UI/AutoResizeTextarea";
import Modal from "@/components/UI/Modal";
import { MODAL_TYPE } from "@/utils/enums";
import { closeModal } from "@/utils/utility";
import useDeleteOperation from "@/customHooks/useDeleteOperation";

const SkillCreateModal = ({ onSuccess, orgId, userId, editingSkill }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    content: "",
  });

  const { isDeleting: isSaving, executeDelete } = useDeleteOperation(MODAL_TYPE.CREATE_SKILL_MODAL, {
    closeOnSuccess: false,
  });

  // Populate form when editing
  useEffect(() => {
    if (editingSkill) {
      setFormData({
        name: editingSkill.name || "",
        description: editingSkill.description || "",
        content: editingSkill.content || "",
      });
    } else {
      setFormData({
        name: "",
        description: "",
        content: "",
      });
    }
  }, [editingSkill]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Skill name is required");
      return;
    }

    if (!formData.content.trim()) {
      toast.error("Skill content is required");
      return;
    }

    if (!editingSkill && !userId) {
      toast.error("User ID is required. Please log in again.");
      return;
    }

    const dataToSend = {
      ...formData,
      org_id: orgId,
    };

    // Only add created_by for new skills
    if (!editingSkill) {
      dataToSend.created_by = userId;
    }

    await executeDelete(async () => {
      await onSuccess?.(dataToSend);
      closeModal(MODAL_TYPE.CREATE_SKILL_MODAL);
    });
  };

  const footerContent = (
    <div className="flex gap-2 justify-end">
      <button
        data-testid="skill-modal-cancel-button"
        className="btn btn-sm"
        onClick={() => closeModal(MODAL_TYPE.CREATE_SKILL_MODAL)}
        disabled={isSaving}
      >
        Cancel
      </button>
      <button
        data-testid="skill-modal-save-button"
        className="btn btn-sm btn-primary"
        onClick={handleSubmit}
        disabled={isSaving || !formData.name.trim() || !formData.content.trim()}
      >
        {isSaving && <Loader2 size={14} className="animate-spin" />}
        {editingSkill ? "Update Skill" : "Create Skill"}
      </button>
    </div>
  );

  return (
    <Modal
      MODAL_ID={MODAL_TYPE.CREATE_SKILL_MODAL}
      onClose={() => closeModal(MODAL_TYPE.CREATE_SKILL_MODAL)}
      title={editingSkill ? "Edit Skill" : "Create New Skill"}
      icon={<BookOpen size={16} className="text-primary" />}
      widthClass="w-[min(42rem,92vw)]"
      footer={footerContent}
    >
      <div className="space-y-4">
        {/* Skill Name */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">Skill Name *</span>
          </label>
          <input
            autoFocus
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            className="input input-bordered w-full"
            placeholder="e.g., refund-policy"
            maxLength={100}
            disabled={isSaving}
            required
          />
        </div>

        {/* Description */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">Description</span>
          </label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => handleInputChange("description", e.target.value)}
            className="input input-bordered w-full"
            placeholder="Brief description of what this skill does"
            maxLength={200}
            disabled={isSaving}
          />
        </div>

        {/* Content */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">Skill Content *</span>
          </label>
          <AutoResizeTextarea
            value={formData.content}
            onChange={(e) => handleInputChange("content", e.target.value)}
            className="textarea textarea-bordered min-h-[200px]"
            placeholder="Full skill instructions and procedures go here..."
            disabled={isSaving}
            required
          />
          <label className="label">
            <span className="label-text-alt text-base-content/60">
              Provide detailed instructions and procedures for this skill
            </span>
          </label>
        </div>
      </div>
    </Modal>
  );
};

export default SkillCreateModal;
