"use client";

import React, { memo, useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import TabsLayout from "./sections/TabsLayout";
import PromptTab from "./sections/PromptTab";
import ModelTab from "./sections/ModelTab";
import ConnectorsTab from "./sections/ConnectorsTab";
import MemoryTab from "./sections/MemoryTab";
import SettingsTab from "./sections/SettingsTab";
import IntegrationGuideTab from "./sections/IntegrationGuideTab";
import { SparklesIcon, BotIcon, LinkIcon, BrainIcon, SettingsIcon } from "@/components/Icons";
import { BookOpen } from "lucide-react";
import { useCustomSelector } from "@/customHooks/customSelector";

const NonImageModelConfig = memo(
  ({
    params,
    searchParams: propsSearchParams,
    isEmbedUser,
    isPublished,
    isEditor,
    apiKeySectionRef,
    promptTextAreaRef,
    uiState,
    updateUiState,
    promptState,
    setPromptState,
    handleCloseTextAreaFocus,
    savePrompt,
    isMobileView,
    closeHelperButtonLocation,
    apiKeyError,
    setApiKeyError,
    currentView,
    switchView,
  }) => {
    const searchParams = useSearchParams();
    const configState = useCustomSelector((state) => {
      const versionData = state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[propsSearchParams?.version];
      const bridgeDataFromState = state?.bridgeReducer?.allBridgesMap?.[params?.id];

      return {
        modelType: isPublished
          ? bridgeDataFromState?.configuration?.type?.toLowerCase()
          : versionData?.configuration?.type?.toLowerCase(),
      };
    });

    const [activeTab, setActiveTab] = useState(
      searchParams.get("tab") || (configState.modelType === "image" ? "model" : "prompt")
    );

    useEffect(() => {
      if (configState.modelType === "image" && (!currentView || currentView === "config")) {
        setActiveTab("model");
      }
    }, [configState.modelType, currentView]);

    useEffect(() => {
      if (currentView && currentView !== "config" && currentView !== "agent-flow" && currentView !== "chatbot-config") {
        if (!searchParams.get("tab")) {
          setActiveTab(currentView);
        }
      }
    }, [currentView, searchParams]);

    const tabs = useMemo(() => {
      const baseTabs = [
        {
          id: "prompt",
          label: "Prompt",
          icon: SparklesIcon,
          content: (
            <PromptTab
              isPublished={isPublished}
              isEmbedUser={isEmbedUser}
              params={params}
              searchParams={propsSearchParams}
              isEditor={isEditor}
              promptTextAreaRef={promptTextAreaRef}
              uiState={uiState}
              updateUiState={updateUiState}
              promptState={promptState}
              setPromptState={setPromptState}
              handleCloseTextAreaFocus={handleCloseTextAreaFocus}
              savePrompt={savePrompt}
              isMobileView={isMobileView}
            />
          ),
        },
        {
          id: "model",
          label: "Model",
          icon: BotIcon,
          content: (
            <ModelTab
              isPublished={isPublished}
              params={params}
              searchParams={propsSearchParams}
              isEditor={isEditor}
              apiKeySectionRef={apiKeySectionRef}
              promptTextAreaRef={promptTextAreaRef}
              isEmbedUser={isEmbedUser}
              apiKeyError={apiKeyError}
            />
          ),
        },
        {
          id: "connectors",
          label: "Connectors",
          icon: LinkIcon,
          content: (
            <ConnectorsTab
              isPublished={isPublished}
              params={params}
              searchParams={propsSearchParams}
              isEditor={isEditor}
            />
          ),
        },
        {
          id: "memory",
          label: "Memory",
          icon: BrainIcon,
          content: (
            <MemoryTab isPublished={isPublished} params={params} searchParams={propsSearchParams} isEditor={isEditor} />
          ),
        },
        {
          id: "settings",
          label: "Settings",
          icon: SettingsIcon,
          content: (
            <SettingsTab
              isPublished={isPublished}
              params={params}
              searchParams={propsSearchParams}
              isEditor={isEditor}
              isEmbedUser={isEmbedUser}
              currentView={currentView}
              switchView={switchView}
            />
          ),
        },
      ];

      if (!isEmbedUser) {
        baseTabs.push({
          id: "integration",
          label: "Integration Guide",
          icon: BookOpen,
          content: <IntegrationGuideTab isPublished={isPublished} params={params} />,
        });
      }

      return baseTabs;
    }, [
      isPublished,
      isEmbedUser,
      params,
      propsSearchParams,
      isEditor,
      currentView,
      switchView,
      promptTextAreaRef,
      uiState,
      updateUiState,
      promptState,
      setPromptState,
      handleCloseTextAreaFocus,
      savePrompt,
      isMobileView,
      apiKeySectionRef,
      apiKeyError,
    ]);

    const shouldHideTabs = uiState?.isPromptHelperOpen;

    return <TabsLayout tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} hideTabs={shouldHideTabs} />;
  }
);

NonImageModelConfig.displayName = "NonImageModelConfig";

export default NonImageModelConfig;
