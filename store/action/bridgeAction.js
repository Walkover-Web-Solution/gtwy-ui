import {
  addorRemoveResponseIdInBridge,
  archiveBridgeApi,
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
  updateBridge,
  updateBridgeVersionApi,
  updateFunctionApi,
  updateapi,
  uploadImage,
} from "@/config/index";
import { toast } from "react-toastify";
import posthog, { trackAgentEvent } from "@/utils/posthog";
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
      console.error(error);
      throw error.response;
    }
  };

export const getBridgeVersionAction =
  ({ versionId }) =>
  async (dispatch) => {
    try {
      dispatch(isPending());
      const data = await getBridgeVersionApi({ bridgeVersionId: versionId });
      dispatch(fetchSingleBridgeVersionReducer({ bridge: data?.agent }));
      return data?.agent;
    } catch (error) {
      dispatch(isError());
      console.error(error);
    }
  };

export const createBridgeAction = (dataToSend, onSuccess) => async (dispatch, getState) => {
  try {
    dispatch(clearPreviousBridgeDataReducer());
    const response = await createBridge(dataToSend.dataToSend);
    // Extract only the necessary serializable data from the response
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
      const data = await createBridge(dataToSend);
      dispatch(createBridgeReducer({ data, orgId: orgId }));
      return data;
    } catch (error) {
      if (error?.response?.data?.message?.includes("duplicate key")) {
        toast.error("Agent Name can't be duplicate fallBack to manual bridge creation");
      } else {
        toast.error("Something went wrong");
      }
      console.error(error);
      throw error;
    }
  };

export const createEmbedAgentAction =
  ({ purpose, agent_name, orgId, isEmbedUser, router, sendDataToParent }) =>
  async (dispatch, getState) => {
    try {
      dispatch(isPending());

      // Generate unique name if not provided
      const generateUniqueName = () => {
        const timestamp = Date.now();
        const randomNum = Math.floor(Math.random() * 1000);
        return `Agent_${timestamp}_${randomNum}`;
      };

      let response;

      if (purpose && purpose.trim()) {
        // Try AI creation with purpose first
        try {
          const aiDataToSend = {
            purpose: purpose.trim(),
            bridgeType: "api",
          };

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
      const name = agent_name?.trim() || generateUniqueName();
      const slugName = generateUniqueName();

      const fallbackDataToSend = {
        service: "openai",
        model: "gpt-4o",
        name,
        slugName: slugName,
        bridgeType: "api",
        type: "chat",
      };

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
  ({ function_id, dataToSend }) =>
  async (dispatch) => {
    try {
      const response = await updateFunctionApi({ function_id, dataToSend });
      dispatch(updateFunctionReducer({ org_id: response.data.org_id, data: response.data }));
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
  ({ versionId, dataToSend, bridgeId }) =>
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

      dispatch(backupBridgeVersionReducer({ bridgeId: parentBridgeId, versionId }));

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

      dispatch(
        updateBridgeVersionReducer({
          bridges: optimisticData,
          functionData: dataToSend?.functionData || null,
        })
      );

      // Show saving indi\ation in navbar
      dispatch(setSavingStatus({ status: "saving" }));

      markUpdateInitiatedByCurrentTab(versionId);

      // Step 5: Make the actual API call
      const data = await updateBridgeVersionApi({ versionId, dataToSend });
      const updatedVersion = data?.agent;

      if (data?.success && updatedVersion) {
        // Don't update again - the optimistic update is already correct
        // Only update the status to show success
        dispatch(setSavingStatus({ status: "saved" }));
        dispatch(updateBridgeVersionReducer({ bridges: updatedVersion }));

        // Clear the status after 3 seconds
      } else {
        dispatch(bridgeVersionRollBackReducer({ bridgeId: parentBridgeId, versionId }));
        // Update status to show warning
        dispatch(setSavingStatus({ status: "failed" }));

        // Clear the status after 3 seconds
        setTimeout(() => {
          dispatch(setSavingStatus({ status: null }));
        }, 3000);
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

        if (parentBridgeId) {
          dispatch(bridgeVersionRollBackReducer({ bridgeId: parentBridgeId, versionId }));
          toast.error("Failed to update version. Changes have been reverted.");
        }
      }

      dispatch(isError());
      // Show error status
      dispatch(setSavingStatus({ status: "failed" }));

      // Clear the status after 3 seconds
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
    dispatch(updateBridgeVersionReducer({ bridges: data?.data?.agent }));
  } catch (error) {
    console.error(error);
  }
};

export const publishBridgeVersionAction =
  ({ bridgeId, versionId, orgId }) =>
  async (dispatch) => {
    try {
      const data = await publishBridgeVersionApi({ versionId });
      if (data?.success) {
        dispatch(publishBrigeVersionReducer({ versionId: data?.version_id, bridgeId, orgId }));
        toast.success("Agent Version published successfully");
      }
    } catch (error) {
      console.error(error);
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
