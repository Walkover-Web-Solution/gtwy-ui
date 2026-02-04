"use client";

import React, { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const TabsLayout = ({ tabs, activeTab, onTabChange, hideTabs = false }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeContent = tabs.find((tab) => tab.id === activeTab)?.content;

  // Read tab from URL on component mount/refresh
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl && tabs.some((tab) => tab.id === tabFromUrl) && tabFromUrl !== activeTab) {
      onTabChange(tabFromUrl);
    }
  }, [searchParams, tabs, activeTab, onTabChange]);

  const handleTabChange = (tabId) => {
    // Update URL with tab query parameter
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    current.set("tab", tabId);
    const search = current.toString();
    const query = search ? `?${search}` : "";
    router.push(`${window.location.pathname}${query}`, { scroll: false });

    // Call the original onTabChange callback
    onTabChange(tabId);
  };

  return (
    <div id="tabs-layout-container" className="flex flex-col w-full">
      {!hideTabs && (
        <div id="tabs-layout-nav" className="border-b border-base-200 bg-base-100 sticky top-0 z-10 -ml-8 -mx-4">
          <div
            className="w-full ml-3 items-center flex h-10 bg-transparent gap-1 border-0 px-4 overflow-x-auto scrollbar-hide"
            role="tablist"
            aria-orientation="horizontal"
          >
            {tabs.map((tab) => {
              const isActive = tab.id === activeTab;
              const Icon = tab.icon;
              return (
                <button
                  id={`tab-button-${tab.id}`}
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => handleTabChange(tab.id)}
                  className={`inline-flex items-center justify-center border border-transparent whitespace-nowrap focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 rounded-lg px-2 py-1  text-xs transition-all duration-200 flex-shrink-0 min-w-fit ${
                    isActive ? " text-blue-600 border-base-300/30" : "text-base-content/60 hover:text-base-content"
                  }`}
                >
                  {Icon && <Icon size={12} className="w-3 h-3 mr-2" aria-hidden="true" />}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div id="tabs-layout-content" role="tabpanel" className="pb-6">
        {activeContent}
      </div>
    </div>
  );
};

export default TabsLayout;
