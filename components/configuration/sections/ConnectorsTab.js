"use client";

import React from "react";
import ToolsSection from "../ToolsSection";
import UnsupportedFeatureOverlay from "../UnsupportedFeatureOverlay";
import { useCustomSelector } from "@/customHooks/customSelector";

const ConnectorsTab = ({ isPublished, params, searchParams, isEditor }) => {
  const { shouldToolsShow } = useCustomSelector((state) => {
    const versionData = state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[searchParams?.version];
    const bridgeDataFromState = state?.bridgeReducer?.allBridgesMap?.[params?.id];
    const modelReducer = state?.modelReducer?.serviceModels;
    const activeData = isPublished ? bridgeDataFromState : versionData;
    const serviceName = activeData?.service;
    const modelTypeName = activeData?.configuration?.type?.toLowerCase();
    const modelName = activeData?.configuration?.model;
    const validationConfig = modelReducer?.[serviceName]?.[modelTypeName]?.[modelName]?.validationConfig || {};

    return {
      shouldToolsShow: validationConfig?.tools,
    };
  });

  return (
    <div
      data-testid="connectors-tab-container"
      id="connectors-tab-container"
      className={`w-full relative ${shouldToolsShow ? "" : "overflow-hidden max-h-[46rem]"}`}
    >
      {!shouldToolsShow && <UnsupportedFeatureOverlay featureName="Connectors" />}

      <ToolsSection isPublished={isPublished} params={params} searchParams={searchParams} isEditor={isEditor} />
    </div>
  );
};

export default ConnectorsTab;
