"use client";
import React, { useState, useEffect } from "react";
import { Copy, Check } from "lucide-react";

export const runtime = "edge";

const RagEmbedTestPage = () => {
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
    // Remove existing script if any
    const existingScript = document.getElementById("rag-main-script");
    if (existingScript) {
      existingScript.remove();
    }

    // Create and append new script
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
      container.innerHTML = '';
    }
    
    // Remove old script
    const existingScript = document.getElementById("rag-main-script");
    if (existingScript) {
      existingScript.remove();
    }
  }
  
  setTheme(newTheme); // This will trigger the useEffect above
  };

  return (
    <div className="min-h-screen bg-base-200 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">RAG Embed Test Page</h1>
          <p className="text-base-content/60">
            Test how your RAG embed will look and function on external platforms
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Controls */}
          <div className="lg:col-span-1">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title mb-4">Configuration</h2>

                {/* Token Input */}
                {!isTokenSet ? (
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold">Embed Token</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your embed token"
                      className="input input-bordered w-full"
                      value={embedToken}
                      onChange={(e) => setEmbedToken(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleSetToken()}
                    />
                    <button
                      className="btn btn-primary mt-3"
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
                      <input
                        type="text"
                        className="input input-bordered w-full"
                        value={embedToken}
                        readOnly
                      />
                      <button
                        className="btn btn-square btn-ghost"
                        onClick={handleCopyToken}
                      >
                        {copied ? <Check size={20} /> : <Copy size={20} />}
                      </button>
                    </div>
                    <button
                      className="btn btn-error btn-sm mt-2"
                      onClick={handleReset}
                    >
                      Reset
                    </button>
                  </div>
                )}

                {/* Theme Selector */}
                <div className="form-control mt-4">
                  <label className="label">
                    <span className="label-text font-semibold">Theme</span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      className={`btn btn-sm flex-1 ${theme === "light" ? "btn-primary" : "btn-outline"}`}
                      onClick={() => handleThemeChange("light")}
                    >
                      Light
                    </button>
                    <button
                      className={`btn btn-sm flex-1 ${theme === "dark" ? "btn-primary" : "btn-outline"}`}
                      onClick={() => handleThemeChange("dark")}
                    >
                      Dark
                    </button>
                  </div>
                </div>

                {/* Function Buttons */}
                {isTokenSet && (
                  <div className="mt-6">
                    <h3 className="font-semibold mb-3">Available Functions</h3>
                    <div className="space-y-2">
                      <button
                        className="btn btn-outline w-full justify-start"
                        onClick={handleOpenRag}
                      >
                        <span className="font-mono text-xs">window.openRag()</span>
                      </button>
                      <p className="text-xs text-base-content/60 ml-2 -mt-1">
                        Opens the add document modal
                      </p>

                      <button
                        className="btn btn-outline w-full justify-start"
                        onClick={handleCloseRag}
                      >
                        <span className="font-mono text-xs">window.closeRag()</span>
                      </button>
                      <p className="text-xs text-base-content/60 ml-2 -mt-1">
                        Closes the add document modal
                      </p>

                      <button
                        className="btn btn-outline w-full justify-start"
                        onClick={handleShowDocuments}
                      >
                        <span className="font-mono text-xs">window.showDocuments()</span>
                      </button>
                      <p className="text-xs text-base-content/60 ml-2 -mt-1">
                        Shows the document list
                      </p>
                    </div>
                  </div>
                )}

                {/* Info Section */}
                <div className="mt-6 p-4 bg-info/10 rounded-lg">
                  <h4 className="font-semibold text-sm mb-2">ℹ️ How to use</h4>
                  <ol className="text-xs space-y-1 list-decimal list-inside text-base-content/70">
                    <li>Enter your embed token</li>
                    <li>Click "Initialize RAG Embed"</li>
                    <li>Use the function buttons to test</li>
                    <li>View the embed in the preview area</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Preview */}
          <div className="lg:col-span-2">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title mb-4">Embed Preview</h2>
                <p className="text-sm text-base-content/60 mb-4">
                  This is how the RAG embed will appear on external platforms
                </p>

                {!isTokenSet ? (
                  <div className="flex items-center justify-center h-96 border-2 border-dashed border-base-300 rounded-lg">
                    <div className="text-center">
                      <p className="text-base-content/60">
                        Enter an embed token to preview
                      </p>
                    </div>
                  </div>
                ) : (
                  <div
                    id={parentId}
                    className="border-2 border-base-300 rounded-lg p-4 min-h-96 bg-base-200"
                    style={{ minHeight: "500px" }}
                  >
                    {/* RAG embed will be injected here */}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default RagEmbedTestPage;