"use client";
import React, { useCallback, useEffect, useMemo } from "react";
import { Bell, X, CheckCheck } from "lucide-react";
import { useDispatch } from "react-redux";
import { toggleSidebar } from "@/utils/utility";
import { useCustomSelector } from "@/customHooks/customSelector";
import {
  fetchOrgNotificationsAction,
  fetchAgentNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/store/action/notificationAction";

const SLIDER_ID = "notifications-slider";

function NotificationsSlider({ agentId }) {
  const dispatch = useDispatch();

  const { orgItems, orgLoading, agentItems, agentLoading, unreadCount } = useCustomSelector((state) => {
    const org = state?.notificationReducer?.org || {};
    const agent = agentId ? state?.notificationReducer?.byAgent?.[agentId] : null;
    return {
      orgItems: org.items || [],
      orgLoading: org.loading || false,
      agentItems: agent?.items || [],
      agentLoading: agent?.loading || false,
      unreadCount: (org.unreadCount || 0) + (agent?.unreadCount || 0),
    };
  });

  const fetchFirstPage = useCallback(() => {
    dispatch(fetchOrgNotificationsAction({ page: 1 }));
    if (agentId) {
      dispatch(fetchAgentNotificationsAction({ agentId, page: 1 }));
    }
  }, [dispatch, agentId]);

  // Fetch when the slider is opened
  useEffect(() => {
    const sliderElement = document.getElementById(SLIDER_ID);
    if (!sliderElement) return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "attributes" && mutation.attributeName === "class") {
          const isOpen = !sliderElement.classList.contains("translate-x-full");
          if (isOpen) {
            fetchFirstPage();
          }
        }
      });
    });

    observer.observe(sliderElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, [fetchFirstPage]);

  const handleClose = useCallback(() => {
    toggleSidebar(SLIDER_ID, "right");
  }, []);

  const handleMarkAllRead = useCallback(() => {
    dispatch(markAllNotificationsReadAction(agentId));
  }, [dispatch, agentId]);

  const handleItemClick = useCallback(
    (item) => {
      if (!item.read) {
        dispatch(markNotificationReadAction(item._id));
      }
    },
    [dispatch]
  );

  const sortedItems = useMemo(
    () => [...orgItems, ...agentItems].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [orgItems, agentItems]
  );

  const loading = orgLoading || agentLoading;

  return (
    <aside
      id={SLIDER_ID}
      data-testid="notifications-sidebar"
      className="sidebar-container fixed z-very-high flex flex-col top-0 right-0 p-4 w-full md:w-1/3 lg:w-1/4 opacity-100 h-screen bg-base-200 transition-all duration-300 border-l border-base-300 overflow-hidden translate-x-full "
      aria-label="Notifications Slider"
    >
      <div className="flex flex-col w-full gap-4 h-full min-h-0">
        <div className="flex justify-between items-center border-b border-base-300 pb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-base font-semibold text-base-content leading-tight">Notifications</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="p-1.5 rounded-lg text-base-content/40 hover:text-base-content hover:bg-base-300 transition-all tooltip tooltip-bottom"
                data-tip="Mark all as read"
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

        <div className="mt-2 flex-1 overflow-y-auto">
          {loading && sortedItems.length === 0 ? (
            <div className="flex justify-center items-center h-40">
              <div className="loading loading-spinner loading-md"></div>
            </div>
          ) : sortedItems.length > 0 ? (
            <ul className="space-y-2 text-base-content">
              {sortedItems.map((item) => (
                <li
                  key={item._id}
                  onClick={() => handleItemClick(item)}
                  className={`px-3 py-2.5 rounded-lg border border-base-300 border-l-2 cursor-pointer transition-all duration-150 ${
                    item.read ? "bg-base-100 border-l-base-300" : "bg-primary/5 border-l-primary hover:bg-primary/10"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-semibold truncate text-base-content">{item.title}</span>
                    <span className="text-xs text-base-content/40 shrink-0 tabular-nums">
                      {new Date(item.createdAt).toLocaleString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </span>
                  </div>
                  <span className="text-xs text-base-content/60 block">{item.message}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-12 text-base-content/30">
              <Bell className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No notifications yet</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

export default NotificationsSlider;
