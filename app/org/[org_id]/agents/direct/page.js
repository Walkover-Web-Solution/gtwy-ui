"use client";
import React, { use, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Code2, History, MessagesSquare } from "lucide-react";
import Protected from "@/components/Protected";
import useDirectConfig from "@/customHooks/useDirectConfig";
import useDirectChat from "@/customHooks/useDirectChat";
import DirectPageHeader from "@/components/directCompletion/DirectPageHeader";
import DirectConfigPanel from "@/components/directCompletion/DirectConfigPanel";
import DirectChatPanel from "@/components/directCompletion/DirectChatPanel";
import DirectHistoryTab from "@/components/directCompletion/DirectHistoryTab";
import DirectApiTab from "@/components/directCompletion/DirectApiTab";

export const runtime = "edge";

const TABS = [
  { id: "playground", label: "Playground", icon: MessagesSquare },
  { id: "history", label: "History", icon: History },
  { id: "api", label: "API", icon: Code2 },
];

// The active tab is component state, not a URL param: the history view rewrites the query
// string (thread_id, version, ...) and would drop a tab param. ?tab= is only read on load.
const getInitialTab = (search) => {
  const tab = search.get("tab");
  return TABS.some((t) => t.id === tab) ? tab : "playground";
};

function DirectCompletionPage({ params, searchParams }) {
  const { org_id: orgId } = use(params);
  const search = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => getInitialTab(search));
  // The provider key lives in memory only, so it is never written to storage.
  const [apikey, setApikey] = useState("");
  const directConfig = useDirectConfig(orgId);
  const directChat = useDirectChat({ config: directConfig.config, apikey });

  const { config, services } = directConfig;
  const serviceName = services.find((s) => s.value === config.service)?.displayName || config.service;
  const modelLabel = config.model ? `${serviceName} · ${config.model}` : "";

  return (
    <div className="flex h-full flex-col">
      <DirectPageHeader orgId={orgId} tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Hidden instead of unmounted, so switching tabs keeps the typed input and scroll position. */}
      <div
        className={`min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(340px,420px)_1fr] ${
          activeTab === "playground" ? "grid" : "hidden"
        }`}
      >
        <DirectConfigPanel {...directConfig} apikey={apikey} setApikey={setApikey} />
        <DirectChatPanel {...directChat} modelLabel={modelLabel} />
      </div>

      {activeTab === "history" && (
        <div className="min-h-0 flex-1">
          <DirectHistoryTab
            orgId={orgId}
            searchParams={searchParams}
            onOpenPlayground={() => setActiveTab("playground")}
          />
        </div>
      )}

      {activeTab === "api" && <DirectApiTab orgId={orgId} config={config} hasApikey={!!apikey} />}
    </div>
  );
}

export default Protected(DirectCompletionPage);
