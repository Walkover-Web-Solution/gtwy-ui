import { useCustomSelector } from "./customSelector";

export const useConfigurationState = (params, searchParams) => {
  return useCustomSelector((state) => {
    const versionData = state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[searchParams?.version];
    const bridgeDataFromState = state?.bridgeReducer?.allBridgesMap?.[params?.id];
    const isPublished = searchParams?.isPublished === "true";
    const modelReducer = state?.modelReducer?.serviceModels;

    // Use bridgeData when isPublished=true, otherwise use versionData
    const activeData = isPublished ? bridgeDataFromState : versionData;
    const service = activeData?.service;
    const serviceName = activeData?.service;
    const modelTypeName = activeData?.configuration?.type?.toLowerCase();
    const modelName = activeData?.configuration?.model;

    return {
      bridgeType: state?.bridgeReducer?.allBridgesMap?.[params?.id]?.bridgeType?.trim()?.toLowerCase() || "api",
      modelType: isPublished
        ? bridgeDataFromState?.configuration?.type?.toLowerCase()
        : versionData?.configuration?.type?.toLowerCase(),
      reduxPrompt: isPublished ? bridgeDataFromState?.configuration?.prompt : versionData?.configuration?.prompt,
      modelName: isPublished ? bridgeDataFromState?.configuration?.model : versionData?.configuration?.model,
      showConfigType: state.appInfoReducer.embedUserDetails.showConfigType,
      showDefaultApikeys: state.appInfoReducer.embedUserDetails.addDefaultApiKeys,
      shouldToolsShow:
        state.modelReducer.serviceModels[serviceName]?.[modelTypeName]?.[modelName]?.validationConfig?.tools,
      bridgeApiKey: isPublished
        ? bridgeDataFromState?.apikey_object_id?.[service === "openai_response" ? "openai" : service]
        : versionData?.apikey_object_id?.[service === "openai_response" ? "openai" : service],
      shouldPromptShow: modelReducer?.[serviceName]?.[modelTypeName]?.[modelName]?.validationConfig?.system_prompt,
      bridge_functions: isPublished ? bridgeDataFromState?.function_ids || [] : versionData?.function_ids || [],
      connect_agents: isPublished ? bridgeDataFromState?.connected_agents || {} : versionData?.connected_agents || {},
      knowbaseVersionData: isPublished ? bridgeDataFromState?.doc_ids || [] : versionData?.doc_ids || [],
      hideAdvancedParameters: state.appInfoReducer.embedUserDetails.hideAdvancedParameters,
      hideAdvancedConfigurations: state.appInfoReducer.embedUserDetails.hideAdvancedConfigurations,
      service: service,
      hidePreTool: state.appInfoReducer.embedUserDetails.hidePreTool,
    };
  });
};
