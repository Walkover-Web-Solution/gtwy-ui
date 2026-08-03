import {
  addorRemoveResponseIdInBridge,
  archiveBridgeApi,
  createAgentFromTemplateApi,
  createBridge,
  createBridgeVersionApi,
  createDuplicateBridge,
  createapi,
  deleteBridge,
  deleteBridgeVersionApi,
  deleteFunctionApi,
  discardBridgeVersionApi,
  fetchBridgeUsageMetricsApi,
  genrateSummary,
  getAgentsVersionsByFunctions,
  getAllBridges,
  getAllFunctionsApi,
  getAllResponseTypesApi,
  getBridgeVersionApi,
  getPrebuiltToolsApi,
  getSingleBridge,
  getTestcasesScrore,
  integration,
  publishBridgeVersionApi,
  publishBulkVersionApi,
  submitPostPublishFeedbackApi,
  updateBridge,
  updateBridgeVersionApi,
  updateFunctionApi,
  updateapi,
  uploadImage,
} from "@/config/index";
import { toast } from "react-toastify";
import posthog, { trackAgentEvent } from "@/utils/posthog";
import { handleApiError, isNetworkError } from "@/utils/errorHandler";
import {
  backupBridgeVersionReducer,
  bridgeVersionRollBackReducer,
  clearBridgeUsageMetricsReducer,
  clearPreviousBridgeDataReducer,
  createBridgeReducer,
  createBridgeVersionReducer,
  deleteBridgeReducer,
  deleteBridgeVersionReducer,
  duplicateBridgeReducer,
  fetchAllBridgeReducer,
  fetchAllFunctionsReducer,
  fetchAgentsVersionsDataReducer,
  fetchSingleBridgeReducer,
  fetchSingleBridgeVersionReducer,
  getPrebuiltToolsReducer,
  integrationReducer,
  isError,
  isPending,
  publishBrigeVersionReducer,
  removeFunctionDataReducer,
  setSavingStatus,
  setBridgeUsageMetricsReducer,
  updateBridgeReducer,
  updateBridgeToolsReducer,
  updateBridgeVersionReducer,
  updateFunctionReducer,
} from "../reducer/bridgeReducer";
import { getAllResponseTypeSuccess } from "../reducer/responseTypeReducer";
import { markUpdateInitiatedByCurrentTab } from "@/utils/utility";
import { callViasocketCreateFullFlow } from "@/config/utilityApi";

const AGENT_CREATE_RT_TIMEOUT_MS = 5 * 60 * 1000;

/** Waits for agent_created / agent_create_failed from useRtLayerEventHandler (org channel). */
function waitForAgentCreateRtResult() {
  return new Promise((resolve, reject) => {
    let timeoutId;
    const finish = (callback, value) => {
      clearTimeout(timeoutId);
      window.removeEventListener("gtwy:agent-created", onCreated);
      window.removeEventListener("gtwy:agent-create-failed", onFailed);
      callback(value);
    };
    const onCreated = (event) => finish(resolve, event.detail);
    const onFailed = (event) => finish(reject, new Error(event.detail || "Failed to create agent"));

    timeoutId = setTimeout(
      () => finish(reject, new Error("Agent creation timed out. Please try again.")),
      AGENT_CREATE_RT_TIMEOUT_MS
    );
    window.addEventListener("gtwy:agent-created", onCreated);
    window.addEventListener("gtwy:agent-create-failed", onFailed);
  });
}

async function finishCreateBridgeWithAi(dispatch, orgId, agent) {
  const data = { data: { success: true, agent }, status: 200, statusText: "OK" };
  dispatch(createBridgeReducer({ data, orgId }));
  await dispatch(getAllFunctions());
  return data;
}

//   ---------------------------------------------------- ADMIN ROUTES ---------------------------------------- //
export const getSingleBridgesAction =
  ({ id, version }) =>
  async (dispatch, getState) => {
    try {
      dispatch(clearPreviousBridgeDataReducer());
      dispatch(isPending());
      const data = await getSingleBridge(id);
      dispatch(fetchSingleBridgeReducer({ bridge: data.data?.agent }));
      getBridgeVersionAction({ versionId: version || data.data?.agent?.published_version_id })(dispatch);
    } catch (error) {
      dispatch(isError());
      if (isNetworkError(error)) {
        handleApiError(error, "Failed to load agent");
      }
      console.error("Error in getSingleBridgesAction:", error);
      throw error.response;
    }
  };

export const getBridgeVersionAction =
  ({ versionId }) =>
  async (dispatch) => {
    try {
      dispatch(isPending());
      if (!versionId || versionId === "null") {
        return;
      }
      const data = await getBridgeVersionApi({ bridgeVersionId: versionId });
      dispatch(fetchSingleBridgeVersionReducer({ bridge: data?.agent }));
      return data?.agent;
    } catch (error) {
      dispatch(isError());
      console.error(error);
    }
  };

export const createAgentFromTemplateAction = (templateId, onSuccess) => async (dispatch) => {
  try {
    dispatch(clearPreviousBridgeDataReducer());
    const response = await createAgentFromTemplateApi(templateId);
    const serializableData = {
      data: response.data,
      status: response.status,
      statusText: response.statusText,
    };
    onSuccess(serializableData);
    dispatch(createBridgeReducer({ data: serializableData, orgId: response.data.orgid }));
    if (response?.data?._id) {
      trackAgentEvent("created", {
        agent_id: response.data._id,
        name: response.data.name,
        org_id: response.data.orgid,
      });
    }
  } catch (error) {
    if (error?.response?.data?.message?.includes("duplicate key")) {
      toast.error("Agent Name can't be duplicate");
    } else {
      toast.error(error?.response?.data?.message || "Something went wrong");
    }
    console.error(error);
    throw error;
  }
};

export const createBridgeAction = (dataToSend, onSuccess) => async (dispatch, getState) => {
  try {
    dispatch(clearPreviousBridgeDataReducer());

    // Always expect RT layer response now (backend always returns 202)
    const rtPromise = waitForAgentCreateRtResult();
    const response = await createBridge(dataToSend.dataToSend);

    // Check if backend returned 202 (RT layer response)
    if (response?.status === 202 || response?.data?.accepted) {
      const agent = await rtPromise;
      const serializableData = {
        data: { success: true, agent },
        status: 200,
        statusText: "OK",
      };
      onSuccess(serializableData);
      dispatch(createBridgeReducer({ data: serializableData, orgId: dataToSend.orgid }));
      if (agent?._id) {
        trackAgentEvent("created", {
          agent_id: agent._id,
          name: agent.name,
          org_id: dataToSend.orgid,
        });
      }
    } else {
      // Fallback for direct response (backward compatibility)
      const serializableData = {
        data: response.data,
        status: response.status,
        statusText: response.statusText,
      };
      onSuccess(serializableData);
      dispatch(createBridgeReducer({ data: serializableData, orgId: dataToSend.orgid }));
      if (response?.data?._id) {
        trackAgentEvent("created", {
          agent_id: response.data._id,
          name: response.data.name,
          org_id: dataToSend.orgid,
        });
      }
    }
  } catch (error) {
    if (error?.response?.data?.message?.includes("duplicate key")) {
      toast.error("Agent Name can't be duplicate");
    } else {
      toast.error("Something went wrong");
    }
    console.error(error);
    throw error;
  }
};

export const createBridgeWithAiAction =
  ({ dataToSend, orgId }, onSuccess) =>
  async (dispatch, getState) => {
    try {
      dispatch(clearPreviousBridgeDataReducer());

      // Always expect RT layer response now (backend always returns 202)
      const rtPromise = waitForAgentCreateRtResult();
      const response = await createBridge(dataToSend);

      if (response?.status === 202 || response?.data?.accepted) {
        const agent = await rtPromise;
        return finishCreateBridgeWithAi(dispatch, orgId, agent);
      }

      // Fallback for direct response (backward compatibility)
      const data = response;
      dispatch(createBridgeReducer({ data, orgId: orgId }));
      await dispatch(getAllFunctions());
      return data;
    } catch (error) {
      if (error?.response?.data?.message?.includes("duplicate key")) {
        console.error("Agent Name can't be duplicate fallBack to manual bridge creation");
      } else {
        toast.error("Something went wrong");
      }
      console.error(error);
      throw error;
    }
  };

export const createEmbedAgentAction =
  ({ purpose, agent_name, orgId, isEmbedUser, router, sendDataToParent, meta }) =>
  async (dispatch, getState) => {
    try {
      dispatch(isPending());

      // Generate unique name if not provided

      let response;

      if (purpose && purpose.trim()) {
        // Try AI creation with purpose first
        try {
          const aiDataToSend = {
            purpose: purpose.trim(),
            bridgeType: "api",
            name: agent_name?.trim() || null,
          };
          if (meta) {
            aiDataToSend.meta = meta;
          }

          response = await dispatch(createBridgeWithAiAction({ dataToSend: aiDataToSend, orgId }));

          if (response?.data) {
            const createdAgent = response.data.agent;

            if (isEmbedUser && sendDataToParent) {
              sendDataToParent(
                "drafted",
                {
                  name: createdAgent?.name,
                  agent_id: createdAgent?._id,
                },
                "Agent created Successfully"
              );
            }

            if (router && createdAgent) {
              router.push(`/org/${orgId}/agents/configure/${createdAgent._id}?version=${createdAgent.versions[0]}`);
            }

            return { success: true, agent: createdAgent };
          }
        } catch (aiError) {
          console.log("AI creation failed, falling back to manual creation:", aiError);
          // Fall through to manual creation
        }
      }

      // Manual creation fallback
      const fallbackDataToSend = {
        service: "openai",
        model: "gpt-4o",
        name: agent_name?.trim() || null,
        bridgeType: "api",
        type: "chat",
      };
      if (meta) {
        fallbackDataToSend.meta = meta;
      }

      response = await new Promise((resolve, reject) => {
        dispatch(
          createBridgeAction({ dataToSend: fallbackDataToSend, orgid: orgId }, (data) => {
            resolve(data);
          })
        ).catch(reject);
      });

      if (response?.data) {
        const createdAgent = response.data.agent;

        if (isEmbedUser && sendDataToParent) {
          sendDataToParent(
            "drafted",
            {
              name: createdAgent?.name,
              agent_id: createdAgent?._id,
            },
            "Agent created Successfully"
          );
        }

        if (router && createdAgent) {
          router.push(`/org/${orgId}/agents/configure/${createdAgent._id}?version=${createdAgent.versions[0]}`);
        }

        return { success: true, agent: createdAgent };
      }

      throw new Error("Failed to create agent");
    } catch (error) {
      console.error("Error in createEmbedAgentAction:", error);
      const errorMessage = error?.response?.data?.message || "Error while creating agent";
      toast.error(errorMessage);
      throw error;
    }
  };

export const createBridgeVersionAction = (data, onSuccess) => async (dispatch, getState) => {
  try {
    const dataToSend = {
      version_id: data?.parentVersionId,
      version_description: data?.version_description,
    };
    const result = await createBridgeVersionApi(dataToSend);
    if (result?.success) {
      onSuccess(result);
      dispatch(
        createBridgeVersionReducer({
          newVersionId: result?.version_id,
          parentVersionId: data?.parentVersionId,
          bridgeId: data?.bridgeId,
          version_description: data?.version_description,
          orgId: data?.orgId,
        })
      );
      trackAgentEvent("version_created", {
        agent_id: data?.bridgeId,
        version_id: result?.version_id,
        org_id: data?.orgId,
      });
      toast.success("New version created successfully");
    }
  } catch (error) {
    if (error?.response?.data?.message?.includes("duplicate key")) {
      toast.error("Agent Name can't be duplicate");
    } else {
      toast.error("Something went wrong");
    }
    console.error(error);
    throw error;
  }
};

export const deleteBridgeVersionAction =
  ({ versionId, bridgeId, org_id }) =>
  async (dispatch) => {
    try {
      const response = await deleteBridgeVersionApi({ versionId });
      dispatch(deleteBridgeVersionReducer({ versionId, bridgeId, org_id }));
      toast.success("Version Deleted Successfully");
      return response;
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Error While Deleting Version");
      console.error(error?.response?.data?.detail);
      throw error;
    }
  };

export const getAllBridgesAction = (onSuccess) => async (dispatch) => {
  try {
    dispatch(isPending());
    const response = await getAllBridges();
    const embed_token = response?.data?.embed_token;
    const alerting_embed_token = response?.data?.alerting_embed_token;
    const history_page_chatbot_token = response?.data?.history_page_chatbot_token;
    const triggerEmbedToken = response?.data?.trigger_embed_token;
    const average_response_time = response?.data?.avg_response_time;
    const doctstar_embed_token = response?.data?.doctstar_embed_token;
    const bridgesPayload = response?.data?.agent || [];

    if (onSuccess) onSuccess(bridgesPayload);
    dispatch(
      fetchAllBridgeReducer({
        bridges: bridgesPayload,
        orgId: response?.data?.org_id,
        embed_token,
        doctstar_embed_token,
        alerting_embed_token,
        history_page_chatbot_token,
        triggerEmbedToken,
        average_response_time,
      })
    );

    // Update user properties with agent metrics for user segmentation
    const totalAgents = bridgesPayload.length;
    const publishedAgents = bridgesPayload.filter((agent) => agent.published_version_id).length;

    posthog.setPersonProperties({
      total_agents: totalAgents,
      published_agents: publishedAgents,
      has_agents: totalAgents > 0,
      agents_last_fetched: new Date().toISOString(),
    });

    const integrationData = await integration(embed_token);
    const flowObject = integrationData?.flows?.reduce((obj, item) => {
      obj[item.id] = item;
      return obj;
    }, {});
    dispatch(fetchAllBridgeReducer({ orgId: response?.data?.org_id, integrationData: flowObject }));

    const triggerData = await integration(triggerEmbedToken);
    dispatch(fetchAllBridgeReducer({ orgId: response?.data?.org_id, triggerData: triggerData?.flows || [] }));
  } catch (error) {
    dispatch(isError());
    console.error(error);
  }
};

export const getAllFunctions = () => async (dispatch) => {
  try {
    dispatch(isPending());
    const response = await getAllFunctionsApi();
    const functionsArray = response.data?.data || [];
    const functionsObject = functionsArray.reduce((obj, item) => {
      obj[item._id] = item;
      return obj;
    }, {});
    dispatch(fetchAllFunctionsReducer({ orgId: response?.data?.org_id, functionData: functionsObject }));
  } catch (error) {
    dispatch(isError());
    console.error(error);
  }
};

export const updateFuntionApiAction =
  ({ function_id, dataToSend, embedToken = null }) =>
  async (dispatch) => {
    try {
      const description = dataToSend?.description || "";
      const response = await updateFunctionApi({ function_id, dataToSend });
      dispatch(updateFunctionReducer({ org_id: response.data.org_id, data: response.data }));

      if (embedToken && description) {
        const regenerateResult = await callViasocketCreateFullFlow(embedToken, description);
        if (!regenerateResult.success) {
          console.warn("Failed to regenerate ViaSocket flow:", regenerateResult.error);
        }
      }
    } catch (error) {
      dispatch(isError());
      console.error(error);
    }
  };

export const getAllResponseTypesAction = (orgId) => async (dispatch, getState) => {
  try {
    dispatch(isPending());
    const response = await getAllResponseTypesApi(orgId);
    dispatch(
      getAllResponseTypeSuccess({
        responseTypes: response.data.chatBot?.responseTypes,
        orgId: response.data?.chatBot?.orgId,
      })
    );
  } catch (error) {
    dispatch(isError());
    console.error(error);
  }
};

export const updateBridgeAction =
  ({ bridgeId, dataToSend }) =>
  async (dispatch) => {
    try {
      dispatch(isPending());
      markUpdateInitiatedByCurrentTab(bridgeId);
      const data = await updateBridge({ bridgeId, dataToSend });
      dispatch(updateBridgeReducer({ bridges: data.data.agent, functionData: dataToSend?.functionData || null }));
      trackAgentEvent("updated", {
        agent_id: bridgeId,
        name: data.data.agent?.name,
        update_type: "metadata",
      });
      return { success: true };
    } catch (error) {
      console.error(error);
      dispatch(isError());
      throw error;
    }
  };

export const updateBridgeVersionAction =
  ({ versionId, dataToSend, bridgeId, localOnly = false, skipRollback = false }) =>
  async (dispatch, getState) => {
    try {
      if (!versionId) {
        toast.error("You cannot update published data");
        return;
      }

      // Step 1: Find the parent bridge ID if not provided
      let parentBridgeId = bridgeId;
      if (!parentBridgeId) {
        const state = getState().bridgeReducer;
        for (const bId in state.bridgeVersionMapping) {
          if (state.bridgeVersionMapping[bId][versionId]) {
            parentBridgeId = bId;
            break;
          }
        }
      }

      if (!parentBridgeId) {
        console.error("Could not find parent bridge ID for version:", versionId);
        return;
      }

      if (!localOnly) {
        dispatch(backupBridgeVersionReducer({ bridgeId: parentBridgeId, versionId }));
      }

      const currentVersion = getState().bridgeReducer.bridgeVersionMapping[parentBridgeId][versionId];

      // Build optimistic data with proper deep merging
      const optimisticData = {
        ...currentVersion,
        ...dataToSend,
        _id: versionId,
        parent_id: parentBridgeId,
      };

      // Deep merge configuration if present
      if (dataToSend.configuration) {
        optimisticData.configuration = {
          ...currentVersion.configuration,
          ...dataToSend.configuration,
        };
      }

      // Deep merge agents.connected_agents if present
      if (dataToSend.agents) {
        // Check if this is a removal (no agent_status) or addition (has agent_status)
        const isRemoval = !dataToSend.agents.agent_status;

        // Handle both flat structure (API response) and nested structure (optimistic updates)
        // After refresh: currentVersion.connected_agents (flat)
        // After optimistic update: currentVersion.agents.connected_agents (nested)
        const currentConnectedAgents = currentVersion.agents?.connected_agents || currentVersion.connected_agents || {};

        if (isRemoval && dataToSend.agents.connected_agents) {
          // Remove the specified agent(s)
          const agentsToRemove = Object.keys(dataToSend.agents.connected_agents);
          const updatedConnectedAgents = { ...currentConnectedAgents };

          agentsToRemove.forEach((agentName) => {
            delete updatedConnectedAgents[agentName];
          });

          // Always use nested structure for consistency
          optimisticData.agents = {
            agent_status: currentVersion.agents?.agent_status || currentVersion.agent_status,
            connected_agents: updatedConnectedAgents,
          };
          // Remove flat structure if it exists
          delete optimisticData.connected_agents;
          delete optimisticData.agent_status;
        } else {
          // Add or update agent(s)
          // Merge with existing agents from either location
          const mergedConnectedAgents = {
            ...currentConnectedAgents,
            ...dataToSend.agents.connected_agents,
          };

          // Always use nested structure for consistency
          optimisticData.agents = {
            ...currentVersion.agents,
            ...dataToSend.agents,
            connected_agents: mergedConnectedAgents,
          };
          // Remove flat structure if it exists
          delete optimisticData.connected_agents;
          if (dataToSend.agents.agent_status) {
            delete optimisticData.agent_status;
          }
        }
      }

      // Deep merge variables_path if present
      if (dataToSend.variables_path) {
        optimisticData.variables_path = {
          ...currentVersion.variables_path,
          ...dataToSend.variables_path,
        };
      }

      // Deep merge embed_override if present
      if (dataToSend.embed_override) {
        const currentEmbedOverride = currentVersion.embed_override || {};
        const currentTools = currentEmbedOverride.tools || {};
        optimisticData.embed_override = {
          ...currentEmbedOverride,
          ...dataToSend.embed_override,
          tools: {
            ...currentTools,
            ...(dataToSend.embed_override.tools || {}),
          },
        };
      }

      // Handle function_ids for EmbedList - update optimistically based on functionData
      if (dataToSend.functionData) {
        const currentFunctionIds = currentVersion.function_ids || [];
        if (dataToSend.functionData.function_operation === "1") {
          // Add function if not already present
          if (!currentFunctionIds.includes(dataToSend.functionData.function_id)) {
            optimisticData.function_ids = [...currentFunctionIds, dataToSend.functionData.function_id];
          }
        } else {
          // Remove function
          optimisticData.function_ids = currentFunctionIds.filter((id) => id !== dataToSend.functionData.function_id);
        }
      }

      // Handle doc_ids if present (complete array replacement)
      if (dataToSend.doc_ids !== undefined) {
        optimisticData.doc_ids = dataToSend.doc_ids;
      }

      // Handle built_in_tools_data if present
      if (dataToSend.built_in_tools_data) {
        optimisticData.built_in_tools = currentVersion.built_in_tools || [];
        if (dataToSend.built_in_tools_data.built_in_tools_operation === "1") {
          // Add tool if not already present
          if (!optimisticData.built_in_tools.includes(dataToSend.built_in_tools_data.built_in_tools)) {
            optimisticData.built_in_tools = [
              ...optimisticData.built_in_tools,
              dataToSend.built_in_tools_data.built_in_tools,
            ];
          }
        } else {
          // Remove tool
          optimisticData.built_in_tools = optimisticData.built_in_tools.filter(
            (tool) => tool !== dataToSend.built_in_tools_data.built_in_tools
          );
        }
      }

      // Handle web_search_filters if present (complete array replacement)
      if (dataToSend.web_search_filters !== undefined) {
        optimisticData.web_search_filters = dataToSend.web_search_filters;
      }

      // Handle post_tool if present (complete replacement, not added to function_ids)
      if (dataToSend.post_tool !== undefined) {
        optimisticData.post_tool = dataToSend.post_tool;
      }

      // Handle settings if present (deep merge including nested objects like review_agent)
      if (dataToSend.settings) {
        optimisticData.settings = {
          ...currentVersion.settings,
          ...dataToSend.settings,
        };
        // Deep merge review_agent if present to preserve existing fields
        if (dataToSend.settings.review_agent) {
          optimisticData.settings.review_agent = {
            ...currentVersion.settings?.review_agent,
            ...dataToSend.settings.review_agent,
          };
        }
      }

      // Handle agent_info if present (deep merge)
      if (dataToSend.agent_info) {
        optimisticData.agent_info = {
          ...currentVersion.agent_info,
          ...dataToSend.agent_info,
        };
      }

      dispatch(
        updateBridgeVersionReducer({
          bridges: optimisticData,
          functionData: dataToSend?.functionData || null,
        })
      );

      if (localOnly) {
        return;
      }

      // Show saving indi\ation in navbar
      dispatch(setSavingStatus({ status: "saving" }));

      markUpdateInitiatedByCurrentTab(versionId);

      // Step 5: Make the actual API call
      const data = await updateBridgeVersionApi({ versionId, dataToSend });
      const updatedVersion = data?.agent;

      if (data?.success && updatedVersion) {
        // Merge API response with current optimistic data to preserve fields
        // that may not be returned by the API (like reviewer_enabled)
        const mergedVersion = {
          ...updatedVersion,
          settings: {
            ...updatedVersion.settings,
            review_agent: {
              ...optimisticData.settings?.review_agent,
              ...updatedVersion.settings?.review_agent,
            },
          },
        };

        dispatch(setSavingStatus({ status: "saved" }));
        dispatch(updateBridgeVersionReducer({ bridges: mergedVersion }));

        // Clear the status after 3 seconds
        return { success: true };
      } else {
        if (!skipRollback) {
          dispatch(bridgeVersionRollBackReducer({ bridgeId: parentBridgeId, versionId }));
        }
        // Update status to show warning
        dispatch(setSavingStatus({ status: "failed" }));

        // Clear the status after 3 seconds
        setTimeout(() => {
          dispatch(setSavingStatus({ status: null }));
        }, 3000);
        return { success: false, error: data?.message || data?.error || "Failed to update version" };
      }
    } catch (error) {
      console.error(error);

      if (versionId) {
        let parentBridgeId = bridgeId;
        if (!parentBridgeId) {
          const state = getState().bridgeReducer;
          for (const bId in state.bridgeVersionMapping) {
            if (state.bridgeVersionMapping[bId][versionId]) {
              parentBridgeId = bId;
              break;
            }
          }
        }

        if (parentBridgeId && !skipRollback) {
          dispatch(bridgeVersionRollBackReducer({ bridgeId: parentBridgeId, versionId }));
          toast.error(error?.response?.data?.message || "Failed to update version. Changes have been reverted.");
        }
      }

      dispatch(isError());
      // Show error status
      dispatch(setSavingStatus({ status: "failed" }));

      // Clear the status after 3 seconds
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to update version";
      return { success: false, error: errorMessage };
    }
  };

export const deleteBridgeAction =
  ({ bridgeId, org_id, restore = false }) =>
  async (dispatch) => {
    try {
      const response = await deleteBridge(bridgeId, org_id, restore);
      if (response?.data?.success) {
        dispatch(deleteBridgeReducer({ bridgeId, orgId: org_id, restore }));
        trackAgentEvent(restore ? "restored" : "deleted", {
          agent_id: bridgeId,
          org_id: org_id,
        });
      }
      return response;
    } catch (error) {
      toast.error(error?.response?.data?.error || error?.message || error || "Failed to delete agent");
      console.error("Failed to delete bridge:", error);
      throw error;
    }
  };

export const integrationAction = (dataToSend, org_id) => async (dispatch) => {
  try {
    dispatch(integrationReducer({ dataToSend, orgId: org_id }));
  } catch (error) {
    console.error(error);
  }
};

export const createApiAction = (org_id, dataFromEmbed) => async (dispatch) => {
  try {
    const data = await createapi(dataFromEmbed);
    if (data?.success) {
      dispatch(updateBridgeToolsReducer({ orgId: org_id, functionData: data?.data }));
      return data?.data;
    }
  } catch (error) {
    console.error(error);
  }
};

export const updateApiAction = (bridge_id, dataFromEmbed) => async (dispatch) => {
  try {
    markUpdateInitiatedByCurrentTab(dataFromEmbed?.version_id);
    const data = await updateapi(bridge_id, dataFromEmbed);
    if (data?.data?.agent) {
      dispatch(updateBridgeVersionReducer({ bridges: data.data.agent }));
    }
    return data;
  } catch (error) {
    console.error(error);
    return error;
  }
};

export const publishBridgeVersionAction =
  ({ bridgeId, versionId, orgId, generate_summary = false }) =>
  async (dispatch) => {
    try {
      const data = await publishBridgeVersionApi({ versionId, generate_summary });
      if (data?.success) {
        dispatch(publishBrigeVersionReducer({ versionId: data?.version_id, bridgeId, orgId }));
        toast.success("Agent Version published successfully");
      }
      return data;
    } catch (error) {
      console.error(error);
    }
  };

export const submitPostPublishFeedbackAction = (payload) => async () => {
  try {
    const response = await submitPostPublishFeedbackApi(payload);
    return response?.data || response;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const addorRemoveResponseIdInBridgeAction = (bridge_id, org_id, responseObj) => async (dispatch) => {
  try {
    const response = await addorRemoveResponseIdInBridge(bridge_id, org_id, responseObj);
    dispatch(updateBridgeReducer(response.data));
  } catch (error) {
    console.error(error);
  }
};

export const duplicateBridgeAction = (bridge_id) => async (dispatch) => {
  try {
    dispatch(isPending());
    const response = await createDuplicateBridge(bridge_id);
    dispatch(duplicateBridgeReducer(response));
    return response?.result?.["_id"];
  } catch (error) {
    dispatch(isError());
    toast.error("Failed to duplicate the bridge");
    console.error("Failed to duplicate the bridge: ", error);
  }
};

export const archiveBridgeAction =
  (bridge_id, newStatus = 1) =>
  async (dispatch) => {
    try {
      dispatch(isPending());
      const response = await archiveBridgeApi(bridge_id, newStatus);
      dispatch(updateBridgeReducer({ bridges: response?.agent, functionData: null }));
      return response?.agent?.status;
    } catch (error) {
      dispatch(isError());
      toast.error("Failed to Archive the bridge");
      console.error("Failed to duplicate the bridge: ", error);
    }
  };

export const dicardBridgeVersionAction =
  ({ bridgeId, versionId }) =>
  async (dispatch) => {
    try {
      await discardBridgeVersionApi({ bridgeId, versionId });
    } catch (error) {
      console.error(error);
    }
  };

export const uploadImageAction = (formData, isVedioOrPdf) => async (dispatch) => {
  try {
    const response = await uploadImage(formData, isVedioOrPdf);
    return response;
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
};

export const genrateSummaryAction =
  ({ bridgeId, versionId, orgId }) =>
  async (dispatch) => {
    try {
      const response = await genrateSummary({ bridgeId, versionId, orgId });
      return response;
    } catch (error) {
      dispatch(isError());
      console.error("Failed to update summary: ", error);
    }
  };

export const getTestcasesScroreAction = (version_id) => async (dispatch) => {
  try {
    const reponse = await getTestcasesScrore(version_id);
    return reponse;
  } catch {
    toast.error("Failed to genrate testcase score");
  }
};

export const deleteFunctionAction =
  ({ script_id, functionId, orgId }) =>
  async (dispatch) => {
    try {
      const reponse = await deleteFunctionApi(script_id);
      dispatch(removeFunctionDataReducer({ orgId, functionId }));
      return reponse;
    } catch {
      toast.error("Failed to delete function");
    }
  };

export const getPrebuiltToolsAction = () => async (dispatch) => {
  try {
    const response = await getPrebuiltToolsApi();
    dispatch(getPrebuiltToolsReducer({ tools: response?.in_built_tools }));
  } catch (error) {
    console.error(error);
  }
};

export const fetchBridgeUsageMetricsAction =
  ({ start_date, end_date, filterActive = false }) =>
  async (dispatch) => {
    try {
      // Set loading to true before API call
      dispatch(
        setBridgeUsageMetricsReducer({
          loading: true,
          data: [],
          filters: { start_date, end_date },
          filterActive,
        })
      );

      const response = await fetchBridgeUsageMetricsApi({ start_date, end_date });

      // Set loading to false after API call completes
      dispatch(
        setBridgeUsageMetricsReducer({
          loading: false,
          data: response?.data || [],
          filters: { start_date, end_date },
          filterActive, // Pass filter activation status to reducer
        })
      );
      return response?.data;
    } catch (error) {
      toast.error(error?.data?.message || error?.response?.data?.message || "Failed to fetch usage metrics");
      console.error("Failed to fetch bridge usage metrics:", error);
      throw error;
    }
  };

export const clearBridgeUsageMetricsAction = () => (dispatch) => {
  dispatch(clearBridgeUsageMetricsReducer());
  dispatch(fetchBridgeUsageMetricsAction({ start_date: null, end_date: null, filterActive: true }));
};

export const publishBulkVersionAction = (version_ids) => async (dispatch) => {
  try {
    const response = await publishBulkVersionApi(version_ids);
    return response;
  } catch (error) {
    toast.error("Failed to publish bulk version");
    throw error;
  }
};

export const getAgentsVersionsDataAction = (orgId) => async (dispatch) => {
  try {
    const data = await getAgentsVersionsByFunctions(orgId);
    dispatch(fetchAgentsVersionsDataReducer({ data }));
    return data;
  } catch (error) {
    console.error("Failed to fetch agents-versions data:", error);
    throw error;
  }
};
