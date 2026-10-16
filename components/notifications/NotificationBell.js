"use client";
import React, { useEffect } from "react";
import { Bell } from "lucide-react";
import { toggleSidebar } from "@/utils/utility";
import useNotificationInbox from "@/customHooks/useNotificationInbox";
import { NOTIFICATIONS_SLIDER_ID } from "@/components/sliders/NotificationsSlider";

// Sidebar entry point for notifications on every org page. Loads the unread count on mount;
// live pushes keep it current after that.
function NotificationBell({ orgId, showLabel, onOpen }) {
  const { unreadCount, fetched, refresh } = useNotificationInbox(orgId);

  useEffect(() => {
    if (orgId && !fetched) refresh();
  }, [orgId, fetched, refresh]);

  const badge = unreadCount > 99 ? "99+" : unreadCount;

  return (
    <button
      id="main-slider-notifications-button"
      data-testid="main-slider-notifications-button"
      onClick={() => {
        toggleSidebar(NOTIFICATIONS_SLIDER_ID, "right");
        onOpen?.();
      }}
      className={`w-full flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-base-200 text-base-content ${
        showLabel ? "" : "justify-center"
      }`}
      aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}
    >
      <span className="relative shrink-0">
        <Bell size={16} />
        {unreadCount > 0 && !showLabel && (
          <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-error text-error-content text-[10px] leading-4 text-center">
            {badge}
          </span>
        )}
      </span>
      {showLabel && (
        <>
          <span className="text-xs truncate font-medium flex-1 text-left">Notifications</span>
          {unreadCount > 0 && <span className="badge badge-error badge-sm">{badge}</span>}
        </>
      )}
    </button>
  );
}

export default NotificationBell;
