"use client";

import React, { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import ConfirmationModal from "@/components/UI/ConfirmationModal";
import { closeModal } from "@/utils/utility";
import { MODAL_TYPE } from "@/utils/enums";
import useGuardedSectionChange from "./useGuardedSectionChange";

// Config sections (Prompt/Model/Connectors/Memory/Settings) as a collapsible
// accordion. All sections start closed; opening one closes any other.
// Content only mounts while its section is open so heavy tabs (Prompt
// editor, etc.) aren't all live at once.
const AccordionSectionsLayout = ({ tabs, activeTab, onTabChange }) => {
  // Visual open/closed state is independent from `activeTab` (which the
  // parent always initializes to "prompt") so every section starts closed.
  const [openId, setOpenId] = useState(null);
  const handleTabChange = (tabId) => {
    setOpenId(tabId);
    onTabChange(tabId);
  };
  const { requestTabChange, doTabChange, pendingTabRef } = useGuardedSectionChange(activeTab, handleTabChange);
  const openIndex = tabs.findIndex((tab) => tab.id === openId);

  const handleHeaderClick = (tabId) => {
    if (openId === tabId) {
      setOpenId(null);
      return;
    }
    requestTabChange(tabId);
  };

  return (
    <div data-testid="config-layout-accordion" className="flex flex-col gap-3 w-full pb-8 pt-1">
      {tabs.map((tab, idx) => {
        const isOpen = tab.id === openId;
        const isDone = openIndex !== -1 && idx < openIndex;
        const Icon = tab.icon;
        return (
          <div
            key={tab.id}
            data-testid={`config-accordion-section-${tab.id}`}
            className={`rounded-xl border overflow-hidden transition-colors ${
              isOpen ? "border-primary/40 shadow-sm" : "border-base-200"
            }`}
          >
            <button
              type="button"
              onClick={() => handleHeaderClick(tab.id)}
              aria-expanded={isOpen}
              className={`w-full px-4 py-3.5 flex items-center gap-3 text-left transition-colors ${
                isOpen ? "bg-primary/5" : "bg-base-100 hover:bg-base-200/60"
              }`}
            >
              <span
                className={`flex items-center justify-center w-7 h-7 rounded-full shrink-0 transition-colors ${
                  isOpen
                    ? "bg-primary text-primary-content"
                    : isDone
                      ? "bg-primary/15 text-primary"
                      : "bg-base-200 text-base-content/50"
                }`}
              >
                {isDone && !isOpen ? (
                  <Check size={14} />
                ) : Icon ? (
                  <Icon size={14} className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <span className="text-xs font-semibold">{idx + 1}</span>
                )}
              </span>
              <span className={`flex-1 text-sm font-semibold ${isOpen ? "text-base-content" : "text-base-content/80"}`}>
                {tab.label}
              </span>
              <ChevronDown
                size={16}
                className={`shrink-0 text-base-content/40 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
            {isOpen && (
              <div className="px-4 py-5 border-t border-base-200 bg-base-100 animate-fade-in-scale">{tab.content}</div>
            )}
          </div>
        );
      })}

      <ConfirmationModal
        modalType={MODAL_TYPE.UNSAVED_CHANGES_TAB_MODAL}
        title="Unsaved Prompt Changes"
        message="You have unsaved changes to your prompt. If you leave now, your changes will be lost."
        confirmText="Leave without saving"
        cancelText="Stay"
        confirmButtonClass="btn-error text-white"
        onConfirm={() => {
          closeModal(MODAL_TYPE.UNSAVED_CHANGES_TAB_MODAL);
          const tab = pendingTabRef.current;
          pendingTabRef.current = null;
          if (tab) doTabChange(tab);
        }}
        onCancel={() => {
          closeModal(MODAL_TYPE.UNSAVED_CHANGES_TAB_MODAL);
          pendingTabRef.current = null;
        }}
        onClose={() => {
          closeModal(MODAL_TYPE.UNSAVED_CHANGES_TAB_MODAL);
          pendingTabRef.current = null;
        }}
      />
    </div>
  );
};

export default AccordionSectionsLayout;
