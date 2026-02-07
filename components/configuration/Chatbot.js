import { useCustomSelector } from "@/customHooks/customSelector";
import { useEffect, useMemo } from "react";

const Chatbot = ({ params, searchParams }) => {
  // Memoize isPublished to make it reactive to searchParams changes
  const isPublished = useMemo(() => {
    // Handle both URLSearchParams object and plain object
    let result;
    if (searchParams?.get) {
      // URLSearchParams object
      result = searchParams.get("isPublished") === "true";
    } else {
      // Plain object
      result = searchParams?.isPublished === "true";
    }
    return result;
  }, [searchParams]);
  const { bridgeName, bridgeSlugName, chatbot_token, variablesKeyValue, configuration, service, bridgeType } =
    useCustomSelector((state) => {
      const versionState = state?.variableReducer?.VariableMapping?.[params?.id]?.[searchParams?.version] || {};
      return {
        bridgeName: state?.bridgeReducer?.allBridgesMap?.[params?.id]?.name,
        bridgeSlugName: state?.bridgeReducer?.allBridgesMap?.[params?.id]?.slugName,
        chatbot_token: state?.ChatBot?.chatbot_token || "",
        variablesKeyValue: versionState?.variables || [],
        configuration: state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[searchParams?.version]?.configuration,
        service: state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[searchParams?.version]?.service,
        bridgeType: state?.bridgeReducer?.allBridgesMap?.[params?.id]?.bridgeType,
      };
    });
  // Convert variables array to object
  const variables = useMemo(() => {
    const coerceValue = (rawValue, fallback, type) => {
      const candidate = rawValue ?? fallback ?? "";
      const trimmed = typeof candidate === "string" ? candidate.trim() : candidate;
      if (type === "number") {
        const parsed = Number(trimmed);
        return Number.isNaN(parsed) ? trimmed : parsed;
      }
      if (type === "boolean") {
        if (typeof trimmed === "boolean") return trimmed;
        return String(trimmed).toLowerCase() === "true";
      }
      if (type === "object" || type === "array") {
        try {
          const parsed = typeof trimmed === "string" ? JSON.parse(trimmed) : trimmed;
          return parsed;
        } catch {
          return trimmed;
        }
      }
      return candidate;
    };

    return variablesKeyValue.reduce((acc, pair) => {
      if (!pair?.key) {
        return acc;
      }
      const resolved = pair.value && String(pair.value).length > 0 ? pair.value : pair.defaultValue;
      if (resolved !== undefined) {
        acc[pair.key] = coerceValue(pair.value, pair.defaultValue, pair.type || "string");
      }
      return acc;
    }, {});
  }, [variablesKeyValue]);

  // Send bridge name as threadId when it changes
  useEffect(() => {
    if (bridgeName && window?.SendDataToChatbot) {
      window.SendDataToChatbot({
        threadId: bridgeName?.replaceAll(" ", "_"),
      });
    }
  }, [bridgeName]);

  // Send bridge slug name when it changes
  useEffect(() => {
    if (bridgeSlugName && window?.SendDataToChatbot) {
      window.SendDataToChatbot({
        bridgeName: bridgeSlugName,
      });
    }
  }, [bridgeSlugName]);

  // Send vision config when it changes
  useEffect(() => {
    if (window?.SendDataToChatbot) {
      window.SendDataToChatbot({
        modelChanged: configuration?.model,
      });
    }
  }, [configuration?.model]);

  useEffect(() => {
    if (window?.SendDataToChatbot) {
      window.SendDataToChatbot({
        serviceChanged: service,
      });
    }
  }, [service]);

  // Send variables when they change
  useEffect(() => {
    if (window?.SendDataToChatbot) {
      window.SendDataToChatbot({
        variables: variables,
      });
    }
  }, [variables]);

  useEffect(() => {
    const version = searchParams?.get ? searchParams.get("version") : searchParams?.version;

    if (!bridgeName || !bridgeSlugName) {
      return;
    }

    if (!isPublished && !version) {
      return;
    }

    const intervalId = setInterval(() => {
      if (window?.SendDataToChatbot && bridgeType === "chatbot") {
        // Send all configuration data
        window.SendDataToChatbot({
          bridgeName: bridgeSlugName,
          threadId: bridgeName?.replaceAll(" ", "_"),
          parentId: "parentChatbot",
          fullScreen: true,
          hideCloseButton: true,
          hideIcon: true,
          version_id: isPublished ? "null" : version,
          variables: variables || {},
        });
        clearInterval(intervalId);
      }
    }, 1000);
  }, [chatbot_token, searchParams, isPublished, bridgeSlugName, bridgeName, variables]);

  return <></>;
};

export default Chatbot;
