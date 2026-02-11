"use client";

import React from "react";
import ToolsSection from "../ToolsSection";

const ConnectorsTab = ({ isPublished }) => {
  return (
    <div data-testid="connectors-tab-container" id="connectors-tab-container" className="w-full">
      <ToolsSection isPublished={isPublished} />
    </div>
  );
};

export default ConnectorsTab;
