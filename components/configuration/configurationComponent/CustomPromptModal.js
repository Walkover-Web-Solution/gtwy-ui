import Modal from "@/components/UI/Modal";
import { closeModal } from "@/utils/utility";
import { useState } from "react";

const CustomPromptModal = ({ modalId, title, description, placeholder, prompt, onSave, onClose }) => {
  const [value, setValue] = useState(prompt || "");

  const handleClose = () => {
    setValue(prompt || "");
    closeModal(modalId);
    onClose?.();
  };

  const handleSave = () => {
    if (!value.trim()) return;
    onSave(value.trim());
    closeModal(modalId);
  };

  return (
    <Modal MODAL_ID={modalId} onClose={onClose}>
      <div className="modal-box max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-base">{title}</h3>
            <p className="text-xs text-base-content/50 mt-0.5">{description}</p>
          </div>
        </div>

        <div className="relative">
          <textarea
            className="textarea textarea-bordered w-full text-sm resize-none focus:outline-none focus:border-primary"
            rows={5}
            placeholder={placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
          />
          <span className="absolute bottom-3 right-3 text-xs text-base-content/30">{value.length}</span>
        </div>

        <div className="modal-action mt-3">
          <button className="btn btn-ghost btn-sm" onClick={handleClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary btn-sm"
            disabled={!value.trim() || value.trim() === (prompt || "").trim()}
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={handleClose}>close</button>
      </form>
    </Modal>
  );
};

export default CustomPromptModal;
