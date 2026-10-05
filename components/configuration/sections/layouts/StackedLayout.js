"use client";

import React from "react";

// All config sections (Prompt/Model/Connectors/Memory/Settings) rendered
// one after another on a single scrollable page instead of behind tabs.
const StackedLayout = ({ tabs }) => {
  return (
    <div data-testid="config-layout-stacked" className="flex flex-col gap-4 w-full pb-8 pt-1">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <div
            key={tab.id}
            data-testid={`config-stacked-section-${tab.id}`}
            className="w-full rounded-xl border border-base-200 bg-base-100 shadow-sm overflow-hidden"
          >
            <div className="flex items-center gap-2.5 px-5 py-3.5 bg-base-200/40 border-b border-base-200">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary shrink-0">
                {Icon && <Icon size={14} className="w-3.5 h-3.5" aria-hidden="true" />}
              </span>
              <h3 className="text-sm font-semibold text-base-content">{tab.label}</h3>
            </div>
            <div className="px-5 py-5">{tab.content}</div>
          </div>
        );
      })}
    </div>
  );
};

export default StackedLayout;
