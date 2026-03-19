"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Settings, BookOpen, Play, ChevronLeft } from "lucide-react";
import { useDispatch } from "react-redux";
import { useCustomSelector } from "@/customHooks/customSelector";
import { getAllChatBotAction } from "@/store/action/chatBotAction";
import ChatbotConfigurationTab from "./ChatbotConfigurationTab";
import ChatbotIntegrationGuideTab from "./ChatbotIntegrationGuideTab";
import ChatbotTestingTab from "./ChatbotTestingTab";
import ChatbotPreview from "./ChatbotPreview";

const ChatbotConfigDetailView = ({ params, embedToken }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();

  const { chatbots } = useCustomSelector((state) => ({
    chatbots: state?.ChatBot?.org?.[params?.org_id] || [],
  }));
  const chatBotId = params?.chatbot_id || chatbots?.[0]?._id;

  useEffect(() => {
    if (!chatbots?.length && params?.org_id) {
      dispatch(getAllChatBotAction(params.org_id));
    }
  }, [params?.org_id]);

  const tabFromUrl = searchParams.get("tab") || "integration";
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [isConfigMode, setIsConfigMode] = useState(tabFromUrl === "configuration");
  const [isTestingMode, setIsTestingMode] = useState(tabFromUrl === "testing");
  useEffect(() => {
    setActiveTab(tabFromUrl);
    setIsConfigMode(tabFromUrl === "configuration");
    setIsTestingMode(tabFromUrl === "testing");
  }, [tabFromUrl]);

  const handleTabChange = (tabId) => {
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set("tab", tabId);
    router.push(`?${newParams.toString()}`);
    setIsConfigMode(tabId === "configuration");
    setIsTestingMode(tabId === "testing");
    setActiveTab(tabId);
  };

  const handleBackFromConfig = () => {
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set("tab", "integration");
    router.push(`?${newParams.toString()}`);
    setIsConfigMode(false);
    setActiveTab("integration");
  };

  const handleBackFromTesting = () => {
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set("tab", "integration");
    router.push(`?${newParams.toString()}`);
    setIsTestingMode(false);
    setActiveTab("integration");
  };

  const tabs = [
    {
      id: "integration",
      label: "Integration Guide",
      icon: <BookOpen className="h-4 w-4" />,
    },
    {
      id: "configuration",
      label: "Configuration",
      icon: <Settings className="h-4 w-4" />,
    },
    {
      id: "testing",
      label: "Testing",
      icon: <Play className="h-4 w-4" />,
    },
  ];

  return (
    <>
      <div className="w-full h-full flex flex-col" data-testid="chatbot-config-detail-view">
        <div className="flex-1 flex overflow-hidden px-2 mt-2">
          {/* Sidebar */}
          <div className="w-80 flex-shrink-0 h-full" data-testid="chatbot-config-sidebar">
            <div className="bg-base-100 pt-6 border border-base-300 rounded-lg p-2 h-full flex flex-col overflow-hidden">
              {!isConfigMode && !isTestingMode ? (
                // Main Navigation Tabs with slide from left animation
                <nav
                  key="main-nav"
                  className="space-y-1"
                  style={{ animation: "slideInLeft 0.3s ease-out both" }}
                  data-testid="chatbot-config-main-nav"
                >
                  {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        data-testid={`chatbot-config-tab-${tab.id}`}
                        onClick={() => handleTabChange(tab.id)}
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
              ) : isConfigMode ? (
                // Configuration Settings with slide from right animation
                <div
                  key="config-nav"
                  className="flex flex-col flex-1 min-h-0"
                  style={{ animation: "slideInRight 0.3s ease-out both" }}
                >
                  {/* Back Button */}
                  <div className="mb-4 flex-shrink-0">
                    <button
                      data-testid="chatbot-config-back-button"
                      onClick={handleBackFromConfig}
                      className="w-full flex items-center gap-3 py-2 px-3 rounded-lg transition-all duration-200 hover:bg-base-200 text-base-content"
                    >
                      <ChevronLeft size={16} />
                      <span className="text-sm truncate">Back</span>
                    </button>
                  </div>
                  <div className="text-xs text-base-content/50 uppercase tracking-wider px-2 mb-2 flex-shrink-0">
                    Configuration
                  </div>
                  <div
                    id="config-sidebar-content"
                    data-testid="chatbot-config-sidebar-content"
                    className="space-y-1 overflow-y-auto flex-1 min-h-0"
                  >
                    <ChatbotConfigurationTab params={params} isInSidebar={true} />
                  </div>
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
                      data-testid="chatbot-testing-back-button"
                      onClick={handleBackFromTesting}
                      className="w-full flex items-center gap-3 py-2 px-3 rounded-lg transition-all duration-200 hover:bg-base-200 text-base-content"
                    >
                      <ChevronLeft size={16} />
                      <span className="text-sm truncate">Back</span>
                    </button>
                  </div>
                  <div className="text-xs text-base-content/50 uppercase tracking-wider px-2 mb-2 flex-shrink-0">
                    Testing
                  </div>
                  <div
                    id="chatbot-testing-sidebar-content"
                    data-testid="chatbot-testing-sidebar-content"
                    className="overflow-y-auto flex-1 min-h-0"
                  ></div>
                </div>
              )}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 ml-3 overflow-hidden" data-testid="chatbot-config-content-area">
            <div
              className={`h-full border border-base-300 rounded-lg bg-base-100 ${activeTab !== "configuration" ? "overflow-y-auto" : ""}`}
            >
              {activeTab === "integration" && <ChatbotIntegrationGuideTab params={params} chatBotId={chatBotId} />}
              {activeTab === "configuration" && <ChatbotPreview embedToken={embedToken} params={params} />}
              {activeTab === "testing" && (
                <ChatbotTestingTab params={params} chatBotId={chatBotId} embedToken={embedToken} />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatbotConfigDetailView;
