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
    showAdvancedParameters,
    showAdvancedConfigurations,
    showFallbackModel,
    bridgeType,
    isPublished,
    isEditor,
    apiKeyError,
    modelType,
  } = useConfigurationContext();
  const shouldRenderApiKey = useMemo(
    () => (!showDefaultApikeys && isEmbedUser) || !isEmbedUser,
    [isEmbedUser, showDefaultApikeys]
  );

  const planServices = useCustomSelector((state) => state?.planReducer?.services);

  const isServiceInPlan = useMemo(() => {
    if (!service || !planServices) return false;
    if (planServices === "*") return true;
    if (Array.isArray(planServices)) return planServices.includes(service);
    if (typeof planServices === "object") return Object.prototype.hasOwnProperty.call(planServices, service);
    return false;
  }, [planServices, service]);

  const apiKeyConfigButton = useMemo(() => {
    if (!shouldRenderApiKey || !isServiceInPlan) return null;
    return (
      <ApiKeyInput
        apiKeySectionRef={apiKeySectionRef}
        params={params}
        searchParams={searchParams}
        isEmbedUser={isEmbedUser}
        showAdvancedParameters={showAdvancedParameters}
        isPublished={isPublished}
        isEditor={isEditor}
        hasError={apiKeyError}
        compact
      />
    );
  }, [
    shouldRenderApiKey,
    isServiceInPlan,
    apiKeySectionRef,
    params,
    searchParams,
    isEmbedUser,
    showAdvancedParameters,
    isPublished,
    isEditor,
    apiKeyError,
  ]);
  return (
    <div data-testid="model-tab-container" id="model-tab-container" className="flex flex-col mt-4 w-full">
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

      <div data-testid="model-tab-config-section" id="model-tab-config-section" className="space-y-6">
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
            <ModelDropdown
              params={params}
              searchParams={searchParams}
              isPublished={isPublished}
              isEditor={isEditor}
              isEmbedUser={isEmbedUser}
              showAdvancedConfigurations={showAdvancedConfigurations}
              apiKeyActionButton={apiKeyConfigButton}
            />
          </div>
        </div>

        {shouldRenderApiKey && !isServiceInPlan && (
          <div className="space-y-2">
            <label className="block text-base-content/70 text-sm font-medium">API Key</label>
            <ApiKeyInput
              apiKeySectionRef={apiKeySectionRef}
              params={params}
              searchParams={searchParams}
              isEmbedUser={isEmbedUser}
              showAdvancedParameters={showAdvancedParameters}
              isPublished={isPublished}
              isEditor={isEditor}
              hasError={apiKeyError}
            />
            <p className="text-xs text-base-content/50 mt-2">Your API key is encrypted and stored securely</p>
          </div>
        )}

        {/* Parameters Section with Border */}
        {((showAdvancedParameters && isEmbedUser) || !isEmbedUser) && (
          <div
            data-testid="model-tab-parameters-section"
            id="model-tab-parameters-section"
            className="border-t border-base-200 pt-6"
          >
            <div className="mb-4">
              <h2 className="text-base-content text-md font-medium">Parameters</h2>
            </div>
            <div className="max-w-2xl">
              <AdvancedParameters
                params={params}
                searchParams={searchParams}
                isEmbedUser={isEmbedUser}
                showAdvancedParameters={showAdvancedParameters}
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
        )}
        {/* Fallback Model Section */}
        {((isEmbedUser && showFallbackModel) || !isEmbedUser) && modelType !== "image" && (
          <div className="space-y-2">
            <FallbackModel
              params={params}
              searchParams={searchParams}
              bridgeType={bridgeType}
              shouldRenderApiKey={shouldRenderApiKey}
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
