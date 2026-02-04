import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConfigurationState } from "@/customHooks/useConfigurationState";
import { ConfigurationProvider } from "./ConfigurationContext";
import SetupView from "./SetupView";
import Protected from "../Protected";
import { Lock } from "lucide-react";
import { useCustomSelector } from "@/customHooks/customSelector";

const ConfigurationPage = ({
  params,
  isEmbedUser,
  apiKeySectionRef,
  promptTextAreaRef,
  searchParams,
  uiState,
  updateUiState,
  promptState,
  setPromptState,
  handleCloseTextAreaFocus,
  savePrompt,
  isMobileView,
  closeHelperButtonLocation,
  onViewChange,
  viewOverride,
}) => {
  const router = useRouter();
  const view = searchParams?.view || "config";
  const [currentView, setCurrentView] = useState(viewOverride || view);

  const configState = useConfigurationState(params, searchParams);

  // Get user role to determine edit permissions
  const { isAdminOrOwner, currentOrgRole, currentUser } = useCustomSelector((state) => {
    const orgRole = state?.userDetailsReducer?.organizations?.[params.org_id]?.role_name;
    const isAdminOrOwner = orgRole === "Admin" || orgRole === "Owner";

    return {
      isAdminOrOwner,
      currentOrgRole: orgRole || "",
      currentUser: state?.userDetailsReducer?.userDetails || {},
    };
  });

  // Determine if user has edit permissions for this agent
  const bridge = useCustomSelector((state) => state?.bridgeReducer?.allBridgesMap?.[params?.id]);
  const isEditor = useMemo(() => {
    // For embed users, only check agent access (not org role)
    if (isEmbedUser) {
      return true;
    }

    // Original logic for non-embed users
    return (
      (currentOrgRole === "Editor" &&
        (bridge?.users?.length === 0 ||
          !bridge?.users ||
          (bridge?.users?.length > 0 && bridge?.users?.some((user) => user === currentUser.id)))) ||
      (currentOrgRole === "Viewer" && bridge?.users?.some((user) => user === currentUser.id)) ||
      currentOrgRole === "Creator" ||
      isAdminOrOwner
    );
  }, [currentOrgRole, currentUser, bridge?.users, isAdminOrOwner, isEmbedUser]);
  // }, [bridgeType, currentView, params.org_id, params.id, searchParams.version, router]);

  const handleNavigation = useCallback(
    (target) => {
      // Update URL with view parameter while preserving existing query params
      const current = new URLSearchParams(window.location.search);
      // Remove tab parameter when switching to integration view to avoid conflicts
      if (target === "integration") {
        current.delete("tab");
      }
      current.set("tab", target);

      const search = current.toString();
      const query = search ? `?${search}` : "";
      router.push(`${window.location.pathname}${query}`, { scroll: false });

      setCurrentView(target);
      onViewChange?.(target === "agent-flow");
    },
    [onViewChange, params.org_id, params.id, searchParams?.version, router]
  );

  useEffect(() => {
    if (viewOverride && viewOverride !== currentView) {
      setCurrentView(viewOverride);
    }
  }, [currentView, viewOverride]);

  const renderHelpSection = useMemo(
    () => () => {
      return (
        <div className="mt-4 mb-4 border-t border-base-content/10 border-b-0 ">
          <div className="flex flex-row gap-6 mt-4 items-center">
            {/* Speak to us */}
            {!isEmbedUser && (
              <>
                <button
                  data-cal-namespace="30min"
                  data-cal-link="team/gtwy.ai/ai-consultation"
                  data-cal-origin="https://cal.id"
                  data-cal-config='{"layout":"month_view"}'
                  className="flex items-center gap-1 text-sm text-base-content/50 hover:text-base-content font-bold transition-colors cursor-pointer"
                >
                  <span>Speak to us</span>
                  <span>→</span>
                </button>

                {/* Help Docs */}

                <a
                  id="help-docs-link"
                  href="https://gtwy.ai/resources"
                  className="flex items-center gap-1 text-sm text-base-content/50 hover:text-base-content font-bold transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>Help Docs</span>
                  <span>→</span>
                </a>

                {/* Integration Guide */}

                <button
                  id="integration-guide-button"
                  onClick={() => {
                    handleNavigation("integration");
                  }}
                  className="flex items-center gap-1 text-sm text-base-content-50 hover:text-base-content font-bold transition-colors cursor-pointer"
                >
                  <span>Integration Guide</span>
                  <span>→</span>
                </button>
              </>
            )}
          </div>
        </div>
      );
    },
    [isEmbedUser]
  );

  // Detect if viewing published content (read-only mode)
  const isPublished = useMemo(() => {
    if (searchParams?.get) {
      return searchParams.get("isPublished") === "true";
    } else {
      return searchParams?.isPublished === "true";
    }
  }, [searchParams]);
  // Create context value with consolidated state - significantly reduced dependencies
  const contextValue = useMemo(
    () => ({
      ...configState,
      params,
      searchParams,
      isEmbedUser,
      apiKeySectionRef,
      promptTextAreaRef,
      uiState,
      updateUiState,
      promptState,
      setPromptState,
      handleCloseTextAreaFocus,
      savePrompt,
      isMobileView,
      closeHelperButtonLocation,
      currentView,
      switchView: handleNavigation,
      isPublished,
      isEditor,
    }),
    [
      configState,
      params,
      searchParams,
      isEmbedUser,
      apiKeySectionRef,
      promptTextAreaRef,
      uiState,
      updateUiState,
      promptState,
      setPromptState,
      handleCloseTextAreaFocus,
      savePrompt,
      isMobileView,
      closeHelperButtonLocation,
      isPublished,
      isEditor,
      currentView,
      handleNavigation,
    ]
  );

  // Check if viewing published data or non-editor mode
  const [bannerState, setBannerState] = useState({
    showPublished: isPublished,
    showNonEditor: !isEditor,
    animatingPublished: false,
    animatingNonEditor: false,
  });
  const prevIsPublished = useRef(isPublished);
  const prevIsEditor = useRef(isEditor);

  // Handle banner animation when isPublished changes
  useEffect(() => {
    if (prevIsPublished.current !== isPublished) {
      if (isPublished) {
        // Switching to published - show with slide-in animation
        setBannerState((prev) => ({ ...prev, showPublished: true, animatingPublished: false }));
      } else {
        // Switching from published - start slide-out animation
        setBannerState((prev) => ({ ...prev, showPublished: true, animatingPublished: true }));
        // Hide banner after animation completes
        setTimeout(() => {
          setBannerState((prev) => ({ ...prev, showPublished: false, animatingPublished: false }));
        }, 300); // Match animation duration
      }
      prevIsPublished.current = isPublished;
    }
  }, [isPublished]);

  // Handle banner animation when isEditor changes
  useEffect(() => {
    if (prevIsEditor.current !== isEditor) {
      if (!isEditor) {
        // Switching to non-editor - show with slide-in animation
        setBannerState((prev) => ({ ...prev, showNonEditor: true, animatingNonEditor: false }));
      } else {
        // Switching to editor - start slide-out animation
        setBannerState((prev) => ({ ...prev, showNonEditor: true, animatingNonEditor: true }));
        // Hide banner after animation completes
        setTimeout(() => {
          setBannerState((prev) => ({ ...prev, showNonEditor: false, animatingNonEditor: false }));
        }, 300); // Match animation duration
      }
      prevIsEditor.current = isEditor;
    }
  }, [isEditor]);

  return (
    <ConfigurationProvider value={contextValue}>
      <div className="flex flex-col gap-2 relative min-h-full">
        {/* Published Data Banner - Sticky and close to navbar */}
        {bannerState.showPublished && (
          <div
            id="published-banner"
            className={`sticky top-0 z-40 bg-blue-50 dark:bg-slate-800 border-b border-blue-200 dark:border-slate-700 py-2 ${
              bannerState.animatingPublished ? "animate-slide-out-to-navbar" : "animate-slide-in-from-navbar"
            }`}
          >
            <div className="flex items-center justify-center gap-2 text-sm">
              <Lock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-blue-700 dark:text-slate-300">
                This is a <span className="text-blue-800 dark:text-white font-medium">read-only</span> published data.
              </span>
            </div>
          </div>
        )}

        {/* Non-Editor Banner - Sticky and close to navbar */}
        {bannerState.showNonEditor && (
          <div
            id="non-editor-banner"
            className={`sticky top-0 z-40 bg-amber-50 dark:bg-slate-800 border-b border-amber-200 dark:border-slate-700 py-2 ${
              bannerState.animatingNonEditor ? "animate-slide-out-to-navbar" : "animate-slide-in-from-navbar"
            }`}
          >
            <div className="flex items-center justify-center gap-2 text-sm">
              <Lock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-blue-700 dark:text-slate-300">
                You don't have <span className="text-blue-800 dark:text-white font-medium">edit access</span> to update
                this agent.
              </span>
            </div>
          </div>
        )}
        <div className="flex-1">
          <SetupView />
        </div>
        <div className="mt-auto">{renderHelpSection()}</div>
      </div>
    </ConfigurationProvider>
  );
};

export default Protected(React.memo(ConfigurationPage));
