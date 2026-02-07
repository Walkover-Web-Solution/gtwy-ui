import React, { useState, useEffect, useRef } from "react";
import { SettingsIcon } from "@/components/Icons";
import AdvancedParameters from "./AdvancedParamenter";

const AdvancedSettingsButton = ({
  params,
  searchParams,
  isEmbedUser,
  hideAdvancedParameters = false,
  isPublished = false,
  isEditor = true,
}) => {
  // Determine if content is read-only (either published or user is not an editor)
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const advancedSettingsRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (advancedSettingsRef.current && !advancedSettingsRef.current.contains(event.target)) {
        setShowAdvancedSettings(false);
      }
    };

    if (showAdvancedSettings) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showAdvancedSettings]);

  if (hideAdvancedParameters) {
    return null;
  }

  return (
    <div id="advanced-settings-container" className="relative" ref={advancedSettingsRef}>
      <button
        id="advanced-settings-toggle-button"
        type="button"
        className={`btn btn-sm border-base-content/20 ${showAdvancedSettings ? "btn-active text-primary border-primary/60" : "btn-ghost"}`}
        onClick={() => setShowAdvancedSettings((prev) => !prev)}
        title="LLM Advanced Parameters"
      >
        <SettingsIcon size={16} />
      </button>

      {showAdvancedSettings && (
        <div
          id="advanced-settings-dropdown"
          className="absolute right-0 top-full z-high mt-2 w-[320px] max-h-[60vh] overflow-y-auto rounded-lg border border-base-content/30 bg-base-100 p-3 shadow-lg"
        >
          <AdvancedParameters
            params={params}
            searchParams={searchParams}
            isEmbedUser={isEmbedUser}
            hideAdvancedParameters={hideAdvancedParameters}
            level={1}
            className="mt-0"
            compact
            isPublished={isPublished}
            isEditor={isEditor}
          />
        </div>
      )}
    </div>
  );
};

export default React.memo(AdvancedSettingsButton);
