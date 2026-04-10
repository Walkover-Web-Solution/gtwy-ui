"use client";

import React, { useEffect, useRef } from "react";
import ToolsSection from "../ToolsSection";
import { useConfigurationContext } from "../ConfigurationContext";
import UnsupportedFeatureOverlay from "../UnsupportedFeatureOverlay";

const ConnectorsTab = ({ isPublished }) => {
  const { shouldToolsShow } = useConfigurationContext();
  const containerRef = useRef(null);

  useEffect(() => {
    if (shouldToolsShow || !containerRef.current) {
      return;
    }

    let parent = containerRef.current.parentElement;
    let scrollContainer = null;

    while (parent) {
      const style = window.getComputedStyle(parent);
      const overflowY = style.overflowY;
      const isScrollable =
        (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
        parent.scrollHeight > parent.clientHeight;

      if (isScrollable) {
        scrollContainer = parent;
        break;
      }

      parent = parent.parentElement;
    }

    if (!scrollContainer) {
      return;
    }

    const previousOverflow = scrollContainer.style.overflow;
    const previousOverflowY = scrollContainer.style.overflowY;
    scrollContainer.style.overflow = "hidden";
    scrollContainer.style.overflowY = "hidden";

    return () => {
      scrollContainer.style.overflow = previousOverflow;
      scrollContainer.style.overflowY = previousOverflowY;
    };
  }, [shouldToolsShow]);

  return (
    <div
      ref={containerRef}
      data-testid="connectors-tab-container"
      id="connectors-tab-container"
      className={`w-full relative ${!shouldToolsShow ? "overflow-hidden min-h-[24rem]" : ""}`}
    >
      {!shouldToolsShow && <UnsupportedFeatureOverlay featureName="Connectors" />}

      <ToolsSection isPublished={isPublished} />
    </div>
  );
};

export default ConnectorsTab;
