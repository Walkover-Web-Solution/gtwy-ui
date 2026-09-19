"use client";
import { persistor, store } from "@/store/store";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Provider } from "react-redux";
import { Toaster } from "react-hot-toast";
import { PersistGate } from "redux-persist/integration/react";
import CommandPalette from "@/components/command/CommandPalette";
import { usePathname } from "next/navigation";
import { useThemeManager } from "@/customHooks/useThemeManager";
import PostHogProvider from "@/components/PostHogProvider";

const Wrapper = ({ children }) => {
  const pathname = usePathname();
  const { actualTheme } = useThemeManager();
  const [toastPortalTarget, setToastPortalTarget] = useState(null);
  useEffect(() => {
    const openDialogs = Array.from(document.querySelectorAll("dialog[open]"));
    const currentTarget = () => (openDialogs.length ? openDialogs[openDialogs.length - 1] : document.body);
    setToastPortalTarget(currentTarget());

    const observer = new MutationObserver((mutations) => {
      let changed = false;
      for (const mutation of mutations) {
        const target = mutation.target;
        if (!(target instanceof HTMLElement) || target.tagName !== "DIALOG") continue;
        const index = openDialogs.indexOf(target);
        if (target.hasAttribute("open")) {
          if (index === -1) {
            openDialogs.push(target);
            changed = true;
          }
        } else if (index !== -1) {
          openDialogs.splice(index, 1);
          changed = true;
        }
      }
      if (changed) setToastPortalTarget(currentTarget());
    });
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["open"] });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const pathSegments = pathname.split("/").filter(Boolean);
    let title = "GTWY AI";
    if (pathSegments.length > 0) {
      const lastSegment = pathSegments[pathSegments.length - 1];
      // Check if last segment is a number (like an ID), if so, use the second to last segment
      const segmentToUse = isNaN(lastSegment) ? lastSegment : pathSegments[pathSegments.length - 2] || lastSegment;
      const pageName = segmentToUse.replace(/[_-]/g, " ");
      const capitalizedPageName = pageName
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      title = `GTWY AI | ${capitalizedPageName}`;
    }
    document.title = title;
  }, [pathname]);

  // Return a Provider component that wraps all the child components
  // with the Redux store
  // It also has a div that wraps all the child components
  // And adds a Toaster for the notifications
  return (
    <>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <PostHogProvider>
            <div className="w-screen">
              {children}
              <CommandPalette />
              {toastPortalTarget &&
                createPortal(
                  <Toaster
                    position="top-center"
                    containerStyle={{ zIndex: 2147483000 }}
                    toastOptions={{
                      style: actualTheme === "dark" ? { background: "#333", color: "#fff" } : {},
                    }}
                  />,
                  toastPortalTarget
                )}
            </div>
          </PostHogProvider>
        </PersistGate>
      </Provider>
    </>
  );
};

export default Wrapper;
