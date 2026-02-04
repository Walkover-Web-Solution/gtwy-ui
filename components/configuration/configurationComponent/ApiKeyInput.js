import ApiKeyModal from "@/components/modals/ApiKeyModal";
import { useCustomSelector } from "@/customHooks/customSelector";
import { updateBridgeVersionAction } from "@/store/action/bridgeAction";
import { MODAL_TYPE } from "@/utils/enums";
import { openModal } from "@/utils/utility";
import React, { useCallback, useMemo } from "react";
import { useDispatch } from "react-redux";
import Dropdown from "@/components/UI/Dropdown";

const ApiKeyInput = ({
  params,
  searchParams,
  apiKeySectionRef,
  isEmbedUser,
  hideAdvancedParameters = false,
  isPublished,
  isEditor = true,
}) => {
  // Determine if content is read-only (either published or user is not an editor)
  const isReadOnly = isPublished || !isEditor;
  const dispatch = useDispatch();

  const { bridge, apikeydata, bridgeApikey_object_id, currentService, bridgeType } = useCustomSelector((state) => {
    const versionData = state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[searchParams?.version];
    const bridgeDataFromState = state?.bridgeReducer?.allBridgesMap?.[params?.id];
    const apikeys = state?.apiKeysReducer?.apikeys || {};

    // Use bridgeData when isPublished=true, otherwise use versionData
    const activeData = isPublished ? bridgeDataFromState : versionData;

    return {
      bridge: activeData || {},
      apikeydata: apikeys[params?.org_id] || [], // Ensure apikeydata is an array
      bridgeApikey_object_id: isPublished ? bridgeDataFromState?.apikey_object_id : versionData?.apikey_object_id,
      currentService: isPublished ? bridgeDataFromState?.service : versionData?.service,
      bridgeType: state?.bridgeReducer?.allBridgesMap?.[params?.id]?.bridgeType,
    };
  });

  // Memoize filtered API keys
  const filteredApiKeys = useMemo(() => {
    return apikeydata.filter((apiKey) => apiKey?.service === bridge?.service);
  }, [apikeydata, bridge?.service]);

  const handleDropdownChange = useCallback(
    (selectedApiKeyId) => {
      if (selectedApiKeyId === "add_new") {
        openModal(MODAL_TYPE.API_KEY_MODAL);
      } else if (selectedApiKeyId !== "GPT5_NANO_DEFAULT_KEY") {
        const service = bridge?.service;
        const updated = { ...bridgeApikey_object_id, [service]: selectedApiKeyId };
        dispatch(
          updateBridgeVersionAction({
            bridgeId: params?.id,
            versionId: searchParams?.version,
            dataToSend: { apikey_object_id: updated },
          })
        );
      }
      if (
        selectedApiKeyId === "GPT5_NANO_DEFAULT_KEY" &&
        bridge?.configuration?.model === "gpt-5-nano" &&
        bridgeType === "chatbot"
      ) {
        const service = bridge?.service;
        const updated = { ...bridgeApikey_object_id };
        delete updated[service]; // Remove only the current service's key
        dispatch(
          updateBridgeVersionAction({
            bridgeId: params?.id,
            versionId: searchParams?.version,
            dataToSend: { apikey_object_id: updated },
          })
        );
        return;
      }
    },
    [params.id, searchParams?.version, bridge?.service, bridge, bridgeType, bridgeApikey_object_id]
  );

  // Determine the currently selected value
  const selectedValue = useMemo(() => {
    const serviceApiKeyId =
      typeof bridgeApikey_object_id === "object" ? bridgeApikey_object_id?.[bridge?.service] : bridgeApikey_object_id;
    const currentApiKey = apikeydata.find((apiKey) => apiKey?._id === serviceApiKeyId);

    // Special handling for gpt-5-nano model - show default key if no API key is added and bridge type is chatbot
    if (bridge?.configuration?.model === "gpt-5-nano" && bridgeType === "chatbot" && !serviceApiKeyId) {
      return "GPT5_NANO_DEFAULT_KEY";
    }

    return currentApiKey?._id;
  }, [apikeydata, bridgeApikey_object_id, bridge?.service, bridge?.configuration?.model, bridgeType]);

  // Build dropdown options
  const dropdownOptions = useMemo(() => {
    const opts = [];

    // Add default key for gpt-5-nano model only when bridge type is chatbot (like old ai_ml case)
    if (bridge?.configuration?.model === "gpt-5-nano" && bridgeType === "chatbot") {
      opts.push({ value: "GPT5_NANO_DEFAULT_KEY", label: "GPT-5-Nano Default Key" });
    }

    if (filteredApiKeys.length > 0) {
      filteredApiKeys.forEach((apiKey) => {
        opts.push({ value: apiKey._id, label: apiKey.name });
      });
    } else {
      // Disabled informational option pattern can be represented by not adding an option here; placeholder will handle it
    }
    // Add new key action
    opts.push({ value: "add_new", label: "+  Add new API Key" });
    return opts;
  }, [filteredApiKeys, bridge.service, bridge?.configuration?.model, bridgeType]);

  return (
    <div id="apikey-input-container" className="relative form-control w-auto text-base-content" ref={apiKeySectionRef}>
      <Dropdown
        id="apikey-input-dropdown"
        disabled={isReadOnly}
        options={dropdownOptions}
        value={selectedValue || ""}
        onChange={(val) => handleDropdownChange(val)}
        placeholder={filteredApiKeys.length === 0 ? "No API keys for this service" : "Select API key"}
        showSearch
        searchPlaceholder="Search API keys..."
        size="sm"
        className="flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm whitespace-nowrap transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 border-base-200 text-base-content h-8 min-w-[150px]"
        style={{ backgroundColor: "color-mix(in oklab, var(--color-white) 3%, transparent)" }}
        maxLabelLength={20}
        menuClassName="w-full min-w-[200px]"
      />

      <ApiKeyModal
        params={params}
        searchParams={searchParams}
        service={currentService}
        bridgeApikey_object_id={bridgeApikey_object_id}
      />
    </div>
  );
};

export default React.memo(ApiKeyInput);
