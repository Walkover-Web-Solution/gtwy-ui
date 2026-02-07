"use client";

import React, { useState } from "react";
import GTWYEmbedTester from "@/components/embedTesting/GTWYEmbedTester";
import ChatbotEmbedTester from "@/components/embedTesting/ChatbotEmbedTester";
import RagEmbedTester from "@/components/embedTesting/RagEmbedTester";

const EmbedTestingPage = () => {
  const [activeTab, setActiveTab] = useState("gtwy");

  const tabs = [
    { id: "gtwy", label: "GTWY Embed", component: GTWYEmbedTester },
    { id: "chatbot", label: "Chatbot Embed", component: ChatbotEmbedTester },
    { id: "rag", label: "RAG Embed", component: RagEmbedTester },
  ];

  const ActiveComponent = tabs.find((tab) => tab.id === activeTab)?.component;

  return (
    <div className="h-screen bg-base-200 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex-none px-6 pt-4 pb-3 border-b border-base-300">
        <div className="mx-auto">
          <h1 className="text-2xl font-bold text-base-content mb-1">Embed Testing Suite</h1>
          <p className="text-sm text-base-content/70">
            Comprehensive testing interface for all embed types - GTWY, Chatbot, and RAG
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-none px-6 pt-4 border-b border-base-300">
        <div className="mx-auto">
          <div className="tabs tabs-boxed bg-base-100 inline-flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`tab tab-lg ${activeTab === tab.id ? "tab-active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden px-6 py-4">
        <div className="mx-auto h-full">{ActiveComponent && <ActiveComponent />}</div>
      </div>
    </div>
  );
};

export default EmbedTestingPage;
