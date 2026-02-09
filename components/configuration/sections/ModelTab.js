"use client";

import React, { useMemo } from "react";
import ServiceDropdown from "../configurationComponent/ServiceDropdown";
import ModelDropdown from "../configurationComponent/ModelDropdown";
import ApiKeyInput from "../configurationComponent/ApiKeyInput";
import { useConfigurationContext } from "../ConfigurationContext";
import RecommendedModal from "../configurationComponent/RecommendedModal";
import AdvancedParameters from "../configurationComponent/AdvancedParamenter";
import FallbackModel from "../configurationComponent/FallbackModel";
import { useCustomSelector } from "@/customHooks/customSelector";
import InfoTooltip from "@/components/InfoTooltip";
import { ShieldAlert } from "lucide-react";

const ModelTab = () => {
  const {
    params,
    searchParams,
    apiKeySectionRef,
    promptTextAreaRef,
    bridgeApiKey,
    shouldPromptShow,
    service,
    showDefaultApikeys,
    isEmbedUser,
    hideAdvancedParameters,
    hideAdvancedConfigurations,
    bridgeType,
    isPublished,
    isEditor,
  } = useConfigurationContext();
  const shouldRenderApiKey = useMemo(
    () => (!showDefaultApikeys && isEmbedUser) || !isEmbedUser,
    [isEmbedUser, showDefaultApikeys]
  );
  const { fallbackModel, DefaultModel } = useCustomSelector((state) => {
    const versionData = state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[searchParams?.version];
    const bridgeDataFromState = state?.bridgeReducer?.allBridgesMap?.[params?.id];
    const activeData = isPublished ? bridgeDataFromState : versionData;

    return {
      fallbackModel: activeData?.fall_back,
      DefaultModel: state?.serviceReducer?.default_model || [],
    };
  });
  const isFallbackEnabled = !!fallbackModel?.is_enable;
  const fallbackServiceName = fallbackModel?.service || service || "Not set";

  const fallbackModelName = fallbackModel?.model || DefaultModel?.[fallbackServiceName]?.model || "Not set";

  return (
    <div id="model-tab-container" className="flex flex-col mt-4 w-full">
      {/* LLM Configuration Header */}
      <div className="mb-4 mt-2">
        <h3 className="text-base-content text-md font-medium">LLM Configuration</h3>
      </div>

      {!isEmbedUser && (
        <RecommendedModal
          params={params}
          searchParams={searchParams}
          apiKeySectionRef={apiKeySectionRef}
          promptTextAreaRef={promptTextAreaRef}
          bridgeApiKey={bridgeApiKey}
          shouldPromptShow={shouldPromptShow}
          service={service}
          deafultApiKeys={showDefaultApikeys}
          isPublished={isPublished}
          isEditor={isEditor}
        />
      )}

      <div id="model-tab-config-section" className="space-y-6">
        {/* Service Provider and Model Row */}
        <div className="grid grid-cols-2 mt-2 gap-6">
          <div className="space-y-2">
            <label className="block text-base-content/70 text-sm font-medium">Service Provider</label>
            <ServiceDropdown
              params={params}
              searchParams={searchParams}
              apiKeySectionRef={apiKeySectionRef}
              promptTextAreaRef={promptTextAreaRef}
              isEmbedUser={isEmbedUser}
              isPublished={isPublished}
              isEditor={isEditor}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-base-content/70 text-sm font-medium">Model</label>

            <div className="flex items-center gap-2">
              {/* main dropdown takes full width */}
              <div className="flex-1">
                <ModelDropdown
                  params={params}
                  searchParams={searchParams}
                  isPublished={isPublished}
                  isEditor={isEditor}
                />
              </div>

              {/* fallback badge icon */}
              <InfoTooltip
                tooltipContent={
                  !isFallbackEnabled ? (
                    <div className="text-xs max-w-[220px]">
                      <div className="font-semibold text-warning">Fallback Model</div>
                      <div className="mt-1 opacity-80">Please enable the fallback model below.</div>
                    </div>
                  ) : (
                    <div className="text-xs space-y-1">
                      <div className="font-semibold text-warning">Fallback Model</div>
                      <div>
                        <span className="opacity-70">Service:</span>{" "}
                        <span className="font-medium capitalize">{fallbackServiceName}</span>
                      </div>
                      <div>
                        <span className="opacity-70">Model:</span>{" "}
                        <span className="font-medium">{fallbackModelName}</span>
                      </div>
                    </div>
                  )
                }
              >
                <button
                  type="button"
                  className={`btn btn-sm btn-ghost border rounded border-base-200 px-2 ${
                    isFallbackEnabled ? "" : "opacity-70"
                  }`}
                >
                  <ShieldAlert size={16} className={isFallbackEnabled ? "text-warning" : "text-gray-400"} />
                </button>
              </InfoTooltip>
            </div>
          </div>
        </div>

        {/* API Key Section */}
        {shouldRenderApiKey && (
          <div className="space-y-2">
            <label className="block text-base-content/70 text-sm font-medium">API Key</label>
            <ApiKeyInput
              apiKeySectionRef={apiKeySectionRef}
              params={params}
              searchParams={searchParams}
              isEmbedUser={isEmbedUser}
              hideAdvancedParameters={hideAdvancedParameters}
              isPublished={isPublished}
              isEditor={isEditor}
            />
            <p className="text-xs text-base-content/50 mt-2">Your API key is encrypted and stored securely</p>
          </div>
        )}

        {/* Parameters Section with Border */}
        <div id="model-tab-parameters-section" className="border-t border-base-200 pt-6">
          <div className="mb-4">
            <h2 className="text-base-content text-md font-medium">Parameters</h2>
          </div>
          <div className="max-w-2xl">
            <AdvancedParameters
              params={params}
              searchParams={searchParams}
              isEmbedUser={isEmbedUser}
              hideAdvancedParameters={hideAdvancedParameters}
              level={1}
              className="mt-0"
              defaultExpanded
              showAccordion={false}
              compact
              isPublished={isPublished}
              isEditor={isEditor}
            />
          </div>
        </div>
        {/* Fallback Model Section */}
        {((isEmbedUser && !hideAdvancedConfigurations) || !isEmbedUser) && (
          <div className="space-y-2">
            <FallbackModel
              params={params}
              searchParams={searchParams}
              bridgeType={bridgeType}
              isPublished={isPublished}
              isEditor={isEditor}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ModelTab;
