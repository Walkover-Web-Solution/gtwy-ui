"use client";

import React, { memo, useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TabsLayout from "./sections/TabsLayout";
import PromptTab from "./sections/PromptTab";
import ModelTab from "./sections/ModelTab";
import ConnectorsTab from "./sections/ConnectorsTab";
import MemoryTab from "./sections/MemoryTab";
import SettingsTab from "./sections/SettingsTab";
import IntegrationGuideTab from "./sections/IntegrationGuideTab";
import { SparklesIcon, BotIcon, LinkIcon, BrainIcon, SettingsIcon } from "@/components/Icons";
import { BookOpen } from "lucide-react";
import { useConfigurationContext } from "./ConfigurationContext";

const NonImageModelConfig = memo(() => {
  const { isPublished, uiState, currentView, isEmbedUser, onTabSwitchRequest } = useConfigurationContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "prompt");

  // Sync activeTab with URL param
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams, activeTab]);

  useEffect(() => {
    const handleTabSwitch = (tabId) => {
      const current = new URLSearchParams(Array.from(searchParams.entries()));
      current.set("tab", tabId);
      const search = current.toString();
      const query = search ? `?${search}` : "";
      router.push(`${window.location.pathname}${query}`, { scroll: false });
    };

    if (onTabSwitchRequest) {
      onTabSwitchRequest.current = handleTabSwitch;
    }
  }, [onTabSwitchRequest, router, searchParams]);

  // Sync activeTab with currentView from URL (legacy support if needed, but tab param takes precedence)
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
        content: <PromptTab isPublished={isPublished} isEmbedUser={isEmbedUser} />,
      },
      { id: "model", label: "Model", icon: BotIcon, content: <ModelTab isPublished={isPublished} /> },
      { id: "connectors", label: "Connectors", icon: LinkIcon, content: <ConnectorsTab isPublished={isPublished} /> },
      { id: "memory", label: "Memory", icon: BrainIcon, content: <MemoryTab isPublished={isPublished} /> },
      { id: "settings", label: "Settings", icon: SettingsIcon, content: <SettingsTab isPublished={isPublished} /> },
    ];

    // Only add integration tab for non-embed users
    if (!isEmbedUser) {
      baseTabs.push({
        id: "integration",
        label: "Integration Guide",
        icon: BookOpen,
        content: <IntegrationGuideTab isPublished={isPublished} />,
      });
    }

    return baseTabs;
  }, [isPublished, isEmbedUser]);

  // Hide tabs when prompt helper is open
  const shouldHideTabs = uiState?.isPromptHelperOpen;

  return <TabsLayout tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} hideTabs={shouldHideTabs} />;
});

NonImageModelConfig.displayName = "NonImageModelConfig";

export default NonImageModelConfig;
