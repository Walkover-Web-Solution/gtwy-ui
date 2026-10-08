"use client";
import React from "react";
import Modal from "@/components/UI/Modal";
import { MODAL_TYPE } from "@/utils/enums";
import { closeModal, RequiredItem } from "@/utils/utility";
import { Save } from "lucide-react";

const SaveWidgetModal = ({ widgetName, widgetDescription, onNameChange, onDescriptionChange, onSave, onCancel }) => {
  const handleCancel = () => {
    closeModal(MODAL_TYPE.SAVE_WIDGET_MODAL);
    onCancel?.();
  };

  const handleSave = () => {
    onSave?.();
  };

  const footerContent = (
    <div className="flex justify-end gap-2">
      <button data-testid="save-widget-cancel-button" className="btn btn-ghost btn-sm" onClick={handleCancel}>
        Cancel
      </button>
      <button
        data-testid="save-widget-save-button"
        className="btn btn-primary btn-sm"
        onClick={handleSave}
        disabled={!widgetName.trim()}
      >
        Save Widget
      </button>
    </div>
  );

  return (
    <Modal
      MODAL_ID={MODAL_TYPE.SAVE_WIDGET_MODAL}
      onClose={handleCancel}
      title="Save Widget"
      description="Give your widget a name and description"
      icon={<Save size={16} className="text-trace-gold" />}
      widthClass="w-[min(480px,92vw)]"
      footer={footerContent}
    >
      <div data-testid="save-widget-modal" className="flex flex-col gap-4">
        <div className="form-control">
          <label className="label">
            <span className="">
              Widget Name <RequiredItem />
            </span>
          </label>
          <input
            autoComplete="off"
            data-testid="save-widget-name-input"
            type="text"
            placeholder="Enter widget name"
            className="input w-full"
            value={widgetName}
            onChange={(e) => onNameChange(e.target.value)}
            autoFocus
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="">Description</span>
          </label>
          <textarea
            data-testid="save-widget-description-textarea"
            placeholder="Enter widget description (optional)"
            className="textarea w-full h-24"
            value={widgetDescription}
            onChange={(e) => onDescriptionChange(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
};

export default SaveWidgetModal;
