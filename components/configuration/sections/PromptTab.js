"use client";

import React from "react";
import InputSection from "../InputSection";
import { useConfigurationContext } from "../ConfigurationContext";
import AdvancedParameters from "../configurationComponent/AdvancedParamenter";
import { useCustomSelector } from "@/customHooks/customSelector";

const PromptTab = ({ isPublished, isEmbedUser }) => {
  const { params, searchParams, isEditor } = useConfigurationContext();
  const { hideAdvancedParameters } = useCustomSelector((state) => ({
    hideAdvancedParameters: state.appInfoReducer.embedUserDetails.hideAdvancedParameters,
  }));
  return (
    <div id="prompt-tab-container" className="flex flex-col w-full">
      <InputSection />

      <div id="prompt-tab-advanced-params-wrapper" className="w-full max-w-2xl">
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

export default PromptTab;
