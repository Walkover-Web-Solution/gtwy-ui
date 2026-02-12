"use client";

import React, { useEffect } from "react";

const EmbedPreview = ({
  embedToken,
  showHeader = true,
  parentId = "alert-embed-parent",
  reloadTrigger = 0,
  isLoading = false,
}) => {
  useEffect(() => {
    if (!embedToken) return;

    // Create and load the embed script
    const script = document.createElement("script");
    script.id = "gtwy-main-script";
    script.setAttribute("embedToken", embedToken);
    script.src = "http://localhost:3000/gtwy_dev.js";
    script.setAttribute("parentId", parentId);
    script.setAttribute("defaultOpen", "true");
    document.body.appendChild(script);

    // Cleanup function
    return () => {
      try {
        const scriptElement = document.getElementById("gtwy-main-script");
        if (scriptElement && scriptElement.parentNode === document.body) {
          document.body.removeChild(scriptElement);
        }

        // Remove embed container if it exists
        const embedContainer = document.getElementById("iframe-viasocket-embed-parent-container");
        if (embedContainer && embedContainer.parentNode === document.body) {
          document.body.removeChild(embedContainer);
        }
      } catch (error) {
        console.warn("Error removing embed scripts:", error);
      }
    };
  }, [embedToken, parentId, reloadTrigger]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="text-sm text-base-content/70 mt-4">Loading embed preview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {showHeader && (
        <div className="p-4 border-b border-base-300">
          <h3 className="text-sm font-semibold text-base-content">Live Preview</h3>
        </div>
      )}

      <div className={`flex-1 ${showHeader ? "p-4 bg-base-200" : "w-full h-full"}`}>
        {embedToken ? (
          <div
            id={parentId}
            className={`h-full w-full ${showHeader ? "bg-base-100 rounded-lg shadow-lg overflow-hidden" : ""}`}
          >
            {/* Embed will be injected here */}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <div className="loading loading-spinner loading-lg text-primary"></div>
              <p className="text-sm text-base-content/70">Loading embed preview...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmbedPreview;
