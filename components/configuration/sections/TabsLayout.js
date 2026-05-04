"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

const TabsLayout = ({ tabs, activeTab, onTabChange, hideTabs = false }) => {
  const searchParams = useSearchParams();
  const activeContent = tabs.find((tab) => tab.id === activeTab)?.content;

  const tabRefs = useRef({});
  const listRef = useRef(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });

  // Read tab from URL on component mount/refresh
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl && tabs.some((tab) => tab.id === tabFromUrl) && tabFromUrl !== activeTab) {
      onTabChange(tabFromUrl);
    }
  }, [searchParams, tabs, activeTab, onTabChange]);

  useEffect(() => {
    const activeEl = tabRefs.current[activeTab];
    const listEl = listRef.current;
    if (!activeEl || !listEl) return;

    const listRect = listEl.getBoundingClientRect();
    const tabRect = activeEl.getBoundingClientRect();

    setIndicator({
      left: tabRect.left - listRect.left + listEl.scrollLeft,
      width: tabRect.width,
      ready: true,
    });
  }, [activeTab, tabs]);

  const handleTabChange = (tabId) => {
    onTabChange(tabId);
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    current.set("tab", tabId);
    const search = current.toString();
    const query = search ? `?${search}` : "";
    window.history.replaceState(null, "", `${window.location.pathname}${query}`);
  };

  return (
    <div data-testid="tabs-layout-container" id="tabs-layout-container" className="flex flex-col w-full">
      {!hideTabs && (
        <div
          data-testid="tabs-layout-nav"
          id="tabs-layout-nav"
          className="border-b border-base-200 bg-base-100 sticky top-0 z-10 -ml-8 -mx-4"
        >
          <div
            ref={listRef}
            className="relative w-full ml-3 items-center flex h-10 bg-transparent gap-1 border-0 px-4 overflow-x-auto scrollbar-hide"
            role="tablist"
            aria-orientation="horizontal"
          >
            {tabs.map((tab) => {
              const isActive = tab.id === activeTab;
              const Icon = tab.icon;
              return (
                <button
                  ref={(el) => {
                    tabRefs.current[tab.id] = el;
                  }}
                  data-testid={`tab-button-${tab.id}`}
                  id={`tab-button-${tab.id}`}
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => handleTabChange(tab.id)}
                  className={`inline-flex items-center justify-center border-0 whitespace-nowrap focus-visible:ring-2 focus-visible:ring-blue-600/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 rounded-lg px-2 py-1 text-xs transition-colors duration-200 flex-shrink-0 min-w-fit ${
                    isActive ? "text-blue-600 font-medium" : "text-base-content/60 hover:text-base-content"
                  }`}
                >
                  {Icon && <Icon size={12} className="w-3 h-3 mr-2" aria-hidden="true" />}
                  <span>{tab.label}</span>
                </button>
              );
            })}

            {/* Sliding underline indicator */}
            {indicator.ready && (
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: indicator.left,
                  width: indicator.width,
                  height: 2,
                  borderRadius: "2px 2px 0 0",
                  background: "#2563eb",
                  transition: "left 0.25s cubic-bezier(0.4,0,0.2,1), width 0.25s cubic-bezier(0.4,0,0.2,1)",
                  pointerEvents: "none",
                }}
              />
            )}
          </div>
        </div>
      )}

      <div data-testid="tabs-layout-content" id="tabs-layout-content" role="tabpanel" className="pb-6">
        {activeContent}
      </div>
    </div>
  );
};

export default TabsLayout;
