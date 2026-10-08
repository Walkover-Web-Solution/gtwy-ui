"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, X, CheckCheck } from "lucide-react";
import { toggleSidebar } from "@/utils/utility";
import useNotificationInbox from "@/customHooks/useNotificationInbox";
import NotificationList from "@/components/notifications/NotificationList";

export const NOTIFICATIONS_SLIDER_ID = "notifications-slider";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
];

// Opened from the sidebar bell: every notification the user can see, newest first.
function NotificationsSlider({ orgId }) {
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const { items, agentNames, unreadCount, loading, hasMore, refresh, loadMore, markRead, markAllRead, openAgent } =
    useNotificationInbox(orgId);

  // Refresh whenever the slider opens.
  useEffect(() => {
    const sliderElement = document.getElementById(NOTIFICATIONS_SLIDER_ID);
    if (!sliderElement) return;
    const observer = new MutationObserver(() => {
      if (!sliderElement.classList.contains("translate-x-full")) refresh();
    });
    observer.observe(sliderElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, [refresh]);

  const handleClose = useCallback(() => toggleSidebar(NOTIFICATIONS_SLIDER_ID, "right"), []);

  const handleOpenAgent = useCallback(
    (item) => {
      handleClose();
      openAgent(item);
    },
    [handleClose, openAgent]
  );

  const visibleItems = useMemo(
    () => (filter === "unread" ? items.filter((item) => !item.read) : items),
    [filter, items]
  );

  return (
    <aside
      id={NOTIFICATIONS_SLIDER_ID}
      data-testid="notifications-sidebar"
      className="sidebar-container fixed z-very-high flex flex-col top-0 right-0 p-4 w-full md:w-1/3 lg:w-1/4 opacity-100 h-screen bg-base-200 transition-all duration-300 border-l border-base-300 overflow-hidden translate-x-full"
      aria-label="Notifications"
    >
      <div className="flex flex-col w-full gap-3 h-full min-h-0">
        <div className="flex justify-between items-center border-b border-base-300 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-base font-semibold text-base-content leading-tight">Notifications</p>
              <p className="text-xs text-base-content/50">{unreadCount ? `${unreadCount} unread` : "All caught up"}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="p-1.5 rounded-lg text-base-content/40 hover:text-base-content hover:bg-base-300 transition-all tooltip tooltip-bottom"
                data-tip="Mark all as read"
                data-testid="notifications-mark-all-read"
              >
                <CheckCheck className="w-4 h-4" />
              </button>
            )}
            <button
              id="notifications-slider-close-icon"
              onClick={handleClose}
              className="p-1.5 rounded-lg text-base-content/40 hover:text-base-content hover:bg-base-300 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="inline-flex w-fit items-center gap-0.5 rounded-lg bg-base-300/60 p-1 shrink-0" role="tablist">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={filter === item.id}
              onClick={() => setFilter(item.id)}
              className={`rounded-md px-3 py-1 text-xs transition-colors ${
                filter === item.id
                  ? "bg-base-100 font-semibold text-base-content shadow-sm"
                  : "text-base-content/55 hover:text-base-content"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {loading && !items.length ? (
            <div className="flex justify-center items-center h-40">
              <div className="loading loading-spinner loading-md"></div>
            </div>
          ) : (
            <>
              <NotificationList
                items={visibleItems}
                agentNames={agentNames}
                onItemClick={markRead}
                onOpenAgent={handleOpenAgent}
                emptyTitle={filter === "unread" ? "Nothing unread" : undefined}
                emptyHint={filter === "unread" ? "You've read every notification." : undefined}
              />
              {hasMore && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm w-full mt-2"
                  onClick={loadMore}
                  disabled={loading}
                >
                  {loading ? <span className="loading loading-spinner loading-xs" /> : "Load more"}
                </button>
              )}
            </>
          )}
        </div>

        <button
          type="button"
          className="btn btn-sm btn-outline shrink-0"
          data-testid="notifications-open-centre"
          onClick={() => {
            handleClose();
            router.push(`/org/${orgId}/notifications`);
          }}
        >
          Open notification centre
        </button>
      </div>
    </aside>
  );
}

export default NotificationsSlider;
