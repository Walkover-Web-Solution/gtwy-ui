"use client";

import React from "react";
import GptMemory from "../configurationComponent/Gptmemory";
import { useConfigurationContext } from "../ConfigurationContext";

const MemoryTab = () => {
  const { params, searchParams, isPublished, isEditor = true } = useConfigurationContext();

  return (
    <div id="memory-tab-container" className="w-full">
      <GptMemory params={params} searchParams={searchParams} isPublished={isPublished} isEditor={isEditor} />
    </div>
  );
};

export default MemoryTab;
