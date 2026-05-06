"use client";

import React from "react";
import GptMemory from "../configurationComponent/Gptmemory";
import UnsupportedFeatureOverlay from "../UnsupportedFeatureOverlay";
import { useCustomSelector } from "@/customHooks/customSelector";

const MemoryTab = ({ isPublished, params, searchParams, isEditor = true }) => {
  const { validationConfig, modelType } = useCustomSelector((state) => {
    const versionData = state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[searchParams?.version];
    const bridgeDataFromState = state?.bridgeReducer?.allBridgesMap?.[params?.id];
    const modelReducer = state?.modelReducer?.serviceModels;
    const activeData = isPublished ? bridgeDataFromState : versionData;
    const serviceName = activeData?.service;
    const modelTypeName = activeData?.configuration?.type?.toLowerCase();
    const modelName = activeData?.configuration?.model;
    const validConfig = modelReducer?.[serviceName]?.[modelTypeName]?.[modelName]?.validationConfig || {};

    return {
      validationConfig: validConfig,
      modelType: isPublished
        ? bridgeDataFromState?.configuration?.type?.toLowerCase()
        : versionData?.configuration?.type?.toLowerCase(),
    };
  });

  const isMemorySupported = modelType !== "image" && validationConfig?.memory !== false;

  return (
    <div data-testid="memory-tab-container" id="memory-tab-container" className="w-full relative">
      {!isMemorySupported && <UnsupportedFeatureOverlay featureName="Memory" />}

      <GptMemory params={params} searchParams={searchParams} isPublished={isPublished} isEditor={isEditor} />
    </div>
  );
};

export default MemoryTab;
