"use client";
import React, { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { setEmbedUserDetailsAction, clearEmbedThemeDetailsAction } from "@/store/action/appInfoAction";
import { useDispatch } from "react-redux";
import { updateBridgeAction, createEmbedAgentAction, getAllBridgesAction } from "@/store/action/bridgeAction";
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
  const [openGtwyReceived, setOpenGtwyReceived] = useState(false);
  const isNavigatingRef = useRef(false);
  const isAgentDataGetted = useRef(false);
  const urlParamsObj = useMemo(() => {
    const interfaceDetailsParam = searchParams.get("interfaceDetails");
    return interfaceDetailsParam ? JSON.parse(interfaceDetailsParam) : {};
  }, [searchParams]);

  const { allBridges, embedThemeConfig, themeMode } = useCustomSelector((state) => ({
    allBridges: state.bridgeReducer?.orgs?.[urlParamsObj.org_id]?.orgs || [],
    embedThemeConfig: state.appInfoReducer?.embedUserDetails?.theme_config || null,
    themeMode: state.appInfoReducer?.embedUserDetails?.themeMode || "system",
  }));

  const { changeTheme } = useThemeManager();

  // Notify parent that embed is loaded
  useEffect(() => {
    window.parent.postMessage({ type: "gtwyLoaded", data: "gtwyLoaded" }, "*");
    dispatch(clearEmbedThemeDetailsAction());
  }, []);

  useEffect(() => {
    if (isAgentDataGetted.current) {
      dispatch(getAllBridgesAction(urlParamsObj.org_id));
      isAgentDataGetted.current = false;
    }
  }, []);

  // Apply theme mode when embed user
  useEffect(() => {
    if (isEmbedUser && themeMode && urlParamsObj.folder_id) {
      changeTheme(themeMode);
    }
  }, [isEmbedUser, themeMode, changeTheme, urlParamsObj.folder_id]);

  // Set default theme if none configured
  useEffect(() => {
    if (!embedThemeConfig || embedThemeConfig.length === 0) {
      dispatch(setEmbedUserDetailsAction({ theme_config: defaultUserTheme }));
    }
  }, [dispatch, embedThemeConfig]);

  const createNewAgent = useCallback(
    async (agent_name, orgId, agent_purpose, meta) => {
      if (isNavigatingRef.current) {
        return;
      }
      isNavigatingRef.current = true;
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
          setCurrentAgentName(agent_name || result.agent?.name);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
        isNavigatingRef.current = false;
      }
    },
    [dispatch, router]
  );

  const handleAgentCreation = useCallback((agentName, orgId, agentPurpose, meta) => {
    setIsLoading(true);
    createNewAgent(agentName, orgId, agentPurpose, meta);
  }, []);

  // Initialize tokens and session storage from URL params
  useEffect(() => {
    if (!urlParamsObj.org_id || !urlParamsObj.token || (!urlParamsObj.folder_id && !urlParamsObj.gtwy_user)) {
      return;
    }

    dispatch(setEmbedUserDetailsAction({ isEmbedUser: true }));
    sessionStorage.setItem("local_token", urlParamsObj.token);
    sessionStorage.setItem("gtwy_org_id", urlParamsObj.org_id);
    sessionStorage.setItem("gtwy_folder_id", urlParamsObj.folder_id);
    if (urlParamsObj.folder_id) {
      sessionStorage.setItem("embedUser", true);
    }

    if (urlParamsObj.config) {
      const configUpdates = {};
      Object.entries(urlParamsObj.config).forEach(([key, value]) => {
        if (value === undefined) return;
        if (key === "prompt") {
          dispatch(setEmbedUserDetailsAction({ [key]: value }));
        } else if (key === "theme_config") {
          let parsedTheme = value;
          if (typeof value === "string") {
            try {
              parsedTheme = JSON.parse(value);
            } catch (err) {
              console.error("Invalid theme_config JSON in embed params", err);
              return;
            }
          }
          configUpdates[key] = parsedTheme;
        } else if (key === "apikey_object_id" || key === "models" || key === "themeMode") {
          configUpdates[key] = value;
        } else {
          configUpdates[key] = toBoolean(value);
        }
      });
      if (Object.keys(configUpdates).length > 0) {
        dispatch(setEmbedUserDetailsAction(configUpdates));
      }
    }

    if (urlParamsObj.agent_name) {
      setCurrentAgentName(urlParamsObj.agent_name);
    }
  }, [urlParamsObj]);
  // Handle URL-based navigation
  useEffect(() => {
    const hasAgentParams = urlParamsObj?.agent_name || urlParamsObj?.agent_id || urlParamsObj?.agent_purpose;

    if (hasAgentParams && urlParamsObj.org_id) {
      setIsLoading(true);
      if (urlParamsObj?.agent_name && currentAgentName) {
        handleAgentCreation(currentAgentName, urlParamsObj.org_id);
      } else if (urlParamsObj?.agent_id) {
        router.push(`/org/${urlParamsObj.org_id}/agents/configure/${urlParamsObj.agent_id}?isEmbedUser=true`);
      } else if (urlParamsObj?.agent_purpose) {
        createNewAgent("", urlParamsObj.org_id, urlParamsObj.agent_purpose);
      }
      return;
    }

    if (!openGtwyReceived) return;

    if (urlParamsObj.org_id && urlParamsObj.token && (urlParamsObj.folder_id || urlParamsObj.gtwy_user)) {
      setIsLoading(true);
      router.push(`/org/${urlParamsObj.org_id}/agents?isEmbedUser=true`);
    } else {
      setIsLoading(false);
    }
  }, [openGtwyReceived, urlParamsObj, currentAgentName, handleAgentCreation, router, createNewAgent]);

  // Handle postMessage events from parent
  useEffect(() => {
    const handleMessage = async (event) => {
      if (event?.data?.data?.type === "openGtwy") setOpenGtwyReceived(true);
      if (event.data?.data?.type !== "gtwyInterfaceData") return;
      const messageData = event.data.data.data;
      const orgId = sessionStorage.getItem("gtwy_org_id");

      if (messageData?.agent_name) {
        setIsLoading(true);
        handleAgentCreation(messageData.agent_name, orgId, messageData.agent_purpose || null, messageData.meta || null);
        return;
      } else if (messageData?.agent_id && orgId) {
        if (messageData?.meta) {
          const bridge = allBridges.find((b) => b._id === messageData.agent_id);
          if (bridge) {
            dispatch(updateBridgeAction({ dataToSend: { meta: messageData.meta }, bridgeId: messageData.agent_id }));
          }
        }
        setIsLoading(true);
        const bridgeData = allBridges.find((b) => b._id === messageData.agent_id);
        if (!bridgeData) {
          router.push(`/org/${orgId}/agents`);
          return;
        }
        const version = bridgeData.published_version_id || bridgeData.versions[0];
        if (messageData?.history) {
          router.push(
            `/org/${orgId}/agents/history/${messageData.agent_id}?version=${version}&message_id=${messageData.history.message_id}`
          );
        } else {
          router.push(`/org/${orgId}/agents/configure/${messageData.agent_id}?version=${version}`);
        }
        return;
      } else if (messageData?.agent_purpose) {
        setIsLoading(true);
        createNewAgent("", orgId, messageData.agent_purpose);
        return;
      }

      const uiUpdates = {};
      if (messageData?.showGuide !== undefined) uiUpdates.showGuide = messageData.showGuide;
      if (messageData?.showConfigType !== undefined) uiUpdates.showConfigType = messageData.showConfigType;
      if (messageData?.theme_config) {
        let incomingTheme = messageData.theme_config;
        if (typeof incomingTheme === "string") {
          try {
            incomingTheme = JSON.parse(incomingTheme);
          } catch (err) {
            console.error("Invalid theme_config JSON from message data", err);
          }
        }
        dispatch(setEmbedUserDetailsAction({ theme_config: incomingTheme }));
      }
      if (Object.keys(uiUpdates).length > 0) {
        dispatch(setEmbedUserDetailsAction(uiUpdates));
      }
    };

    window.addEventListener("message", handleMessage);
  }, [allBridges]);

  const resolvedEmbedTheme = embedThemeConfig || defaultUserTheme;

  if (isLoading) {
    return (
      <>
        <ThemeManager userType="embed" customTheme={resolvedEmbedTheme} />
        <div className="flex items-center justify-center min-h-screen bg-base-100">
          <div className="text-center">
            <div className="text-4xl font-bold text-base-content mb-4">GTWY</div>
            <div className="flex items-center justify-center space-x-1 text-xl text-base-content">
              <span>is loading</span>
              <div className="flex space-x-1 ml-2">
                <div
                  className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                ></div>
                <div
                  className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
                <div
                  className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                  style={{ animationDelay: "0.3s" }}
                ></div>
              </div>
            </div>
          </div>
          <ServiceInitializer />
        </div>
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
