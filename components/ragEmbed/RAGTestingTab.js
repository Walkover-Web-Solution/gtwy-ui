"use client";

import React, { useState, useEffect } from "react";
import { ArrowRight, X, FileText } from "lucide-react";
import { useCustomSelector } from "@/customHooks/customSelector";
import EmbedPreview from "../integration/EmbedPreview";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

const RAGTestingTab = ({ data }) => {
  const [eventLogs, setEventLogs] = useState([]);
  const [theme, setTheme] = useState("light");

  const { embedToken } = useCustomSelector((state) => ({
    embedToken: state?.integrationReducer?.embedTokens?.[data?.folder_id],
  }));

  const addLog = (type, message, data = null) => {
    const timestamp = new Date().toLocaleTimeString();
    setEventLogs((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        type,
        message,
        data,
        timestamp,
      },
    ]);
  };

  useEffect(() => {
    if (embedToken) {
      addLog("success", "RAG embed token loaded from Redux");
    }
  }, [embedToken]);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data.type === "rag") {
        addLog("info", "Received RAG event", event.data);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const testOpenRag = () => {
    try {
      if (typeof window.openRag === "function") {
        window.openRag();
        addLog("success", "window.openRag() called successfully");
      } else {
        addLog("error", "window.openRag is not available");
      }
    } catch (error) {
      addLog("error", "Error calling openRag", error.message);
    }
  };

  const testCloseRag = () => {
    try {
      if (typeof window.closeDocuments === "function") {
        window.closeDocuments();
        addLog("success", "window.closeDocuments() called successfully");
      } else {
        addLog("error", "window.closeDocuments is not available");
      }
    } catch (error) {
      addLog("error", "Error calling closeDocuments", error.message);
    }
  };

  const testShowDocuments = () => {
    try {
      if (typeof window.showDocuments === "function") {
        window.showDocuments();
        addLog("success", "window.showDocuments() called successfully");
      } else {
        addLog("error", "window.showDocuments is not available");
      }
    } catch (error) {
      addLog("error", "Error calling showDocuments", error.message);
    }
  };

  const clearLogs = () => {
    setEventLogs([]);
    addLog("info", "Event logs cleared");
  };

  const getLogTypeBadge = (type) => {
    switch (type) {
      case "success":
        return "badge-success";
      case "error":
        return "badge-error";
      case "info":
        return "badge-info";
      default:
        return "badge-ghost";
    }
  };

  return (
    <div className="h-full">
      <PanelGroup direction="horizontal">
        <Panel defaultSize={25} minSize={20}>
          <div className="h-full flex flex-col bg-base-100 border-r border-base-300">
            <div className="p-4 border-b border-base-300">
              <h3 className="text-sm font-semibold text-base-content mb-3">Testing Functions</h3>
              <div className="space-y-2">
                <div className="card bg-base-200 shadow-sm">
                  <div className="card-body p-3">
                    <h4 className="text-xs font-semibold mb-2">RAG Controls</h4>
                    <div className="space-y-2">
                      <button onClick={testOpenRag} className="btn btn-primary btn-sm w-full gap-2">
                        <ArrowRight className="h-4 w-4" />
                        Create Document
                      </button>

                      <button onClick={testShowDocuments} className="btn btn-info btn-sm w-full gap-2">
                        <FileText className="h-4 w-4" />
                        Show Documents
                      </button>
                      <button onClick={testCloseRag} className="btn btn-error btn-sm w-full gap-2">
                        <X className="h-4 w-4" />
                        Close Documents
                      </button>
                    </div>
                  </div>
                </div>

                <div className="card bg-base-200 shadow-sm">
                  <div className="card-body p-3">
                    <h4 className="text-xs font-semibold mb-2">Theme</h4>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setTheme("light")}
                        className={`btn btn-sm flex-1 ${theme === "light" ? "btn-primary" : "btn-ghost"}`}
                      >
                        Light
                      </button>
                      <button
                        onClick={() => setTheme("dark")}
                        className={`btn btn-sm flex-1 ${theme === "dark" ? "btn-primary" : "btn-ghost"}`}
                      >
                        Dark
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-base-300 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-base-content">Event Logs</h3>
                <button onClick={clearLogs} className="btn btn-ghost btn-xs">
                  Clear
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {eventLogs.length === 0 ? (
                  <div className="text-center text-base-content/50 text-xs py-8">
                    <p>No events logged yet</p>
                    <p className="mt-1">Test functions to see logs here</p>
                  </div>
                ) : (
                  eventLogs.map((log) => (
                    <div key={log.id} className="card bg-base-200 shadow-sm">
                      <div className="card-body p-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`badge badge-xs ${getLogTypeBadge(log.type)}`}>{log.type}</span>
                              <span className="text-xs text-base-content/60">{log.timestamp}</span>
                            </div>
                            <p className="text-xs text-base-content break-words">{log.message}</p>
                            {log.data && (
                              <pre className="text-xs text-base-content/60 mt-1 overflow-x-auto">
                                {JSON.stringify(log.data, null, 2)}
                              </pre>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </Panel>

        <PanelResizeHandle className="w-2 bg-base-300 hover:bg-primary transition-colors cursor-col-resize" />

        <Panel defaultSize={75} minSize={30}>
          <div className="h-full bg-base-100">
            <EmbedPreview
              embedToken={embedToken}
              embedType="rag"
              parentId="rag-container"
              showHeader={true}
              isLoading={!embedToken}
              theme={theme}
            />
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
};

export default RAGTestingTab;
