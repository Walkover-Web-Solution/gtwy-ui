"use client";
import { persistor, store } from "@/store/store";
import React, { useEffect } from "react";
import { Provider } from "react-redux";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { PersistGate } from "redux-persist/integration/react";
import CommandPalette from "@/components/command/CommandPalette";
import { usePathname } from "next/navigation";
import { useThemeManager } from "@/customHooks/useThemeManager";
import PostHogProvider from "@/components/PostHogProvider";

/**
 * The Wrapper component is the top level component of our application
 * It provides the Redux store to all the child components
 * It also has a ToastContainer for the react-toastify notifications
 */
const Wrapper = ({ children }) => {
  const pathname = usePathname();
  const { actualTheme } = useThemeManager();

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
  // And adds a ToastContainer for the notifications
  return (
    <>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <PostHogProvider>
            <div className="w-screen">
              {/* All the child components */}
              {children}
              {/* Global Command Palette */}
              <CommandPalette />
              {/* Notification toast container */}
              <ToastContainer position="bottom-left" theme={actualTheme === "dark" ? "dark" : "light"} />
            </div>
          </PostHogProvider>
        </PersistGate>
      </Provider>
    </>
  );
};

export default Wrapper;
