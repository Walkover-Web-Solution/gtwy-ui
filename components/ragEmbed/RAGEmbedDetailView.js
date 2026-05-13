"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, TestTube, ArrowLeft } from "lucide-react";
import RAGIntegrationTab from "./RAGIntegrationTab";
import RAGTestingTab from "./RAGTestingTab";

const RAGEmbedDetailView = ({ data, onClose }) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get tab from URL params, default to "integration"
  const tabFromUrl = searchParams.get("tab") || "integration";
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [isTestingMode, setIsTestingMode] = useState(tabFromUrl === "testing");

  // Sync activeTab with URL params
  useEffect(() => {
    setActiveTab(tabFromUrl);
    setIsTestingMode(tabFromUrl === "testing");
  }, [tabFromUrl]);

  // Early return AFTER all hooks
  if (!data) return null;

  // Handle tab click
  const handleTabClick = (tabId) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabId);
    router.push(`?${params.toString()}`);
    setIsTestingMode(tabId === "testing");
    setActiveTab(tabId);
  };

  const handleBackFromTesting = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "integration");
    router.push(`?${params.toString()}`);
    setIsTestingMode(false);
    setActiveTab("integration");
  };

  const TABS = [
    {
      id: "integration",
      label: "Integration Guide",
      icon: <BookOpen className="h-4 w-4" />,
    },
    {
      id: "testing",
      label: "Testing",
      icon: <TestTube className="h-4 w-4" />,
    },
  ];

  return (
    <div className="w-full h-full flex flex-col">
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

        #rag-testing-sidebar-content {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        #rag-testing-sidebar-content::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div className="w-full h-full flex flex-col" data-testid="rag-embed-detail-view">
        {/* Main Content Area with Sidebar */}
        <div className="flex-1 flex overflow-hidden px-2 mt-2">
          {/* Sidebar */}
          <div className="w-80 flex-shrink-0 h-full mr-3" data-testid="rag-embed-sidebar">
            <div className="bg-base-100 pt-4 border border-base-300 rounded-lg p-2 h-full flex flex-col overflow-hidden">
              {!isTestingMode ? (
                // Main Navigation Tabs with Back Button
                <div
                  key="main-nav"
                  className="flex flex-col space-y-1"
                  style={{ animation: "slideInLeft 0.3s ease-out both" }}
                >
                  <div className="mb-4 flex-shrink-0">
                    <button
                      data-testid="rag-embed-main-back-button"
                      onClick={typeof onClose === "function" ? onClose : () => router.back()}
                      className="w-full flex items-center gap-3 py-2 px-3 rounded-lg transition-all duration-200 hover:bg-base-200 text-base-content"
                    >
                      <ArrowLeft size={16} />
                      <span className="text-sm truncate">Back</span>
                    </button>
                  </div>
                  <nav className="space-y-1" data-testid="rag-embed-main-nav">
                    {TABS.map((tab) => {
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          data-testid={`rag-embed-tab-${tab.id}`}
                          onClick={() => handleTabClick(tab.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                            ${
                              isActive
                                ? "bg-base-200 text-base-content"
                                : "text-base-content/70 hover:bg-base-200 hover:text-base-content"
                            }`}
                        >
                          {tab.icon}
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </nav>
                </div>
              ) : (
                // Testing sidebar panel
                <div
                  key="testing-nav"
                  className="flex flex-col flex-1 min-h-0"
                  style={{ animation: "slideInRight 0.3s ease-out both" }}
                >
                  <div className="mb-4 flex-shrink-0">
                    <button
                      data-testid="rag-embed-testing-back-button"
                      onClick={handleBackFromTesting}
                      className="w-full flex items-center gap-3 py-2 px-3 rounded-lg transition-all duration-200 hover:bg-base-200 text-base-content"
                    >
                      <ArrowLeft size={16} />
                      <span className="text-sm truncate">Back</span>
                    </button>
                  </div>
                  <div className="text-xs text-base-content/50 uppercase tracking-wider px-2 mb-2 flex-shrink-0">
                    Testing
                  </div>
                  <div
                    id="rag-testing-sidebar-content"
                    data-testid="rag-embed-testing-sidebar-content"
                    className="space-y-2 overflow-y-auto flex-1 min-h-0"
                  ></div>
                </div>
              )}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden" data-testid="rag-embed-content-area">
            <div className="h-full border border-base-300 rounded-lg bg-base-100 overflow-y-auto">
              {activeTab === "integration" && <RAGIntegrationTab data={data} />}
              {activeTab === "testing" && <RAGTestingTab data={data} isTestingMode={isTestingMode} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RAGEmbedDetailView;
