// hooks/useRtLayerEventHandler.js
"use client";
import { addThreadNMessageUsingRtLayer, addThreadUsingRtLayer } from "@/store/reducer/historyReducer";
import { setFallbackData } from "@/store/reducer/chatReducer";
import {
  handleRtLayerMessage,
  handleRtLayerStreamChunk,
  setChatTestCaseIdAction,
  addChatErrorMessage,
  handleRtLayerFunctionCall,
} from "@/store/action/chatAction";
import { updateApiKeyStatusReducer } from "@/store/reducer/apiKeysReducer";
import {
  testRunStartedReducer,
  testRunResultReducer,
  testRunCompletedReducer,
  testRunFailedReducer,
  directTestResultReducer,
} from "@/store/reducer/testCasesReducer";
import { updateAnalyticsFromRtLayer, addAnalyticsThread } from "@/store/reducer/analyticsReducer";

import { usePathname } from "next/navigation";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import WebSocketClient from "rtlayer-client";
import { toast } from "react-toastify";
import { didCurrentTabInitiateUpdate } from "@/utils/utility";
import { RefreshIcon } from "@/components/Icons";
import { buildLlmUrls } from "@/utils/attachmentUtils";
import { getModelAction } from "@/store/action/modelAction";
import { getServiceAction } from "@/store/action/serviceAction";
import { useDispatch, useSelector } from "react-redux";

// ---------------------------------------------------------------------------
// Module-level registry: channelId → { client, refCount }
// Shared across all hook instances so the same WebSocket client is reused
// whenever multiple components subscribe to the same channel.
// ---------------------------------------------------------------------------
const channelClientRegistry = new Map(); // Map<channelId, { client, refCount }>

function useRtLayerEventHandler(channelIdentifier = "") {
  const [client, setClient] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const dispatch = useDispatch();
  const pathName = usePathname();
  const listenerRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const SERVICES = useSelector((state) => state.serviceReducer.services);

  // Extract path parameters with error handling
  const { bridgeId, orgId } = useMemo(() => {
    try {
      const path = pathName.split("?")[0].split("/");
      return {
        bridgeId: path[5],
        orgId: path[2],
      };
    } catch (error) {
      console.error("Error parsing path parameters:", error);
      return { bridgeId: null, orgId: null };
    }
  }, [pathName]);

  // Memoize channel ID to prevent unnecessary recalculations
  const channelId = useMemo(() => {
    if (
      channelIdentifier &&
      channelIdentifier !== "" &&
      !channelIdentifier.includes("undefined") &&
      !channelIdentifier.includes("null")
    ) {
      return channelIdentifier;
    }
    if (!bridgeId || !orgId) return null;
    return (orgId + "_" + bridgeId).replace(/ /g, "_");
  }, [bridgeId, orgId, channelIdentifier]);

  // Helper function to show toast notification
  const showAgentUpdatedToast = useCallback(() => {
    if (!toast.isActive("agent-updated")) {
      const RefreshButton = () => {
        const handleRefresh = () => {
          toast.dismiss("agent-updated");
          window.location.reload();
        };
        return (
          <div className="mt-2 flex justify-center">
            <button onClick={handleRefresh} className="btn btn-primary btn-sm">
              <RefreshIcon size={16} />
              Refresh Page
            </button>
          </div>
        );
      };
      toast.info(
        <div className="">
          <div className="">Agent has been updated. Please refresh to see changes.</div>
          <RefreshButton />
        </div>,
        {
          position: "top-right",
          autoClose: false,
          hideProgressBar: false,
          closeOnClick: false,
          pauseOnHover: true,
          draggable: true,
          toastId: "agent-updated",
          style: { border: "1px solid #ccc" },
        }
      );
    }
  }, []);

  // ---------- History data processor (socket messages) ----------
  const processHistoryData = useCallback(
    (message) => {
      try {
        const parsedData = typeof message === "string" ? JSON.parse(message) : message;

        if (
          parsedData.type === "summary" ||
          parsedData.type === "requests_over_time" ||
          parsedData.type === "response_time"
        ) {
          dispatch(updateAnalyticsFromRtLayer(parsedData));
          return;
        }

        const { response, error, event } = parsedData;

        // Intercept intermediate function calls/reasoning updates
        if (response && response.function_call === true && !response.data) {
          const channelId = channelIdentifier;
          if (channelId) {
            dispatch(handleRtLayerFunctionCall(channelId, response));
          }
          return;
        }

        // ---------- Testcase run events (RTLayer-driven) ----------
        // Channel name from backend is `${org_id}_${bridge_id}`. We trust the
        // bridge_id present in the payload, falling back to the parsed path.
        if (
          event === "run_started" ||
          event === "testcase_result" ||
          event === "run_completed" ||
          event === "run_failed"
        ) {
          const runBridgeId = parsedData.bridge_id || bridgeId;
          if (!runBridgeId) return;
          if (event === "run_started") {
            // Don't overwrite testcaseId if it's already set in the run state
            // This preserves the original testcase ID sent from the UI
            dispatch(
              testRunStartedReducer({
                bridgeId: runBridgeId,
                total: parsedData.total_testcases,
                versionIds: parsedData.version_ids,
                testcaseId: parsedData.testcase_id || null,
                preserveTestcaseId: true, // Flag to preserve existing testcaseId
              })
            );
          } else if (event === "testcase_result") {
            dispatch(
              testRunResultReducer({
                bridgeId: runBridgeId,
                versionId: parsedData.version_id,
                result: parsedData.result,
                model: parsedData.model,
                service: parsedData.service || parsedData.service_name,
                isOverridden: parsedData.is_overridden,
              })
            );
            // Also store in direct test results for testcases that don't exist in database
            dispatch(
              directTestResultReducer({
                bridgeId: runBridgeId,
                versionId: parsedData.version_id,
                result: parsedData.result,
              })
            );
          } else if (event === "run_completed") {
            dispatch(testRunCompletedReducer({ bridgeId: runBridgeId, payload: parsedData }));
            toast.success("Test run completed");
          } else if (event === "run_failed") {
            const errMsg =
              typeof parsedData.error === "string" ? parsedData.error : parsedData.error?.message || "Test run failed";
            dispatch(testRunFailedReducer({ bridgeId: runBridgeId, error: errMsg }));
            toast.error(errMsg);
          }
          return;
        }

        // Handle streaming events early
        if (event) {
          const channelId = channelIdentifier;
          if (channelId) {
            if (event === "start") {
              // Create loading/streaming message
              const messageData = {
                id: parsedData.message_id,
                content: "",
                role: "assistant",
                model: parsedData.model,
                isLoading: true,
                isStreaming: true,
                fromRTLayer: true,
              };
              dispatch(handleRtLayerMessage(channelId, messageData));
              return;
            } else if (event === "delta") {
              dispatch(handleRtLayerStreamChunk(channelId, parsedData.message_id, parsedData.content || ""));
              return;
            } else if (event === "fallback") {
              dispatch(
                setFallbackData({
                  channelId,
                  messageId: parsedData.message_id,
                  fallbackData: {
                    fallback: true,
                    firstAttemptError: parsedData.error,
                    modelName: parsedData.to_model,
                    model: parsedData.to_model,
                    fromModel: parsedData.from_model,
                    fromService: parsedData.from_service,
                    toService: parsedData.to_service,
                  },
                })
              );
              return;
            } else if (event === "error") {
              const errorMessage =
                parsedData.error || parsedData.fallback_error || "An error occurred during streaming";
              dispatch(addChatErrorMessage(channelId, errorMessage));
              return;
            }
            // For 'done' event, let it fall through as it contains the 'response' object and can be processed normally.
          }
        }

        if (!response && !error) {
          console.error("No response found in data");
          return { success: false, error: "No response found" };
        }
        if (error) {
          const errorMessage =
            typeof error === "string" ? error : error?.error || error?.message || JSON.stringify(error);
          dispatch(addChatErrorMessage(channelIdentifier, errorMessage));
          return;
        }
        const { Thread, Messages, type } = response;

        // Handle agent_updated type
        if (type === "agent_updated") {
          const agentId = response.version_id || response.bridge_id;
          const currentTabInitiated = didCurrentTabInitiateUpdate(String(agentId));
          if (currentTabInitiated) {
            return;
          } else {
            const isConfigPage = typeof pathName === "string" && pathName.includes("/configure/");
            if (isConfigPage) {
              // showAgentUpdatedToast();
            }
          }
          return;
        }

        // Handle new history data format (direct message in response)
        if (response.message_id) {
          // Create thread data from response
          const threadData = {
            thread_id: response.thread_id,
            sub_thread_id: response.sub_thread_id || response.thread_id,
            bridge_id: response.bridge_id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          const llmUrls = buildLlmUrls(response.image_urls || [], []);

          // Create message data from response
          const messageData = {
            id: response.message_id,
            user: response.user,
            llm_message: response.llm_message,
            chatbot_message: response.chatbot_message,
            updated_llm_message: response.updated_llm_message,
            error: response.error,
            tools_call_data: response.tools_call_data || [],
            llm_urls: llmUrls,
            urls: response.urls || [],
            user_feedback: response.user_feedback,
            version_id: response.version_id,
            org_id: response.org_id,
            bridge_id: response.bridge_id,
            prompt: response.prompt,
            AiConfig: response.AiConfig,
            fallback_model: response.fallback_model,
            model: response.model,
            status: response.status,
            tokens: response.tokens,
            variables: response.variables,
            latency: response.latency,
            firstAttemptError: response.firstAttemptError,
            finish_reason: response.finish_reason,
            parent_id: response.parent_id,
            child_id: response.child_id,
            fromRTLayer: true,
            created_at: new Date().toISOString(), // Add timestamp
          };

          // Dispatch to history reducer
          if (threadData.thread_id) {
            dispatch(addThreadUsingRtLayer({ Thread: threadData }));

            // Also push to analytics sidebar so rerun threads appear there too
            const analyticsThread = {
              thread_id: threadData.thread_id,
              sub_thread_id: threadData.sub_thread_id,
              updated_at: threadData.updated_at,
              created_at: threadData.created_at,
            };
            dispatch(addAnalyticsThread({ bridge_id: bridgeId, thread: analyticsThread }));

            // Create Messages object in the format expected by the reducer
            const Messages = {
              [response.message_id]: messageData,
            };

            dispatch(
              addThreadNMessageUsingRtLayer({
                thread_id: threadData.thread_id,
                sub_thread_id: threadData.sub_thread_id,
                Messages,
              })
            );
          }
          return;
        }

        // Handle chat messages for dry run (non-orchestral)
        if (response.data) {
          const channelId = channelIdentifier;
          if (response.data) {
            // Process the response data structure - handle image_urls format with permanent_url
            let rawImages = [];

            if (Array.isArray(response.data.image_urls)) {
              rawImages = response.data.image_urls
                .map((imageObj) => {
                  // Extract permanent_url or fallback to image_url
                  return imageObj.permanent_url || imageObj.image_url || imageObj;
                })
                .filter(Boolean);
            }

            const toolCalls = [];
            if (response.data.tools_data) {
              Object.entries(response.data.tools_data).forEach(([toolName, toolResult]) => {
                toolCalls.push({
                  call_id: toolName,
                  name: toolName,
                  status: "done",
                  result: typeof toolResult === "string" ? toolResult : JSON.stringify(toolResult),
                });
              });
            }

            const llmUrls = buildLlmUrls(rawImages, []);
            const messageData = {
              id: response.data.id || response.data.message_id || parsedData.message_id,
              // Preserve the backend message_id (UUID) separately from the
              // upstream provider id (which may be an OpenAI `resp_...` id).
              // Needed for creating testcases (backend resolves ai_config
              // via historyService.findHistoryByMessageId).
              message_id: parsedData.message_id || response.data.message_id || response.data.id,
              content: response.data.content,
              role: response.data.role || "assistant",
              model: response.data.model,
              finish_reason: response.data.finish_reason || parsedData.finish_reason,
              fallback: response.data.fall_back || response.data.fallback,
              firstAttemptError: response.data.firstAttemptError,
              images: rawImages,
              llm_urls: llmUrls,
              tools_data: response.data.tools_data || {},
              toolCalls: toolCalls,
              annotations: response.data.annotations,
              fromRTLayer: true,
              usage: parsedData.response?.usage || parsedData.usage, // Include usage data if available
              type: response?.type || parsedData.type,
              ai_response: response?.ai_response || {},
            };
            if (channelId) {
              // Dispatch to chat reducer - this will clear loading
              dispatch(handleRtLayerMessage(channelId, messageData));
            }
          } else if (Messages && Array.isArray(Messages)) {
            // Fallback for old message format
            if (channelId) {
              Messages.forEach((msg) => {
                msg.fromRTLayer = true;
                dispatch(handleRtLayerMessage(channelId, msg));
              });
            }
          }
          return;
        }

        // Handle testcase_id from RT layer response
        if (response.testcase_id) {
          const channelId = channelIdentifier;
          if (channelId) {
            dispatch(setChatTestCaseIdAction(channelId, response.testcase_id));
          }
        }

        // Handle legacy history data format (existing functionality)
        if (!Thread || !Messages) {
          return;
        }
        Object.keys(Messages).forEach((key) => {
          Messages[key].fromRTLayer = true;
        });

        // Clean the data to reduce serialization overhead
        const cleanThread = {
          thread_id: Thread.thread_id,
          sub_thread_id: Thread.sub_thread_id,
          bridge_id: Thread.bridge_id,
        };

        // Dispatch actions to Redux store (existing history functionality)
        dispatch(addThreadUsingRtLayer({ Thread: cleanThread }));
        dispatch(
          addThreadNMessageUsingRtLayer({
            thread_id: cleanThread.thread_id,
            sub_thread_id: cleanThread.sub_thread_id,
            Messages,
          })
        );
      } catch (error) {
        console.error("Error parsing message data:", error);
      }
    },
    [dispatch, channelIdentifier, pathName, showAgentUpdatedToast]
  );

  // WebSocket client initialization with registry-based deduplication.
  // If a client already exists for the current channelId, it is reused and
  // the reference count is incremented instead of opening a new connection.
  const initializeWebSocketClient = useCallback(
    async (targetChannelId) => {
      try {
        // Clear any existing reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }

        // Reuse existing client for this channel if one is already registered
        if (targetChannelId && channelClientRegistry.has(targetChannelId)) {
          const entry = channelClientRegistry.get(targetChannelId);
          entry.refCount += 1;
          setClient(entry.client);
          setIsConnected(true);
          setConnectionError(null);
          return entry.client;
        }

        const newClient = WebSocketClient("lyvSfW7uPPolwax0BHMC", "DprvynUwAdFwkE91V5Jj");

        // Add connection event handlers
        if (newClient && typeof newClient.on === "function") {
          newClient.on("connect", () => {
            setIsConnected(true);
            setConnectionError(null);
          });

          newClient.on("disconnect", () => {
            setIsConnected(false);
          });

          newClient.on("error", (error) => {
            setConnectionError(error.message || "Connection error");
            setIsConnected(false);
          });
        }

        // Register the new client in the module-level registry
        if (targetChannelId) {
          channelClientRegistry.set(targetChannelId, { client: newClient, refCount: 1 });
        }

        setClient(newClient);
        setIsConnected(true);
        setConnectionError(null);

        return newClient;
      } catch (error) {
        console.error("Failed to initialize WebSocket client:", error);
        setConnectionError(error.message);
        setIsConnected(false);

        // Auto-retry connection after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          initializeWebSocketClient(targetChannelId);
        }, 5000);

        return null;
      }
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Initialize WebSocket client – pass channelId so the registry check can
  // happen before a new connection is opened.
  useEffect(() => {
    let mounted = true;

    if (!client && mounted) {
      initializeWebSocketClient(channelId);
    }

    // Cleanup function
    return () => {
      mounted = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [client, channelId, initializeWebSocketClient]);

  const processHistoryDataRef = useRef(processHistoryData);
  useEffect(() => {
    processHistoryDataRef.current = processHistoryData;
  }, [processHistoryData]);

  // Set up event listener
  useEffect(() => {
    if (!client || !channelId) {
      return;
    }

    try {
      // Remove existing listener if any
      if (listenerRef.current && typeof listenerRef.current.remove === "function") {
        listenerRef.current.remove();
      }

      // Create new listener
      const listener = client.on(channelId, (message) => {
        processHistoryDataRef.current(message);
      });

      listenerRef.current = listener;

      // Cleanup function
      return () => {
        if (listenerRef.current && typeof listenerRef.current.remove === "function") {
          listenerRef.current.remove();
          listenerRef.current = null;
        }
      };
    } catch (error) {
      console.error("Error setting up WebSocket listener:", error);
      setConnectionError(error.message);
    }
  }, [client, channelId]);
  // Listen to global channel for model config updates
  useEffect(() => {
    if (!client) return;

    const globalListener = client.on("global_model_updates", (message) => {
      try {
        // Parse the message
        let parsedData = typeof message === "string" ? JSON.parse(message) : message;

        // Check if this is a model_config_updated event
        if (parsedData?.event === "model_config_updated") {
          // Refresh only the specific service that was updated
          const serviceToRefresh = parsedData.service;

          if (serviceToRefresh) {
            dispatch(getModelAction({ service: serviceToRefresh }));
          } else {
            // Fallback: if no service specified, refresh all services
            if (Array.isArray(SERVICES) && SERVICES.length > 0) {
              SERVICES.forEach((service) => {
                if (service?.value) {
                  dispatch(getModelAction({ service: service.value }));
                }
              });
            } else {
              dispatch(getServiceAction());
            }
          }
        }
      } catch (error) {
        console.error("Error processing model config update:", error);
      }
    });

    return () => {
      if (globalListener && typeof globalListener.remove === "function") {
        globalListener.remove();
      }
    };
  }, [client, dispatch]);

  // Listen to org-level channel for API key status updates
  useEffect(() => {
    if (!client || !orgId) return;

    const orgChannel = `org_${orgId}`;
    const orgListener = client.on(orgChannel, (message) => {
      try {
        const parsedData = typeof message === "string" ? JSON.parse(message) : message;
        if (parsedData?.type === "apikey_status_update") {
          const { apikey_id, status } = parsedData;
          if (apikey_id && status) {
            dispatch(updateApiKeyStatusReducer({ org_id: orgId, apikey_id, status }));
          }
        }
      } catch (error) {
        console.error("Error processing apikey status update:", error);
      }
    });

    return () => {
      if (orgListener && typeof orgListener.remove === "function") {
        orgListener.remove();
      }
    };
  }, [client, orgId, dispatch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear any pending reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      // Remove listener
      if (listenerRef.current && typeof listenerRef.current.remove === "function") {
        listenerRef.current.remove();
      }

      // Decrement the ref-count in the registry. Only close the underlying
      // WebSocket client when no other hook instances are still using it.
      if (channelId && channelClientRegistry.has(channelId)) {
        const entry = channelClientRegistry.get(channelId);
        entry.refCount -= 1;
        if (entry.refCount <= 0) {
          channelClientRegistry.delete(channelId);
          if (client && typeof client.close === "function") {
            client.close();
          }
        }
      } else if (client && typeof client.close === "function") {
        // Fallback: close if not tracked in registry (e.g. channelId was null)
        client.close();
      }
    };
  }, [client, channelId]);

  // Manual reconnect function – removes the channel from the registry so a
  // fresh connection is created on the next initialization.
  const reconnect = useCallback(() => {
    if (channelId && channelClientRegistry.has(channelId)) {
      channelClientRegistry.delete(channelId);
    }
    if (client && typeof client.close === "function") {
      client.close();
    }
    setClient(null);
    setIsConnected(false);
    setConnectionError(null);

    // Initialize new client
    setTimeout(() => {
      initializeWebSocketClient(channelId);
    }, 100);
  }, [client, channelId, initializeWebSocketClient]);

  // Return connection status and methods for external use
  return {
    client,
    isConnected,
    connectionError,
    reconnect,
    channelId,
    processHistoryData, // Expose for manual processing if needed
    bridgeId,
    orgId,
  };
}

export default useRtLayerEventHandler;
