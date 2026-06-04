"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Play } from "lucide-react";
import { useDispatch } from "react-redux";
import { useCustomSelector } from "@/customHooks/customSelector";
import { getChatBotDetailsAction } from "@/store/action/chatBotAction";
import ChatbotPreview from "./ChatbotPreview";
import EventLogs, { createAddLog } from "@/components/integration/EventLogs";
import CodeMirror from "@uiw/react-codemirror";
import { json, jsonParseLinter } from "@codemirror/lang-json";
import { linter, lintGutter } from "@codemirror/lint";
import { useThemeManager } from "@/customHooks/useThemeManager";
const ChatbotTestingControlsInner = ({ chatBotId }) => {
  const { actualTheme } = useThemeManager();
  const [eventLogs, setEventLogs] = useState([]);
  const addLog = createAddLog(setEventLogs);
  const [sendDataJson, setSendDataJson] = useState();
  const [askAiData, setAskAiData] = useState("");

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data.type === "chatbot") {
        const receivedData = event.data;
        addLog("info", "Received message event", receivedData);
      }
    };

    window.addEventListener("message", handleMessage);
    addLog("success", "Message listener initialized");

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  const clearLogs = () => setEventLogs([]);

  const handleSendData = () => {
    try {
      const data = JSON.parse(sendDataJson);
      if (typeof window.Chatbot?.sendData === "function") {
        window.Chatbot.sendData(data);
      }
    } catch (error) {
      addLog("error", "Invalid JSON format", error.message);
    }
  };

  const handleOpen = () => {
    try {
      if (typeof window.Chatbot?.open === "function") {
        window.Chatbot.open();
      }
    } catch (error) {
      addLog("error", "Failed to open chatbot", error.message);
    }
  };

  const handleClose = () => {
    try {
      if (typeof window.Chatbot?.close === "function") {
        window.Chatbot.close();
      }
    } catch (error) {
      addLog("error", "Failed to close chatbot", error.message);
    }
  };

  const handleShow = () => {
    try {
      if (typeof window.Chatbot?.show === "function") {
        window.Chatbot.show();
      }
    } catch (error) {
      addLog("error", "Failed to show chatbot icon", error.message);
    }
  };

  const handleHide = () => {
    try {
      if (typeof window.Chatbot?.hide === "function") {
        window.Chatbot.hide();
      }
    } catch (error) {
      addLog("error", "Failed to hide chatbot icon", error.message);
    }
  };

  const handleReloadChats = () => {
    try {
      if (typeof window.Chatbot?.reloadChats === "function") {
        window.Chatbot.reloadChats();
      } else {
      }
    } catch (error) {
      addLog("error", "Failed to reload chats", error.message);
    }
  };

  const handleAskAi = () => {
    try {
      if (!askAiData.trim()) {
        return;
      }
      if (typeof window.Chatbot?.askAi === "function") {
        window.Chatbot.askAi(askAiData);
      }
    } catch (error) {
      addLog("error", "Failed to ask AI", error.message);
    }
  };

  return (
    <div className="space-y-3" data-testid="chatbot-testing-controls">
      {/* Basic Controls */}
      <div className="card bg-base-200" data-testid="chatbot-testing-basic-controls">
        <div className="card-body p-3">
          <h4 className="card-title text-sm">Basic Controls</h4>
          <div className="grid grid-cols-2 gap-2">
            <button
              data-testid="chatbot-testing-open-button"
              onClick={handleOpen}
              className="btn btn-outline btn-xs gap-1"
            >
              <Play className="h-3 w-3" />
              Open
            </button>
            <button
              data-testid="chatbot-testing-close-button"
              onClick={handleClose}
              className="btn btn-error btn-xs gap-1"
            >
              <Play className="h-3 w-3 rotate-180" />
              Close
            </button>
            <button
              data-testid="chatbot-testing-show-icon-button"
              onClick={handleShow}
              className="btn btn-outline btn-xs gap-1"
            >
              <Play className="h-3 w-3" />
              Show Icon
            </button>
            <button
              data-testid="chatbot-testing-hide-icon-button"
              onClick={handleHide}
              className="btn btn-outline btn-xs gap-1"
            >
              <Play className="h-3 w-3" />
              Hide Icon
            </button>
            <button
              data-testid="chatbot-testing-reload-chats-button"
              onClick={handleReloadChats}
              className="btn btn-outline btn-xs gap-1 col-span-2"
            >
              <Play className="h-3 w-3" />
              Reload Chats
            </button>
          </div>
        </div>
      </div>

      {/* Send Data */}
      <div className="card bg-base-200" data-testid="chatbot-testing-send-data">
        <div className="card-body p-3">
          <h4 className="card-title text-sm">Send Data</h4>
          <div data-testid="chatbot-testing-send-data-input" className="border border-base-300 rounded overflow-hidden">
            <CodeMirror
              value={sendDataJson ?? "{}"}
              height="100px"
              extensions={[json(), linter(jsonParseLinter()), lintGutter()]}
              onChange={(val) => setSendDataJson(val)}
              placeholder="Enter JSON data"
              className="text-xs"
              theme={actualTheme}
            />
          </div>
          <button
            data-testid="chatbot-testing-send-data-button"
            onClick={handleSendData}
            className="btn btn-outline btn-xs w-full gap-1 mt-1"
          >
            <Play className="h-3 w-3" />
            Call sendData()
          </button>
        </div>
      </div>

      {/* Ask AI */}
      <div className="card bg-base-200" data-testid="chatbot-testing-ask-ai">
        <div className="card-body p-3">
          <h4 className="card-title text-sm">Ask AI</h4>
          <textarea
            data-testid="chatbot-testing-ask-ai-input"
            className="textarea textarea-bordered textarea-xs text-xs w-full"
            rows={3}
            value={askAiData}
            onChange={(e) => setAskAiData(e.target.value)}
            placeholder="Enter question or data for AI"
          />
          <button
            data-testid="chatbot-testing-ask-ai-button"
            onClick={handleAskAi}
            className="btn btn-outline btn-xs w-full gap-1 mt-1"
          >
            <Play className="h-3 w-3" />
            Call askAi()
          </button>
        </div>
      </div>

      {/* Event Logs */}
      <EventLogs logs={eventLogs} onClear={clearLogs} />
    </div>
  );
};

export const ChatbotTestingControls = React.memo(ChatbotTestingControlsInner);

const ChatbotTestingTab = ({ params, chatBotId, embedToken }) => {
  const dispatch = useDispatch();
  const [portalTarget, setPortalTarget] = useState(null);

  useEffect(() => {
    // Wait for sidebar slide-in animation (300ms) before mounting portal content
    const timer = setTimeout(() => {
      const el = document.getElementById("chatbot-testing-sidebar-content");
      if (el) {
        setPortalTarget(el);
        return;
      }
      const interval = setInterval(() => {
        const el = document.getElementById("chatbot-testing-sidebar-content");
        if (el) {
          setPortalTarget(el);
          clearInterval(interval);
        }
      }, 50);
      return () => clearInterval(interval);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const { chatBotConfig } = useCustomSelector((state) => ({
    chatBotConfig: state?.ChatBot?.ChatBotMap?.[chatBotId]?.config,
  }));

  useEffect(() => {
    if (chatBotId !== undefined) {
      dispatch(getChatBotDetailsAction(chatBotId));
    }
  }, [chatBotId, dispatch]);

  return (
    <>
      {portalTarget && createPortal(<ChatbotTestingControls chatBotId={chatBotId} />, portalTarget)}
      <ChatbotPreview chatbotConfig={chatBotConfig} embedToken={embedToken} params={params} />
    </>
  );
};

export default ChatbotTestingTab;
