'use client'
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { TestTube, MessageCircleMore, Pause, Play, ClipboardX, BookCheck, MoreVertical, Clock, Home, HistoryIcon, ArchiveRestore, Edit2, BotIcon, ChevronDown, RefreshCcw } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { useCustomSelector } from '@/customHooks/customSelector';
import { updateBridgeAction, dicardBridgeVersionAction, archiveBridgeAction } from '@/store/action/bridgeAction';
import { updateBridgeVersionReducer } from '@/store/reducer/bridgeReducer';
import { MODAL_TYPE } from '@/utils/enums';
import { openModal, toggleSidebar, sendDataToParent } from '@/utils/utility';
import { toast } from 'react-toastify';
const ChatBotSlider = dynamic(() => import('./sliders/ChatBotSlider'), { ssr: false });
const ConfigHistorySlider = dynamic(() => import('./sliders/ConfigHistorySlider'), { ssr: false });
import Protected from './Protected';
const DeleteModal = dynamic(() => import('./UI/DeleteModal'), { ssr: false });
import useDeleteOperation from '@/customHooks/useDeleteOperation';
import BridgeVersionDropdown from './configuration/configurationComponent/BridgeVersionDropdown';
const VariableCollectionSlider = dynamic(() => import('./sliders/VariableCollectionSlider'), { ssr: false });

const BRIDGE_STATUS = {
  ACTIVE: 1,
  PAUSED: 0
};

const Navbar = ({ isEmbedUser, params }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showEllipsisMenu, setShowEllipsisMenu] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const { isDeleting: isDiscardingWithHook, executeDelete } = useDeleteOperation();
  const ellipsisMenuRef = useRef(null);

  const router = useRouter();
  const pathname = usePathname();
  const pathParts = pathname.split('?')[0].split('/');
  const orgId = params?.org_id || pathParts[2];
  const bridgeId = params?.id || pathParts[5];
  const dispatch = useDispatch();
  const searchParams = useSearchParams();
  const versionId = useMemo(() => searchParams?.get("version"), [searchParams]);
  const isPublished = useMemo(() => searchParams?.get("isPublished") === "true", [searchParams]);
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
    hideHomeButton,
    showHistory,
    bridgeName,
    savingStatus,
    publishedVersionId,
    showAgentName,
  } = useCustomSelector((state) => {
    return {
      bridgeData: state?.bridgeReducer?.org?.[orgId]?.orgs?.find((bridge) => bridge._id === bridgeId) || {},
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
      hideHomeButton: state.appInfoReducer?.embedUserDetails?.hideHomeButton || false,
      showHistory: state.appInfoReducer?.embedUserDetails?.showHistory,
      bridgeName: state?.bridgeReducer?.allBridgesMap?.[bridgeId]?.name || "",
      publishedVersionId: state?.bridgeReducer?.allBridgesMap?.[bridgeId]?.published_version_id || null,
      savingStatus: state?.bridgeReducer?.savingStatus || { status: null, timestamp: null },
      showAgentName: state?.appInfoReducer?.embedUserDetails?.showAgentName,
    };
  });
  // Define tabs based on user type
  const TABS = useMemo(() => {
    const baseTabs = [
      {
        id: 'configure',
        label: `${bridgeData.bridgeType === 'api' ? 'Agent' : 'Chatbot'} Config`,
        icon: BotIcon,
        shortLabel: `${bridgeData.bridgeType === 'api' ? 'Agent' : 'Chatbot'} Config`
      },
      { id: 'history', label: 'History', icon: MessageCircleMore, shortLabel: 'History' }
    ];
    if (!isEmbedUser) {
      baseTabs.splice(1, 0, { id: 'testcase', label: 'Test Cases', icon: TestTube, shortLabel: 'Tests' });
    }
    return baseTabs;
  }, [isEmbedUser, bridgeType]);

  const agentName = useMemo(() => bridgeName || bridgeData?.name || 'Agent not Found', [bridgeName, bridgeData?.name]);

  // Calculate active tab index for tab switcher animation
  const activeTabIndex = useMemo(() => {
    return TABS.findIndex(tab => tab.id === activeTab);
  }, [TABS, activeTab]);

  const TAB_WIDTH = useMemo(() => {
    return isMobile ? 90 : 120; // px
  }, [isMobile]);

  const shouldShowNavbar = useCallback(() => {
    const depth = pathParts.length;
    if (depth === 3) return false;
    return ['configure', 'history', 'testcase'].some(seg => pathname.includes(seg));
  }, [pathParts.length, pathname]);

  // Close ellipsis menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ellipsisMenuRef?.current && !ellipsisMenuRef?.current.contains(event.target)) {
        setShowEllipsisMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Responsive detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
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
      dispatch(updateBridgeAction({
        bridgeId: bridgeId,
        dataToSend: { name: trimmed },
      }));
      isEmbedUser && sendDataToParent("updated", {
        name: trimmed,
        agent_id: bridgeId
      }, "Agent Name Updated");
    }
    setIsEditingName(false);
  }, [editedName, agentName, dispatch, bridgeId, isEmbedUser]);

  const handleNameCancel = useCallback(() => {
    setIsEditingName(false);
    setEditedName(agentName);
  }, [agentName]);

  const handleNameKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleNameSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleNameCancel();
    }
  }, [handleNameSave, handleNameCancel]);

  const handlePauseBridge = useCallback(async () => {
    const newStatus = bridgeStatus === BRIDGE_STATUS.PAUSED
      ? BRIDGE_STATUS.ACTIVE
      : BRIDGE_STATUS.PAUSED;

    try {
      await dispatch(updateBridgeAction({
        bridgeId,
        dataToSend: { bridge_status: newStatus }
      }));
      toast.success(`Agent ${newStatus === BRIDGE_STATUS.ACTIVE ? 'resumed' : 'paused'} successfully`);
      setShowEllipsisMenu(false); // Close menu after action
    } catch (err) {
      console.error(err);
      toast.error('Failed to update agent status');
    }
  }, [dispatch, bridgeId, bridgeStatus]);

  const handleDiscardChanges = useCallback(async () => {
    await executeDelete(async () => {
      dispatch(updateBridgeVersionReducer({
        bridges: { ...bridge, _id: versionId, parent_id: bridgeId, is_drafted: false }
      }));
      await dispatch(dicardBridgeVersionAction({ bridgeId, versionId }));
      toast.success('Changes discarded successfully');
    });
  }, [executeDelete, dispatch, bridge, searchParams, bridgeId]);

  const handlePublish = useCallback(async () => {
    if (!isDrafted) {
      toast.info('Nothing to publish');
      return;
    }
    try {
      openModal(MODAL_TYPE?.PUBLISH_BRIDGE_VERSION)
    } catch (err) {
      console.error(err);
      toast.error('Failed to publish version');
    }
  }, [isDrafted]);

  const handleTabChange = useCallback((tabId) => {
    const base = `/org/${orgId}/agents/${tabId}/${bridgeId}`;
    
    // Get bridge type from Redux and determine correct type parameter
    let typeValue;
    if (bridgeType && bridgeType.toLowerCase() === 'chatbot') {
      typeValue = 'chatbot';
    } else {
      // For 'api', 'batch', or any other type, default to 'api'
      typeValue = 'api';
    }
    const typeQueryPart = `&type=${typeValue}`;
    
    // If currently in published mode and navigating to testcase or history
    if (isPublished && (tabId === 'testcase' || tabId === 'history')) {
      // Use published version ID and remove isPublished parameter
      router.push(base + (publishedVersion ? `?version=${publishedVersion}${typeQueryPart}` : `?type=${typeValue}`));
    } else {
      // Normal navigation with current version
      router.push(base + (versionId ? `?version=${versionId}${typeQueryPart}` : `?type=${typeValue}`));
    }
  }, [router, orgId, bridgeId, versionId, isPublished, publishedVersion, bridgeType]);

  const handlePublishedClick = useCallback(() => {
    if (!publishedVersion) {
      toast.error('No published version available');
      return;
    }
    
    const currentUrl = new URL(window.location);
    // Don't push versionId when isPublished=true, just set isPublished flag
    currentUrl.searchParams.delete('version'); // Remove version parameter
    currentUrl.searchParams.set('isPublished', 'true');
    
    // Ensure the type parameter is set based on the bridge type from Redux
    let typeValue;
    if (bridgeType && bridgeType.toLowerCase() === 'chatbot') {
      typeValue = 'chatbot';
    } else {
      // For 'api', 'batch', or any other type, default to 'api'
      typeValue = 'api';
    }
    currentUrl.searchParams.set('type', typeValue);
    
    router.push(currentUrl.pathname + currentUrl.search);
  }, [router, publishedVersion, bridgeType]);

  const toggleConfigHistorySidebar = useCallback(() => toggleSidebar("default-config-history-slider", "right"), []);
  const handleHomeClick = useCallback(() => router.push(`/org/${orgId}/agents`), [router, orgId]);

  // Keyboard shortcuts for navigation
  useEffect(() => {
    let gPressed = false;
    let timeoutId = null;

    const handleKeyDown = (e) => {
      const target = e.target;
      const isInputField = target.tagName === 'INPUT' || 
                          target.tagName === 'TEXTAREA' || 
                          target.isContentEditable;
      
      if (isInputField) return;

      if (e.key === 'g' || e.key === 'G') {
        gPressed = true;
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          gPressed = false;
        }, 1000);
      } else if (gPressed) {
        if (e.key === 'c' || e.key === 'C') {
          e.preventDefault();
          handleTabChange('configure');
          gPressed = false;
          if (timeoutId) clearTimeout(timeoutId);
        } else if (e.key === 't' || e.key === 'T') {
          e.preventDefault();
          if (!isEmbedUser) {
            handleTabChange('testcase');
          }
          gPressed = false;
          if (timeoutId) clearTimeout(timeoutId);
        } else if (e.key === 'h' || e.key === 'H') {
          e.preventDefault();
          handleTabChange('history');
          gPressed = false;
          if (timeoutId) clearTimeout(timeoutId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [handleTabChange, isEmbedUser]);

  const StatusIndicator = ({ status }) => (
    status === BRIDGE_STATUS.ACTIVE ? null : (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-sm font-medium bg-warning/10 text-warning border border-warning/20">
        <Clock size={12} />
        <span className="hidden sm:inline">Paused</span>
      </div>
    )
  );

  const handleArchiveBridge = async (bridgeId, newStatus = 0) => {
    try {
      const bridgeStatus = await dispatch(archiveBridgeAction(bridgeId, newStatus));
      if (bridgeStatus === 1) {
        toast.success('Agent Unarchived Successfully');
      } else {
        toast.success('Agent Archived Successfully');
      }
    } catch (error) {
      console.error('Failed to archive/unarchive agents', error);
    }
  }

  // Ellipsis Menu Component
  const EllipsisMenu = () => (
    <div className="relative" ref={ellipsisMenuRef}>
      <button
        onClick={() => setShowEllipsisMenu(!showEllipsisMenu)}
        className="p-2 hover:bg-base-200 rounded-md transition-colors"
        title="More options"
      >
        <MoreVertical size={16} />
      </button>

      {showEllipsisMenu && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-base-100 border border-base-300 rounded-lg shadow-xl z-very-high">
          <div className="">
            <button
              onMouseDown={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                await handlePauseBridge();
                setShowEllipsisMenu(false);
              }}
              disabled={isUpdatingBridge}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-base-200 flex items-center gap-2 cursor-pointer ${isUpdatingBridge ? 'opacity-50 cursor-not-allowed' : ''
                }`}
            >
              {bridgeStatus === BRIDGE_STATUS.PAUSED ? (
                <>
                  <Play size={14} className="text-green-600" />
                  Resume Agent
                </>
              ) : (
                <>
                  <Pause size={14} className="text-red-600" />
                  Pause Agent
                </>
              )}
            </button>
          </div>
          <div className="">
            <button
              onMouseDown={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                await handleArchiveBridge(bridgeId, isArchived ? 0 : 1);
                setShowEllipsisMenu(false);
              }}
              disabled={isUpdatingBridge}
              className={`w-full px-4 text-left text-sm hover:bg-base-200 flex items-center gap-1 cursor-pointer ${isUpdatingBridge ? 'opacity-50 cursor-not-allowed' : ''
                } ${isArchived ? 'hidden' : ''}`}
            >
              {!isArchived ?
                <>
                  <ArchiveRestore size={14} className="text-red-600" />
                  Unarchive Agent
                </>
              : null}
            </button>
          </div>
        </div>
      )}
    </div>
  );
  if (!shouldShowNavbar()) return null;

  return (
    <div className="bg-base-100 z-medium">
      {/* Main navigation header */}
      <div className={`sticky top-0 z-high transition-all duration-300 ${isScrolled
        ? 'bg-base-100/95 backdrop-blur-sm shadow-md border-b border-base-300'
        : 'bg-base-100 border-b border-base-200 '
        }`}>

        {/* Top bar with breadcrumb/home and actions */}
        <div className="flex w-full items-center justify-between px-2 sm:px-4 lg:px-6 h-10 min-w-0">
          {/* Left: Agent Name and Versions */}
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-5 min-w-0 flex-1">
            {(isEmbedUser && !hideHomeButton) &&
              <button
                onClick={handleHomeClick}
                className="btn btn-xs sm:btn-sm gap-1 sm:gap-2 hover:bg-base-200 px-2 sm:px-3"
                title="Go to Home"
              >
                <Home size={14} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline text-sm sm:text-sm">Home</span>
              </button>
            }
            
            {/* Simple Agent Name Display */}
            <div className="hidden sm:flex items-center ml-1 sm:ml-2 lg:ml-0 min-w-0 flex-1">
              {((showAgentName && isEmbedUser) || !isEmbedUser) && (
                <div className="flex items-center px-1 sm:px-2 py-1 sm:py-2 rounded-lg min-w-0 max-w-[120px] sm:max-w-fit cursor-pointer group hover:bg-base-200/50 transition-colors">
                  {!isEditingName ? (
                    <div className="flex items-center gap-1.5" onClick={handleNameEdit}>
                      <span
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
              {activeTab === 'configure' && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Published Button */}
                  {publishedVersion && (
                    <button
                      onClick={handlePublishedClick}
                      className={`btn btn-xs flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-all duration-200 whitespace-nowrap min-w-fit ${
                        isPublished
                          ? 'bg-green-100 text-green-800 border border-green-300 hover:bg-green-200'
                          : 'bg-base-100 text-base-content border border-base-300 hover:bg-green-50 hover:text-green-700 hover:border-green-300'
                      }`}
                      title={isPublished ? 'Currently viewing published version' : 'Switch to published version'}
                    >
                      <span className="hidden sm:inline">Published</span>
                      <span className="sm:hidden">Pub</span>
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
              {savingStatus?.status && (
                <div className="flex-shrink-0 ml-2 mr-2">
                  <div className="px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 text-base-content">
                    {savingStatus.status === 'saving' && (
                      <>
                        <div className="loading loading-spinner loading-xs"></div>
                        <span>Saving</span>
                      </>
                    )}
                    {savingStatus.status === 'saved' && (
                      <>
                        <BookCheck size={14} />
                        <span>Saved</span>
                      </>
                    )}
                    {savingStatus.status === 'failed' && (
                      <>
                        <ClipboardX size={14} />
                        <span>Failed</span>
                      </>
                    )}
                    {savingStatus.status === 'warning' && (
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
                <div className="relative flex items-center gap-1"
                  style={{ width: `${TAB_WIDTH * TABS.length}px` }}>
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
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={`relative z-10 h-8 flex items-center justify-center gap-2 text-sm font-medium transition-colors
                ${isActive
                            ? 'text-primary-content'
                            : 'text-base-content/70 hover:text-base-content'
                          }`}
                        style={{ width: `${TAB_WIDTH}px` }} // 🔒 lock tab width
                      >
                        <tab.icon
                          size={14}
                          className={`w-3.5 h-3.5 transition-opacity ${isActive ? 'opacity-100' : 'opacity-60'
                            }`}
                        />
                        <span className="truncate text-xs">
                          {isMobile ? tab.shortLabel : tab.label}
                        </span>
                      </button>
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
                      className="p-1 bg-base-300 rounded-md hover:bg-base-200 transition-colors"
                      onClick={toggleConfigHistorySidebar}
                    >
                      <HistoryIcon size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* Publish/Discard Dropdown - Fixed Position */}
              {activeTab == 'configure' && (
                <div className="flex items-center">
                  <div className="dropdown dropdown-end">
                    <button
                      tabIndex={0}
                      role="button"
                      className={`inline-flex items-center justify-center whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive hover:bg-primary/90 rounded-md gap-1 lg:gap-1.5 px-2 lg:px-3 has-[>svg]:px-2 lg:has-[>svg]:px-2.5 h-8 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-sm shadow-lg shadow-emerald-500/20 transition-all duration-200 font-medium min-w-0 ${isPublishing ? 'loading' : ''}`}
                      disabled={isPublishing || isPublished}
                    >
                      <span className="text-white text-sm truncate">{isPublishing ? 'Publishing...' : 'Publish'}</span>
                      {!isPublishing && <ChevronDown size={12} className="text-white" />}
                    </button>
                    <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-very-high w-52 p-2 shadow border border-base-200">
                      <li>
                        <button
                          onClick={handlePublish}
                          disabled={!isDrafted || isPublishing || isPublished}
                          className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-base-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <BookCheck size={14} className="text-success" />
                          <span>Publish</span>
                        </button>
                      </li>
                      {isDrafted && publishedVersionId != null && (
                        <li>
                          <button
                            onClick={() => openModal(MODAL_TYPE.DELETE_MODAL)}
                            disabled={isUpdatingBridge || isPublishing || isPublished}
                            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-base-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <RefreshCcw size={14} className="text-error" />
                            <span>Revert</span>
                          </button>
                        </li>
                      )}
                    </ul>
                  </div>

                </div>
              )}
              {/* Ellipsis menu - Fixed Position */}
              <div className="flex items-center">
                {!isEmbedUser && (
                  <EllipsisMenu />
                )}
              </div>
            </div>

            {/* Mobile view - compact buttons removed from header for embed users */}
            <div className="md:hidden flex items-center gap-1 flex-shrink-0">
              {/* Hidden on mobile - moved to bottom navbar */}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Version Dropdown - Below navbar */}
      <div className="sm:hidden bg-base-100 border-b border-base-200 px-2 py-2">
        <div className="flex items-center justify-between gap-2">
          {/* Agent Name - Editable */}
          <div className="flex items-center min-w-0 flex-1">
            <div className="flex items-center px-1 py-1 rounded-lg min-w-0 max-w-[120px] cursor-pointer group hover:bg-base-200/50 transition-colors">
              {!isEditingName ? (
                <div className="flex items-center gap-1.5" onClick={handleNameEdit}>
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
          {activeTab === 'configure' && (
            <>
              {/* Published Button */}
              {publishedVersion && (
                <button
                  onClick={handlePublishedClick}
                  className={`btn btn-xs flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-all duration-200 whitespace-nowrap ${
                    isPublished
                      ? 'bg-green-100 text-green-800 border border-green-300 hover:bg-green-200'
                      : 'bg-base-100 text-base-content border border-base-300 hover:bg-green-50 hover:text-green-700 hover:border-green-300'
                  }`}
                  title={isPublished ? 'Currently viewing published version' : 'Switch to published version'}
                >
                  <span>Pub</span>
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
      {isMobile && activeTab === 'configure' && (
        <div className=" p-2">
          <div className="flex gap-1 sm:gap-2">
            {!isEmbedUser && <button className="tooltip tooltip-left px-2" data-tip="Updates History" onClick={toggleConfigHistorySidebar}>
              <HistoryIcon size={14} />
            </button>}

            {/* Mobile Publish/Discard Dropdown */}
            <div className="dropdown dropdown-end flex-1">
              <div 
                tabIndex={0} 
                role="button" 
                className={`btn btn-xs bg-success gap-1 w-full rounded-full ${isPublishing ? 'loading' : ''}`}
                disabled={isPublishing}
              >
                {!isPublishing && <BookCheck size={12} className="text-black" />}
                <span className="text-black text-xs">{isPublishing ? 'Publishing...' : 'Publish'}</span>
                {!isPublishing && <ChevronDown size={10} className="text-black" />}
              </div>
              <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-very-high w-48 p-2 shadow border border-base-200">
                <li>
                  <button
                    onClick={handlePublish}
                    disabled={!isDrafted || isPublishing}
                    className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <BookCheck size={14} className="text-green-600" />
                    <span>Publish</span>
                  </button>
                </li>
                {isDrafted && (
                  <li>
                    <button
                      onClick={() => openModal(MODAL_TYPE.DELETE_MODAL)}
                      disabled={isUpdatingBridge || isPublishing}
                      className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ClipboardX size={14} className="text-red-600" />
                      <span>Discard</span>
                    </button>
                  </li>
                )}
              </ul>
            </div>

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
      <DeleteModal onConfirm={handleDiscardChanges} title="Discard Changes" description={`Are you sure you want to discard the changes? This action cannot be undone.`} buttonTitle="Discard" loading={isDiscardingWithHook} isAsync={true} />
    </div>
  );
};

const MemoNavbar = React.memo(Navbar);

export default Protected(MemoNavbar);
