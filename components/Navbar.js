"use client";
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  TestTube,
  MessageCircleMore,
  ClipboardX,
  CloudCheck,
  BookCheck,
  Clock,
  Home,
  HistoryIcon,
  Edit2,
  BotIcon,
  ChevronDown,
  RefreshCcw,
  Settings,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDispatch } from "react-redux";
import { useCustomSelector } from "@/customHooks/customSelector";
import { updateBridgeAction, dicardBridgeVersionAction, deleteBridgeAction } from "@/store/action/bridgeAction";
import { updateBridgeVersionReducer } from "@/store/reducer/bridgeReducer";
import { MODAL_TYPE } from "@/utils/enums";
import { openModal, closeModal, toggleSidebar, sendDataToParent } from "@/utils/utility";
import { toast } from "react-toastify";
const ChatBotSlider = dynamic(() => import("./sliders/ChatBotSlider"), { ssr: false });
const ConfigHistorySlider = dynamic(() => import("./sliders/ConfigHistorySlider"), { ssr: false });
import Protected from "./Protected";
const DeleteModal = dynamic(() => import("./UI/DeleteModal"), { ssr: false });
import useDeleteOperation from "@/customHooks/useDeleteOperation";
import BridgeVersionDropdown from "./configuration/configurationComponent/BridgeVersionDropdown";
const VariableCollectionSlider = dynamic(() => import("./sliders/VariableCollectionSlider"), { ssr: false });
import AccessManagementModal from "./modals/AccessManagementModal";
import AgentActionMenu from "@/components/agents/AgentActionMenu";
import usePortalDropdown from "@/customHooks/usePortalDropdown";
const MakePublicAgentModal = dynamic(() => import("./modals/MakePublicAgentModal"), { ssr: false });
import unsavedPromptGuard from "@/utils/unsavedPromptGuard";
import ConfirmationModal from "./UI/ConfirmationModal";

const BRIDGE_STATUS = {
  ACTIVE: 1,
  PAUSED: 0,
};

const Navbar = ({ isEmbedUser, params }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const { isDeleting: isDiscardingWithHook, executeDelete } = useDeleteOperation();
  const ellipsisMenuRef = useRef(null);
  const [selectedAgentForAccess, setSelectedAgentForAccess] = useState(null);
  const pendingNavRef = useRef(null);

  const router = useRouter();
  const pathname = usePathname();
  const pathParts = pathname.split("?")[0].split("/");
  const orgId = params?.org_id || pathParts[2];
  const bridgeId = params?.id || pathParts[5];
  const dispatch = useDispatch();
  const searchParams = useSearchParams();
  const versionId = useMemo(() => searchParams?.get("version"), [searchParams]);
  const isPublished = useMemo(() => searchParams?.get("isPublished") === "true", [searchParams]);
  // Use portal dropdown hook (same as agents page)
  const { handlePortalOpen, handlePortalCloseImmediate, PortalDropdown, PortalStyles } = usePortalDropdown({
    offsetX: -100,
    offsetY: 5,
  });
  const {
    bridgeData,
    bridge,
    publishedVersion,
    isDrafted,
    bridgeStatus,
    bridgeType,
    isPublishing,
    isUpdatingBridge,
    activeTab,
    isArchived,
    showHomeButton,
    showHistory,
    bridgeName,
    savingStatus,
    publishedVersionId,
    showAgentName,
    isAdminOrOwner,
    hasPageConfig,
    bridgeSummary,
    publicAgentConfig,
    bridgeVersionsArray,
    statelessConversation,
  } = useCustomSelector((state) => {
    const orgRole = state?.userDetailsReducer?.organizations?.[orgId]?.role_name;
    const isAdminOrOwner = orgRole === "Admin" || orgRole === "Owner";
    const bridgeData =
      state?.bridgeReducer?.org?.[orgId]?.orgs?.find((bridge) => bridge._id === bridgeId) ||
      state.bridgeReducer.allBridgesMap[bridgeId] ||
      {};
    return {
      bridgeData,
      bridge: state.bridgeReducer.allBridgesMap[bridgeId] || {},
      publishedVersion: state.bridgeReducer.allBridgesMap?.[bridgeId]?.published_version_id ?? null,
      isDrafted: state.bridgeReducer.bridgeVersionMapping?.[bridgeId]?.[versionId]?.is_drafted ?? false,
      bridgeStatus: state.bridgeReducer.allBridgesMap?.[bridgeId]?.bridge_status ?? BRIDGE_STATUS.ACTIVE,
      bridgeType: state?.bridgeReducer?.allBridgesMap?.[bridgeId]?.bridgeType,
      isArchived: state.bridgeReducer.allBridgesMap?.[bridgeId]?.status ?? false,
      isPublishing: state.bridgeReducer.isPublishing ?? false,
      isUpdatingBridge: state.bridgeReducer.isUpdatingBridge ?? false,
      activeTab: pathname.includes("configure")
        ? "configure"
        : pathname.includes("history")
          ? "history"
          : pathname.includes("testcase")
            ? "testcase"
            : "configure",
      showHomeButton: state.appInfoReducer?.embedUserDetails?.showHomeButton ?? true,
      showHistory: state.appInfoReducer?.embedUserDetails?.showHistory,
      bridgeName: state?.bridgeReducer?.allBridgesMap?.[bridgeId]?.name || "",
      publishedVersionId: state?.bridgeReducer?.allBridgesMap?.[bridgeId]?.published_version_id || null,
      savingStatus: state?.bridgeReducer?.savingStatus || { status: null, timestamp: null },
      showAgentName: state?.appInfoReducer?.embedUserDetails?.showAgentName,
      isAdminOrOwner,
      currentOrgRole: orgRole || "",
      currentUser: state?.userDetailsReducer?.userDetails || {},
      hasPageConfig: !!state?.bridgeReducer?.allBridgesMap?.[bridgeId]?.settings?.publicAgentConfig,
      bridgeSummary: state?.bridgeReducer?.allBridgesMap?.[bridgeId]?.bridge_summary || "",
      publicAgentConfig: state?.bridgeReducer?.allBridgesMap?.[bridgeId]?.settings?.publicAgentConfig,
      bridgeVersionsArray: state?.bridgeReducer?.allBridgesMap?.[bridgeId]?.versions || [],
      statelessConversation: state?.bridgeReducer?.allBridgesMap?.[bridgeId]?.settings?.stateless_conversation ?? false,
    };
  });
  // Define tabs based on user type
  const TABS = useMemo(() => {
    const baseTabs = [
      {
        id: "configure",
        label: `${bridgeData.bridgeType === "api" ? "Agent" : "Chatbot"} Config`,
        icon: BotIcon,
        shortLabel: `${bridgeData.bridgeType === "api" ? "Agent" : "Chatbot"} Config`,
        shortcut: "G C",
      },
      { id: "history", label: "History", icon: MessageCircleMore, shortLabel: "History", shortcut: "G H" },
    ];
    if (!isEmbedUser) {
      baseTabs.splice(1, 0, {
        id: "testcase",
        label: "Test Cases",
        icon: TestTube,
        shortLabel: "Tests",
        shortcut: "G T",
      });
    }
    return baseTabs;
  }, [isEmbedUser, bridgeType]);

  const agentName = useMemo(() => bridgeName || bridgeData?.name || "Agent not Found", [bridgeName, bridgeData?.name]);

  // Get published version number (e.g., "V2")
  const publishedVersionNumber = useMemo(() => {
    if (!publishedVersion || !bridgeVersionsArray.length) return "";
    const versionIndex = bridgeVersionsArray.indexOf(publishedVersion);
    return versionIndex >= 0 ? `V${versionIndex + 1}` : "";
  }, [publishedVersion, bridgeVersionsArray]);

  const [showSavedText, setShowSavedText] = useState(false);
  useEffect(() => {
    if (savingStatus.status === "saved") {
      setShowSavedText(true);
      const timer = setTimeout(() => setShowSavedText(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [savingStatus.status, savingStatus.timestamp]);

  // Calculate active tab index for tab switcher animation
  const activeTabIndex = useMemo(() => {
    return TABS.findIndex((tab) => tab.id === activeTab);
  }, [TABS, activeTab]);

  const TAB_WIDTH = useMemo(() => {
    return isMobile ? 90 : 120; // px
  }, [isMobile]);

  const canRevertDraft = useMemo(() => isDrafted && publishedVersionId != null, [isDrafted, publishedVersionId]);

  const shouldShowNavbar = useCallback(() => {
    const depth = pathParts.length;
    if (depth === 3) return false;
    return ["configure", "history", "testcase"].some((seg) => pathname.includes(seg));
  }, [pathParts.length, pathname]);

  // Scroll detection
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 10);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Responsive detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Agent name editing functions
  const handleNameEdit = useCallback(() => {
    setIsEditingName(true);
    setEditedName(agentName);
  }, [agentName]);

  const handleNameSave = useCallback(() => {
    const trimmed = editedName.trim();
    if (trimmed === "") {
      toast.error("Agent name cannot be empty");
      setEditedName(agentName);
      return;
    }

    // Check for special characters (allow only letters, numbers, spaces, hyphens, and underscores)
    const specialCharRegex = /[^a-zA-Z0-9\s\-_]/;
    if (specialCharRegex.test(trimmed)) {
      toast.error("Agent name can only contain letters, numbers, spaces, hyphens, and underscores");
      setEditedName(agentName);
      return;
    }

    if (trimmed !== agentName) {
      dispatch(
        updateBridgeAction({
          bridgeId: bridgeId,
          dataToSend: { name: trimmed },
        })
      );
      isEmbedUser &&
        sendDataToParent(
          "updated",
          {
            name: trimmed,
            agent_id: bridgeId,
          },
          "Agent Name Updated"
        );
    }
    setIsEditingName(false);
  }, [editedName, agentName, dispatch, bridgeId, isEmbedUser]);

  const handleNameCancel = useCallback(() => {
    setIsEditingName(false);
    setEditedName(agentName);
  }, [agentName]);

  const handleNameKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleNameSave();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleNameCancel();
      }
    },
    [handleNameSave, handleNameCancel]
  );

  const handleDiscardChanges = useCallback(async () => {
    await executeDelete(async () => {
      dispatch(
        updateBridgeVersionReducer({
          bridges: { ...bridge, _id: versionId, parent_id: bridgeId, is_drafted: false },
        })
      );
      await dispatch(dicardBridgeVersionAction({ bridgeId, versionId }));
      toast.success("Changes discarded successfully");
    });
  }, [executeDelete, dispatch, bridge, searchParams, bridgeId]);

  const handlePublish = useCallback(async () => {
    if (!isDrafted) {
      toast.info("Nothing to publish");
      return;
    }
    try {
      if (unsavedPromptGuard.hasUnsavedChanges) {
        openModal(MODAL_TYPE.UNSAVED_CHANGES_PUBLISH_MODAL);
        return;
      }
      openModal(MODAL_TYPE?.PUBLISH_BRIDGE_VERSION);
    } catch (err) {
      console.error(err);
      toast.error("Failed to publish version");
    }
  }, [isDrafted]);

  const handleTabChange = useCallback(
    (tabId) => {
      const navigate = () => {
        const base = `/org/${orgId}/agents/${tabId}/${bridgeId}`;

        // Get bridge type from Redux and determine correct type parameter
        let typeValue;
        if (bridgeType && bridgeType.toLowerCase() === "chatbot") {
          typeValue = "chatbot";
        } else {
          // For 'api', 'batch', or any other type, default to 'api'
          typeValue = "api";
        }
        const typeQueryPart = `&type=${typeValue}`;

        // If currently in published mode and navigating to testcase or history
        if (isPublished && (tabId === "testcase" || tabId === "history")) {
          // Use published version ID and remove isPublished parameter
          router.push(
            base + (publishedVersion ? `?version=${publishedVersion}${typeQueryPart}` : `?type=${typeValue}`)
          );
        } else {
          // Normal navigation with current version
          router.push(base + (versionId ? `?version=${versionId}${typeQueryPart}` : `?type=${typeValue}`));
        }
      };

      if (unsavedPromptGuard.hasUnsavedChanges) {
        pendingNavRef.current = navigate;
        openModal(MODAL_TYPE.UNSAVED_CHANGES_NAV_MODAL);
        return;
      }

      navigate();
    },
    [router, orgId, bridgeId, versionId, isPublished, publishedVersion, bridgeType]
  );

  const handlePublishedClick = useCallback(() => {
    if (!publishedVersion) {
      toast.error("No published version available");
      return;
    }

    const navigate = () => {
      const currentUrl = new URL(window.location);
      // Don't push versionId when isPublished=true, just set isPublished flag
      currentUrl.searchParams.delete("version"); // Remove version parameter
      currentUrl.searchParams.set("isPublished", "true");

      // Ensure the type parameter is set based on the bridge type from Redux
      let typeValue;
      if (bridgeType && bridgeType.toLowerCase() === "chatbot") {
        typeValue = "chatbot";
      } else {
        // For 'api', 'batch', or any other type, default to 'api'
        typeValue = "api";
      }
      currentUrl.searchParams.set("type", typeValue);

      router.push(currentUrl.pathname + currentUrl.search);
    };

    if (unsavedPromptGuard.hasUnsavedChanges) {
      pendingNavRef.current = navigate;
      openModal(MODAL_TYPE.UNSAVED_CHANGES_NAV_MODAL);
      return;
    }

    navigate();
  }, [router, publishedVersion, bridgeType]);

  const toggleConfigHistorySidebar = useCallback(() => toggleSidebar("default-config-history-slider", "right"), []);
  const handleHomeClick = useCallback(() => {
    if (unsavedPromptGuard.hasUnsavedChanges) {
      pendingNavRef.current = () => router.push(`/org/${orgId}/agents`);
      openModal(MODAL_TYPE.UNSAVED_CHANGES_NAV_MODAL);
      return;
    }
    router.push(`/org/${orgId}/agents`);
  }, [router, orgId]);

  // Keyboard shortcuts for navigation - only enabled on testcases, configuration, or history pages
  useEffect(() => {
    // Only enable shortcuts on allowed pages (testcases, configuration, or history)
    const isAllowedPage = ["configure", "history", "testcase"].some((seg) => pathname.includes(seg));
    if (!isAllowedPage) return;

    let gPressed = false;
    let timeoutId = null;

    const handleKeyDown = (e) => {
      const target = e.target;
      const isInputField = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      if (isInputField) return;

      if (e.key === "g" || e.key === "G") {
        gPressed = true;
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          gPressed = false;
        }, 1000);
      } else if (gPressed) {
        if (e.key === "c" || e.key === "C") {
          e.preventDefault();
          handleTabChange("configure");
          gPressed = false;
          if (timeoutId) clearTimeout(timeoutId);
        } else if (e.key === "t" || e.key === "T") {
          e.preventDefault();
          if (!isEmbedUser) {
            handleTabChange("testcase");
          }
          gPressed = false;
          if (timeoutId) clearTimeout(timeoutId);
        } else if (e.key === "h" || e.key === "H") {
          e.preventDefault();
          handleTabChange("history");
          gPressed = false;
          if (timeoutId) clearTimeout(timeoutId);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [handleTabChange, isEmbedUser, pathname]);

  const StatusIndicator = ({ status }) =>
    status === BRIDGE_STATUS.ACTIVE ? null : (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-sm font-medium bg-warning/10 text-warning border border-warning/20">
        <Clock size={12} />
        <span className="hidden sm:inline">Paused</span>
      </div>
    );

  const handleDeleteAgentConfirm = useCallback(async () => {
    await executeDelete(async () => {
      const response = await dispatch(deleteBridgeAction({ bridgeId, org_id: orgId }));
      toast.success(response?.data?.message || "Agent deleted successfully");
      router.push(`/org/${orgId}/agents`);
    });
  }, [executeDelete, dispatch, bridgeId, orgId, router]);

  const handleStatelessToggle = useCallback(
    async (nextValue) => {
      try {
        const res = await dispatch(
          updateBridgeAction({
            bridgeId,
            dataToSend: { settings: { stateless_conversation: nextValue } },
          })
        );
        toast.success(`Stateless conversation ${nextValue ? "enabled" : "disabled"}`);
        return res;
      } catch (err) {
        console.error("Navbar.handleStatelessToggle failed", err);
        toast.error("Failed to update stateless conversation");
        throw err;
      }
    },
    [dispatch, bridgeId]
  );

  const EllipsisMenu = () => (
    <AgentActionMenu
      menuRef={ellipsisMenuRef}
      bridge={bridge}
      bridgeData={bridgeData}
      bridgeStatus={bridgeStatus}
      isArchived={isArchived === 0}
      isUpdatingBridge={isUpdatingBridge}
      isEmbedUser={isEmbedUser}
      isAdminOrOwner={isAdminOrOwner}
      orgId={orgId}
      bridgeId={bridgeId}
      statelessConversation={statelessConversation}
      onStatelessToggle={handleStatelessToggle}
      onSetSelectedAgent={setSelectedAgentForAccess}
      handlePortalOpen={handlePortalOpen}
      handlePortalCloseImmediate={handlePortalCloseImmediate}
      bridgeType={bridgeType}
    />
  );
  if (!shouldShowNavbar()) return null;

  return (
    <div className="bg-base-100 z-medium">
      {/* Main navigation header */}
      <div
        className={`sticky top-0 z-high transition-all duration-300 ${
          isScrolled
            ? "bg-base-100/95 backdrop-blur-sm shadow-md border-b border-base-300"
            : "bg-base-100 border-b border-base-200 "
        }`}
      >
        {/* Top bar with breadcrumb/home and actions */}
        <div className="flex w-full items-center justify-between px-2 sm:px-4 lg:px-6 h-10 min-w-0">
          {/* Left: Agent Name and Versions */}
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-5 min-w-0 flex-1">
            {isEmbedUser && showHomeButton && (
              <button
                onClick={handleHomeClick}
                className="btn btn-xs sm:btn-sm gap-1 sm:gap-2 hover:bg-base-200 px-2 sm:px-3"
                title="Go to Home"
              >
                <Home data-testid="navbar-home-button" id="navbar-home-button" size={14} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline text-sm sm:text-sm">Home</span>
              </button>
            )}

            {/* Simple Agent Name Display */}
            <div className="hidden sm:flex items-center ml-1 sm:ml-2 lg:ml-0 min-w-0 flex-1">
              {((showAgentName && isEmbedUser) || !isEmbedUser) && (
                <div className="flex items-center px-1 sm:px-2 py-1 sm:py-2 rounded-lg min-w-0 max-w-[120px] sm:max-w-fit cursor-pointer group hover:bg-base-200/50 transition-colors">
                  {!isEditingName ? (
                    <div className="flex items-center gap-1.5" onClick={handleNameEdit}>
                      <span
                        data-testid="navbar-agent-name-display"
                        id="navbar-agent-name-display"
                        className="font-semibold text-sm text-base-content truncate flex-shrink"
                        title={`${agentName} - Click to edit`}
                      >
                        {agentName}
                      </span>
                      <Edit2
                        size={12}
                        className="text-base-content/40 group-hover:text-base-content/60 transition-colors flex-shrink-0"
                      />
                    </div>
                  ) : (
                    <input
                      autoComplete="off"
                      data-testid="navbar-agent-name-input"
                      id="navbar-agent-name-input"
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      onBlur={handleNameSave}
                      onKeyDown={handleNameKeyDown}
                      className="input input-xs text-sm text-base-content"
                      autoFocus
                      maxLength={50}
                    />
                  )}
                </div>
              )}
              {/* Divider */}
              <div className="mx-1 sm:mx-2 h-4 w-px bg-base-300 flex-shrink-0"></div>

              {/* Published Button + Bridge Version Dropdown */}
              {activeTab === "configure" && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Published Button */}
                  {publishedVersion && (
                    <button
                      data-testid="navbar-published-button"
                      id="navbar-published-button"
                      onClick={handlePublishedClick}
                      className={`btn btn-xs flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-all duration-200 whitespace-nowrap min-w-fit ${
                        isPublished
                          ? "bg-green-100 text-green-800 border border-green-300 hover:bg-green-200"
                          : "bg-base-100 text-base-content border border-base-300 hover:bg-green-50 hover:text-green-700 hover:border-green-300"
                      }`}
                      title={isPublished ? "Currently viewing published version" : "Switch to published version"}
                    >
                      <span className="hidden sm:inline">Published ({publishedVersionNumber})</span>
                      <span className="sm:hidden">Pub ({publishedVersionNumber})</span>
                      {isPublished && (
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0" title="Active"></span>
                      )}
                    </button>
                  )}

                  {/* Bridge Version Dropdown - Desktop Only */}
                  <div className="hidden sm:flex min-w-0 flex-1">
                    {orgId && bridgeId ? (
                      <BridgeVersionDropdown
                        params={{ org_id: orgId, id: bridgeId }}
                        searchParams={searchParams}
                        maxVersions={2}
                      />
                    ) : (
                      <div className="flex items-center gap-1">
                        <div className="h-6 bg-base-200 animate-pulse rounded w-8"></div>
                        <div className="h-6 bg-base-200 animate-pulse rounded w-8"></div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Saving Status Indicator */}
              {activeTab === "configure" && (
                <div className="flex-shrink-0 ml-2 mr-2">
                  <div className="px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 text-base-content">
                    {savingStatus.status === "saving" && (
                      <>
                        <div className="loading loading-spinner loading-xs"></div>
                        <span>Saving</span>
                      </>
                    )}
                    {savingStatus.status === "saved" && (
                      <>
                        <CloudCheck size={16} />
                        {showSavedText && <span>Saved</span>}
                      </>
                    )}
                    {savingStatus.status === "failed" && (
                      <>
                        <ClipboardX size={14} />
                        <span>Failed</span>
                      </>
                    )}
                    {savingStatus.status === "warning" && (
                      <>
                        <Clock size={14} />
                        <span>Warning</span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Bridge Status Indicator */}
              {bridgeStatus !== BRIDGE_STATUS.ACTIVE && (
                <div className="flex-shrink-0">
                  <StatusIndicator status={bridgeStatus} />
                </div>
              )}
            </div>
          </div>

          {/* Right: Action buttons */}
          <div className="flex items-center gap-2 sm:gap-4 lg:gap-6 flex-shrink-0">
            {/* Navigation Tabs - Fixed Position with Sliding Animation */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {(isEmbedUser && showHistory) || !isEmbedUser ? (
                <div className="relative flex items-center gap-1" style={{ width: `${TAB_WIDTH * TABS.length}px` }}>
                  {/* Sliding background indicator */}
                  <span
                    className="absolute top-0 left-0 h-full rounded-lg bg-primary shadow-sm transition-transform duration-300 ease-in-out"
                    style={{
                      width: `${TAB_WIDTH}px`,
                      transform: `translateX(${activeTabIndex * TAB_WIDTH}px)`,
                    }}
                  />
                  {TABS.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const formattedShortcut = tab.shortcut.replace(/\s+/g, " + ");
                    const tabShortcutTooltip = `${formattedShortcut}`;
                    return (
                      <div key={tab.id} className="tooltip tooltip-bottom" data-tip={tabShortcutTooltip}>
                        <button
                          data-testid={`navbar-tab-${tab.id}`}
                          id={`navbar-tab-${tab.id}`}
                          onClick={() => handleTabChange(tab.id)}
                          className={`relative z-10 h-8 flex items-center justify-center gap-2 text-sm font-medium transition-colors
                ${isActive ? "text-primary-content" : "text-base-content/70 hover:text-base-content"}`}
                          style={{ width: `${TAB_WIDTH}px` }} // 🔒 lock tab width
                        >
                          <tab.icon
                            size={14}
                            className={`w-3.5 h-3.5 transition-opacity ${isActive ? "opacity-100" : "opacity-60"}`}
                          />
                          <span className="truncate text-xs">{isMobile ? tab.shortLabel : tab.label}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                // Invisible placeholder to maintain spacing when tabs are hidden
                <div className="w-32 h-8"></div>
              )}
            </div>

            {/* Divider */}
            <div className="h-4 w-px bg-base-300 flex-shrink-0"></div>

            {/* Desktop view - show buttons for both users with fixed positioning */}
            <div className="hidden md:flex items-center gap-1 lg:gap-2 flex-shrink-0">
              {/* History button - Fixed Position */}
              <div className="flex items-center">
                {!isEmbedUser && (
                  <div className="tooltip tooltip-bottom" data-tip="Updates History">
                    <button
                      data-testid="navbar-history-button"
                      id="navbar-history-button"
                      className="p-1 bg-base-300 rounded-md hover:bg-base-200 transition-colors"
                      onClick={toggleConfigHistorySidebar}
                    >
                      <HistoryIcon size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* Publish/Discard Dropdown - Fixed Position */}
              {activeTab == "configure" && (
                <div className="flex items-center">
                  {canRevertDraft ? (
                    <div className="dropdown dropdown-end">
                      <button
                        data-testid="navbar-publish-dropdown-toggle"
                        id="navbar-publish-dropdown-toggle"
                        tabIndex={0}
                        role="button"
                        className={`inline-flex items-center justify-center whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive hover:bg-primary/90 rounded-md gap-1 lg:gap-1.5 px-2 lg:px-3 has-[>svg]:px-2 lg:has-[>svg]:px-2.5 h-8 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-sm shadow-lg shadow-emerald-500/20 transition-all duration-200 font-medium min-w-0 ${isPublishing ? "loading" : ""}`}
                        disabled={isPublishing || isPublished}
                      >
                        <span className="text-white text-sm truncate">
                          {isPublishing ? "Publishing..." : "Publish"}
                        </span>
                        {!isPublishing && <ChevronDown size={12} className="text-white" />}
                      </button>
                      <ul
                        tabIndex={0}
                        className="dropdown-content menu bg-base-100 rounded-box z-very-high w-52 p-2 shadow border border-base-200"
                      >
                        <li>
                          <button
                            data-testid="navbar-publish-button"
                            id="navbar-publish-button"
                            onClick={handlePublish}
                            disabled={!isDrafted || isPublishing || isPublished}
                            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-base-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <BookCheck size={14} className="text-success" />
                            <span>Publish</span>
                          </button>
                        </li>
                        <li>
                          <button
                            data-testid="navbar-revert-button"
                            id="navbar-revert-button"
                            onClick={() => openModal(MODAL_TYPE.DELETE_MODAL)}
                            disabled={isUpdatingBridge || isPublishing || isPublished}
                            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-base-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <RefreshCcw size={14} className="text-error" />
                            <span>Revert</span>
                          </button>
                        </li>
                        {!isEmbedUser && (
                          <li>
                            <button
                              data-testid="navbar-make-public-agent-button"
                              id="navbar-make-public-agent-button"
                              onClick={() => openModal(MODAL_TYPE.MAKE_PUBLIC_AGENT)}
                              disabled={isPublishing || !publishedVersion}
                              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-base-300 disabled:opacity-50 disabled:cursor-not-allowed"
                              title={
                                !publishedVersion
                                  ? "Publish a version first to make it public"
                                  : hasPageConfig
                                    ? "Update public agent configuration"
                                    : "Make this agent public"
                              }
                            >
                              <Settings size={14} className="text-primary" />
                              <span>{hasPageConfig ? "Update Public Agent" : "Make Public Agent"}</span>
                            </button>
                          </li>
                        )}
                      </ul>
                    </div>
                  ) : (
                    <button
                      data-testid="navbar-publish-button"
                      id="navbar-publish-button"
                      onClick={handlePublish}
                      disabled={!isDrafted || isPublishing || isPublished}
                      className={`inline-flex items-center justify-center whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive hover:bg-primary/90 rounded-md gap-1 lg:gap-1.5 px-2 lg:px-3 has-[>svg]:px-2 lg:has-[>svg]:px-2.5 h-8 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-sm shadow-lg shadow-emerald-500/20 transition-all duration-200 font-medium min-w-0 ${isPublishing ? "loading" : ""}`}
                    >
                      {!isPublishing && <BookCheck size={12} className="text-white" />}
                      <span className="text-white text-sm truncate">{isPublishing ? "Publishing..." : "Publish"}</span>
                    </button>
                  )}
                </div>
              )}
              {/* Ellipsis menu - Fixed Position */}
              <div className="flex items-center">{!isEmbedUser && <EllipsisMenu />}</div>
            </div>

            {/* Mobile view - compact buttons removed from header for embed users */}
            <div className="md:hidden flex items-center gap-1 flex-shrink-0">
              {/* Hidden on mobile - moved to bottom navbar */}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Version Dropdown - Below navbar */}
      <div id="navbar-mobile-agent-name-display" className="sm:hidden bg-base-100 border-b border-base-200 px-2 py-2">
        <div className="flex items-center justify-between gap-2">
          {/* Agent Name - Editable */}
          <div className="flex items-center min-w-0 flex-1">
            <div className="flex items-center px-1 py-1 rounded-lg min-w-0 max-w-[120px] cursor-pointer group hover:bg-base-200/50 transition-colors">
              {!isEditingName ? (
                <div
                  data-testid="navbar-mobile-agent-name-display-inner"
                  id="navbar-mobile-agent-name-display-inner"
                  className="flex items-center gap-1.5"
                  onClick={handleNameEdit}
                >
                  <span
                    className="font-semibold text-sm text-base-content truncate flex-shrink"
                    title={`${agentName} - Click to edit`}
                  >
                    {agentName}
                  </span>
                  <Edit2
                    size={10}
                    className="text-base-content/40 group-hover:text-base-content/60 transition-colors flex-shrink-0"
                  />
                </div>
              ) : (
                <input
                  autoComplete="off"
                  data-testid="navbar-mobile-agent-name-input"
                  id="navbar-mobile-agent-name-input"
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onBlur={handleNameSave}
                  onKeyDown={handleNameKeyDown}
                  className="input input-xs text-sm text-base-content w-full"
                  autoFocus
                  maxLength={50}
                />
              )}
            </div>
          </div>

          {/* Published Button and Version Dropdown - Only show on configure tab */}
          {activeTab === "configure" && (
            <>
              {/* Published Button */}
              {publishedVersion && (
                <button
                  data-testid="navbar-mobile-published-button"
                  id="navbar-mobile-published-button"
                  onClick={handlePublishedClick}
                  className={`btn btn-xs flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-all duration-200 whitespace-nowrap ${
                    isPublished
                      ? "bg-green-100 text-green-800 border border-green-300 hover:bg-green-200"
                      : "bg-base-100 text-base-content border border-base-300 hover:bg-green-50 hover:text-green-700 hover:border-green-300"
                  }`}
                  title={isPublished ? "Currently viewing published version" : "Switch to published version"}
                >
                  <span>Pub ({publishedVersionNumber})</span>
                  {isPublished && (
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0" title="Active"></span>
                  )}
                </button>
              )}

              {/* Version Dropdown */}
              <div className="min-w-0">
                {orgId && bridgeId ? (
                  <BridgeVersionDropdown
                    params={{ org_id: orgId, id: bridgeId }}
                    searchParams={searchParams}
                    maxVersions={2}
                    showDropdownOnly={true}
                  />
                ) : (
                  <div className="flex items-center gap-1">
                    <div className="h-6 bg-base-200 animate-pulse rounded w-6"></div>
                    <div className="h-6 bg-base-200 animate-pulse rounded w-6"></div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Ellipsis Menu */}
          {!isEmbedUser && <EllipsisMenu />}
        </div>
      </div>

      {/* Mobile action buttons - for both normal and embed users on configure tab */}
      {isMobile && activeTab === "configure" && (
        <div className=" p-2">
          <div className="flex gap-1 sm:gap-2">
            {!isEmbedUser && (
              <button
                id="navbar-mobile-history-button"
                className="tooltip tooltip-left px-2"
                data-tip="Updates History"
                onClick={toggleConfigHistorySidebar}
              >
                <HistoryIcon size={14} />
              </button>
            )}

            {/* Mobile Publish/Discard Dropdown */}
            {canRevertDraft ? (
              <div className="dropdown dropdown-end flex-1">
                <div
                  id="navbar-mobile-publish-dropdown-toggle"
                  tabIndex={0}
                  role="button"
                  className={`btn btn-xs bg-success gap-1 w-full rounded-full ${isPublishing ? "loading" : ""}`}
                  disabled={isPublishing}
                >
                  {!isPublishing && <BookCheck size={12} className="text-black" />}
                  <span className="text-black text-xs">{isPublishing ? "Publishing..." : "Publish"}</span>
                  {!isPublishing && <ChevronDown size={10} className="text-black" />}
                </div>
                <ul
                  tabIndex={0}
                  className="dropdown-content menu bg-base-100 rounded-box z-very-high w-48 p-2 shadow border border-base-200"
                >
                  <li>
                    <button
                      id="navbar-mobile-publish-button"
                      onClick={handlePublish}
                      disabled={!isDrafted || isPublishing}
                      className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <BookCheck size={14} className="text-green-600" />
                      <span>Publish</span>
                    </button>
                  </li>
                  <li>
                    <button
                      id="navbar-mobile-revert-button"
                      onClick={() => openModal(MODAL_TYPE.DELETE_MODAL)}
                      disabled={isUpdatingBridge || isPublishing}
                      className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ClipboardX size={14} className="text-red-600" />
                      <span>Discard</span>
                    </button>
                  </li>
                </ul>
              </div>
            ) : (
              <button
                id="navbar-mobile-publish-button"
                onClick={handlePublish}
                disabled={!isDrafted || isPublishing}
                className={`btn btn-xs bg-success gap-1 w-full rounded-full ${isPublishing ? "loading" : ""}`}
              >
                {!isPublishing && <BookCheck size={12} className="text-black" />}
                <span className="text-black text-xs">{isPublishing ? "Publishing..." : "Publish"}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Sliders - only for non-embed users */}
      {!isEmbedUser && (
        <>
          <ChatBotSlider />
          <ConfigHistorySlider versionId={versionId} />
        </>
      )}

      <VariableCollectionSlider
        params={{ org_id: orgId, id: bridgeId }}
        versionId={versionId}
        isEmbedUser={isEmbedUser}
      />

      {/* Modals */}
      <DeleteModal
        onConfirm={handleDiscardChanges}
        title="Discard Changes"
        description={`Are you sure you want to discard the changes? This action cannot be undone.`}
        buttonTitle="Discard"
        loading={isDiscardingWithHook}
        isAsync={true}
      />
      <DeleteModal
        modalType={MODAL_TYPE.DELETE_AGENT_MODAL}
        onConfirm={handleDeleteAgentConfirm}
        title="Delete Agent"
        description="Are you sure you want to delete this agent? It will be moved to deleted items and permanently removed after 30 days."
        buttonTitle="Delete"
        loading={isDiscardingWithHook}
        isAsync={true}
      />

      <AccessManagementModal agent={selectedAgentForAccess} />

      <MakePublicAgentModal
        bridgeId={bridgeId}
        agent_name={agentName}
        pageConfig={publicAgentConfig}
        agentSummary={bridgeSummary}
      />

      {/* Portal components from hook */}
      <PortalStyles />
      <PortalDropdown />

      {/* Publish guard — blocks publish when prompt has unsaved changes */}
      <ConfirmationModal
        modalType={MODAL_TYPE.UNSAVED_CHANGES_PUBLISH_MODAL}
        title="Unsaved Prompt Changes"
        message="You have unsaved changes to your prompt. Please save your prompt before publishing."
        confirmText="Got it"
        cancelText="Cancel"
        confirmButtonClass="btn-primary"
        cancelButtonClass=""
        onConfirm={() => {
          closeModal(MODAL_TYPE.UNSAVED_CHANGES_PUBLISH_MODAL);
        }}
        onCancel={() => {
          closeModal(MODAL_TYPE.UNSAVED_CHANGES_PUBLISH_MODAL);
        }}
        onClose={() => {
          closeModal(MODAL_TYPE.UNSAVED_CHANGES_PUBLISH_MODAL);
        }}
      />

      {/* Unsaved prompt changes guard modal */}
      <ConfirmationModal
        modalType={MODAL_TYPE.UNSAVED_CHANGES_NAV_MODAL}
        title="Unsaved Prompt Changes"
        message="You have unsaved changes to your prompt. If you leave now, your changes will be lost."
        confirmText="Leave without saving"
        cancelText="Stay"
        confirmButtonClass="btn-error text-white"
        onConfirm={() => {
          closeModal(MODAL_TYPE.UNSAVED_CHANGES_NAV_MODAL);
          if (pendingNavRef.current) {
            pendingNavRef.current();
            pendingNavRef.current = null;
          }
        }}
        onCancel={() => {
          closeModal(MODAL_TYPE.UNSAVED_CHANGES_NAV_MODAL);
          pendingNavRef.current = null;
        }}
        onClose={() => {
          closeModal(MODAL_TYPE.UNSAVED_CHANGES_NAV_MODAL);
          pendingNavRef.current = null;
        }}
      />
    </div>
  );
};

const MemoNavbar = React.memo(Navbar);

export default Protected(MemoNavbar);
