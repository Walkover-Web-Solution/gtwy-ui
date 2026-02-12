"use client";
import React, { useCallback, useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { setEmbedUserDetailsAction, clearEmbedThemeDetailsAction } from "@/store/action/appInfoAction";
import { useDispatch } from "react-redux";
import { getAllBridgesAction, updateBridgeAction, createEmbedAgentAction } from "@/store/action/bridgeAction";
import { sendDataToParent, toBoolean } from "@/utils/utility";
import { useCustomSelector } from "@/customHooks/customSelector";
import ServiceInitializer from "@/components/organization/ServiceInitializer";
import { ThemeManager, useThemeManager } from "@/customHooks/useThemeManager";
import defaultUserTheme from "@/public/themes/default-user-theme.json";
import Protected from "@/components/Protected";

const Layout = ({ children, isEmbedUser }) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(true);
  const [currentAgentName, setCurrentAgentName] = useState(null);
  const [processedAgentName, setProcessedAgentName] = useState(null);
  const [openGtwyReceived, setOpenGtwyReceived] = useState(false);

  // Memoize URL params parsing to avoid unnecessary re-parsing
  const urlParamsObj = useMemo(() => {
    const interfaceDetailsParam = searchParams.get("interfaceDetails");
    const decodedParam = interfaceDetailsParam ? interfaceDetailsParam : null;
    return decodedParam ? JSON.parse(decodedParam) : {};
  }, [searchParams]);

  const { allBridges, embedThemeConfig, themeMode } = useCustomSelector((state) => ({
    allBridges: state.bridgeReducer?.orgs?.[urlParamsObj.org_id]?.orgs || [],
    embedThemeConfig: state.appInfoReducer?.embedUserDetails?.theme_config || null,
    themeMode: state.appInfoReducer?.embedUserDetails?.themeMode || "system",
  }));

  const { changeTheme } = useThemeManager();

  useEffect(() => {
    if (isEmbedUser && themeMode && urlParamsObj.folder_id) {
      changeTheme(themeMode);
    }
  }, [isEmbedUser, themeMode, changeTheme, urlParamsObj.folder_id]);

  const resolvedEmbedTheme = useMemo(() => embedThemeConfig || defaultUserTheme, [embedThemeConfig]);
  // Reset embed theme config to ensure fresh state for new embeds
  const resetEmbedThemeConfig = useCallback(() => {
    dispatch(clearEmbedThemeDetailsAction());
  }, [dispatch]);
  useEffect(() => {
    if (!embedThemeConfig || embedThemeConfig.length === 0) {
      dispatch(setEmbedUserDetailsAction({ theme_config: defaultUserTheme }));
    }
  }, [dispatch, embedThemeConfig]);

  // Reset theme config when component mounts

  // Listen for openGtwy event from parent
  useEffect(() => {
    window.parent.postMessage({ type: "gtwyLoaded", data: "gtwyLoaded" }, "*");
  }, []);

  useEffect(() => {
    resetEmbedThemeConfig();
  }, []);

  const createNewAgent = useCallback(
    async (agent_name, orgId, agent_purpose, meta) => {
      try {
        setIsLoading(true);

        const result = await dispatch(
          createEmbedAgentAction({
            purpose: agent_purpose,
            agent_name: agent_name,
            orgId: orgId,
            isEmbedUser: true,
            router: router,
            sendDataToParent: sendDataToParent,
            meta: meta,
          })
        );

        if (result?.success) {
          setProcessedAgentName(agent_name || result.agent?.name);
        }
      } catch (error) {
        console.error("Error creating agent:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [dispatch, router]
  );

  const navigateToExistingAgent = useCallback(
    (agent, orgId) => {
      // Reset theme config when navigating to a different agent
      const version = agent?.published_version_id || agent?.versions?.[0];
      if (agent?._id && orgId && version) {
        router.push(`/org/${orgId}/agents/configure/${agent._id}?version=${version}`);
      }
      setIsLoading(false);
      setProcessedAgentName(agent.name);
    },
    [router]
  );

  const handleAgentNavigation = useCallback(
    async (agentName, orgId, agentPurpose, meta) => {
      setIsLoading(true);
      const trimmedAgentName = agentName.trim();

      // First check if agent exists in current store
      if (allBridges && allBridges.length > 0) {
        const agentInStore = allBridges.find((agent) => agent?.name?.trim() === trimmedAgentName);
        if (agentInStore) {
          navigateToExistingAgent(agentInStore, orgId);
          return;
        }
      }

      // Only fetch bridges if not already present in store and openGtwy event received
      try {
        let bridges = allBridges;
        if (!allBridges || allBridges.length === 0) {
          await dispatch(
            getAllBridgesAction((data) => {
              bridges = data;
            })
          );
        }

        const existingAgent = bridges?.find((agent) => agent?.name?.trim() === trimmedAgentName);

        if (existingAgent) {
          navigateToExistingAgent(existingAgent, orgId);
        } else {
          createNewAgent(agentName, orgId, agentPurpose, meta);
        }
      } catch (error) {
        console.error("Error fetching bridges, falling back to create a new agent:", error);
      }
    },
    [processedAgentName, dispatch, createNewAgent, navigateToExistingAgent, allBridges, openGtwyReceived]
  );

  // Initialize tokens and setup immediately (without waiting for openGtwy)
  useEffect(() => {
    const initializeTokens = () => {
      // Reset theme config on initialization
      if (urlParamsObj.org_id && urlParamsObj.token && (urlParamsObj.folder_id || urlParamsObj.gtwy_user)) {
        // Clear previous embed user details to prevent theme persistence
        dispatch(clearEmbedThemeDetailsAction());

        if (urlParamsObj.token) {
          dispatch(setEmbedUserDetailsAction({ isEmbedUser: true }));
          sessionStorage.setItem("local_token", urlParamsObj.token);
          sessionStorage.setItem("gtwy_org_id", urlParamsObj?.org_id);
          sessionStorage.setItem("gtwy_folder_id", urlParamsObj?.folder_id);
          urlParamsObj?.folder_id && sessionStorage.setItem("embedUser", true);
        }

        if (urlParamsObj.config) {
          Object.entries(urlParamsObj.config).forEach(([key, value]) => {
            if (value === undefined) return;
            if (key === "apikey_object_id") {
              dispatch(setEmbedUserDetailsAction({ [key]: value }));
              return;
            }
            if (key === "theme_config") {
              let parsedTheme = value;
              if (typeof value === "string") {
                try {
                  parsedTheme = JSON.parse(value);
                } catch (err) {
                  console.error("Invalid theme_config JSON in embed params", err);
                }
              }
              dispatch(setEmbedUserDetailsAction({ theme_config: parsedTheme }));
              return;
            }
            if (key === "themeMode") {
              dispatch(setEmbedUserDetailsAction({ themeMode: value }));
              return;
            }

            dispatch(setEmbedUserDetailsAction({ [key]: toBoolean(value) }));
          });
        }

        // Set agent name but don't navigate yet
        if (urlParamsObj?.agent_name) {
          setCurrentAgentName(urlParamsObj.agent_name);
        }
      }
    };

    initializeTokens();
  }, [urlParamsObj]);

  // Handle navigation - immediate for agent parameters, wait for openGtwy for others
  useEffect(() => {
    const handleNavigation = () => {
      const hasAgentParams = urlParamsObj?.agent_name || urlParamsObj?.agent_id || urlParamsObj?.agent_purpose;

      if (hasAgentParams && urlParamsObj.org_id) {
        setIsLoading(true);

        if (urlParamsObj?.agent_name) {
          if (currentAgentName) {
            handleAgentNavigation(currentAgentName, urlParamsObj.org_id);
          }
        } else if (urlParamsObj?.agent_id) {
          router.push(`/org/${urlParamsObj.org_id}/agents/configure/${urlParamsObj.agent_id}?isEmbedUser=true`);
        } else if (urlParamsObj?.agent_purpose) {
          createNewAgent("", urlParamsObj.org_id, urlParamsObj.agent_purpose);
        }
        return;
      }

      if (!openGtwyReceived) {
        return;
      }

      if (urlParamsObj.org_id && urlParamsObj.token && (urlParamsObj.folder_id || urlParamsObj.gtwy_user)) {
        setIsLoading(true);
        // No agent parameters, go to agents list
        router.push(`/org/${urlParamsObj.org_id}/agents?isEmbedUser=true`);
      } else {
        setIsLoading(false);
      }
    };

    handleNavigation();
  }, [openGtwyReceived, urlParamsObj, currentAgentName, handleAgentNavigation, router, createNewAgent, allBridges]);

  useEffect(() => {
    const handleMessage = async (event) => {
      if (event?.data?.data?.type === "openGtwy") setOpenGtwyReceived(true);
      if (event.data?.data?.type !== "gtwyInterfaceData") return;
      // Only fetch bridges if not already present in store
      let bridges = allBridges;
      if (!allBridges || allBridges.length === 0) {
        await dispatch(
          getAllBridgesAction((data) => {
            bridges = data;
          })
        );
      }

      const messageData = event.data.data.data;
      const orgId = sessionStorage.getItem("gtwy_org_id");

      if (messageData?.agent_name) {
        setIsLoading(true);
        handleAgentNavigation(
          messageData.agent_name || null,
          orgId,
          messageData.agent_purpose || null,
          messageData.meta || null
        );
      } else if (messageData?.agent_id && orgId) {
        if (messageData?.meta && messageData?.agent_id && orgId) {
          const bridge = bridges.find((bridge) => bridge._id === messageData.agent_id);
          if (!bridge) {
            return;
          }
          dispatch(
            updateBridgeAction({
              dataToSend: { meta: messageData.meta },
              bridgeId: messageData.agent_id,
            })
          );
        }
        setIsLoading(true);
        const bridgeData = bridges.find((bridge) => bridge._id === messageData.agent_id);
        const history = messageData?.history;

        if (!bridgeData) {
          router.push(`/org/${orgId}/agents`);
          return;
        }

        if (history) {
          router.push(
            `/org/${orgId}/agents/history/${messageData.agent_id}?version=${bridgeData.published_version_id || bridgeData.versions[0]}&message_id=${history.message_id}`
          );
          return;
        }

        router.push(
          `/org/${orgId}/agents/configure/${messageData.agent_id}?version=${bridgeData.published_version_id || bridgeData.versions[0]}`
        );
        return;
      } else if (messageData?.agent_purpose) {
        setIsLoading(true);
        createNewAgent("", orgId, messageData.agent_purpose);
      }

      // Set new theme config
      if (messageData?.theme_config) {
        dispatch(setEmbedUserDetailsAction({ theme_config: messageData.theme_config }));
      }

      if (messageData) {
        dispatch(setEmbedUserDetailsAction(messageData));
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      // window.removeEventListener('message', handleMessage);
    };
  }, [allBridges]);

  // Memoize loading component to avoid unnecessary re-renders
  const LoadingComponent = useMemo(
    () => (
      <div className="flex items-center justify-center min-h-screen bg-base-100">
        <div className="text-center">
          <div className="text-4xl font-bold text-base-content mb-4">GTWY</div>
          <div className="flex items-center justify-center space-x-1 text-xl text-base-content">
            <span>is loading</span>
            <div className="flex space-x-1 ml-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }}></div>
            </div>
          </div>
        </div>
        <ServiceInitializer />
      </div>
    ),
    []
  );

  if (isLoading) {
    return (
      <>
        <ThemeManager userType="embed" customTheme={resolvedEmbedTheme} />
        {LoadingComponent}
      </>
    );
  }

  return (
    <>
      <ThemeManager userType="embed" customTheme={resolvedEmbedTheme} />
      {children}
    </>
  );
};

export default Protected(Layout);
