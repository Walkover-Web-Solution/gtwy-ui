"use client";
import dynamic from "next/dynamic";
import ErrorPage from "@/app/not-found";
import LoadingSpinner from "@/components/LoadingSpinner";
import Protected from "@/components/Protected";
import { getSingleMessage, switchOrg, switchUser } from "@/config/index";
import { useCustomSelector } from "@/customHooks/customSelector";
import { ThemeManager } from "@/customHooks/useThemeManager";
import { getAllApikeyAction } from "@/store/action/apiKeyAction";
import {
  createApiAction,
  deleteFunctionAction,
  getAllBridgesAction,
  getAllFunctions,
  getPrebuiltToolsAction,
  integrationAction,
  updateApiAction,
  updateBridgeVersionAction,
} from "@/store/action/bridgeAction";
import { getAllChatBotAction } from "@/store/action/chatBotAction";
import { getAllKnowBaseDataAction } from "@/store/action/knowledgeBaseAction";
import { updateUserMetaOnboarding, updateOrgMetaAction, getUsersAction } from "@/store/action/orgAction";
import { getServiceAction } from "@/store/action/serviceAction";
import { getFromCookies, removeCookie, setInCookies } from "@/utils/utility";

import { useParams, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, use } from "react";
import { useDispatch } from "react-redux";
import useRtLayerEventHandler from "@/customHooks/useRtLayerEventHandler";
import {
  getApiKeyGuideAction,
  getGuardrailsTemplatesAction,
  getTutorialDataAction,
  getDescriptionsAction,
  getFinishReasonsAction,
  getLinksAction,
} from "@/store/action/flowDataAction";
import { userDetails } from "@/store/action/userDetailsAction";
import { storeMarketingRefUserAction } from "@/store/action/marketingRefAction";
import { getAllIntegrationDataAction } from "@/store/action/integrationAction";
import { getPrebuiltPromptsAction } from "@/store/action/prebuiltPromptAction";
import { useEmbedScriptLoader } from "@/customHooks/embedScriptLoader";
import ServiceInitializer from "@/components/organization/ServiceInitializer";
import { getAllAuthData } from "@/store/action/authkeyAction";

const Navbar = dynamic(() => import("@/components/Navbar"), { loading: () => <LoadingSpinner /> });
const MainSlider = dynamic(() => import("@/components/sliders/MainSlider"), { loading: () => <LoadingSpinner /> });
const ChatDetails = dynamic(() => import("@/components/historyPageComponents/ChatDetails"), {
  loading: () => <LoadingSpinner />,
});
const KeyboardShortcutsModal = dynamic(() => import("@/components/modals/KeyboardShortcutsModal"), {
  loading: () => <LoadingSpinner />,
});

function layoutOrgPage({ children, params, searchParams, isEmbedUser, isFocus }) {
  const dispatch = useDispatch();
  const pathName = usePathname();
  const urlParams = useParams();
  const path = pathName.split("?")[0].split("/");
  const [selectedItem, setSelectedItem] = useState(null);
  const [isSliderOpen, setIsSliderOpen] = useState(false);
  const [isValidOrg, setIsValidOrg] = useState(true);
  const [loading, setLoading] = useState(true);

  const resolvedParams = use(params);
  const resolvedSearchParams = useSearchParams();

  const {
    embedToken,
    alertingEmbedToken,
    versionData,
    organizations,
    preTools,
    currentUser,
    SERVICES,
    doctstar_embed_token,
    currrentOrgDetail,
  } = useCustomSelector((state) => ({
    embedToken: state?.bridgeReducer?.org?.[resolvedParams?.org_id]?.embed_token,
    alertingEmbedToken: state?.bridgeReducer?.org?.[resolvedParams?.org_id]?.alerting_embed_token,
    versionData:
      state?.bridgeReducer?.bridgeVersionMapping?.[path[5]]?.[resolvedSearchParams?.get("version")]?.apiCalls || {},
    organizations: state.userDetailsReducer.organizations,
    preTools:
      state?.bridgeReducer?.bridgeVersionMapping?.[path[5]]?.[resolvedSearchParams?.get("version")]?.pre_tools || [],
    SERVICES: state?.serviceReducer?.services,
    currentUser: state.userDetailsReducer.userDetails,
    doctstar_embed_token: state?.bridgeReducer?.org?.[resolvedParams.org_id]?.doctstar_embed_token || "",
    currrentOrgDetail: state?.userDetailsReducer?.organizations?.[resolvedParams.org_id],
  }));
  useEffect(() => {
    if (!isEmbedUser) {
      dispatch(getTutorialDataAction());
    }
    if (pathName.endsWith("agents")) {
      dispatch(getFinishReasonsAction());
    }
    if (pathName.endsWith("agents") && !isEmbedUser) {
      dispatch(getGuardrailsTemplatesAction());
      dispatch(userDetails());
      dispatch(getDescriptionsAction());
    }
    dispatch(getLinksAction());

    if (pathName.endsWith("apikeys") && !isEmbedUser) {
      dispatch(getApiKeyGuideAction());
    }
  }, [pathName]);
  useEffect(() => {
    const updateUserMeta = async () => {
      // Skip user meta updates for embed users
      if (isEmbedUser) return;

      const unlimited_access = getFromCookies("unlimited_access");
      const utmSource = getFromCookies("utm_source");
      const utmMedium = getFromCookies("utm_medium");
      const utmCampaign = getFromCookies("utm_campaign");
      const utmTerm = getFromCookies("utm_term");
      const utmContent = getFromCookies("utm_content");
      let currentUserMeta = currentUser?.meta;

      // Build UTM object with only present values from URL that are NOT already in user meta
      const utmParams = {};
      const paramsUpdate = {};
      if (utmSource && !currentUser?.meta?.utm_source) utmParams.utm_source = utmSource;
      if (utmMedium && !currentUser?.meta?.utm_medium) utmParams.utm_medium = utmMedium;
      if (utmCampaign && !currentUser?.meta?.utm_campaign) utmParams.utm_campaign = utmCampaign;
      if (utmTerm && !currentUser?.meta?.utm_term) utmParams.utm_term = utmTerm;
      if (utmContent && !currentUser?.meta?.utm_content) utmParams.utm_content = utmContent;
      if (unlimited_access && !currrentOrgDetail?.meta?.unlimited_access)
        paramsUpdate.unlimited_access = unlimited_access;

      // Check if we need to update user meta (either null meta or new UTM params
      try {
        // If UTM params exist, store marketing ref first
        if (!currentUser?.meta) {
          await dispatch(
            storeMarketingRefUserAction({
              ...utmParams,
              client_id: currentUser.id,
              client_email: currentUser.email,
              client_name: currentUser.name,
              created_at: currentUser.created_at,
            })
          );
        }

        // Single call to update user meta with all data
        const updatedUser = {
          ...currentUser,
          meta: {
            // If meta is null, initialize onboarding, otherwise use existing meta
            ...(currentUser?.meta === null
              ? {
                  onboarding: {
                    bridgeCreation: true,
                    FunctionCreation: true,
                    knowledgeBase: true,
                    Addvariables: true,
                    AdvanceParameter: true,
                    PauthKey: true,
                    CompleteBridgeSetup: true,
                    TestCasesSetup: true,
                  },
                }
              : currentUserMeta),
            // Add UTM params if they exist
            ...utmParams,
            ...paramsUpdate,
          },
        };
        if (paramsUpdate?.unlimited_access && !currrentOrgDetail?.meta?.unlimited_access) {
          const updatedOrgDetails = {
            ...currrentOrgDetail,
            meta: {
              ...currrentOrgDetail?.meta,
              unlimited_access: true,
            },
          };
          dispatch(updateOrgMetaAction(resolvedParams.org_id, updatedOrgDetails));
          removeCookie("unlimited_access");
        }

        const data =
          currentUserMeta === null || Object.keys(utmParams).length > 0 || Object.keys(paramsUpdate).length > 0
            ? await dispatch(updateUserMetaOnboarding(currentUser.id, updatedUser))
            : null;
        if (data?.data?.status) {
          currentUserMeta = data?.data?.data?.user?.meta;
        }
      } catch (err) {
        console.error("Error updating user meta:", err);
      }
    };

    updateUserMeta();
  }, []);

  useEmbedScriptLoader(
    pathName.includes("agents") ? embedToken : pathName.includes("alerts") && !isEmbedUser ? alertingEmbedToken : "",
    isEmbedUser,
    currrentOrgDetail?.role_name === "Viewer"
  );

  useRtLayerEventHandler();

  useEffect(() => {
    const validateOrg = async () => {
      try {
        if (!organizations) {
          return;
        }
        const orgExists = organizations[resolvedParams?.org_id];
        if (orgExists) {
          setIsValidOrg(true);
        } else {
          setIsValidOrg(false);
        }
      } catch (error) {
        console.error("Failed to validate organization", error);
        setIsValidOrg(false);
      }
    };
    if (resolvedParams.org_id && organizations && !isEmbedUser) {
      validateOrg();
    }
  }, [resolvedParams, organizations]);

  useEffect(() => {
    if (!SERVICES || Object?.entries(SERVICES)?.length === 0) {
      dispatch(getServiceAction());
    }
  }, [SERVICES]);

  useEffect(() => {
    if (isValidOrg) {
      dispatch(
        getAllBridgesAction((data) => {
          setLoading(false);
        })
      );
      dispatch(getAllFunctions());
    }
  }, [isValidOrg, !isEmbedUser ? currentUser?.meta?.onboarding?.bridgeCreation : true]);

  useEffect(() => {
    if (isValidOrg && resolvedParams?.org_id) {
      dispatch(getAllApikeyAction(resolvedParams?.org_id));
      dispatch(getAllKnowBaseDataAction(resolvedParams?.org_id));
      dispatch(getPrebuiltToolsAction());
      if (!isEmbedUser) {
        currrentOrgDetail?.role_name != "Viewer" && dispatch(getAllAuthData(resolvedParams?.org_id));
        dispatch(getAllIntegrationDataAction(resolvedParams.org_id));
        dispatch(getPrebuiltPromptsAction());
        dispatch(getUsersAction());
      }
    }
  }, [isValidOrg, dispatch, resolvedParams?.org_id]);

  const scriptId = "chatbot-main-script";
  const scriptSrc = process.env.NEXT_PUBLIC_CHATBOT_SCRIPT_SRC;

  useEffect(() => {
    if (isValidOrg && !isEmbedUser) {
      const updateScript = (token) => {
        const existingScript = document.getElementById(scriptId);
        if (existingScript) {
          document.head.removeChild(existingScript);
        }
        if (token) {
          const script = document.createElement("script");
          script.setAttribute("embedToken", token);
          script.setAttribute("hideIcon", true);
          script.setAttribute("eventsToSubscribe", JSON.stringify(["MESSAGE_CLICK"]));
          script.id = scriptId;
          script.src = scriptSrc;
          document.head.appendChild(script);
        }
      };

      dispatch(getAllChatBotAction(resolvedParams.org_id)).then((e) => {
        const chatbotToken = e?.chatbot_token;
        if (chatbotToken && !pathName.includes("/history")) updateScript(chatbotToken);
      });

      return () => {
        if (!pathName.includes("/history")) {
          const existingScript = document.getElementById(scriptId);
          if (existingScript) {
            // document.head.removeChild(existingScript);
          }
        }
      };
    }
  }, [isValidOrg]);

  useEffect(() => {
    const onFocus = async () => {
      if (isValidOrg && !isEmbedUser) {
        const orgId = getFromCookies("current_org_id");
        if (orgId !== resolvedParams?.org_id) {
          await switchOrg(resolvedParams?.org_id);
          const currentOrg = organizations[resolvedParams?.org_id];
          const localToken = await switchUser({ orgId: resolvedParams?.org_id, orgName: currentOrg?.name });
          setInCookies("local_token", localToken.token);
        }
      }
    };
    // Only add focus listener for non-embed users
    if (!isEmbedUser) {
      window.addEventListener("focus", onFocus);
    }
    return () => {
      if (!isEmbedUser) {
        window.removeEventListener("focus", onFocus);
      }
    };
  }, [isValidOrg, resolvedParams]);
  const docstarScriptId = "docstar-main-script";
  const docstarScriptSrc = "https://techdoc.walkover.in/scriptProd.js";
  useEffect(() => {
    const existingScript = document.getElementById(docstarScriptId);
    if (existingScript) {
      document.head.removeChild(existingScript);
    }
    if (doctstar_embed_token && !isEmbedUser) {
      const script = document.createElement("script");
      script.setAttribute("embedToken", doctstar_embed_token);
      script.id = docstarScriptId;
      script.src = docstarScriptSrc;
      document.head.appendChild(script);
    }
  }, [doctstar_embed_token, isEmbedUser]);

  useEffect(() => {
    if (isValidOrg) {
      window.addEventListener("message", handleMessage);
      return () => {
        window.removeEventListener("message", handleMessage);
      };
    }
  }, [isValidOrg, resolvedParams.id, versionData, resolvedSearchParams.get("version"), path]);
  async function handleMessage(e) {
    if (e.data?.metadata?.type !== "tool") return;
    // todo: need to make api call to update the name & description
    if (e?.data?.webhookurl) {
      const dataToSend = {
        ...e.data,
        status: e?.data?.action,
      };
      dispatch(integrationAction(dataToSend, resolvedParams?.org_id));
      if (e?.data?.action === "deleted") {
        if (versionData && typeof versionData === "object" && !Array.isArray(versionData)) {
          const selectedVersionData = Object.values(versionData).find((fn) => fn.script_id === e?.data?.id);
          if (selectedVersionData) {
            //This condition will delete the tools and preTools..
            await dispatch(
              updateBridgeVersionAction({
                bridgeId: path[5],
                versionId: resolvedSearchParams?.get("version"),
                dataToSend: {
                  functionData: {
                    function_id: selectedVersionData._id,
                    function_name: selectedVersionData.script_id,
                  },
                },
              })
            );
            if (preTools.includes(selectedVersionData?._id)) {
              dispatch(
                updateApiAction(path[5], {
                  pre_tools: selectedVersionData?._id,
                  status: "0",
                  version_id: resolvedSearchParams?.get("version"),
                })
              );
            }
          } else {
            dispatch(
              updateApiAction(path[5], {
                pre_tools: preTools[0],
                status: "0",
                version_id: resolvedSearchParams?.get("version"),
              })
            );
          }
          dispatch(
            deleteFunctionAction({ script_id: e?.data?.id, orgId: path[2], functionId: selectedVersionData?._id })
          );
        }
      }

      if (
        e?.data?.action === "published" ||
        e?.data?.action === "paused" ||
        e?.data?.action === "created" ||
        e?.data?.action === "updated"
      ) {
        const dataFromEmbed = {
          url: e?.data?.webhookurl,
          payload: e?.data?.payload,
          desc: e?.data?.description || e?.data?.title,
          id: e?.data?.id,
          status: e?.data?.action,
          title: e?.data?.title,
        };
        dispatch(createApiAction(resolvedParams.org_id, dataFromEmbed)).then((data) => {
          if (!versionData?.[data?._id] && (!Array.isArray(preTools) || !preTools?.includes(data?._id))) {
            {
              e?.data?.metadata?.createFrom && e.data.metadata.createFrom === "preFunction"
                ? dispatch(
                    updateApiAction(path[5], {
                      pre_tools: data?._id,
                      status: "1",
                      version_id: resolvedSearchParams?.get("version"),
                    })
                  )
                : dispatch(
                    updateBridgeVersionAction({
                      bridgeId: path[5],
                      versionId: resolvedSearchParams?.get("version"),
                      dataToSend: {
                        functionData: {
                          function_id: data?._id,
                          function_operation: "1",
                        },
                      },
                    })
                  );
            }
          }
        });
      }
    }
    if (e.data?.type === "MESSAGE_CLICK") {
      try {
        const systemPromptResponse = await getSingleMessage({
          bridge_id: urlParams?.id,
          message_id: e?.data?.data?.createdAt,
        });
        setSelectedItem({ "System Prompt": systemPromptResponse, ...e?.data?.data });
        setIsSliderOpen(true);
      } catch (error) {
        console.error("Failed to fetch single message:", error);
      }
    }
  }

  if (!isValidOrg && !isEmbedUser) {
    return <ErrorPage></ErrorPage>;
  }

  const themeUserType = isEmbedUser ? "embed" : "default";

  if (!isEmbedUser) {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        <ThemeManager userType={themeUserType} />
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="flex flex-col h-full z-high">
            <MainSlider resolvedParams={resolvedParams} />
          </div>

          {/* Main Content Area */}
          <div
            className={`flex-1 ${path.length > 4 ? "ml-0  md:ml-12 lg:ml-12" : ""} flex flex-col overflow-hidden z-medium`}
          >
            <div className="sticky top-0 z-medium bg-base-100 border-b border-base-300 ml-2">
              <Navbar params={resolvedParams} searchParams={resolvedSearchParams} />
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              <main
                className={`px-2 h-full ${path.length > 4 && !isFocus && !pathName.includes("orchestratal_model") ? "max-h-[calc(100vh-2rem)]" : ""} ${!pathName.includes("history") ? "overflow-y-auto" : "overflow-y-hidden"}`}
              >
                {children}
              </main>
            </div>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <LoadingSpinner />
          </div>
        ) : null}

        {/* Chat Details Sidebar */}
        <ChatDetails selectedItem={selectedItem} setIsSliderOpen={setIsSliderOpen} isSliderOpen={isSliderOpen} />
        <ServiceInitializer />
        <KeyboardShortcutsModal />
      </div>
    );
  } else {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        <ThemeManager userType={themeUserType} />
        {/* Main Content Area for Embed Users */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Sticky Navbar */}
          <div className="sticky top-0 z-medium bg-base-100 border-b border-base-300 ml-2">
            <Navbar params={resolvedParams} searchParams={resolvedSearchParams} />
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <LoadingSpinner />
              </div>
            ) : (
              <main
                className={`px-2 h-full ${path.length > 4 && !isFocus && !pathName.includes("orchestratal_model") ? "max-h-[calc(100vh-2rem)]" : ""} ${!pathName.includes("history") ? "overflow-y-auto" : "overflow-y-hidden"}`}
              >
                {children}
              </main>
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default Protected(layoutOrgPage);
