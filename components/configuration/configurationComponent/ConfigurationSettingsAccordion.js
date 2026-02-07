import React, { useMemo, useState } from "react";
import { ChevronDownIcon, ChevronUpIcon, SettingsIcon } from "@/components/Icons";
import { useConfigurationContext } from "../ConfigurationContext";
import ToneDropdown from "./ToneDropdown";
import ResponseStyleDropdown from "./ResponseStyleDropdown";
import AdvancedConfiguration from "./AdvancedConfiguration";
import Protected from "@/components/Protected";
import BridgeTypeToggle from "./BridgeTypeToggle";

const ConfigurationSettingsAccordion = ({ isEmbedUser, isPublished, isEditor = true }) => {
  // Determine if content is read-only (either published or user is not an editor)

  const isReadOnly = isPublished || !isEditor;
  const [isOpen, setIsOpen] = useState(false);
  const {
    params,
    searchParams,
    hideAdvancedConfigurations,
    bridgeType,
    modelType,
    currentView,
    switchView,
    showConfigType,
  } = useConfigurationContext();
  const shouldShowAgentType = useMemo(
    () => (isEmbedUser && showConfigType) || !isEmbedUser,
    [isEmbedUser, showConfigType]
  );
  return (
    <div className="z-very-low text-base-content w-full max-w-md cursor-pointer" tabIndex={0}>
      <div
        className={`px-2 py-1.5 ${isOpen ? "border border-base-content/20 rounded-x-lg rounded-t-lg" : "border border-base-content/20 rounded-lg"} flex items-center justify-between font-medium w-full !cursor-pointer`}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <div className="flex items-center gap-2">
          <SettingsIcon size={14} className="shrink-0" />
          <span className="label-text text-sm">Settings</span>
        </div>
        <span className="cursor-pointer">{isOpen ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />}</span>
      </div>

      <div
        className={`transition-all duration-300 ease-in-out ${isOpen ? "px-2 py-2 border-x border-b border-base-content/20 rounded-x-lg rounded-b-lg opacity-100" : "max-h-0 opacity-0 overflow-hidden border border-base-content/20 rounded-lg p-0"}`}
      >
        {/* Settings Content */}
        <div className="flex flex-col gap-6">
          {shouldShowAgentType && bridgeType?.toString()?.toLowerCase() !== "chatbot" && (
            <div className="bg-base-100 rounded-lg">
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
                <div className="bg-base-100 rounded-lg border border-base-200 p-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-base-content">Connected Agent Flow</p>
                    <p className="text-xs text-base-content/60">Switch to orchestral flow builder.</p>
                  </div>
                  <label className="label cursor-pointer gap-2">
                    <span className="text-xs font-semibold">{currentView === "agent-flow" ? "On" : "Off"}</span>
                    <input
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
                <div className="bg-base-100 rounded-lg">
                  <ToneDropdown
                    params={params}
                    searchParams={searchParams}
                    isPublished={isPublished}
                    isEditor={isEditor}
                  />
                </div>
                <div className="bg-base-100 rounded-lg">
                  <ResponseStyleDropdown
                    params={params}
                    searchParams={searchParams}
                    isPublished={isPublished}
                    isEditor={isEditor}
                  />
                </div>
              </div>

              {((isEmbedUser && !hideAdvancedConfigurations) || !isEmbedUser) && (
                <div className="bg-base-100 rounded-lg">
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
      </div>
    </div>
  );
};

export default Protected(React.memo(ConfigurationSettingsAccordion));
