"use client";

import React, { useEffect } from "react";

const EmbedPreview = ({
  embedToken,
  showHeader = true,
  parentId = "alert-embed-parent",
  reloadTrigger = 0,
  isLoading = false,
  embedType = "gtwy", // "gtwy" or "rag"
  theme = "light", // Theme for RAG embed: "light" or "dark"
}) => {
  useEffect(() => {
    if (!embedToken) return;

    // Determine script configuration based on embed type
    const scriptConfig =
      embedType === "rag"
        ? {
            id: "rag-main-script",
            src: process.env.NEXT_PUBLIC_KNOWLEDGEBASE_SCRIPT_SRC || "https://chatbot.gtwy.ai/rag-dev.js",
            containerId: "rag-embed-container",
            appendTo: "head",
          }
        : {
            id: "gtwy-main-script",
            src: "http://localhost:3000/gtwy_dev.js",
            containerId: "iframe-viasocket-embed-parent-container",
            appendTo: "body",
          };

    // Clear container and remove existing script before loading (important for theme changes)
    const container = document.getElementById(parentId);
    if (container) {
      container.innerHTML = "";
    }

    const existingScript = document.getElementById(scriptConfig.id);
    if (existingScript) {
      existingScript.remove();
    }

    // Remove existing embed container if it exists
    const existingContainer = document.getElementById(scriptConfig.containerId);
    if (existingContainer) {
      existingContainer.remove();
    }

    // Create and load the embed script
    const script = document.createElement("script");
    script.id = scriptConfig.id;
    script.setAttribute("embedToken", embedToken);
    script.src = scriptConfig.src;
    script.setAttribute("parentId", parentId);
    script.setAttribute("defaultOpen", "true");

    // Add RAG-specific attributes
    if (embedType === "rag") {
      script.setAttribute("theme", theme);
    }

    // Append to head for RAG, body for GTWY
    if (scriptConfig.appendTo === "head") {
      document.head.appendChild(script);
    } else {
      document.body.appendChild(script);
    }

    // Cleanup function
    return () => {
      try {
        // Clear container
        const container = document.getElementById(parentId);
        if (container) {
          container.innerHTML = "";
        }

        // Remove script
        const scriptElement = document.getElementById(scriptConfig.id);
        if (scriptElement) {
          scriptElement.remove();
        }

        // Remove embed container if it exists
        const embedContainer = document.getElementById(scriptConfig.containerId);
        if (embedContainer) {
          embedContainer.remove();
        }
      } catch (error) {
        console.warn("Error removing embed scripts:", error);
      }
    };
  }, [embedToken, parentId, reloadTrigger, embedType, theme]);

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
