"use client";
import React from "react";
import Modal from "@/components/UI/Modal";
import { MODAL_TYPE } from "@/utils/enums";
import { closeModal } from "@/utils/utility";

const SaveWidgetModal = ({ widgetName, widgetDescription, onNameChange, onDescriptionChange, onSave, onCancel }) => {
  const handleCancel = () => {
    closeModal(MODAL_TYPE.SAVE_WIDGET_MODAL);
    onCancel?.();
  };

  const handleSave = () => {
    onSave?.();
  };

  return (
    <Modal MODAL_ID={MODAL_TYPE.SAVE_WIDGET_MODAL} onClose={handleCancel}>
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">Save Widget</h3>

        <div className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Widget Name *</span>
            </label>
            <input
              type="text"
              placeholder="Enter widget name"
              className="input input-bordered w-full"
              value={widgetName}
              onChange={(e) => onNameChange(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Description</span>
            </label>
            <textarea
              placeholder="Enter widget description (optional)"
              className="textarea textarea-bordered w-full h-24"
              value={widgetDescription}
              onChange={(e) => onDescriptionChange(e.target.value)}
            />
          </div>
        </div>

        <div className="modal-action">
          <button className="btn btn-ghost" onClick={handleCancel}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!widgetName.trim()}>
            Save Widget
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default SaveWidgetModal;
