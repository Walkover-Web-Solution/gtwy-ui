"use client";
import React, { useState, useEffect } from "react";
import { Copy, Check } from "lucide-react";

export const runtime = "edge";

const ChatbotEmbedTestPage = () => {
  const [embedToken, setEmbedToken] = useState("");
  const [bridgeName, setBridgeName] = useState("");
  const [threadId, setThreadId] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);
  const [parentId] = useState("chatbot-embed-container");
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [copied, setCopied] = useState(false);

  // Configuration options
  const [fullScreen, setFullScreen] = useState(false);
  const [hideCloseButton, setHideCloseButton] = useState(false);
  const [hideIcon, setHideIcon] = useState(false);
  const [defaultOpen, setDefaultOpen] = useState(false);
  const [askAiInput, setAskAiInput] = useState("");
  const [eventLogs, setEventLogs] = useState([]);

  const scriptSrc = "https://chatbot-embed.viasocket.com/chatbot-prod.js";

  const handleInitialize = () => {
    if (embedToken.trim() && bridgeName.trim() && threadId.trim()) {
      setIsInitialized(true);
      loadChatbotScript();
    }
  };

  useEffect(() => {
    const handleChatbotMessage = (event) => {
      // Filter for specific chatbot events we want to log
      const eventType = event.data?.type;

      // List of events to track
      const eventsToLog = ["MESSAGE_SENT", "MESSAGE_RECEIVED", "MESSAGE_RECEIVED_WITH_ERROR"];

      // Only log if it's one of our tracked events
      if (eventType && eventsToLog.includes(eventType)) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = {
          timestamp,
          type: eventType,
          data: event.data?.data || event.data, // Full event data
          fullEvent: event.data, // Complete event object
          id: Date.now() + Math.random(), // Unique ID
        };

        setEventLogs((prev) => [logEntry, ...prev].slice(0, 50)); // Keep last 50 logs
      }
    };

    window.addEventListener("message", handleChatbotMessage);

    return () => {
      window.removeEventListener("message", handleChatbotMessage);
    };
  }, []);

  const handleClearLogs = () => {
    setEventLogs([]);
  };

  useEffect(() => {
    if (scriptLoaded && isInitialized) {
      loadChatbotScript();
    }
  }, [fullScreen, hideCloseButton, hideIcon, defaultOpen]);

  const loadChatbotScript = () => {
    // Clear container first
    const container = document.getElementById(parentId);
    if (container) {
      container.innerHTML = "";
    }

    // Remove existing script if any
    const existingScript = document.getElementById("chatbot-main-script");
    if (existingScript) {
      existingScript.remove();
    }

    // Create and append new script
    const script = document.createElement("script");
    script.id = "chatbot-main-script";
    script.src = scriptSrc;
    script.setAttribute("embedToken", embedToken);
    script.setAttribute("bridgeName", bridgeName);
    script.setAttribute("threadId", threadId);

    document.head.appendChild(script);

    // Wait for script to load, then send data
    script.onload = () => {
      setScriptLoaded(true);
      setTimeout(() => {
        if (window.Chatbot && window.Chatbot.sendData) {
          window.Chatbot.sendData({
            bridgeName: bridgeName,
            threadId: threadId,
            parentId: parentId,
            fullScreen: fullScreen,
            hideCloseButton: hideCloseButton,
            hideIcon: hideIcon,
            defaultOpen: defaultOpen,
            variables: {},
          });
        }
      }, 500);
    };
  };

  const handleOpenChatbot = () => {
    if (window.Chatbot && window.Chatbot.open) {
      window.Chatbot.open();
    }
  };

  const handleCloseChatbot = () => {
    if (window.Chatbot && window.Chatbot.close) {
      window.Chatbot.close();
    }
  };

  const handleShowIcon = () => {
    if (window.Chatbot && window.Chatbot.show) {
      window.Chatbot.show();
    }
  };

  const handleHideIcon = () => {
    if (window.Chatbot && window.Chatbot.hide) {
      window.Chatbot.hide();
    }
  };

  const handleReloadChats = () => {
    if (window.Chatbot && window.Chatbot.reloadChats) {
      window.Chatbot.reloadChats();
    }
  };

  const handleAskAi = () => {
    if (window.Chatbot && window.Chatbot.askAi && askAiInput.trim()) {
      window.Chatbot.askAi(askAiInput);
      setAskAiInput("");
    }
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(embedToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    const existingScript = document.getElementById("chatbot-main-script");
    if (existingScript) {
      existingScript.remove();
    }
    const container = document.getElementById(parentId);
    if (container) {
      container.innerHTML = "";
    }
    setEmbedToken("");
    setBridgeName("");
    setThreadId("");
    setIsInitialized(false);
    setScriptLoaded(false);
    setFullScreen(false);
    setHideCloseButton(false);
    setHideIcon(false);
    setDefaultOpen(false);
  };

  return (
    <div className="min-h-screen bg-base-200 p-6">
      <div className="w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Chatbot Embed Test Page</h1>
          <p className="text-base-content/60">
            Test how your chatbot embed will look and function on external platforms
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Controls */}
          <div className="lg:col-span-1">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title mb-4">Configuration</h2>

                {/* Initial Setup */}
                {!isInitialized ? (
                  <div className="space-y-3">
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
                      />
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">Bridge Name</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Enter bridge/agent slug name"
                        className="input input-bordered w-full input-sm"
                        value={bridgeName}
                        onChange={(e) => setBridgeName(e.target.value.trim())}
                      />
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">Thread ID</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Enter thread ID"
                        className="input input-bordered w-full input-sm"
                        value={threadId}
                        onChange={(e) => setThreadId(e.target.value.trim())}
                      />
                    </div>

                    <button
                      className="btn btn-primary w-full mt-3"
                      onClick={handleInitialize}
                      disabled={!embedToken.trim() || !bridgeName.trim() || !threadId.trim()}
                    >
                      Initialize Chatbot Embed
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">Current Token</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className="input input-bordered w-full input-sm"
                          value={embedToken}
                          readOnly
                        />
                        <button className="btn btn-square btn-ghost btn-sm" onClick={handleCopyToken}>
                          {copied ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">Bridge Name</span>
                      </label>
                      <input
                        type="text"
                        className="input input-bordered w-full input-sm"
                        value={bridgeName}
                        onChange={(e) => setBridgeName(e.target.value.trim())}
                      />
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">Thread ID</span>
                      </label>
                      <input
                        type="text"
                        className="input input-bordered w-full input-sm"
                        value={threadId}
                        onChange={(e) => setThreadId(e.target.value.trim())}
                      />
                    </div>
                    <button className="btn btn-primary btn-sm w-full mb-2" onClick={loadChatbotScript}>
                      Reload Chatbot
                    </button>

                    <button className="btn btn-error btn-sm w-full" onClick={handleReset}>
                      Reset
                    </button>
                  </div>
                )}

                {/* Configuration Toggles */}
                {isInitialized && (
                  <div className="mt-6">
                    <h3 className="font-semibold mb-3">Display Options</h3>
                    <div className="space-y-2">
                      <div className="form-control">
                        <label className="label cursor-pointer justify-start gap-2">
                          <input
                            type="checkbox"
                            className="checkbox checkbox-sm"
                            checked={fullScreen}
                            onChange={(e) => setFullScreen(e.target.checked)}
                          />
                          <span className="label-text">Full Screen</span>
                        </label>
                      </div>

                      <div className="form-control">
                        <label className="label cursor-pointer justify-start gap-2">
                          <input
                            type="checkbox"
                            className="checkbox checkbox-sm"
                            checked={hideCloseButton}
                            onChange={(e) => setHideCloseButton(e.target.checked)}
                          />
                          <span className="label-text">Hide Close Button</span>
                        </label>
                      </div>

                      <div className="form-control">
                        <label className="label cursor-pointer justify-start gap-2">
                          <input
                            type="checkbox"
                            className="checkbox checkbox-sm"
                            checked={hideIcon}
                            onChange={(e) => setHideIcon(e.target.checked)}
                          />
                          <span className="label-text">Hide Icon</span>
                        </label>
                      </div>

                      <div className="form-control">
                        <label className="label cursor-pointer justify-start gap-2">
                          <input
                            type="checkbox"
                            className="checkbox checkbox-sm"
                            checked={defaultOpen}
                            onChange={(e) => setDefaultOpen(e.target.checked)}
                          />
                          <span className="label-text">Default Open</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Function Buttons */}
                {isInitialized && (
                  <div className="mt-6">
                    <h3 className="font-semibold mb-3">Available Functions</h3>
                    <div className="space-y-2">
                      <button className="btn btn-outline btn-sm w-full justify-start" onClick={handleOpenChatbot}>
                        <span className="font-mono text-xs">window.Chatbot.open()</span>
                      </button>
                      <p className="text-xs text-base-content/60 ml-2 -mt-1">Opens the chatbot</p>

                      <button className="btn btn-outline btn-sm w-full justify-start" onClick={handleCloseChatbot}>
                        <span className="font-mono text-xs">window.Chatbot.close()</span>
                      </button>
                      <p className="text-xs text-base-content/60 ml-2 -mt-1">Closes the chatbot</p>

                      <button className="btn btn-outline btn-sm w-full justify-start" onClick={handleShowIcon}>
                        <span className="font-mono text-xs">window.Chatbot.show()</span>
                      </button>
                      <p className="text-xs text-base-content/60 ml-2 -mt-1">Shows the chatbot icon</p>

                      <button className="btn btn-outline btn-sm w-full justify-start" onClick={handleHideIcon}>
                        <span className="font-mono text-xs">window.Chatbot.hide()</span>
                      </button>
                      <p className="text-xs text-base-content/60 ml-2 -mt-1">Hides the chatbot icon</p>

                      <button className="btn btn-outline btn-sm w-full justify-start" onClick={handleReloadChats}>
                        <span className="font-mono text-xs">window.Chatbot.reloadChats()</span>
                      </button>
                      <p className="text-xs text-base-content/60 ml-2 -mt-1">Reloads the chat history</p>

                      <div className="divider my-2"></div>

                      <div className="form-control">
                        <label className="label">
                          <span className="label-text text-xs font-semibold">Ask AI</span>
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Enter message for AI"
                            className="input input-bordered input-sm flex-1"
                            value={askAiInput}
                            onChange={(e) => setAskAiInput(e.target.value)}
                            onKeyPress={(e) => e.key === "Enter" && handleAskAi()}
                          />
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={handleAskAi}
                            disabled={!askAiInput.trim()}
                          >
                            Send
                          </button>
                        </div>
                        <p className="text-xs text-base-content/60 mt-1">window.Chatbot.askAi(data)</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Info Section */}
                <div className="mt-6 p-4 bg-info/10 rounded-lg">
                  <h4 className="font-semibold text-sm mb-2">ℹ️ How to use</h4>
                  <ol className="text-xs space-y-1 list-decimal list-inside text-base-content/70">
                    <li>Enter embed token, bridge name, and thread ID</li>
                    <li>Click "Initialize Chatbot Embed"</li>
                    <li>Configure display options</li>
                    <li>Use function buttons to test interactions</li>
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
                  This is how the chatbot embed will appear on external platforms
                </p>

                {!isInitialized ? (
                  <div className="flex items-center justify-center h-96 border-2 border-dashed border-base-300 rounded-lg">
                    <div className="text-center">
                      <p className="text-base-content/60">Enter configuration details to preview</p>
                    </div>
                  </div>
                ) : (
                  <div
                    id={parentId}
                    className="border-2 border-base-300 rounded-lg p-4 min-h-96 bg-base-200"
                    style={{ minHeight: "500px" }}
                  >
                    {/* Chatbot embed will be injected here */}
                  </div>
                )}
              </div>
            </div>
            {/* ADD THE EVENT LOGS PANEL HERE - RIGHT AFTER THE PREVIEW CARD */}
            {isInitialized && (
              <div className="card bg-base-100 shadow-xl mt-6">
                <div className="card-body">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="card-title">Event Logs</h2>
                    <button className="btn btn-ghost btn-sm" onClick={handleClearLogs}>
                      Clear Logs
                    </button>
                  </div>

                  <div className="bg-base-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                    {eventLogs.length === 0 ? (
                      <p className="text-sm text-base-content/60 text-center py-4">
                        No events logged yet. Interact with the chatbot to see events.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {eventLogs.map((log) => (
                          <div key={log.id} className="bg-base-100 p-3 rounded border border-base-300">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-mono text-primary">{log.type}</span>
                              <span className="text-xs text-base-content/60">{log.timestamp}</span>
                            </div>
                            <pre className="text-xs bg-base-200 p-2 rounded overflow-x-auto">
                              {JSON.stringify(log.fullEvent, null, 2)}
                            </pre>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-2 text-xs text-base-content/60">
                    Showing {eventLogs.length} event{eventLogs.length !== 1 ? "s" : ""} (max 50)
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatbotEmbedTestPage;
