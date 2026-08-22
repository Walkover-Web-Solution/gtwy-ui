"use client";
import { MODAL_TYPE } from "@/utils/enums";
import React from "react";
import { Keyboard } from "lucide-react";
import { closeModal } from "@/utils/utility";
import Modal from "../UI/Modal";

const KeyboardShortcut = ({ keys, description }) => {
  return (
    <div className="flex items-center justify-between py-2 px-3 hover:bg-base-200 rounded-lg transition-colors duration-200">
      <span className="text-xs text-base-content">{description}</span>
      <div className="flex items-center gap-1">
        {keys.map((key, index) => (
          <React.Fragment key={index}>
            <kbd className="kbd kbd-xs bg-base-300 text-base-content border border-base-300 shadow-sm">{key}</kbd>
            {index < keys.length - 1 && <span className="text-base-content/50 text-xs mx-0.5">+</span>}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

const ShortcutCategory = ({ title, shortcuts }) => {
  return (
    <div className="mb-4">
      <h3 className="text-xs font-semibold text-base-content/70 mb-2 uppercase tracking-wide">{title}</h3>
      <div className="space-y-0.5">
        {shortcuts.map((shortcut, index) => (
          <KeyboardShortcut key={index} keys={shortcut.keys} description={shortcut.description} />
        ))}
      </div>
    </div>
  );
};

const KeyboardShortcutsModal = () => {
  const handleClose = () => {
    closeModal(MODAL_TYPE.KEYBOARD_SHORTCUTS_MODAL);
  };

  const isMac = typeof window !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const modifierKey = isMac ? "⌘" : "Ctrl";

  const shortcutCategories = [
    {
      title: "General",
      shortcuts: [
        { keys: [modifierKey, "K"], description: "Search agents, API keys, knowledge base, etc." },
        { keys: [modifierKey, "/"], description: "Show keyboard shortcuts" },
        { keys: ["Esc"], description: "Close modal/popup" },
      ],
    },
    {
      title: "Agent Navigation",
      shortcuts: [
        { keys: ["G", "C"], description: "Go to Agent Config" },
        { keys: ["G", "T"], description: "Go to Evaluations" },
        { keys: ["G", "H"], description: "Go to History" },
      ],
    },
  ];

  return (
    <Modal
      MODAL_ID={MODAL_TYPE.KEYBOARD_SHORTCUTS_MODAL}
      onClose={handleClose}
      title="Keyboard Shortcuts"
      description="Quick reference for all available shortcuts"
      icon={<Keyboard size={16} className="text-trace-gold" />}
      widthClass="w-[min(380px,92vw)]"
    >
      <div id="keyboard-shortcuts-modal-container" className="max-h-[60vh] overflow-y-auto">
        <div className="space-y-4">
          {shortcutCategories.map((category, index) => (
            <ShortcutCategory key={index} title={category.title} shortcuts={category.shortcuts} />
          ))}
        </div>
      </div>
    </Modal>
  );
};

export default KeyboardShortcutsModal;
