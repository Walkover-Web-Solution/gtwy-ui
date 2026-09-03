"use client";
import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
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
import { EMBED_ARRAY_KEYS, EMBED_OBJECT_KEYS, EMBED_PASSTHROUGH_KEYS, EMBED_SKIP_KEYS } from "@/utils/enums";
import LoadingSpinner from "@/components/LoadingSpinner";
import useRtLayerEventHandler from "@/customHooks/useRtLayerEventHandler";

const Layout = ({ children, isEmbedUser }) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(true);
  const [openGtwyReceived, setOpenGtwyReceived] = useState(false);
  const [embedUserId, setEmbedUserId] = useState(null);
  const [embedOrgId, setEmbedOrgId] = useState(null);
  const bridgesFetchedRef = useRef(false);

  const urlParamsObj = useMemo(() => {
    const interfaceDetailsParam = searchParams.get("interfaceDetails");
    return interfaceDetailsParam ? JSON.parse(interfaceDetailsParam) : {};
  }, [searchParams]);

  const { allBridges, embedThemeConfig, themeMode } = useCustomSelector((state) => ({
    allBridges: state.bridgeReducer?.orgs?.[urlParamsObj.org_id]?.orgs || [],
    embedThemeConfig: state.appInfoReducer?.embedUserDetails?.theme_config || null,
    themeMode: state.appInfoReducer?.embedUserDetails?.themeMode || "system",
  }));

  const allBridgesRef = useRef(allBridges);
  useEffect(() => {
    allBridgesRef.current = allBridges;
  }, [allBridges]);

  const { changeTheme } = useThemeManager();

  const agentCreateChannel = useMemo(() => {
    if (!embedOrgId || !embedUserId) return null;
    return `org_${embedOrgId}_${embedUserId}`.replace(/ /g, "_");
  }, [embedOrgId, embedUserId]);

  useRtLayerEventHandler("", agentCreateChannel);

  useEffect(() => {
    if (isEmbedUser && themeMode && urlParamsObj.folder_id) {
      changeTheme(themeMode);
    }
  }, [isEmbedUser, themeMode, changeTheme, urlParamsObj.folder_id]);

  const resolvedEmbedTheme = useMemo(() => embedThemeConfig || defaultUserTheme, [embedThemeConfig]);

  useEffect(() => {
    dispatch(clearEmbedThemeDetailsAction());
  }, []);

  useEffect(() => {
    if (!embedThemeConfig || embedThemeConfig.length === 0) {
      dispatch(setEmbedUserDetailsAction({ theme_config: defaultUserTheme }));
    }
  }, [dispatch, embedThemeConfig]);

  useEffect(() => {
    window.parent.postMessage({ type: "gtwyLoaded", data: "gtwyLoaded" }, "*");
  }, []);

  const getBridges = useCallback(async () => {
    if (bridgesFetchedRef.current && allBridgesRef.current?.length > 0) {
      return allBridgesRef.current;
    }
    let bridges = allBridgesRef.current;
    if (!bridges || bridges.length === 0) {
      await dispatch(
        getAllBridgesAction((data) => {
          bridges = data;
        })
      );
      bridgesFetchedRef.current = true;
    }
    return bridges;
  }, [dispatch]);

  const createNewAgent = useCallback(
    (agent_name, orgId, agent_purpose, meta) => {
      setIsLoading(true);
      dispatch(
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
    },
    [dispatch, router]
  );

  const handleAgentNavigation = useCallback(
    async (agentName, orgId, agentPurpose, meta) => {
      setIsLoading(true);
      try {
        createNewAgent(agentName, orgId, agentPurpose, meta);
      } catch (error) {
        console.error("Error fetching bridges, falling back to create a new agent:", error);
        createNewAgent(agentName, orgId, agentPurpose, meta);
      }
    },
    [getBridges, createNewAgent, router]
  );

  useEffect(() => {
    const initializeTokens = () => {
      if (!urlParamsObj.org_id || !urlParamsObj.token || (!urlParamsObj.folder_id && !urlParamsObj.gtwy_user)) {
        return;
      }

      dispatch(setEmbedUserDetailsAction({ isEmbedUser: true }));
      sessionStorage.setItem("local_token", urlParamsObj.token);
      sessionStorage.setItem("gtwy_org_id", urlParamsObj.org_id);
      sessionStorage.setItem("gtwy_folder_id", urlParamsObj.folder_id);
      sessionStorage.setItem("gtwy_user_id", urlParamsObj.user_id);
      setEmbedOrgId(urlParamsObj.org_id);
      setEmbedUserId(urlParamsObj.user_id);
      if (urlParamsObj.folder_id) {
        sessionStorage.setItem("embedUser", true);
      }

      if (urlParamsObj.config) {
        const configUpdates = {};
        Object.entries(urlParamsObj.config).forEach(([key, value]) => {
          if (value === undefined) return;
          if (key === "theme_config") {
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
          } else if (EMBED_OBJECT_KEYS.has(key) || EMBED_ARRAY_KEYS.has(key) || EMBED_PASSTHROUGH_KEYS.has(key)) {
            configUpdates[key] = value;
          } else {
            configUpdates[key] = toBoolean(value);
          }
        });
        if (Object.keys(configUpdates).length > 0) {
          dispatch(setEmbedUserDetailsAction(configUpdates));
        }
      }
    };

    initializeTokens();
  }, [urlParamsObj]);

  useEffect(() => {
    const handleNavigation = () => {
      const { agent_name, agent_id, agent_purpose, org_id, token, folder_id, historyEmbed, message_id } = urlParamsObj;

      if (agent_id && org_id) {
        setIsLoading(true);
        if (historyEmbed) {
          dispatch(setEmbedUserDetailsAction({ historyEmbed: true }));
          const msgParam = message_id ? `&message_id=${encodeURIComponent(message_id)}` : "";
          router.push(`/org/${org_id}/agents/history/${agent_id}?isEmbedUser=true${msgParam}`);
        } else {
          router.push(`/org/${org_id}/agents/configure/${agent_id}?isEmbedUser=true`);
        }
        return;
      }

      if (agent_name && org_id) {
        const orgId = sessionStorage.getItem("gtwy_org_id") || org_id;
        createNewAgent(agent_name, orgId, agent_purpose || null, null);
        return;
      }

      if (!openGtwyReceived) return;

      // Only auto-route to /agents on a folder navigation flow. Removing
      // gtwy_user from this condition prevents /embed from unmounting on
      // the openGtwy postMessage — which would destroy the message listener
      // before the follow-up gtwyInterfaceData (agent_id/message_id) arrives.
      if (org_id && token && folder_id) {
        setIsLoading(true);
        router.push(`/org/${org_id}/agents?isEmbedUser=true`);
      } else {
        setIsLoading(false);
      }
    };

    handleNavigation();
  }, [openGtwyReceived, urlParamsObj, router, createNewAgent]);

  useEffect(() => {
    const handleMessage = async (event) => {
      if (event?.data?.data?.type === "openGtwy") setOpenGtwyReceived(true);
      if (event.data?.data?.type !== "gtwyInterfaceData") return;
      const messageData = event.data.data.data;
      const orgId = sessionStorage.getItem("gtwy_org_id");
      if (messageData?.agent_name) {
        handleAgentNavigation(
          messageData.agent_name,
          orgId,
          messageData.agent_purpose || null,
          messageData.meta || null
        );
      } else if (messageData?.agent_id && orgId) {
        const bridges = await getBridges();
        const bridge = bridges.find((b) => b._id === messageData.agent_id);
        if (!bridge) return;
        if (messageData.meta || messageData.replaceMeta) {
          const updatedMeta =
            messageData.replaceMeta != null
              ? messageData.replaceMeta
              : { ...(bridge?.meta || {}), ...messageData.meta };
          dispatch(updateBridgeAction({ dataToSend: { meta: updatedMeta }, bridgeId: messageData.agent_id }));
        }
        setIsLoading(true);
        const bridgeData = bridges.find((b) => b._id === messageData.agent_id);
        if (!bridgeData) {
          router.push(`/org/${orgId}/agents`);
          return;
        }
        const version = bridgeData.published_version_id || bridgeData.versions[0];
        if (messageData?.historyEmbed) {
          // Persist historyEmbed flag so downstream UI hides navbar/sidebar
          dispatch(
            setEmbedUserDetailsAction({
              historyEmbed: true,
            })
          );
          const isValidMessageId =
            messageData.message_id &&
            !["none", "null", "undefined"].includes(String(messageData.message_id).toLowerCase());
          const msgParam = isValidMessageId ? `&message_id=${encodeURIComponent(messageData.message_id)}` : "";
          router.push(`/org/${orgId}/agents/history/${messageData.agent_id}?version=${version}${msgParam}`);
        } else if (messageData?.history) {
          router.push(
            `/org/${orgId}/agents/history/${messageData.agent_id}?version=${version}&message_id=${messageData.history.message_id}`
          );
        } else {
          router.push(`/org/${orgId}/agents/configure/${messageData.agent_id}?version=${version}`);
        }
      } else if (messageData?.agent_purpose) {
        createNewAgent("", orgId, messageData.agent_purpose);
      } else if (messageData && typeof messageData === "object") {
        const updates = {};
        Object.entries(messageData).forEach(([key, value]) => {
          if (value === undefined || EMBED_SKIP_KEYS.has(key)) return;
          if (key === "theme_config") {
            let parsed = value;
            if (typeof value === "string") {
              try {
                parsed = JSON.parse(value);
              } catch (err) {
                console.error("Invalid theme_config JSON from message data", err);
                return;
              }
            }

            if (parsed && typeof parsed === "object") updates[key] = parsed;
          } else if (EMBED_OBJECT_KEYS.has(key) || EMBED_ARRAY_KEYS.has(key)) {
            if (value !== null && value !== undefined) updates[key] = value;
          } else if (EMBED_PASSTHROUGH_KEYS.has(key)) {
            if (value !== null && value !== undefined) updates[key] = value;
          } else {
            updates[key] = toBoolean(value);
          }
        });

        if (Object.keys(updates).length > 0) {
          dispatch(setEmbedUserDetailsAction(updates));
        }
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      // window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Memoize loading component to avoid unnecessary re-renders
  const LoadingComponent = useMemo(
    () => (
      <div className="flex items-center justify-center min-h-screen bg-base-100">
        <LoadingSpinner />
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
      <ServiceInitializer />
      <ThemeManager userType="embed" customTheme={resolvedEmbedTheme} />
      {children}
    </>
  );
};

export default Protected(Layout);
