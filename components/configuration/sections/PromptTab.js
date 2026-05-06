"use client";

import React from "react";
import InputSection from "../InputSection";
import AdvancedParameters from "../configurationComponent/AdvancedParamenter";
import { useCustomSelector } from "@/customHooks/customSelector";
import Protected from "@/components/Protected";
import UnsupportedFeatureOverlay from "../UnsupportedFeatureOverlay";

const PromptTab = ({
  isPublished,
  isEmbedUser,
  params,
  searchParams,
  isEditor,
  promptTextAreaRef,
  uiState,
  updateUiState,
  promptState,
  setPromptState,
  handleCloseTextAreaFocus,
  savePrompt,
  isMobileView,
}) => {
  const { hideAdvancedParameters, validationConfig } = useCustomSelector((state) => {
    const versionData = state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[searchParams?.version];
    const bridgeDataFromState = state?.bridgeReducer?.allBridgesMap?.[params?.id];
    const modelReducer = state?.modelReducer?.serviceModels;
    const activeData = isPublished ? bridgeDataFromState : versionData;
    const serviceName = activeData?.service;
    const modelTypeName = activeData?.configuration?.type?.toLowerCase();
    const modelName = activeData?.configuration?.model;
    const validConfig = modelReducer?.[serviceName]?.[modelTypeName]?.[modelName]?.validationConfig || {};

    return {
      hideAdvancedParameters: state.appInfoReducer.embedUserDetails.hideAdvancedParameters,
      validationConfig: validConfig,
    };
  });

  const isPromptSupported = validationConfig?.system_prompt !== false;

  return (
    <div data-testid="prompt-tab-container" id="prompt-tab-container" className="flex flex-col w-full relative">
      {!isPromptSupported && <UnsupportedFeatureOverlay featureName="System Prompt" />}

      <InputSection
        params={params}
        searchParams={searchParams}
        promptTextAreaRef={promptTextAreaRef}
        isEmbedUser={isEmbedUser}
        uiState={uiState}
        updateUiState={updateUiState}
        promptState={promptState}
        setPromptState={setPromptState}
        handleCloseTextAreaFocus={handleCloseTextAreaFocus}
        savePrompt={savePrompt}
        isMobileView={isMobileView}
        isPublished={isPublished}
        isEditor={isEditor}
      />

      <div
        data-testid="prompt-tab-advanced-params-wrapper"
        id="prompt-tab-advanced-params-wrapper"
        className="w-full max-w-2xl"
      >
        <AdvancedParameters
          params={params}
          searchParams={searchParams}
          isEmbedUser={isEmbedUser}
          hideAdvancedParameters={hideAdvancedParameters}
          level={2}
          className="w-full"
          isPublished={isPublished}
          isEditor={isEditor}
        />
      </div>
    </div>
  );
};

export default Protected(PromptTab);
