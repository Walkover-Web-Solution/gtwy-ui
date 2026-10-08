import Modal from "@/components/UI/Modal";
import { closeModal } from "@/utils/utility";
import { useState } from "react";
import { Sparkles } from "lucide-react";

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

  const footerContent = (
    <div className="flex justify-end gap-2">
      <button className="btn btn-ghost btn-sm font-normal text-xs h-8 px-4" onClick={handleClose}>
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
  );

  return (
    <Modal
      MODAL_ID={modalId}
      onClose={handleClose}
      title={title}
      description={description}
      icon={<Sparkles size={16} className="text-trace-gold" />}
      widthClass="w-[min(480px,92vw)]"
      footer={footerContent}
    >
      <div className="flex flex-col gap-4">
        <div className="relative">
          <textarea
            className="textarea w-full text-sm resize-none focus:outline-none focus:border-primary border-base-content/20"
            rows={5}
            placeholder={placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
          />
          <span className="absolute bottom-3 right-3 text-xs text-base-content/30">{value.length}</span>
        </div>
      </div>
    </Modal>
  );
};

export default CustomPromptModal;
