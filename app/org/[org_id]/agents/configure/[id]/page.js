"use client";

import dynamic from "next/dynamic";
import Protected from "@/components/Protected";
import { useConfigurationSelector } from "@/customHooks/useOptimizedSelector";
import { useCustomSelector } from "@/customHooks/customSelector";
import { getAllBridgesAction, getSingleBridgesAction, updateBridgeVersionAction } from "@/store/action/bridgeAction";
import { useEffect, useRef, useState, use, useCallback, useMemo } from "react";
import { useDispatch } from "react-redux";
import { setIsFocusReducer, setThreadIdForVersionReducer } from "@/store/reducer/bridgeReducer";
import { updateTitle, generateRandomID, extractPromptVariables } from "@/utils/utility";
import { useRouter } from "next/navigation";
import Chatbot from "@/components/configuration/Chatbot";
import AgentSetupGuide from "@/components/AgentSetupGuide";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { RefreshIcon } from "@/components/Icons";
import { CircleAlert } from "lucide-react";
const ConfigurationPage = dynamic(() => import("@/components/configuration/ConfigurationPage"));
const Chat = dynamic(() => import("@/components/configuration/Chat"), { loading: () => null });
const WebhookForm = dynamic(() => import("@/components/BatchApi"), { ssr: false });
const PromptHelper = dynamic(() => import("@/components/PromptHelper"), { ssr: false });
const NotesPanel = dynamic(() => import("@/components/NotesPanel"), { ssr: false });
const ConfigurationSkeleton = dynamic(() => import("@/components/skeletons/ConfigurationSkeleton"), { ssr: false });

export const runtime = "edge";

// Bundle Components for collapsed panels (5px min width)
const ConfigBundle = ({ onClick }) => {
  return (
    <div
      id="config-bundle-panel"
      className=" w-full h-full border-r-2 border-primary flex items-center justify-center hover:bg-primary/30 transition-colors duration-200 cursor-pointer"
      title="Expand Configuration Panel"
      style={{ minWidth: "15px" }}
      onClick={onClick}
    >
      <div
        id="config-bundle-label"
        className="font-bold text-xs whitespace-nowrap select-none"
        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
      >
        Config
      </div>
    </div>
  );
};

const ChatBundle = ({ onClick }) => {
  return (
    <div
      id="chat-bundle-panel"
      className="w-full h-full flex items-center justify-center hover:bg-primary/30 transition-colors duration-200 cursor-pointer"
      title="Expand Chat Panel"
      style={{ minWidth: "20px" }}
      onClick={onClick}
    >
      <div
        id="chat-bundle-label"
        className=" font-bold text-xs whitespace-nowrap select-none"
        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
      >
        Chat
      </div>
    </div>
  );
};

const PromptHelperBundle = ({ onClick }) => {
  return (
    <div
      id="prompt-helper-bundle-panel"
      className="w-full h-full flex items-center justify-center hover:bg-primary/30 transition-colors duration-200 cursor-pointer"
      title="Expand Prompt Helper Panel"
      style={{ minWidth: "20px" }}
      onClick={onClick}
    >
      <div
        id="prompt-helper-bundle-label"
        className="font-bold text-xs whitespace-nowrap select-none"
        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
      >
        Helper
      </div>
    </div>
  );
};

const NotesBundle = ({ onClick }) => {
  return (
    <div
      id="notes-bundle-panel"
      className="w-full h-full flex items-center justify-center hover:bg-primary/30 transition-colors duration-200 cursor-pointer"
      title="Expand Notes Panel"
      style={{ minWidth: "20px" }}
      onClick={onClick}
    >
      <div
        id="notes-bundle-label"
        className="font-bold text-xs whitespace-nowrap select-none"
        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
      >
        Notes
      </div>
    </div>
  );
};

const Page = ({ params, searchParams, isEmbedUser }) => {
  const resolvedParams = use(params);
  const resolvedSearchParams = use(searchParams);
  const promptTextAreaRef = useRef(null);
  const router = useRouter();
  const mountRef = useRef(false);
  const dispatch = useDispatch();

  // Panel refs for programmatic resizing
  const configPanelRef = useRef(null);
  const chatPanelRef = useRef(null);
  const promptHelperPanelRef = useRef(null);
  const notesPanelRef = useRef(null);

  // Add this new ref
  const isManualResizeRef = useRef(false);
  // Simplified UI state for react-resizable-panels with collapse states
  const [uiState, setUiState] = useState(() => ({
    isDesktop: typeof window !== "undefined" ? window.innerWidth >= 710 : false,
    isPromptHelperOpen: false,
    showNotes: true,
    showPromptHelper: true,
    // Panel collapse states
    isConfigCollapsed: false,
    isChatCollapsed: false,
    isPromptHelperCollapsed: false,
    isNotesCollapsed: false,
  }));

  const [isGuideVisible, setIsGuideVisible] = useState(false);

  // Ref for the main container to calculate percentage-based width
  const containerRef = useRef(null);

  // Optimized selector with better memoization
  const { bridgeType, versionService, bridgeName, isFocus, reduxPrompt, bridge, isLoading, hasError, hasData } =
    useConfigurationSelector(resolvedParams, resolvedSearchParams);

  // Separate selector for allbridges to prevent unnecessary re-renders
  const allbridges = useCustomSelector(
    useCallback((state) => state?.bridgeReducer?.org?.[resolvedParams?.org_id]?.orgs || [], [resolvedParams?.org_id])
  );

  // Consolidated prompt state - reduced from 8 individual states
  const [promptState, setPromptState] = useState(() => ({
    prompt: "",
    thread_id: bridge?.thread_id || generateRandomID(),
    messages: [],
    hasUnsavedChanges: false,
    newContent: "",
  }));

  // Memoized mobile view detection
  const isMobileView = useMemo(
    () => (typeof window !== "undefined" ? window.innerWidth < 710 : false),
    [uiState.isDesktop]
  );

  // Panel size configurations
  const panelSizes = useMemo(() => {
    if (!uiState.isPromptHelperOpen || !isFocus) {
      // Two panel mode: Config + Chat
      return { config: 50, chat: 50 };
    } else {
      // Three panel mode: Config + PromptHelper + Notes
      return { config: 33.33, promptHelper: 33.33, notes: 33.33 };
    }
  }, [uiState.isPromptHelperOpen, isFocus]);

  // Optimized UI state updates with throttling for smooth resizing
  const updateUiState = useCallback((updates) => {
    setUiState((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleExpandChat = useCallback(() => {
    if (chatPanelRef.current) {
      chatPanelRef.current.resize(panelSizes.chat);
    }
  }, [panelSizes.chat]);

  const handleExpandConfig = useCallback(() => {
    // Check if we're in two-panel or three-panel mode
    const isThreePanelMode = uiState.isPromptHelperOpen && isFocus;

    if (isThreePanelMode) {
      // THREE-PANEL MODE (33-33-33)
      const openPanelsCount = [
        !uiState.isConfigCollapsed,
        !uiState.isPromptHelperCollapsed,
        !uiState.isNotesCollapsed,
      ].filter(Boolean).length;

      if (openPanelsCount === 2) {
        // 2 panels open → make all 3 equal
        configPanelRef.current?.resize(33.33);
        promptHelperPanelRef.current?.resize(33.33);
        notesPanelRef.current?.resize(33.33);
      } else if (openPanelsCount === 1) {
        // Only 1 panel open
        if (!uiState.isPromptHelperCollapsed) {
          // PromptHelper is open → Config takes from PromptHelper
          configPanelRef.current?.resize(50);
          promptHelperPanelRef.current?.resize(50);
        } else if (!uiState.isNotesCollapsed) {
          // Notes is open → Config takes from Notes
          configPanelRef.current?.resize(50);
          notesPanelRef.current?.resize(50);
        }
      }
    } else {
      // TWO-PANEL MODE (50-50) - Config + Chat
      configPanelRef.current?.resize(50);
      chatPanelRef.current?.resize(50);
    }

    updateUiState({ isConfigCollapsed: false });
  }, [
    uiState.isConfigCollapsed,
    uiState.isPromptHelperCollapsed,
    uiState.isNotesCollapsed,
    uiState.isPromptHelperOpen,
    isFocus,
    updateUiState,
  ]);
  const handleExpandPromptHelper = useCallback(() => {
    const openPanelsCount = [
      !uiState.isConfigCollapsed,
      !uiState.isPromptHelperCollapsed,
      !uiState.isNotesCollapsed,
    ].filter(Boolean).length;

    if (openPanelsCount === 2) {
      // 2 panels open → make all 3 equal
      configPanelRef.current?.resize(33.33);
      promptHelperPanelRef.current?.resize(33.33);
      notesPanelRef.current?.resize(33.33);
    } else if (openPanelsCount === 1) {
      // Only 1 panel open
      if (!uiState.isConfigCollapsed) {
        // Config is open → PromptHelper takes from Config
        configPanelRef.current?.resize(50);
        promptHelperPanelRef.current?.resize(50);
      } else if (!uiState.isNotesCollapsed) {
        // Notes is open → PromptHelper takes from Notes
        promptHelperPanelRef.current?.resize(50);
        notesPanelRef.current?.resize(50);
      }
    }

    updateUiState({ isPromptHelperCollapsed: false });
  }, [uiState.isConfigCollapsed, uiState.isPromptHelperCollapsed, uiState.isNotesCollapsed, updateUiState]);

  const handleExpandNotes = useCallback(() => {
    const openPanelsCount = [
      !uiState.isConfigCollapsed,
      !uiState.isPromptHelperCollapsed,
      !uiState.isNotesCollapsed,
    ].filter(Boolean).length;

    if (openPanelsCount === 2) {
      // 2 panels open → make all 3 equal
      configPanelRef.current?.resize(33.33);
      promptHelperPanelRef.current?.resize(33.33);
      notesPanelRef.current?.resize(33.33);
    } else if (openPanelsCount === 1) {
      // Only 1 panel open
      if (!uiState.isPromptHelperCollapsed) {
        // PromptHelper is open → Notes takes from PromptHelper
        promptHelperPanelRef.current?.resize(50);
        notesPanelRef.current?.resize(50);
      } else if (!uiState.isConfigCollapsed) {
        // Config is open, PromptHelper is closed → Notes takes from Config
        // Set flag to prevent PromptHelper state update
        isManualResizeRef.current = true;

        promptHelperPanelRef.current?.resize(5);
        configPanelRef.current?.resize(50); // Changed from 50 to 45
        notesPanelRef.current?.resize(50); // Changed from 45 to 50

        // Reset flag after a short delay
        setTimeout(() => {
          isManualResizeRef.current = false;
        }, 100);
      }
    }

    updateUiState({ isNotesCollapsed: false });
  }, [uiState.isConfigCollapsed, uiState.isPromptHelperCollapsed, uiState.isNotesCollapsed, updateUiState]);
  const leftPanelScrollRef = useRef(null);
  const handleCloseTextAreaFocus = useCallback(() => {
    if (typeof window.closeTechDoc === "function") {
      window.closeTechDoc();
    }
    updateUiState({ isPromptHelperOpen: false });
    // Remove focus from textarea when PromptHelper closes
    if (promptTextAreaRef.current) {
      const textarea = promptTextAreaRef.current.querySelector("textarea");
      if (textarea) {
        textarea.blur();
      }
    }
  }, [updateUiState]);

  // Determine where the Close Helper button should appear
  const closeHelperButtonLocation = useMemo(() => {
    if (!uiState.isPromptHelperOpen) return null;

    if (!uiState.isConfigCollapsed) {
      return "config"; // Show in Config panel (PromptHeader)
    } else if (!uiState.isPromptHelperCollapsed) {
      return "promptHelper"; // Show in PromptHelper panel
    } else {
      return "notes"; // Show in Notes panel
    }
  }, [uiState.isConfigCollapsed, uiState.isPromptHelperCollapsed, uiState.isPromptHelperOpen]);

  const [isAgentFlowView, setIsAgentFlowView] = useState(() => resolvedSearchParams?.view === "agent-flow");
  useEffect(() => {
    setIsAgentFlowView(resolvedSearchParams?.view === "agent-flow");
  }, [resolvedSearchParams?.view]);

  const handleViewChange = useCallback((isFlowView) => {
    setIsAgentFlowView(isFlowView);
  }, []);
  const savePrompt = useCallback(
    (newPrompt) => {
      const newValue = (newPrompt || "").trim();
      const promptVariables = extractPromptVariables(newValue);
      const variablesState = {};

      promptVariables.forEach((varName) => {
        variablesState[varName] = {
          status: "required",
          default_value: "",
        };
      });

      if (newValue !== reduxPrompt.trim()) {
        dispatch(
          updateBridgeVersionAction({
            versionId: resolvedSearchParams?.version,
            dataToSend: {
              configuration: {
                prompt: newValue,
              },
              variables_state: variablesState,
            },
          })
        );
      }
    },
    [dispatch, resolvedSearchParams?.version, reduxPrompt]
  );

  const scrollToTextarea = () => {
    if (leftPanelScrollRef.current && promptTextAreaRef.current) {
      const textareaContainer = promptTextAreaRef.current;
      const scrollContainer = leftPanelScrollRef.current;

      // Check if elements exist and are in the DOM
      if (!scrollContainer.contains(textareaContainer)) {
        return;
      }

      // Use scrollIntoView for smooth scrolling to the textarea
      textareaContainer.scrollIntoView({
        behavior: "smooth",
        block: "start",
        inline: "nearest",
      });
    }
  };
  useEffect(() => {
    if (!uiState.isDesktop) {
      updateUiState({ isPromptHelperOpen: false });
    }
  }, [uiState.isDesktop, updateUiState]);
  useEffect(() => {
    const scrollContainer = leftPanelScrollRef.current;
    if (uiState.isPromptHelperOpen) {
      const timeoutId = setTimeout(() => {
        scrollToTextarea();
      }, 200);
      if (scrollContainer) {
        scrollContainer.style.overflow = "hidden";
      }
      return () => clearTimeout(timeoutId);
    } else {
      if (scrollContainer) {
        scrollContainer.style.overflowY = "auto";
        scrollContainer.style.overflowX = "hidden";
      }
    }
  }, [uiState.isPromptHelperOpen]);
  // PromptHelper effects
  useEffect(() => {
    dispatch(setIsFocusReducer(uiState.isPromptHelperOpen));
  }, [uiState.isPromptHelperOpen, dispatch]);

  // Ensure thread_id exists in Redux for this bridge/version on mount
  useEffect(() => {
    if (setThreadIdForVersionReducer && resolvedParams?.id && resolvedSearchParams?.version) {
      dispatch(
        setThreadIdForVersionReducer({
          bridgeId: resolvedParams.id,
          versionId: resolvedSearchParams.version,
          thread_id: promptState.thread_id,
        })
      );
    }
  }, [dispatch, resolvedParams?.id, resolvedSearchParams?.version, promptState.thread_id]);

  // Update prompt state when reduxPrompt changes
  useEffect(() => {
    setPromptState((prev) => ({ ...prev, prompt: reduxPrompt }));
  }, [reduxPrompt]);

  // Enhanced responsive detection with throttling
  useEffect(() => {
    let timeoutId;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const desktop = window.innerWidth >= 710;
        updateUiState({ isDesktop: desktop });
      }, 100); // Throttle resize events
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timeoutId);
    };
  }, [updateUiState]);

  useEffect(() => {
    if (bridgeName) {
      updateTitle(`GTWY Ai | ${bridgeName}`);
    }
  }, [bridgeName]);

  // Data fetching and other effects...
  useEffect(() => {
    (async () => {
      let bridges = allbridges;
      if (!Array.isArray(bridges) || bridges.length === 0) {
        await dispatch(
          getAllBridgesAction((data) => {
            // Normalize data from callback to an array
            if (Array.isArray(data)) {
              bridges = data;
            } else if (Array.isArray(data?.orgs)) {
              bridges = data.orgs;
            } else {
              bridges = [];
            }
          })
        );
      }
      const agentBridge = Array.isArray(bridges) ? bridges.find((bridge) => bridge?._id === resolvedParams?.id) : null;

      if (!agentBridge) {
        // Include the type parameter when navigating back to maintain sidebar selection
        const agentType = resolvedSearchParams?.type || "api";
        router.push(`/org/${resolvedParams?.org_id}/agents?type=${agentType}`);
        return;
      }

      try {
        await dispatch(getSingleBridgesAction({ id: resolvedParams.id, version: resolvedSearchParams.version }));

        // After getting the bridge, ensure type query parameter matches the bridge type
        const currentType = resolvedSearchParams?.type;
        const bridgeTypeFromRedux = agentBridge.bridgeType?.toLowerCase();
        let correctType;

        // Determine the correct type based on bridge type from Redux
        if (bridgeTypeFromRedux === "chatbot") {
          correctType = "chatbot";
        } else {
          // For 'api', 'batch', or any other type, default to 'api'
          correctType = "api";
        }

        // If type is missing or doesn't match, update the URL
        if (!currentType || currentType !== correctType) {
          const url = new URL(window.location);
          url.searchParams.set("type", correctType);
          // Use replaceState to avoid creating a new history entry
          window.history.replaceState({}, "", url.toString());
        }
      } catch (error) {
        console.error("Error in getSingleBridgesAction:", error);
      }
    })();
    return () => {
      (async () => {
        try {
          if (
            typeof window !== "undefined" &&
            window?.handleclose &&
            document.getElementById("iframe-viasocket-embed-parent-container")
          ) {
            await window.handleclose();
          }
        } catch (error) {
          console.error("Error in handleclose:", error);
        }
      })();
    };
  }, []);

  useEffect(() => {
    if (bridgeType !== "trigger") {
      if (
        typeof window !== "undefined" &&
        window?.handleclose &&
        document.getElementById("iframe-viasocket-embed-parent-container")
      ) {
        window?.handleclose();
      }
    }
  }, [bridgeType]);

  useEffect(() => {
    if (mountRef.current) {
      if (bridgeType === "chatbot") {
        if (typeof openChatbot !== "undefined" && document.getElementById("parentChatbot")) {
          openChatbot();
        }
      } else {
        if (typeof closeChatbot !== "undefined") {
          closeChatbot();
        }
      }
    }
    mountRef.current = true;
  }, [bridgeType]);

  // Show skeleton loading state only for initial load (when no data exists)
  if (isLoading && !hasData && !hasError) {
    return (
      <div className="w-full h-full">
        <ConfigurationSkeleton />
      </div>
    );
  }

  // Show error state with retry option
  if (hasError && !hasData) {
    return (
      <div id="error-container" className="w-full h-full flex items-center justify-center bg-base-100">
        <div id="error-content" className="text-center p-8">
          <div id="error-icon-container" className="mb-4">
            <CircleAlert id="error-icon" className="w-16 h-16 mx-auto text-error" />
          </div>
          <h3 id="error-title" className="text-lg font-semibold text-base-content mb-2">
            Unable to load agent configuration
          </h3>
          <p id="error-message" className="text-base-content/60 mb-4">
            There was an error loading the agent data. Please try again.
          </p>
          <button id="retry-button" onClick={() => window.location.reload()} className="btn btn-primary">
            <RefreshIcon id="refresh-icon" className="w-4 h-4 mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      id="configure-page-container"
      ref={containerRef}
      className={`w-full bg-base-300 h-full transition-all duration-300 ease-in-out overflow-hidden ${!isFocus ? "max-h-[calc(100vh-2rem)]" : "overflow-y-hidden"} ${uiState.isDesktop ? "flex flex-row" : "overflow-y-auto"}`}
    >
      {/* Debug Panel States */}

      {uiState.isDesktop ? (
        isAgentFlowView ? (
          <div id="agent-flow-container" className="w-full h-full">
            <div id="agent-flow-scroll-container" className="h-full overflow-y-auto py-4">
              <ConfigurationPage
                id="agent-flow-configuration-page"
                promptTextAreaRef={promptTextAreaRef}
                params={resolvedParams}
                searchParams={resolvedSearchParams}
                isEmbedUser={isEmbedUser}
                uiState={uiState}
                updateUiState={updateUiState}
                promptState={promptState}
                setPromptState={setPromptState}
                handleCloseTextAreaFocus={handleCloseTextAreaFocus}
                savePrompt={savePrompt}
                isMobileView={isMobileView}
                closeHelperButtonLocation={closeHelperButtonLocation}
                bridgeName={bridgeName}
                onViewChange={handleViewChange}
                viewOverride={isAgentFlowView ? "agent-flow" : undefined}
              />
            </div>
          </div>
        ) : (
          // Desktop: Use react-resizable-panels for smooth resizing
          <PanelGroup id="main-panel-group" direction="horizontal" className="w-full h-full">
            {/* Configuration Panel */}
            <Panel
              id="config-panel"
              ref={configPanelRef}
              defaultSize={panelSizes.config}
              minSize={3}
              maxSize={100}
              className="bg-base-300"
              collapsible={false}
              onResize={(size) => {
                const isCollapsed = size <= 5;
                if (uiState.isConfigCollapsed !== isCollapsed) {
                  updateUiState({ isConfigCollapsed: isCollapsed });
                }
              }}
            >
              {/* Bundle - Show when collapsed */}
              {uiState.isConfigCollapsed && <ConfigBundle onClick={handleExpandConfig} />}

              {/* Configuration Content - Always in DOM, just hidden when collapsed */}
              <div
                id="config-content-container"
                className={`h-full flex flex-col ${uiState.isConfigCollapsed ? "hidden" : ""}`}
              >
                {/* Configuration Content */}
                <div
                  id="config-scroll-container"
                  ref={leftPanelScrollRef}
                  className={`flex-1 overflow-y-auto overflow-x-hidden ${uiState.isPromptHelperOpen ? "px-2" : " pl-8  px-4"}`}
                >
                  <ConfigurationPage
                    id="configuration-page"
                    promptTextAreaRef={promptTextAreaRef}
                    params={resolvedParams}
                    searchParams={resolvedSearchParams}
                    isEmbedUser={isEmbedUser}
                    uiState={uiState}
                    updateUiState={updateUiState}
                    promptState={promptState}
                    setPromptState={setPromptState}
                    handleCloseTextAreaFocus={handleCloseTextAreaFocus}
                    savePrompt={savePrompt}
                    isMobileView={isMobileView}
                    closeHelperButtonLocation={closeHelperButtonLocation}
                    bridgeName={bridgeName}
                    onViewChange={handleViewChange}
                    viewOverride={isAgentFlowView ? "agent-flow" : undefined}
                  />
                </div>
              </div>
            </Panel>

            {/* Resizer Handle with Custom Line */}
            <PanelResizeHandle
              id="main-resize-handle"
              className="w-2 bg-base-100 hover:bg-primary/50 transition-colors duration-200 relative flex items-center justify-center group"
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  id="main-resize-line"
                  className="w-0.5 h-6 bg-base-content/20 group-hover:bg-success/80 transition-colors duration-200 rounded-full"
                />
              </div>
            </PanelResizeHandle>

            {/* Chat/PromptHelper Panel - Conditional based on focus mode */}
            {!uiState.isPromptHelperOpen || !isFocus ? (
              // Chat Panel (Two-panel mode)
              <Panel
                id="chat-panel"
                ref={chatPanelRef}
                defaultSize={panelSizes.chat}
                minSize={3}
                className="bg-base-50"
                collapsible={false}
                onResize={(size) => {
                  const isCollapsed = size <= 5;
                  if (uiState.isChatCollapsed !== isCollapsed) {
                    updateUiState({ isChatCollapsed: isCollapsed });
                  }
                }}
              >
                {uiState.isChatCollapsed ? (
                  <ChatBundle onClick={handleExpandChat} />
                ) : (
                  <div id="parentChatbot" className="h-full flex flex-col">
                    <div
                      className={`flex-1 overflow-x-hidden ${isGuideVisible ? "overflow-y-hidden" : "overflow-y-auto"}`}
                    >
                      <div id="chat-container" className="h-full flex flex-col">
                        <AgentSetupGuide
                          id="agent-setup-guide"
                          promptTextAreaRef={promptTextAreaRef}
                          params={resolvedParams}
                          searchParams={resolvedSearchParams}
                          onVisibilityChange={setIsGuideVisible}
                        />
                        {/* Only show experimental Chat for non-chatbot types */}
                        {bridgeType !== "chatbot" && (
                          <>
                            {!sessionStorage.getItem("orchestralUser") ? (
                              <div id="chat-content-container" className="flex-1 min-h-0">
                                {bridgeType === "batch" && versionService === "openai" ? (
                                  <WebhookForm
                                    id="webhook-form"
                                    params={resolvedParams}
                                    searchParams={resolvedSearchParams}
                                  />
                                ) : (
                                  <Chat
                                    id="chat-component"
                                    params={resolvedParams}
                                    searchParams={resolvedSearchParams}
                                  />
                                )}
                              </div>
                            ) : (
                              <div id="alternative-chat-container" className="flex-1 min-h-0">
                                <Chat
                                  id="alternative-chat-component"
                                  params={resolvedParams}
                                  searchParams={resolvedSearchParams}
                                />
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <Chatbot id="chatbot-component" params={resolvedParams} searchParams={resolvedSearchParams} />
                  </div>
                )}
              </Panel>
            ) : (
              // Three-panel mode: PromptHelper + Notes
              <>
                {/* PromptHelper Panel */}
                <Panel
                  id="prompt-helper-panel"
                  ref={promptHelperPanelRef}
                  defaultSize={panelSizes.promptHelper}
                  minSize={3}
                  maxSize={100}
                  className="bg-base-50"
                  collapsible={false}
                  onResize={(size) => {
                    // Don't update state if we're manually keeping it collapsed
                    if (isManualResizeRef.current) return;

                    const isCollapsed = size <= 5;
                    if (uiState.isPromptHelperCollapsed !== isCollapsed) {
                      updateUiState({ isPromptHelperCollapsed: isCollapsed });
                    }
                  }}
                >
                  {uiState.isPromptHelperCollapsed ? (
                    <PromptHelperBundle onClick={handleExpandPromptHelper} />
                  ) : (
                    <PromptHelper
                      id="prompt-helper"
                      isVisible={uiState.isPromptHelperOpen && !isMobileView}
                      params={resolvedParams}
                      searchParams={resolvedSearchParams}
                      onClose={handleCloseTextAreaFocus}
                      savePrompt={savePrompt}
                      setPrompt={(value) => {
                        // Update prompt state for diff/summary
                        setPromptState((prev) => ({ ...prev, newContent: value }));

                        // Sync the contentEditable prompt editor DOM with the new value
                        const container = promptTextAreaRef.current;
                        if (container) {
                          const editor = container.querySelector('[contenteditable="true"]');
                          if (editor) {
                            editor.value = value || "";
                          }
                        }
                      }}
                      showCloseButton={closeHelperButtonLocation === "promptHelper"}
                      messages={promptState.messages}
                      setMessages={(value) => {
                        if (typeof value === "function") {
                          setPromptState((prev) => ({ ...prev, messages: value(prev.messages) }));
                        } else {
                          setPromptState((prev) => ({ ...prev, messages: value }));
                        }
                      }}
                      thread_id={promptState.thread_id}
                      onResetThreadId={() => {
                        const newId = generateRandomID();
                        setPromptState((prev) => ({ ...prev, thread_id: newId }));
                        setThreadIdForVersionReducer &&
                          dispatch(
                            setThreadIdForVersionReducer({
                              bridgeId: resolvedParams?.id,
                              versionId: resolvedSearchParams?.version,
                              thread_id: newId,
                            })
                          );
                      }}
                      prompt={promptState.prompt}
                      hasUnsavedChanges={promptState.hasUnsavedChanges}
                      setHasUnsavedChanges={(value) =>
                        setPromptState((prev) => ({ ...prev, hasUnsavedChanges: value }))
                      }
                      setNewContent={(value) => setPromptState((prev) => ({ ...prev, newContent: value }))}
                      isEmbedUser={isEmbedUser}
                    />
                  )}
                </Panel>

                {/* Resizer Handle between PromptHelper and Notes with Custom Line */}
                {uiState.showNotes && !isEmbedUser && (
                  <PanelResizeHandle
                    id="prompt-notes-resize-handle"
                    className="w-2 bg-base-300 hover:bg-success/50 transition-colors duration-200 relative flex items-center justify-center group"
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div
                        id="prompt-notes-resize-line"
                        className="w-0.5 h-6 bg-base-content/20 group-hover:bg-success/80 transition-colors duration-200 rounded-full"
                      />
                    </div>
                  </PanelResizeHandle>
                )}

                {/* Notes Panel */}
                {uiState.showNotes && !isEmbedUser && (
                  <Panel
                    id="notes-panel"
                    ref={notesPanelRef}
                    defaultSize={panelSizes.notes}
                    minSize={3}
                    maxSize={100}
                    className="bg-base-50"
                    collapsible={false}
                    onResize={(size) => {
                      const isCollapsed = size <= 5;
                      if (uiState.isNotesCollapsed !== isCollapsed) {
                        updateUiState({ isNotesCollapsed: isCollapsed });
                      }
                    }}
                  >
                    {uiState.isNotesCollapsed ? (
                      <NotesBundle onClick={handleExpandNotes} />
                    ) : (
                      <NotesPanel
                        id="notes-panel-component"
                        isVisible={true}
                        params={resolvedParams}
                        isEmbedUser={isEmbedUser}
                        onClose={handleCloseTextAreaFocus}
                        showCloseButton={closeHelperButtonLocation === "notes"}
                      />
                    )}
                  </Panel>
                )}
              </>
            )}
          </PanelGroup>
        )
      ) : isAgentFlowView ? (
        <div id="mobile-agent-flow-container" className="overflow-y-auto w-full h-full">
          <div id="mobile-agent-flow-content" className="min-h-screen border-b border-base-300 bg-base-100">
            <div id="mobile-agent-flow-inner" className="py-4 px-4">
              <ConfigurationPage
                id="mobile-agent-flow-configuration-page"
                promptTextAreaRef={promptTextAreaRef}
                params={resolvedParams}
                searchParams={resolvedSearchParams}
                isEmbedUser={isEmbedUser}
                uiState={uiState}
                updateUiState={updateUiState}
                promptState={promptState}
                setPromptState={setPromptState}
                handleCloseTextAreaFocus={handleCloseTextAreaFocus}
                savePrompt={savePrompt}
                isMobileView={isMobileView}
                closeHelperButtonLocation={closeHelperButtonLocation}
                bridgeName={bridgeName}
                onViewChange={handleViewChange}
                viewOverride={isAgentFlowView ? "agent-flow" : undefined}
              />
            </div>
          </div>
        </div>
      ) : (
        // Mobile: Simple stacked layout
        <div id="mobile-container" className="overflow-y-auto">
          {/* Configuration Panel */}
          <div id="mobile-config-section" className="min-h-screen border-b border-base-300 bg-base-100">
            <div className="py-4 px-4">
              <ConfigurationPage
                id="mobile-configuration-page"
                promptTextAreaRef={promptTextAreaRef}
                params={resolvedParams}
                searchParams={resolvedSearchParams}
                isEmbedUser={isEmbedUser}
                uiState={uiState}
                updateUiState={updateUiState}
                promptState={promptState}
                setPromptState={setPromptState}
                handleCloseTextAreaFocus={handleCloseTextAreaFocus}
                savePrompt={savePrompt}
                isMobileView={isMobileView}
                closeHelperButtonLocation={closeHelperButtonLocation}
                bridgeName={bridgeName}
                onViewChange={handleViewChange}
                viewOverride={isAgentFlowView ? "agent-flow" : undefined}
              />
            </div>
          </div>

          {/* Chat Panel */}
          <div id="parentChatbot" className="min-h-screen">
            <div id="mobile-chat-container" className="h-full flex flex-col">
              <AgentSetupGuide
                id="mobile-agent-setup-guide"
                promptTextAreaRef={promptTextAreaRef}
                params={resolvedParams}
                searchParams={resolvedSearchParams}
              />

              {/* Only show experimental Chat for non-chatbot types */}
              {bridgeType !== "chatbot" && (
                <>
                  {!sessionStorage.getItem("orchestralUser") ? (
                    <div id="mobile-chat-content-container" className="flex-1 min-h-0">
                      {bridgeType === "batch" && versionService === "openai" ? (
                        <WebhookForm
                          id="mobile-webhook-form"
                          params={resolvedParams}
                          searchParams={resolvedSearchParams}
                        />
                      ) : (
                        <Chat id="mobile-chat-component" params={resolvedParams} searchParams={resolvedSearchParams} />
                      )}
                    </div>
                  ) : (
                    <div id="mobile-alternative-chat-container" className="flex-1 min-h-0">
                      <Chat
                        id="mobile-alternative-chat-component"
                        params={resolvedParams}
                        searchParams={resolvedSearchParams}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
            <Chatbot id="mobile-chatbot-component" params={resolvedParams} searchParams={resolvedSearchParams} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Protected(Page);
