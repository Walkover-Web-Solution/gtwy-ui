"use client";

import React, { useState, useEffect } from "react";
import { useConfigurationContext } from "../ConfigurationContext";
import { useCustomSelector } from "@/customHooks/customSelector";
import ApiGuide from "../configurationComponent/ApiGuide";
import BatchApiGuide from "../configurationComponent/BatchApiGuide";
import SecondStep from "../../chatbotConfiguration/SecondStep";
import PrivateFormSection from "../../chatbotConfiguration/FirstStep";
import SlugNameInput from "../configurationComponent/SlugNameInput";
import { Lock } from "lucide-react";

const IntegrationGuideTab = ({ isPublished }) => {
  const { params } = useConfigurationContext();

  // Get bridge data and integration data from Redux store
  const { slugName, prompt, bridgeTypeFromRedux, publishedVersionId } = useCustomSelector((state) => {
    return {
      slugName: state?.bridgeReducer?.allBridgesMap?.[params?.id]?.slugName,
      prompt: state?.bridgeReducer?.allBridgesMap?.[params?.id]?.configuration?.prompt,
      bridgeTypeFromRedux: state?.bridgeReducer?.allBridgesMap?.[params?.id]?.bridgeType?.toLowerCase(),
      publishedVersionId: state?.bridgeReducer?.allBridgesMap?.[params?.id]?.published_version_id,
    };
  });

  // Initialize activeTab state based on bridge type
  const [activeTab, setActiveTab] = useState(() => {
    return bridgeTypeFromRedux !== "trigger" ? bridgeTypeFromRedux : "chatbot";
  });

  useEffect(() => {
    // Set initial active tab based on the bridge type from Redux
    let initialTab = bridgeTypeFromRedux !== "trigger" ? bridgeTypeFromRedux : "chatbot";

    // If the bridge type is chatbot from Redux, force chatbot tab
    if (bridgeTypeFromRedux === "chatbot") {
      initialTab = "chatbot";
    }
    // If bridge type is not chatbot (api or batch), make sure we don't show chatbot tab
    else if (initialTab === "chatbot") {
      initialTab = "api"; // Default to API tab for non-chatbot agents
    }

    setActiveTab(initialTab);
  }, [bridgeTypeFromRedux]);

  // Determine which tabs to show based on the bridge type
  const tabs =
    bridgeTypeFromRedux === "chatbot"
      ? // If it's a chatbot, only show the chatbot tab
        [{ id: "chatbot", label: "Chatbot" }]
      : // If it's API or batch, show both API and Batch API tabs
        [
          { id: "api", label: "API" },
          { id: "batch", label: "Batch API" },
        ];

  // Render tab content based on active tab (from IntegrationGuideSlider logic)
  const renderTabContent = () => {
    switch (activeTab) {
      case "api":
        return <ApiGuide params={params} prompt={prompt} />;
      case "chatbot":
        return (
          <div className="">
            <SlugNameInput params={params} />
            <PrivateFormSection params={params} ChooseChatbot={true} />
            <SecondStep slugName={slugName} prompt={prompt} />
          </div>
        );
      case "batch":
        return <BatchApiGuide params={params} />;
      default:
        return null;
    }
  };

  // Check if agent has published version
  const hasPublishedVersion = publishedVersionId && publishedVersionId !== null;

  // Render locked state when no published version exists
  if (!hasPublishedVersion) {
    return (
      <div id="integration-guide-locked-container" className="p-6 space-y-6 relative">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-base-content mb-2">Integration Guide</h2>
          <p className="text-sm text-base-content/70">Choose your integration type and follow the guide</p>
        </div>

        {/* Locked State */}
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="text-center space-y-4">
            {/* Enhanced Lock Icon */}
            <div className="mx-auto w-20 h-20 bg-base-300/20 rounded-full flex items-center justify-center backdrop-blur-lg">
              <Lock size={48} />
            </div>

            {/* Title */}
            <h3 className="text-xl font-semibold text-base-content">Publish Version Required</h3>

            {/* Description */}
            <p className="text-base-content/70 max-w-md text-sm">
              You need to publish a version of this agent before you can access the integration guide. Please
              publishyour agent first to unlock integration options.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="integration-guide-container" className="p-6 space-y-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-base-content mb-2">Integration Guide</h2>
        <p className="text-sm text-base-content/70">Choose your integration type and follow the guide</p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Dynamic Tabs based on bridge type */}
        {!tabs.some((tab) => tab.id === "chatbot") && (
          <div id="integration-guide-tabs" className="tabs tabs-boxed bg-base-100 p-1 rounded-lg">
            {tabs.map((tab) => (
              <button
                id={`integration-tab-${tab.id}`}
                key={tab.id}
                className={`tab flex-1 transition-colors ${
                  activeTab === tab.id ? "tab-active bg-base-200 font-medium shadow-sm" : "hover:bg-base-200/50"
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Tab Content */}
        <div className="overflow-y-auto h-full scrollbar-hide p-4">{renderTabContent()}</div>
      </div>
    </div>
  );
};

export default IntegrationGuideTab;
