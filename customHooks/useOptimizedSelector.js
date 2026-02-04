import { useCallback } from "react";
import { useCustomSelector } from "./customSelector";
import { shallowEqual } from "react-redux";

// Specialized selector for configuration state
export const useConfigurationSelector = (params, searchParams) => {
  const paramsId = params?.id;
  const version = searchParams?.version;
  const isPublished = searchParams?.isPublished === "true" || searchParams?.get?.("isPublished") === "true";

  return useCustomSelector(
    useCallback(
      (state) => {
        const bridgeData = state?.bridgeReducer?.allBridgesMap?.[paramsId];
        const versionData = state?.bridgeReducer?.bridgeVersionMapping?.[paramsId]?.[version];

        // Use bridgeData when isPublished=true, otherwise use versionData
        const activeData = isPublished ? bridgeData : versionData;

        return {
          bridgeType: bridgeData?.bridgeType,
          versionService: isPublished ? bridgeData?.service : versionData?.service,
          bridgeName: bridgeData?.name,
          reduxPrompt: isPublished ? bridgeData?.configuration?.prompt || "" : versionData?.configuration?.prompt || "",
          bridge: activeData || {},
          isFocus: state?.bridgeReducer?.isFocus,
          modelType: isPublished
            ? bridgeData?.configuration?.type?.toLowerCase()
            : versionData?.configuration?.type?.toLowerCase(),
          modelName: isPublished ? bridgeData?.configuration?.model : versionData?.configuration?.model,
          isLoading: state?.bridgeReducer?.loading,
          hasError: state?.bridgeReducer?.error,
          hasData: !!(bridgeData || versionData),
          oldContent: bridgeData?.configuration?.prompt || "",
        };
      },
      [paramsId, version, isPublished]
    ),
    shallowEqual
  );
};

// Specialized selector for prompt-related state
export const usePromptSelector = (params, searchParams) => {
  const paramsId = params?.id;
  const version = searchParams?.version;
  const isPublished = searchParams?.isPublished === "true" || searchParams?.get?.("isPublished") === "true";
  return useCustomSelector(
    useCallback(
      (state) => {
        const bridgeData = state?.bridgeReducer?.allBridgesMap?.[paramsId];
        const versionData = state?.bridgeReducer?.bridgeVersionMapping?.[paramsId]?.[version];
        const variableState = state?.variableReducer?.VariableMapping?.[paramsId]?.[version] || {};

        // Use bridgeData when isPublished=true, otherwise use versionData
        const activeData = isPublished ? bridgeData : versionData;

        return {
          prompt: isPublished ? bridgeData?.configuration?.prompt || "" : versionData?.configuration?.prompt || "",
          service: isPublished ? bridgeData?.service || "" : versionData?.service || "",
          serviceType: isPublished ? bridgeData?.configuration?.type || "" : versionData?.configuration?.type || "",
          variablesKeyValue: variableState?.variables || [],
          oldContent: bridgeData?.configuration?.prompt || "",
          bridge: activeData || "",
        };
      },
      [paramsId, version, isPublished]
    ),
    shallowEqual
  );
};
