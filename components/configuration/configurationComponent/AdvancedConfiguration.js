import React, { useEffect, useRef } from "react";
import ResponseFormatSelector from "./ResponseFormatSelector";
import ToolCallCount from "./ToolCallCount";
import GuardrailSelector from "./GuardrailSelector";

const AdvancedConfiguration = ({ params, searchParams, bridgeType, modelType, isPublished, isEditor = true }) => {
  // Determine if content is read-only (either published or user is not an editor)
  const dropdownContainerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownContainerRef.current && !dropdownContainerRef.current.contains(event.target)) {
        const serviceDropdown = document.getElementById("service-dropdown");
        const modelDropdown = document.getElementById("model-dropdown");
        serviceDropdown?.removeAttribute("open");
        modelDropdown?.removeAttribute("open");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const renderContent = () => (
    <div className="flex flex-col gap-6">
      <div className="">
        <GuardrailSelector params={params} searchParams={searchParams} isPublished={isPublished} isEditor={isEditor} />
      </div>

      {bridgeType === "api" && modelType !== "image" && modelType !== "embedding" && (
        <div className="">
          <ResponseFormatSelector
            isPublished={isPublished}
            isEditor={isEditor}
            params={params}
            searchParams={searchParams}
          />
        </div>
      )}

      <div className="">
        <ToolCallCount params={params} searchParams={searchParams} isPublished={isPublished} isEditor={isEditor} />
      </div>
    </div>
  );

  return (
    <div className="z-very-low text-base-content w-full" tabIndex={0}>
      {renderContent()}
    </div>
  );
};

export default AdvancedConfiguration;
