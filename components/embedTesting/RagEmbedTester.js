"use client";

import React, { useState, useEffect } from "react";
import { Copy, Check } from "lucide-react";

const RagEmbedTester = () => {
  const [embedToken, setEmbedToken] = useState("");
  const [isTokenSet, setIsTokenSet] = useState(false);
  const [theme, setTheme] = useState("light");
  const [parentId] = useState("rag-embed-container");
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [copied, setCopied] = useState(false);

  const scriptSrc = process.env.NEXT_PUBLIC_KNOWLEDGEBASE_SCRIPT_SRC || "https://chatbot.gtwy.ai/rag-prod.js";

  const handleSetToken = () => {
    if (embedToken.trim()) {
      setIsTokenSet(true);
      loadRagScript();
    }
  };

  useEffect(() => {
    if (scriptLoaded && isTokenSet) {
      loadRagScript();
    }
  }, [theme]);

  const loadRagScript = () => {
    const existingScript = document.getElementById("rag-main-script");
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement("script");
    script.id = "rag-main-script";
    script.src = scriptSrc;
    script.setAttribute("embedToken", embedToken);
    script.setAttribute("parentId", parentId);
    script.setAttribute("theme", theme);
    script.setAttribute("defaultOpen", "false");

    document.head.appendChild(script);
    setScriptLoaded(true);
  };

  const handleOpenRag = () => {
    if (window.openRag) {
      window.openRag();
    }
  };

  const handleCloseRag = () => {
    if (window.closeRag) {
      window.closeRag();
    }
  };

  const handleShowDocuments = () => {
    if (window.showDocuments) {
      window.showDocuments();
    }
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(embedToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    const existingScript = document.getElementById("rag-main-script");
    if (existingScript) {
      existingScript.remove();
    }
    setEmbedToken("");
    setIsTokenSet(false);
    setScriptLoaded(false);
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    if (scriptLoaded) {
      const container = document.getElementById(parentId);
      if (container) {
        container.innerHTML = "";
      }

      const existingScript = document.getElementById("rag-main-script");
      if (existingScript) {
        existingScript.remove();
      }
    }

    setTheme(newTheme);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
      {/* Left Panel - Configuration & Controls */}
      <div className="lg:col-span-1 flex flex-col h-full gap-3 overflow-hidden">
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-base-100">
          <div className="space-y-3 pr-2">
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body p-4">
                <h2 className="card-title text-lg mb-3">Configuration</h2>

                {!isTokenSet ? (
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold">Embed Token</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your embed token"
                      className="input input-bordered w-full input-sm"
                      value={embedToken}
                      onChange={(e) => setEmbedToken(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleSetToken()}
                    />
                    <button
                      className="btn btn-outline btn-sm mt-3 w-full"
                      onClick={handleSetToken}
                      disabled={!embedToken.trim()}
                    >
                      Initialize RAG Embed
                    </button>
                  </div>
                ) : (
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold">Current Token</span>
                    </label>
                    <div className="flex gap-2">
                      <input type="text" className="input input-bordered w-full input-sm" value={embedToken} readOnly />
                      <button className="btn btn-square btn-ghost btn-sm" onClick={handleCopyToken}>
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                    </div>
                    <button className="btn btn-outline btn-sm mt-2 w-full" onClick={handleReset}>
                      Reset
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="card bg-base-100 shadow-lg">
              <div className="card-body p-4">
                <h3 className="card-title text-lg mb-3">Theme</h3>
                <div className="flex gap-2">
                  <button
                    className={`btn btn-sm flex-1 ${theme === "light" ? "btn-outline btn-active" : "btn-ghost"}`}
                    onClick={() => handleThemeChange("light")}
                  >
                    Light
                  </button>
                  <button
                    className={`btn btn-sm flex-1 ${theme === "dark" ? "btn-outline btn-active" : "btn-ghost"}`}
                    onClick={() => handleThemeChange("dark")}
                  >
                    Dark
                  </button>
                </div>
              </div>
            </div>

            {isTokenSet && (
              <div className="card bg-base-100 shadow-lg">
                <div className="card-body p-4">
                  <h3 className="card-title text-lg mb-3">Available Functions</h3>
                  <div className="space-y-2">
                    <button className="btn btn-outline btn-sm w-full justify-start" onClick={handleOpenRag}>
                      <span className="font-mono text-xs">window.openRag()</span>
                    </button>
                    <p className="text-xs text-base-content/60 ml-2 -mt-1">Opens the add document modal</p>

                    <button className="btn btn-outline btn-sm w-full justify-start" onClick={handleCloseRag}>
                      <span className="font-mono text-xs">window.closeRag()</span>
                    </button>
                    <p className="text-xs text-base-content/60 ml-2 -mt-1">Closes the add document modal</p>

                    <button className="btn btn-outline btn-sm w-full justify-start" onClick={handleShowDocuments}>
                      <span className="font-mono text-xs">window.showDocuments()</span>
                    </button>
                    <p className="text-xs text-base-content/60 ml-2 -mt-1">Shows the document list</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel - Embed Preview (Full Height) */}
      <div className="lg:col-span-2 flex flex-col h-full overflow-hidden">
        <div className="card bg-base-100 shadow-lg flex-1 flex flex-col overflow-hidden">
          <div className="card-body p-4 flex flex-col h-full">
            <h2 className="card-title text-base mb-2 flex-none">Embed Preview</h2>
            <div className="relative border-2 border-dashed border-base-300 rounded-lg flex-1 bg-base-200 overflow-hidden">
              <div id={parentId} className="w-full h-full" />
              {!isTokenSet && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <svg
                      className="w-16 h-16 text-base-content/30 mx-auto mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p className="text-base-content/50">Load the embed to see preview</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RagEmbedTester;
