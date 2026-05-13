"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, X, FileText } from "lucide-react";
import { useCustomSelector } from "@/customHooks/customSelector";
import EmbedPreview from "../integration/EmbedPreview";
import EventLogs, { createAddLog } from "@/components/integration/EventLogs";

const RAGTestingTab = ({ data, isTestingMode }) => {
  const [eventLogs, setEventLogs] = useState([]);
  const addLog = createAddLog(setEventLogs);
  const [theme, setTheme] = useState("light");
  const [portalTarget, setPortalTarget] = useState(null);

  useEffect(() => {
    if (isTestingMode) {
      const el = document.getElementById("rag-testing-sidebar-content");
      setPortalTarget(el);
    } else {
      setPortalTarget(null);
    }
  }, [isTestingMode]);

  const { embedToken } = useCustomSelector((state) => ({
    embedToken: state?.integrationReducer?.embedTokens?.[data?.folder_id],
  }));

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

  const clearLogs = () => setEventLogs([]);

  const controls = (
    <div className="space-y-3" data-testid="rag-testing-controls">
      {/* RAG Controls */}
      <div className="card bg-base-200" data-testid="rag-testing-rag-controls">
        <div className="card-body p-3">
          <h4 className="card-title text-sm">RAG Controls</h4>
          <div className="space-y-2">
            <button
              data-testid="rag-testing-create-document-button"
              onClick={testOpenRag}
              className="btn btn-outline btn-xs w-full gap-1"
            >
              <ArrowRight className="h-3 w-3" />
              Create Document
            </button>
            <button
              data-testid="rag-testing-show-documents-button"
              onClick={testShowDocuments}
              className="btn btn-outline btn-xs w-full gap-1"
            >
              <FileText className="h-3 w-3" />
              Show Documents
            </button>
            <button
              data-testid="rag-testing-close-documents-button"
              onClick={testCloseRag}
              className="btn btn-error btn-xs w-full gap-1"
            >
              <X className="h-3 w-3" />
              Close Documents
            </button>
          </div>
        </div>
      </div>

      {/* Theme */}
      <div className="card bg-base-200" data-testid="rag-testing-theme">
        <div className="card-body p-3">
          <h4 className="card-title text-sm">Theme</h4>
          <div className="flex gap-2">
            <button
              data-testid="rag-testing-theme-light-button"
              onClick={() => setTheme("light")}
              className={`btn btn-xs flex-1 ${theme === "light" ? "btn-active" : "btn-ghost"}`}
            >
              Light
            </button>
            <button
              data-testid="rag-testing-theme-dark-button"
              onClick={() => setTheme("dark")}
              className={`btn btn-xs flex-1 ${theme === "dark" ? "btn-active" : "btn-ghost"}`}
            >
              Dark
            </button>
          </div>
        </div>
      </div>

      {/* Event Logs */}
      <EventLogs logs={eventLogs} onClear={clearLogs} />
    </div>
  );

  if (isTestingMode && portalTarget) {
    return (
      <>
        {createPortal(controls, portalTarget)}
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
      </>
    );
  }

  return (
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
  );
};

export default RAGTestingTab;
