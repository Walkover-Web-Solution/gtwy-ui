"use client";

import React from "react";
import InputSection from "../InputSection";
import { useConfigurationContext } from "../ConfigurationContext";
import AdvancedParameters from "../configurationComponent/AdvancedParamenter";
import { useCustomSelector } from "@/customHooks/customSelector";
import Protected from "@/components/Protected";
import UnsupportedFeatureOverlay from "../UnsupportedFeatureOverlay";

const PromptTab = ({ isPublished, isEmbedUser }) => {
  const { params, searchParams, isEditor, validationConfig } = useConfigurationContext();
  const { showAdvancedParameters } = useCustomSelector((state) => ({
    showAdvancedParameters: state.appInfoReducer.embedUserDetails.showAdvancedParameters,
  }));

  // Check if system_prompt is supported by the current model
  const isPromptSupported = validationConfig?.system_prompt !== false;

  return (
    <div data-testid="prompt-tab-container" id="prompt-tab-container" className="flex flex-col w-full relative">
      {!isPromptSupported && <UnsupportedFeatureOverlay featureName="System Prompt" />}

      <InputSection />

      <div
        data-testid="prompt-tab-advanced-params-wrapper"
        id="prompt-tab-advanced-params-wrapper"
        className="w-full max-w-2xl"
      >
        <AdvancedParameters
          params={params}
          searchParams={searchParams}
          isEmbedUser={isEmbedUser}
          showAdvancedParameters={showAdvancedParameters}
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
