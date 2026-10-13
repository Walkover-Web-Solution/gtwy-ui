"use client";
import React from "react";
import Link from "next/link";
import { ArrowLeft, Zap } from "lucide-react";

const DirectPageHeader = ({ orgId, tabs, activeTab, onTabChange }) => (
  <header className="flex flex-wrap items-center justify-between gap-3 border-b border-base-content/10 bg-base-100 px-4 py-2.5">
    <div className="flex min-w-0 items-center gap-3">
      <Link
        href={`/org/${orgId}/agents`}
        className="btn btn-ghost btn-sm btn-square"
        data-testid="direct-back-button"
        aria-label="Back to agents"
      >
        <ArrowLeft size={16} />
      </Link>
      <span className="h-6 w-px bg-base-content/10" aria-hidden />
      <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-primary text-primary-content">
        <Zap size={15} />
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="truncate text-sm font-semibold text-base-content">Run without an agent</h1>
          <span className="hidden border border-base-content/15 px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-base-content/60 sm:inline">
            Runtime config
          </span>
        </div>
        <p className="truncate text-xs text-base-content/55">
          Model, prompt, parameters and tools travel with each request. Nothing is saved as an agent.
        </p>
      </div>
    </div>

    <div role="tablist" className="flex border border-base-content/10 bg-base-200 p-0.5">
      {tabs.map(({ id, label, icon: Icon }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isActive}
            data-testid={`direct-tab-${id}`}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive ? "bg-primary text-primary-content" : "text-base-content/60 hover:text-base-content"
            }`}
            onClick={() => onTabChange(id)}
          >
            <Icon size={13} />
            {label}
          </button>
        );
      })}
    </div>
  </header>
);

export default DirectPageHeader;
