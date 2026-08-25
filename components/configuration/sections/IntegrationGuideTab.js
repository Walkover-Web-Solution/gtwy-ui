"use client";

import React from "react";
import { useConfigurationContext } from "../ConfigurationContext";
import { useCustomSelector } from "@/customHooks/customSelector";
import IntegrationGuideOnboarding from "../configurationComponent/IntegrationGuideOnboarding";
import SecondStep from "../../chatbotConfiguration/SecondStep";
import PrivateFormSection from "../../chatbotConfiguration/FirstStep";
import SlugNameInput from "../configurationComponent/SlugNameInput";
import { AlertTriangle, Zap, Settings2 } from "lucide-react";

const IntegrationGuideTab = ({ isPublished }) => {
  const { params, isEmbedUser } = useConfigurationContext();

  // Get bridge data and integration data from Redux store
  const { slugName, prompt, bridgeTypeFromRedux, publishedVersionId } = useCustomSelector((state) => {
    return {
      slugName: state?.bridgeReducer?.allBridgesMap?.[params?.id]?.slugName,
      prompt: state?.bridgeReducer?.allBridgesMap?.[params?.id]?.configuration?.prompt,
      bridgeTypeFromRedux: state?.bridgeReducer?.allBridgesMap?.[params?.id]?.bridgeType?.toLowerCase(),
      publishedVersionId: state?.bridgeReducer?.allBridgesMap?.[params?.id]?.published_version_id,
    };
  });

  const isChatbot = bridgeTypeFromRedux === "chatbot";

  // Render tab content based on bridge type (from IntegrationGuideSlider logic)
  const renderTabContent = () => {
    if (isChatbot) {
      return (
        <div className="">
          <SlugNameInput params={params} />
          <PrivateFormSection params={params} ChooseChatbot={true} />
          <SecondStep slugName={slugName} prompt={prompt} />
        </div>
      );
    }
    return <IntegrationGuideOnboarding agentId={params?.id} isEmbedUser={isEmbedUser} prompt={prompt} />;
  };

  // Treat route state and persisted state as published signals.
  const hasPublishedVersion = Boolean(publishedVersionId || isPublished);

  return (
    <div
      data-testid="integration-guide-container"
      id="integration-guide-container"
      className="p-6 space-y-6 max-w-7xl mx-auto"
    >
      <div className="mb-2">
        <h2 className="text-xl font-semibold text-base-content mb-2">Integration Guide</h2>
        <p className="text-sm text-base-content/70">Choose your integration type and follow the guide below.</p>
      </div>

      <div
        data-testid="integration-guide-runtime-vs-configured"
        id="integration-guide-runtime-vs-configured"
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
      >
        <div className="rounded-xl border border-base-300 bg-base-100 p-4 flex gap-3">
          <Zap className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-base-content text-sm">Send it at runtime</p>
            <p className="text-xs text-base-content/70 mt-1">
              Pass <code>configuration</code>, <code>settings</code>, <code>variables</code> and other params directly
              in the API request to override this agent for that single call — no changes here required.
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-base-300 bg-base-100 p-4 flex gap-3">
          <Settings2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-base-content text-sm">Or configure it once in GTWY</p>
            <p className="text-xs text-base-content/70 mt-1">
              Set the model, prompt, connectors and settings on the Prompt/Model/Settings tabs for this{" "}
              <code>agent_id</code> so every request uses them by default, with no need to send them each time.
            </p>
          </div>
        </div>
      </div>

      {!hasPublishedVersion && (
        <div
          data-testid="integration-guide-unpublished-warning"
          id="integration-guide-unpublished-warning"
          className="alert alert-warning border border-warning/30 bg-warning/10"
        >
          <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0" />
          <div>
            <p className="font-medium text-base-content">Publishing Required to Enable Integrations</p>
            <p className="text-sm text-base-content/80">
              Integrations will not work until this agent is published. You can configure them now, but requests and
              scripts will only run after publishing.
            </p>
          </div>
        </div>
      )}

      <div className="overflow-y-auto h-full scrollbar-hide">{renderTabContent()}</div>
    </div>
  );
};

export default IntegrationGuideTab;
