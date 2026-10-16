"use client";
import React, { use, useEffect } from "react";
import { useDispatch } from "react-redux";
import MainLayout from "@/components/layoutComponents/MainLayout";
import PageHeader from "@/components/Pageheader";
import Protected from "@/components/Protected";
import NotificationInboxTab from "@/components/notifications/NotificationInboxTab";
import { useCustomSelector } from "@/customHooks/customSelector";
import { fetchNotificationCatalogueAction } from "@/store/action/notificationAction";
export const runtime = "edge";

// Every alert and failure across the org's agents. Where alerts are sent (webhooks) is set
// up in the Alerts section; this page shows what happened.
function Page({ params }) {
  const resolvedParams = use(params);
  const orgId = resolvedParams.org_id;
  const dispatch = useDispatch();

  const { isEmbedUser, catalogue } = useCustomSelector((state) => ({
    isEmbedUser: state?.appInfoReducer?.embedUserDetails?.isEmbedUser,
    catalogue: state?.notificationReducer?.catalogue || [],
  }));

  useEffect(() => {
    dispatch(fetchNotificationCatalogueAction());
  }, [dispatch]);

  if (isEmbedUser) return null;

  return (
    <div className="h-auto px-2 pb-8">
      <MainLayout>
        <div className="flex flex-col w-full pt-4">
          <PageHeader
            title="Notifications"
            description="Every alert and failure across your agents. Webhooks for these alerts are set up in the Alerts section."
          />
        </div>
      </MainLayout>
      <NotificationInboxTab orgId={orgId} catalogue={catalogue} />
    </div>
  );
}

export default Protected(Page);
