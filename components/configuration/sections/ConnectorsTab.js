"use client";

import React from "react";
import ToolsSection from "../ToolsSection";
import { useConfigurationContext } from "../ConfigurationContext";
import UnsupportedFeatureOverlay from "../UnsupportedFeatureOverlay";

const ConnectorsTab = ({ isPublished }) => {
  const { shouldToolsShow } = useConfigurationContext();

  return (
    <div
      data-testid="connectors-tab-container"
      id="connectors-tab-container"
      className={`w-full relative ${shouldToolsShow ? "" : "overflow-hidden min-h-[24rem]"}`}
    >
      {!shouldToolsShow && <UnsupportedFeatureOverlay featureName="Connectors" />}

      <ToolsSection isPublished={isPublished} />
    </div>
  );
};

export default ConnectorsTab;
