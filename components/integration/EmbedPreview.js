"use client";

import React, { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";

const EmbedPreview = ({
  embedToken,
  showHeader = true,
  parentId = "alert-embed-parent",
  reloadTrigger = 0,
  isLoading = false,
  embedType = "gtwy", // "gtwy" or "rag"
  theme = "light", // Theme for RAG embed: "light" or "dark"
}) => {
  const [internalReload, setInternalReload] = useState(0);
  const [isReloading, setIsReloading] = useState(false);

  const handleReload = () => {
    setIsReloading(true);
    setInternalReload((prev) => prev + 1);
    setTimeout(() => setIsReloading(false), 800);
  };
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
            src:
              process.env.NEXT_PUBLIC_ENV === "LOCAL"
                ? `${process.env.NEXT_PUBLIC_FRONTEND_URL}/gtwy_embed_local.js`
                : process.env.NEXT_PUBLIC_ENV !== "PROD"
                  ? `${process.env.NEXT_PUBLIC_FRONTEND_URL}/gtwy_dev.js`
                  : `${process.env.NEXT_PUBLIC_FRONTEND_URL}/gtwy.js`,
            appendTo: "head",
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
          sessionStorage.removeItem("local_token");
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
  }, [embedToken, parentId, reloadTrigger, internalReload, embedType, theme]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="flex justify-center">
            <LoadingSpinner inline size={24} className="text-primary" height="auto" width="auto" />
          </div>
          <p className="text-sm text-base-content/70 mt-4">Loading embed preview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {showHeader && (
        <div className="p-4 border-b border-base-300 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-base-content">Live Preview</h3>
          <button
            onClick={handleReload}
            className="btn btn-ghost btn-xs gap-1"
            disabled={isReloading}
            title="Reload preview"
          >
            <RotateCcw className={`h-3 w-3 ${isReloading ? "animate-spin" : ""}`} />
          </button>
        </div>
      )}

      <div className={`flex-1 ${showHeader ? "" : "w-full h-full"}`}>
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
              <div className="flex justify-center">
                <LoadingSpinner inline size={24} className="text-primary" height="auto" width="auto" />
              </div>
              <p className="text-sm text-base-content/70">Loading embed preview...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmbedPreview;
