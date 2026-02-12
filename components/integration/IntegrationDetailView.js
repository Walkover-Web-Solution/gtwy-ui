"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import IntegrationTab from "./IntegrationTab";
import ConfigurationTab from "./ConfigurationTab";
import TestingTab from "./TestingTab";

const IntegrationDetailView = ({ data, onClose }) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get tab from URL params, default to "integration"
  const tabFromUrl = searchParams.get("tab") || "integration";
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [isConfigMode, setIsConfigMode] = useState(tabFromUrl === "configuration");

  // Sync activeTab with URL params
  useEffect(() => {
    setActiveTab(tabFromUrl);
    setIsConfigMode(tabFromUrl === "configuration");
  }, [tabFromUrl]);

  // Early return AFTER all hooks
  if (!data) return null;

  // Handle configuration tab click
  const handleTabClick = (tabId) => {
    // Update URL params with new tab
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabId);
    router.push(`?${params.toString()}`);

    if (tabId === "configuration") {
      setIsConfigMode(true);
    } else {
      setIsConfigMode(false);
    }
    setActiveTab(tabId);
  };

  // Handle back from configuration mode
  const handleBackFromConfig = () => {
    // Update URL to integration tab
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "integration");
    router.push(`?${params.toString()}`);

    setIsConfigMode(false);
    setActiveTab("integration");
  };

  const TABS = [
    {
      id: "integration",
      label: "Integration Guide",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
          />
        </svg>
      ),
    },
    {
      id: "configuration",
      label: "Configuration",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      id: "testing",
      label: "Testing Environment",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      ),
    },
  ];

  return (
    <>
      {/* Custom Keyframes for Swap Animation and Scrollbar Hide */}
      <style jsx>{`
        @keyframes slideInLeft {
          0% {
            transform: translateX(-100%);
            opacity: 0;
          }
          100% {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes slideInRight {
          0% {
            transform: translateX(100%);
            opacity: 0;
          }
          100% {
            transform: translateX(0);
            opacity: 1;
          }
        }

        /* Hide scrollbar while maintaining scroll functionality */
        #config-sidebar-content {
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE and Edge */
        }

        #config-sidebar-content::-webkit-scrollbar {
          display: none; /* Chrome, Safari, Opera */
        }
      `}</style>

      <div className="w-full h-full flex flex-col">
        {/* Main Content Area with Sidebar */}
        <div className="flex-1 flex overflow-hidden px-2 mt-2">
          {/* Sidebar */}
          <div className="w-80 flex-shrink-0 h-full">
            <div className="bg-base-100 pt-6 scroll-hidden border border-base-300 rounded-lg p-2 h-full flex flex-col">
              {!isConfigMode ? (
                // Main Navigation Tabs with slide from left animation
                <nav
                  key="main-nav"
                  className="space-y-1"
                  style={{
                    animation: "slideInLeft 0.3s ease-out both",
                  }}
                >
                  {TABS.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleTabClick(tab.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                          ${
                            isActive
                              ? "bg-primary text-primary-content"
                              : "text-base-content/70 hover:bg-base-200 hover:text-base-content"
                          }`}
                      >
                        {tab.icon}
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </nav>
              ) : (
                // Configuration Settings with slide from right animation
                <div
                  key="config-nav"
                  className="flex flex-col flex-1 min-h-0"
                  style={{
                    animation: "slideInRight 0.3s ease-out both",
                  }}
                >
                  {/* Back Button */}
                  <div className="mb-4 flex-shrink-0">
                    <button
                      onClick={handleBackFromConfig}
                      className="w-full flex items-center gap-3 py-2 px-3 rounded-lg transition-all duration-200 hover:bg-base-200 text-base-content"
                    >
                      <ArrowLeft size={16} />
                      <span className="text-sm truncate">Back to Tabs</span>
                    </button>
                  </div>

                  {/* Configuration Content Passed from ConfigurationTab */}
                  <div className="text-xs text-base-content/50 uppercase tracking-wider px-2 mb-2 flex-shrink-0">
                    Configuration
                  </div>
                  <div id="config-sidebar-content" className="space-y-1 overflow-y-auto flex-1 min-h-0"></div>
                </div>
              )}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden">
            <div
              className={`h-full border border-base-300 rounded-lg bg-base-100 ${activeTab !== "configuration" ? "overflow-y-auto" : ""}`}
            >
              {activeTab === "integration" && <IntegrationTab data={data} />}
              {activeTab === "configuration" && <ConfigurationTab data={data} isConfigMode={isConfigMode} />}
              {activeTab === "testing" && <TestingTab data={data} />}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default IntegrationDetailView;
