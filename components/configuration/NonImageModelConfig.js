"use client";

import React, { memo, useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import TabsLayout from "./sections/TabsLayout";
import StackedLayout from "./sections/layouts/StackedLayout";
import AccordionSectionsLayout from "./sections/layouts/AccordionSectionsLayout";
import StepperSectionsLayout from "./sections/layouts/StepperSectionsLayout";
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
  const { isPublished, uiState, currentView, isEmbedUser, modelType, configPanelLayout } = useConfigurationContext();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || (modelType === "image" ? "model" : "prompt"));

  useEffect(() => {
    if (modelType === "image" && (!currentView || currentView === "config")) {
      setActiveTab("model");
    }
  }, [modelType, currentView]);

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

  // Prompt helper needs a single focused section regardless of the chosen
  // layout, so fall back to the tab strip (just hidden) while it's open.
  if (shouldHideTabs) {
    return <TabsLayout tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} hideTabs />;
  }

  // The layout picker only affects the embed end-user's view — the agent
  // owner always sees the default tab strip in the main app.
  if (isEmbedUser) {
    if (configPanelLayout === "accordion") {
      return <AccordionSectionsLayout tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />;
    }
    if (configPanelLayout === "stepper") {
      return <StepperSectionsLayout tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />;
    }
    if (configPanelLayout === "single") {
      return <StackedLayout tabs={tabs} />;
    }
  }

  return <TabsLayout tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />;
});

NonImageModelConfig.displayName = "NonImageModelConfig";

export default NonImageModelConfig;
