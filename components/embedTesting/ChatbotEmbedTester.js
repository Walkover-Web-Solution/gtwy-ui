"use client";

import React, { useState, useEffect } from "react";
import { Copy, Check } from "lucide-react";

const ChatbotEmbedTester = () => {
  const [embedToken, setEmbedToken] = useState("");
  const [bridgeName, setBridgeName] = useState("");
  const [threadId, setThreadId] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);
  const [parentId] = useState("chatbot-embed-container");
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [copied, setCopied] = useState(false);

  const [fullScreen, setFullScreen] = useState(false);
  const [hideCloseButton, setHideCloseButton] = useState(false);
  const [hideIcon, setHideIcon] = useState(false);
  const [defaultOpen, setDefaultOpen] = useState(false);
  const [askAiInput, setAskAiInput] = useState("");
  const [eventLogs, setEventLogs] = useState([]);

  const scriptSrc = process.env.NEXT_PUBLIC_CHATBOT_SCRIPT_SRC;

  const handleInitialize = () => {
    if (embedToken.trim() && bridgeName.trim() && threadId.trim()) {
      setIsInitialized(true);
      loadChatbotScript();
    }
  };

  useEffect(() => {
    const handleChatbotMessage = (event) => {
      const eventType = event.data?.type;
      const eventsToLog = ["MESSAGE_SENT", "MESSAGE_RECEIVED", "MESSAGE_RECEIVED_WITH_ERROR"];

      if (eventType && eventsToLog.includes(eventType)) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = {
          timestamp,
          type: eventType,
          data: event.data?.data || event.data,
          fullEvent: event.data,
          id: Date.now() + Math.random(),
        };

        setEventLogs((prev) => [logEntry, ...prev].slice(0, 50));
      }
    };

    window.addEventListener("message", handleChatbotMessage);
    return () => window.removeEventListener("message", handleChatbotMessage);
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
    const container = document.getElementById(parentId);
    if (container) {
      container.innerHTML = "";
    }

    const existingScript = document.getElementById("chatbot-main-script");
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement("script");
    script.id = "chatbot-main-script";
    script.src = scriptSrc;
    script.setAttribute("embedToken", embedToken);
    script.setAttribute("bridgeName", bridgeName);
    script.setAttribute("threadId", threadId);

    document.head.appendChild(script);

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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
      {/* Left Panel - Configuration, Controls & Event Logs */}
      <div className="lg:col-span-1 flex flex-col h-full gap-3 overflow-hidden">
        {/* Configuration & Controls - Scrollable */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-base-100">
          <div className="space-y-3 pr-2">
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body p-4">
                <h2 className="card-title text-lg mb-3">Configuration</h2>

                {!isInitialized ? (
                  <div className="space-y-3">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">Embed Token</span>
                      </label>
                      <input
                        data-testid="chatbot-embed-token-input"
                        id="chatbot-embed-token-input"
                        type="text"
                        placeholder="Enter your embed token"
                        className="input input-bordered w-full input-sm"
                        value={embedToken}
                        onChange={(e) => setEmbedToken(e.target.value)}
                      />
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">Slug Name</span>
                      </label>
                      <input
                        data-testid="chatbot-slug-name-input"
                        id="chatbot-slug-name-input"
                        type="text"
                        placeholder="Enter agent slug name"
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
                        data-testid="chatbot-thread-id-input"
                        id="chatbot-thread-id-input"
                        type="text"
                        placeholder="Enter thread ID"
                        className="input input-bordered w-full input-sm"
                        value={threadId}
                        onChange={(e) => setThreadId(e.target.value.trim())}
                      />
                    </div>

                    <button
                      data-testid="chatbot-initialize-button"
                      id="chatbot-initialize-button"
                      className="btn btn-outline btn-sm w-full mt-3"
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
                        <span className="label-text font-semibold">Slug Name</span>
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
                    <button
                      data-testid="chatbot-reload-button"
                      id="chatbot-reload-button"
                      className="btn btn-outline btn-sm w-full mb-2"
                      onClick={loadChatbotScript}
                    >
                      Reload Chatbot
                    </button>

                    <button
                      data-testid="chatbot-reset-button"
                      id="chatbot-reset-button"
                      className="btn btn-outline btn-sm w-full"
                      onClick={handleReset}
                    >
                      Reset
                    </button>
                  </div>
                )}
              </div>
            </div>

            {isInitialized && (
              <div className="card bg-base-100 shadow-lg">
                <div className="card-body p-4">
                  <h3 className="card-title text-lg mb-3">Display Options</h3>
                  <div className="space-y-2">
                    <div className="form-control">
                      <label className="label cursor-pointer justify-start gap-2">
                        <input
                          data-testid="chatbot-fullscreen-checkbox"
                          id="chatbot-fullscreen-checkbox"
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
              </div>
            )}

            {isInitialized && (
              <div className="card bg-base-100 shadow-lg">
                <div className="card-body p-4">
                  <h3 className="card-title text-lg mb-3">Available Functions</h3>
                  <div className="space-y-2">
                    <button
                      data-testid="chatbot-open-function"
                      id="chatbot-open-function"
                      className="btn btn-outline btn-sm w-full justify-start"
                      onClick={handleOpenChatbot}
                    >
                      <span className="font-mono text-xs">window.Chatbot.open()</span>
                    </button>

                    <button className="btn btn-outline btn-sm w-full justify-start" onClick={handleCloseChatbot}>
                      <span className="font-mono text-xs">window.Chatbot.close()</span>
                    </button>

                    <button className="btn btn-outline btn-sm w-full justify-start" onClick={handleShowIcon}>
                      <span className="font-mono text-xs">window.Chatbot.show()</span>
                    </button>

                    <button className="btn btn-outline btn-sm w-full justify-start" onClick={handleHideIcon}>
                      <span className="font-mono text-xs">window.Chatbot.hide()</span>
                    </button>

                    <button className="btn btn-outline btn-sm w-full justify-start" onClick={handleReloadChats}>
                      <span className="font-mono text-xs">window.Chatbot.reloadChats()</span>
                    </button>

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
                          data-testid="chatbot-ask-ai-button"
                          id="chatbot-ask-ai-button"
                          className="btn btn-outline btn-sm"
                          onClick={handleAskAi}
                          disabled={!askAiInput.trim()}
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Event Logs - Fixed at bottom of left panel */}
        <div className="card bg-base-100 shadow-lg flex-none" style={{ height: "280px" }}>
          <div className="card-body p-4 flex flex-col h-full">
            <div className="flex justify-between items-center mb-2 flex-none">
              <h2 className="card-title text-base">Event Logs</h2>
              <button onClick={handleClearLogs} className="btn btn-ghost btn-xs">
                Clear
              </button>
            </div>
            <div className="bg-neutral rounded-lg p-3 flex-1 overflow-y-auto font-mono text-xs text-neutral-content">
              {eventLogs.length === 0 ? (
                <p className="text-neutral-content/50">No events yet...</p>
              ) : (
                eventLogs.map((log) => (
                  <div key={log.id} className="mb-2">
                    <span className="text-neutral-content/50">[{log.timestamp}]</span>{" "}
                    <span className="text-info">{log.type}</span>
                    {log.fullEvent && (
                      <pre className="text-neutral-content/70 ml-4 mt-1 text-xs">
                        {JSON.stringify(log.fullEvent, null, 2)}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>
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
              {!isInitialized && (
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

export default ChatbotEmbedTester;
