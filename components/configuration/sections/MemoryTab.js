"use client";

import React from "react";
import GptMemory from "../configurationComponent/Gptmemory";
import { useConfigurationContext } from "../ConfigurationContext";
import UnsupportedFeatureOverlay from "../UnsupportedFeatureOverlay";

const MemoryTab = () => {
  const { params, searchParams, isPublished, isEditor = true, validationConfig, modelType } = useConfigurationContext();

  // Memory is not supported for image models or if explicitly disabled in validationConfig
  // Check if memory key exists in validationConfig, if not, assume it's supported for non-image models
  const isMemorySupported = modelType !== "image" && validationConfig?.memory !== false;

  return (
    <div data-testid="memory-tab-container" id="memory-tab-container" className="w-full relative">
      {!isMemorySupported && <UnsupportedFeatureOverlay featureName="Memory" />}

      <GptMemory params={params} searchParams={searchParams} isPublished={isPublished} isEditor={isEditor} />
    </div>
  );
};

export default MemoryTab;
