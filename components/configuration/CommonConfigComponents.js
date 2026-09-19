import React, { useMemo } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import ServiceDropdown from "./configurationComponent/ServiceDropdown";
import ModelDropdown from "./configurationComponent/ModelDropdown";
import ApiKeyInput from "./configurationComponent/ApiKeyInput";
import RecommendedModal from "./configurationComponent/RecommendedModal";
import AdvancedParameters from "./configurationComponent/AdvancedParamenter";
import { useCustomSelector } from "@/customHooks/customSelector";

const CommonConfigComponents = ({
  params,
  searchParams,
  apiKeySectionRef,
  promptTextAreaRef,
  bridgeApiKey,
  shouldPromptShow,
  service,
  showDefaultApikeys,
  isEmbedUser,
  showAdvancedParameters = false,
  showAdvancedConfigurations = false,
  isPublished = false,
  isEditor = true,
}) => {
  const isOnFreePlan = useCustomSelector((state) => state?.planReducer?.loaded && state?.planReducer?.services !== "*");
  const shouldRenderApiKey = useMemo(
    () => (!showDefaultApikeys && isEmbedUser) || !isEmbedUser,
    [isEmbedUser, showDefaultApikeys]
  );

  return (
    <div data-testid="common-config-container" id="common-config-container" className="flex flex-col mt-4 w-full">
      <div className="space-y-6">
        {/* LLM Configuration panel */}
        <div className="border border-base-300 bg-base-200 px-5 py-5">
          {/* Header - action sits inline with the heading */}
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-base-content text-md font-medium">LLM Configuration</h3>
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
          </div>

          <div className="space-y-6">
            {/* Service Provider and Model Row */}
            <div data-testid="service-model-row" id="service-model-row" className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-base-content/70 text-sm font-medium">Service Provider</label>
                <ServiceDropdown
                  params={params}
                  apiKeySectionRef={apiKeySectionRef}
                  promptTextAreaRef={promptTextAreaRef}
                  searchParams={searchParams}
                  isPublished={isPublished}
                  isEditor={isEditor}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-base-content/70 text-sm font-medium">Model</label>
                <ModelDropdown
                  params={params}
                  searchParams={searchParams}
                  isPublished={isPublished}
                  isEditor={isEditor}
                  isEmbedUser={isEmbedUser}
                  showAdvancedConfigurations={showAdvancedConfigurations}
                />
              </div>
            </div>

            {isOnFreePlan && (
              <div className="flex w-full items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
                <span className="flex items-center gap-1.5 text-base-content/70">
                  <Lock size={11} className="shrink-0 text-primary" />
                  You&apos;re on the Free plan — upgrade to Pro to use every service and model.
                </span>
                <Link
                  href={`/org/${params?.org_id}/plans`}
                  className="btn btn-primary btn-xs h-6 min-h-0 rounded-md px-2 text-[11px] font-semibold"
                >
                  Upgrade
                </Link>
              </div>
            )}

            {/* API Key Section */}
            {shouldRenderApiKey && (
              <div data-testid="api-key-section" id="api-key-section" className="space-y-2">
                <label className="block text-base-content/70 text-sm font-medium">API Key</label>
                <ApiKeyInput
                  apiKeySectionRef={apiKeySectionRef}
                  params={params}
                  searchParams={searchParams}
                  isEmbedUser={isEmbedUser}
                  showAdvancedParameters={showAdvancedParameters}
                  isPublished={isPublished}
                  isEditor={isEditor}
                />
                <p className="text-xs text-base-content/50 mt-2">Your API key is encrypted and stored securely</p>
              </div>
            )}
          </div>
        </div>

        {/* Parameters Section with Border */}
        {((showAdvancedParameters && isEmbedUser) || !isEmbedUser) && (
          <div
            data-testid="parameters-section"
            id="parameters-section"
            className="border border-base-300 bg-base-200 px-5 py-5"
          >
            <div className="mb-4">
              <h2 className="text-base-content text-md font-medium">Parameters</h2>
            </div>
            <div data-testid="parameters-content" id="parameters-content" className="max-w-2xl">
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
      </div>
    </div>
  );
};

export default React.memo(CommonConfigComponents);
