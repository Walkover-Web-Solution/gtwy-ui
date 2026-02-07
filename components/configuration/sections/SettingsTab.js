"use client";

import React, { useMemo } from "react";
import TriggersList from "../configurationComponent/TriggersList";
import { useConfigurationContext } from "../ConfigurationContext";
import ToneDropdown from "../configurationComponent/ToneDropdown";
import ResponseStyleDropdown from "../configurationComponent/ResponseStyleDropdown";
import AdvancedConfiguration from "../configurationComponent/AdvancedConfiguration";
import BridgeTypeToggle from "../configurationComponent/BridgeTypeToggle";
import ChatbotConfigSection from "../ChatbotConfigSection";

const SettingsTab = () => {
  const {
    params,
    searchParams,
    isEmbedUser,
    hideAdvancedConfigurations,
    bridgeType,
    modelType,
    currentView,
    switchView,
    showConfigType,
    isPublished,
    isEditor,
  } = useConfigurationContext();

  const shouldShowTriggers = useMemo(() => bridgeType === "trigger" && !isEmbedUser, [bridgeType, isEmbedUser]);

  const shouldShowAgentType = useMemo(
    () => (isEmbedUser && showConfigType) || !isEmbedUser,
    [isEmbedUser, showConfigType]
  );

  const isReadOnly = isPublished || !isEditor;

  return (
    <div id="settings-tab-container" className="flex flex-col mt-4 gap-6 w-full">
      {shouldShowTriggers && (
        <div className="rounded-xl w-full">
          <TriggersList params={params} searchParams={searchParams} isEmbedUser={isEmbedUser} isReadOnly={isReadOnly} />
        </div>
      )}

      {/* Settings Items - No Label, No Accordion */}
      <div className="flex flex-col gap-6 w-full">
        {shouldShowAgentType && bridgeType?.toString()?.toLowerCase() !== "chatbot" && (
          <div className="">
            <BridgeTypeToggle
              params={params}
              searchParams={searchParams}
              isEmbedUser={isEmbedUser}
              isPublished={isPublished}
              isEditor={isEditor}
            />
          </div>
        )}

        {/* Only show tone, response style, and advanced config if modelType is NOT image */}
        {modelType !== "image" && (
          <>
            {!isEmbedUser && (
              <div
                id="agent-flow-section"
                className="border border-base-200 p-3 flex items-center justify-between gap-4"
              >
                <div>
                  <p className="text-sm font-medium text-base-content">Connected Agent Flow</p>
                  <p className="text-xs text-base-content/60">Switch to orchestral flow builder.</p>
                </div>
                <label className="label cursor-pointer gap-2">
                  <span className="text-xs font-semibold">{currentView === "agent-flow" ? "On" : "Off"}</span>
                  <input
                    id="connected-agent-flow-toggle"
                    type="checkbox"
                    disabled={isReadOnly}
                    className="toggle toggle-sm"
                    checked={currentView === "agent-flow"}
                    onChange={() => {
                      const newView = currentView === "agent-flow" ? "config" : "agent-flow";
                      switchView?.(newView);
                    }}
                  />
                </label>
              </div>
            )}
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="">
                <ToneDropdown
                  params={params}
                  searchParams={searchParams}
                  isPublished={isPublished}
                  isEditor={isEditor}
                />
              </div>
              <div className="">
                <ResponseStyleDropdown
                  params={params}
                  searchParams={searchParams}
                  isPublished={isPublished}
                  isEditor={isEditor}
                />
              </div>
            </div>

            {((isEmbedUser && !hideAdvancedConfigurations) || !isEmbedUser) && (
              <div className="">
                <AdvancedConfiguration
                  params={params}
                  searchParams={searchParams}
                  bridgeType={bridgeType}
                  modelType={modelType}
                  isPublished={isPublished}
                  isEditor={isEditor}
                  isEmbedUser={isEmbedUser}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Chatbot Configuration - Keep Accordion */}
      <div id="chatbot-config-section" className="w-full max-w-2xl">
        <ChatbotConfigSection isPublished={isPublished} isEditor={isEditor} />
      </div>
    </div>
  );
};

export default SettingsTab;
