"use client";
import { MODAL_TYPE } from "@/utils/enums";
import React from "react";
import { KeyboardIcon, XIcon } from "@/components/Icons";
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

  // Detect if user is on Mac
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
        { keys: ["G", "T"], description: "Go to Test Cases" },
        { keys: ["G", "H"], description: "Go to History" },
      ],
    },
  ];

  return (
    <Modal MODAL_ID={MODAL_TYPE.KEYBOARD_SHORTCUTS_MODAL}>
      <form method="dialog" className="modal-backdrop" onClick={handleClose}>
        <button>close</button>
      </form>
      <div className="modal-box absolute bottom-4 left-4 w-72 max-w-sm p-0 m-0">
        <div
          id="keyboard-shortcuts-modal-container"
          className="relative bg-base-100 rounded-xl shadow-2xl overflow-hidden border border-base-300"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-base-300 bg-base-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-base-200">
                  <KeyboardIcon size={18} className="text-base-content" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-base-content">Keyboard Shortcuts</h2>
                </div>
              </div>
              <button
                id="keyboard-shortcuts-close-button"
                onClick={handleClose}
                className="p-1 hover:bg-base-200 rounded-lg transition-colors duration-200"
                aria-label="Close"
              >
                <XIcon size={16} className="text-base-content/70" />
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="p-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-4">
              {shortcutCategories.map((category, index) => (
                <ShortcutCategory key={index} title={category.title} shortcuts={category.shortcuts} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default KeyboardShortcutsModal;
