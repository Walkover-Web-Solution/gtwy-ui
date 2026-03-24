"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Code, Settings, Monitor } from "lucide-react";
import IntegrationTab from "./IntegrationTab";
import ConfigurationTab from "./ConfigurationTab";
import TestingTab from "./TestingTab";
import ConfirmationModal from "../UI/ConfirmationModal";
import { MODAL_TYPE } from "@/utils/enums";
import { openModal, closeModal } from "@/utils/utility";

const IntegrationDetailView = ({ data, onClose }) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get tab from URL params, default to "integration"
  const tabFromUrl = searchParams.get("tab") || "integration";
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [isConfigMode, setIsConfigMode] = useState(tabFromUrl === "configuration");
  const [isTestingMode, setIsTestingMode] = useState(tabFromUrl === "testing");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const pendingBackAction = useRef(null);
  const configSaveRef = useRef(null);

  // Sync activeTab with URL params
  useEffect(() => {
    setActiveTab(tabFromUrl);
    setIsConfigMode(tabFromUrl === "configuration");
    setIsTestingMode(tabFromUrl === "testing");
  }, [tabFromUrl]);

  // Early return AFTER all hooks
  if (!data) return null;

  // Handle configuration tab click
  const handleTabClick = (tabId) => {
    // Update URL params with new tab
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabId);
    router.push(`?${params.toString()}`);

    setIsConfigMode(tabId === "configuration");
    setIsTestingMode(tabId === "testing");
    setActiveTab(tabId);
  };

  // Warn on browser refresh/close if unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges && isConfigMode) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges, isConfigMode]);

  const doBackFromConfig = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "integration");
    router.push(`?${params.toString()}`);
    setIsConfigMode(false);
    setActiveTab("integration");
    setHasUnsavedChanges(false);
  }, [searchParams, router]);

  // Handle back from configuration or testing mode
  const handleBackFromConfig = () => {
    if (hasUnsavedChanges) {
      pendingBackAction.current = doBackFromConfig;
      openModal(MODAL_TYPE.UNSAVED_CHANGES_MODAL);
    } else {
      doBackFromConfig();
    }
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
      icon: <Code className="h-5 w-5" />,
    },
    {
      id: "configuration",
      label: "Configuration",
      icon: <Settings className="h-5 w-5" />,
    },
    {
      id: "testing",
      label: "Testing",
      icon: <Monitor className="h-5 w-5" />,
    },
  ];

  return (
    <>
      <div className="w-full h-full flex flex-col" data-testid="integration-detail-view">
        {/* Main Content Area with Sidebar */}
        <div className="flex-1 flex overflow-hidden px-2 mt-2">
          {/* Sidebar */}
          <div className="w-80 flex-shrink-0 h-full" data-testid="integration-sidebar">
            <div className="bg-base-100 pt-6 scroll-hidden border border-base-300 rounded-lg p-2 h-full flex flex-col">
              {!isConfigMode && !isTestingMode ? (
                // Main Navigation Tabs
                <nav
                  key="main-nav"
                  className="space-y-1"
                  style={{ animation: "slideInLeft 0.3s ease-out both" }}
                  data-testid="integration-main-nav"
                >
                  {TABS.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        data-testid={`integration-tab-${tab.id}`}
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
              ) : isConfigMode ? (
                // Configuration sidebar panel
                <div
                  key="config-nav"
                  className="flex flex-col flex-1 min-h-0"
                  style={{ animation: "slideInRight 0.3s ease-out both" }}
                >
                  <div className="mb-4 flex-shrink-0">
                    <button
                      data-testid="integration-config-back-button"
                      onClick={handleBackFromConfig}
                      className="w-full flex items-center gap-3 py-2 px-3 rounded-lg transition-all duration-200 hover:bg-base-200 text-base-content"
                      title={hasUnsavedChanges ? "You have unsaved changes" : ""}
                    >
                      <ArrowLeft size={16} />
                      <span className="text-sm truncate">Back</span>
                    </button>
                  </div>
                  {/* Configuration Content Passed from ConfigurationTab */}
                  <div className="text-xs text-base-content/50 uppercase tracking-wider px-2 mb-2 flex-shrink-0">
                    Configuration
                  </div>
                  <div id="config-sidebar-content" className="space-y-1 overflow-y-auto flex-1 min-h-0"></div>
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
                      data-testid="integration-testing-back-button"
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
                    id="testing-sidebar-content"
                    data-testid="integration-testing-sidebar-content"
                    className="space-y-2 overflow-y-auto flex-1 min-h-0"
                  ></div>
                </div>
              )}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden" data-testid="integration-content-area">
            <div
              className={`h-full border border-base-300 rounded-lg bg-base-100 ${activeTab === "integration" ? "overflow-y-auto" : ""}`}
            >
              {activeTab === "integration" && <IntegrationTab data={data} />}
              {activeTab === "configuration" && (
                <ConfigurationTab
                  data={data}
                  isConfigMode={isConfigMode}
                  onUnsavedChanges={setHasUnsavedChanges}
                  onSaveRef={configSaveRef}
                />
              )}
              {activeTab === "testing" && <TestingTab data={data} isTestingMode={isTestingMode} />}
            </div>
          </div>
        </div>
      </div>
      <ConfirmationModal
        modalType={MODAL_TYPE.UNSAVED_CHANGES_MODAL}
        title="Unsaved Changes"
        message="You have unsaved changes. What would you like to do?"
        cancelText="Discard Changes"
        confirmText="Save"
        confirmButtonClass="btn-outline"
        cancelButtonClass="btn-error"
        onClose={() => {
          closeModal(MODAL_TYPE.UNSAVED_CHANGES_MODAL);
          pendingBackAction.current = null;
        }}
        onCancel={() => {
          closeModal(MODAL_TYPE.UNSAVED_CHANGES_MODAL);
          pendingBackAction.current?.();
          pendingBackAction.current = null;
        }}
        onConfirm={async () => {
          await configSaveRef.current?.();
          closeModal(MODAL_TYPE.UNSAVED_CHANGES_MODAL);
          pendingBackAction.current?.();
          pendingBackAction.current = null;
        }}
      />
    </>
  );
};

export default IntegrationDetailView;
