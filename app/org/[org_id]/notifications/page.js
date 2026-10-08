"use client";
import React, { use, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import MainLayout from "@/components/layoutComponents/MainLayout";
import PageHeader from "@/components/Pageheader";
import Protected from "@/components/Protected";
import NotificationInboxTab from "@/components/notifications/NotificationInboxTab";
import NotificationRulesTab from "@/components/notifications/NotificationRulesTab";
import NotificationChannelsTab from "@/components/notifications/NotificationChannelsTab";
import NotificationDeliveryLogTab from "@/components/notifications/NotificationDeliveryLogTab";
import { useCustomSelector } from "@/customHooks/customSelector";
import {
  fetchNotificationCatalogueAction,
  fetchNotificationChannelsAction,
  fetchNotificationRulesAction,
} from "@/store/action/notificationAction";
export const runtime = "edge";

const TABS = [
  { id: "inbox", label: "Inbox" },
  { id: "rules", label: "Rules", adminOnly: true },
  { id: "channels", label: "Channels", adminOnly: true },
  { id: "deliveries", label: "Delivery log", adminOnly: true },
];

function Page({ params }) {
  const resolvedParams = use(params);
  const orgId = resolvedParams.org_id;
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState("inbox");

  const { orgRole, isEmbedUser, catalogue, rules, channels, agents } = useCustomSelector((state) => ({
    orgRole: state?.userDetailsReducer?.organizations?.[orgId]?.role_name,
    isEmbedUser: state?.appInfoReducer?.embedUserDetails?.isEmbedUser,
    catalogue: state?.notificationReducer?.catalogue || [],
    rules: state?.notificationReducer?.rules,
    channels: state?.notificationReducer?.channels,
    agents: state?.bridgeReducer?.org?.[orgId]?.orgs || [],
  }));
  const isAdmin = orgRole === "Admin" || orgRole === "Owner";

  useEffect(() => {
    dispatch(fetchNotificationCatalogueAction());
  }, [dispatch]);

  // Rules and channels are shown across several admin tabs, so load them once.
  useEffect(() => {
    if (!isAdmin) return;
    dispatch(fetchNotificationRulesAction());
    dispatch(fetchNotificationChannelsAction());
  }, [dispatch, isAdmin, orgId]);

  if (isEmbedUser) return null;

  const visibleTabs = TABS.filter((tab) => !tab.adminOnly || isAdmin);

  return (
    <div className="h-auto px-2 pb-8">
      <MainLayout>
        <div className="flex flex-col w-full pt-4">
          <PageHeader
            title="Notifications"
            description={
              isAdmin
                ? "Everything that happens across your agents, and where it gets sent."
                : "Everything that happens across your agents."
            }
          />
        </div>
      </MainLayout>

      {visibleTabs.length > 1 && (
        <div
          className="inline-flex w-fit max-w-full items-center gap-0.5 overflow-x-auto rounded-lg bg-base-200 p-1 mb-4"
          role="tablist"
          data-testid="notification-centre-tabs"
        >
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              data-testid={`notification-centre-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 whitespace-nowrap rounded-md px-3 py-1 text-xs transition-colors ${
                activeTab === tab.id
                  ? "bg-base-100 font-semibold text-base-content shadow-sm ring-1 ring-base-content/10"
                  : "text-base-content/55 hover:text-base-content"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {activeTab === "inbox" && <NotificationInboxTab orgId={orgId} catalogue={catalogue} />}
      {isAdmin && activeTab === "rules" && (
        <NotificationRulesTab
          rules={rules?.items || []}
          loading={rules?.loading}
          catalogue={catalogue}
          channels={channels?.items || []}
          agents={agents}
        />
      )}
      {isAdmin && activeTab === "channels" && (
        <NotificationChannelsTab
          channels={channels?.items || []}
          loading={channels?.loading}
          rules={rules?.items || []}
        />
      )}
      {isAdmin && activeTab === "deliveries" && (
        <NotificationDeliveryLogTab catalogue={catalogue} channels={channels?.items || []} />
      )}
    </div>
  );
}

export default Protected(Page);
