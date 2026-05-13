"use client";

import React, { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";

const ChatbotPreview = ({ showHeader = true, embedToken }) => {
  const scriptLoadedRef = useRef(false);
  const scriptId = "chatbot-main-script";
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [isReloading, setIsReloading] = useState(false);

  const handleReload = () => {
    setIsReloading(true);
    scriptLoadedRef.current = false;
    const container = document.getElementById("chatbot-preview-container");
    if (container) container.innerHTML = "";
    const existing = document.getElementById(scriptId);
    if (existing) document.head.removeChild(existing);
    setReloadTrigger((prev) => prev + 1);
    setTimeout(() => setIsReloading(false), 800);
  };

  useEffect(() => {
    if (!embedToken) return;
    if (scriptLoadedRef.current) return;
    scriptLoadedRef.current = true;

    const existingScript = document.getElementById(scriptId);
    if (existingScript) {
      document.head.removeChild(existingScript);
    }
    const script = document.createElement("script");
    script.id = scriptId;
    script.setAttribute("embedToken", embedToken);
    script.setAttribute("hideIcon", "false");
    script.setAttribute("threadId", "thread1");
    script.setAttribute("defaultOpen", "true");
    script.src = process.env.NEXT_PUBLIC_CHATBOT_SCRIPT_SRC;
    document.head.appendChild(script);

    return () => {
      const scriptToRemove = document.getElementById(scriptId);
      if (scriptToRemove) {
        document.head.removeChild(scriptToRemove);
      }
      scriptLoadedRef.current = false;
    };
  }, [embedToken, reloadTrigger]);

  useEffect(() => {
    if (!embedToken) return;

    const checkChatbot = setInterval(() => {
      if (typeof window.SendDataToChatbot === "function") {
        clearInterval(checkChatbot);
        window.SendDataToChatbot({
          bridgeName: "chatbot_preview",
          parentId: "chatbot-preview-container",
          threadId: "chatbot_preview",
        });
      }
    }, 100);

    return () => clearInterval(checkChatbot);
  }, [embedToken, reloadTrigger]);

  if (!embedToken) {
    return null;
  }

  return (
    <div className="h-full flex flex-col bg-base-100">
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

      <div id="chatbot-preview-container" className="h-full w-full"></div>
    </div>
  );
};

export default ChatbotPreview;
