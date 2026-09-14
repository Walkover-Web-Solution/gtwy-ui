"use client";

import React from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import ConfirmationModal from "@/components/UI/ConfirmationModal";
import { closeModal } from "@/utils/utility";
import { MODAL_TYPE } from "@/utils/enums";
import useGuardedSectionChange from "./useGuardedSectionChange";

// Guided step-through wizard over the same Prompt/Model/Connectors/Memory/
// Settings sections, with a step indicator plus Back/Next controls.
const StepperSectionsLayout = ({ tabs, activeTab, onTabChange }) => {
  const { requestTabChange, doTabChange, pendingTabRef } = useGuardedSectionChange(activeTab, onTabChange);

  const stepIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.id === activeTab)
  );
  const current = tabs[stepIndex];
  const CurrentIcon = current?.icon;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === tabs.length - 1;

  return (
    <div data-testid="config-layout-stepper" className="flex flex-col gap-6 w-full pb-8 pt-1">
      <div className="flex items-start gap-1">
        {tabs.map((tab, idx) => {
          const isDone = idx < stepIndex;
          const isActive = idx === stepIndex;
          const Icon = tab.icon;
          return (
            <React.Fragment key={tab.id}>
              <button
                type="button"
                onClick={() => requestTabChange(tab.id)}
                title={tab.label}
                className="flex flex-col items-center gap-1.5 shrink-0 group"
              >
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors ${
                    isActive
                      ? "bg-primary border-primary text-primary-content"
                      : isDone
                        ? "bg-primary/15 border-primary/30 text-primary"
                        : "bg-base-100 border-base-300 text-base-content/40 group-hover:border-base-content/30"
                  }`}
                >
                  {isDone ? <Check size={14} /> : Icon ? <Icon size={14} className="w-3.5 h-3.5" /> : idx + 1}
                </span>
                <span
                  className={`text-[11px] font-medium whitespace-nowrap hidden sm:inline ${
                    isActive ? "text-base-content" : "text-base-content/50"
                  }`}
                >
                  {tab.label}
                </span>
              </button>
              {idx < tabs.length - 1 && (
                <div className={`h-0.5 flex-1 min-w-4 mt-4 rounded-full ${isDone ? "bg-primary/40" : "bg-base-200"}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div
        data-testid={`config-stepper-section-${current?.id}`}
        className="w-full rounded-xl border border-base-200 bg-base-100 shadow-sm px-5 py-5 animate-fade-in-scale"
      >
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-base-200">
          {CurrentIcon && <CurrentIcon size={16} className="w-4 h-4 text-primary" aria-hidden="true" />}
          <h3 className="text-sm font-semibold text-base-content">{current?.label}</h3>
        </div>
        {current?.content}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          className="btn btn-sm btn-ghost gap-1"
          disabled={isFirst}
          onClick={() => requestTabChange(tabs[stepIndex - 1]?.id)}
        >
          <ArrowLeft size={14} /> Back
        </button>
        <div className="flex items-center gap-1.5">
          {tabs.map((tab, idx) => (
            <span
              key={tab.id}
              className={`h-1.5 rounded-full transition-all ${
                idx === stepIndex ? "w-5 bg-primary" : idx < stepIndex ? "w-1.5 bg-primary/40" : "w-1.5 bg-base-300"
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          className="btn btn-sm btn-primary gap-1"
          disabled={isLast}
          onClick={() => requestTabChange(tabs[stepIndex + 1]?.id)}
        >
          Next <ArrowRight size={14} />
        </button>
      </div>

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

export default StepperSectionsLayout;
