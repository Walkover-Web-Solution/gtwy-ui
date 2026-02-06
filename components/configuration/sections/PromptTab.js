"use client";

import React from "react";
import InputSection from "../InputSection";
import { useConfigurationContext } from "../ConfigurationContext";
import AdvancedParameters from "../configurationComponent/AdvancedParamenter";
import { useCustomSelector } from "@/customHooks/customSelector";
import Protected from "@/components/Protected";

const PromptTab = ({ isPublished,isEmbedUser }) => {
  const { params, searchParams, isEditor } = useConfigurationContext();
  const { hideAdvancedParameters } = useCustomSelector(state => ({
    hideAdvancedParameters: state.appInfoReducer.embedUserDetails.hideAdvancedParameters,
  }));
  return (
    <div className="flex flex-col w-full">
      <InputSection />

      <div className="w-full max-w-2xl">
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
