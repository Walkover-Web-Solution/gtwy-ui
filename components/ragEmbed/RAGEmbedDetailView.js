"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, TestTube } from "lucide-react";
import RAGIntegrationTab from "./RAGIntegrationTab";
import RAGTestingTab from "./RAGTestingTab";

const RAGEmbedDetailView = ({ data, onClose }) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get tab from URL params, default to "integration"
  const tabFromUrl = searchParams.get("tab") || "integration";
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  // Sync activeTab with URL params
  useEffect(() => {
    setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  // Early return AFTER all hooks
  if (!data) return null;

  // Handle tab click
  const handleTabClick = (tabId) => {
    // Update URL params with new tab
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabId);
    router.push(`?${params.toString()}`);
    setActiveTab(tabId);
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
      <div className="w-full h-full flex flex-col">
        {/* Main Content Area with Sidebar */}
        <div className="flex-1 flex overflow-hidden px-2 mt-2">
          {/* Sidebar */}
          <div className="flex flex-col w-48 flex-shrink-0 mr-3">
            {/* Header with Back Button */}
            {/* Tabs Navigation */}
            <div className="bg-base-100 rounded-lg border border-base-300 p-2 mb-3">
              <div className="space-y-1">
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
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full border border-base-300 rounded-lg bg-base-100 overflow-y-auto">
              {activeTab === "integration" && <RAGIntegrationTab data={data} />}
              {activeTab === "testing" && <RAGTestingTab data={data} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RAGEmbedDetailView;
