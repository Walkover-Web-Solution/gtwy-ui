import { useCustomSelector } from "@/customHooks/customSelector";
import { updateBridgeVersionAction } from "@/store/action/bridgeAction";
import { AlertIcon } from "@/components/Icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { getServiceAction } from "@/store/action/serviceAction";
import Protected from "@/components/Protected";
import { getIconOfService } from "@/utils/utility";
import InfoTooltip from "@/components/InfoTooltip";
import Dropdown from "@/components/UI/Dropdown";
import { ChevronDownIcon } from "lucide-react";

const ServiceDropdown = ({
  params,
  searchParams,
  apiKeySectionRef,
  promptTextAreaRef,
  isEmbedUser,
  isPublished = false,
  isEditor = true,
}) => {
  // Determine if content is read-only (either published or user is not an editor)
  const isReadOnly = isPublished || !isEditor;
  const {
    bridgeType,
    service,
    SERVICES,
    DEFAULT_MODEL,
    prompt,
    bridgeApiKey,
    shouldPromptShow,
    showDefaultApikeys,
    apiKeyObjectIdData,
  } = useCustomSelector((state) => {
    const versionData = state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[searchParams?.version];
    const bridgeDataFromState = state?.bridgeReducer?.allBridgesMap?.[params?.id];
    const modelReducer = state?.modelReducer?.serviceModels;

    // Use bridgeData when isPublished=true, otherwise use versionData
    const activeData = isPublished ? bridgeDataFromState : versionData;
    const service = activeData?.service;
    const serviceName = activeData?.service;
    const modelTypeName = activeData?.configuration?.type?.toLowerCase();
    const modelName = activeData?.configuration?.model;
    const apiKeyObjectIdData = state.appInfoReducer.embedUserDetails?.apikey_object_id || {};
    const showDefaultApikeys = state.appInfoReducer.embedUserDetails?.addDefaultApiKeys;
    return {
      SERVICES: state?.serviceReducer?.services,
      DEFAULT_MODEL: state?.serviceReducer?.default_model,
      bridgeType: state?.bridgeReducer?.allBridgesMap?.[params?.id]?.bridgeType,
      service: service,
      prompt: isPublished ? bridgeDataFromState?.configuration?.prompt || "" : versionData?.configuration?.prompt || "",
      bridgeApiKey: isPublished
        ? bridgeDataFromState?.apikey_object_id?.[service]
        : versionData?.apikey_object_id?.[service],
      shouldPromptShow: modelReducer?.[serviceName]?.[modelTypeName]?.[modelName]?.validationConfig?.system_prompt,
      apiKeyObjectIdData,
      showDefaultApikeys,
    };
  });

  const [selectedService, setSelectedService] = useState(service);
  const dispatch = useDispatch();

  const resetBorder = (ref, selector) => {
    if (ref?.current) {
      const element = ref.current.querySelector(selector);
      if (element) {
        element.style.borderColor = "";
      }
    }
  };

  useEffect(() => {
    const hasPrompt =
      !shouldPromptShow ||
      prompt !== "" ||
      (promptTextAreaRef.current && promptTextAreaRef.current.querySelector("textarea").value.trim() !== "");
    const hasApiKey = !!bridgeApiKey;

    if (hasPrompt) {
      resetBorder(promptTextAreaRef, "textarea");
    }

    if (hasApiKey) {
      resetBorder(apiKeySectionRef, "select");
    }
  }, [bridgeApiKey, prompt, apiKeySectionRef, promptTextAreaRef]);
  useEffect(() => {
    if (service) {
      setSelectedService(service);
    }
  }, [service]);

  useEffect(() => {
    if (!SERVICES || Object?.entries(SERVICES)?.length === 0) {
      dispatch(getServiceAction({ orgid: params.orgid }));
    }
  }, [SERVICES]);

  // Build options for global Dropdown
  const serviceOptions = useMemo(() => {
    let availableServices = [];
    if (isEmbedUser && showDefaultApikeys) {
      // Ensure apiKeyObjectIdData exists and is an object
      if (apiKeyObjectIdData && typeof apiKeyObjectIdData === "object") {
        availableServices = Object.keys(apiKeyObjectIdData)
          .map((key) => {
            const svc = SERVICES && Array.isArray(SERVICES) && SERVICES.find((s) => s && s.value === key);
            return svc ? svc : { value: key, displayName: key };
          })
          .filter(Boolean);
      }
    } else {
      // Ensure SERVICES is an array
      availableServices = Array.isArray(SERVICES) ? SERVICES : [];
    }
    // Ensure availableServices is an array before mapping
    if (!Array.isArray(availableServices)) {
      availableServices = [];
    }
    return availableServices
      .map((svc) => {
        // Sanity checks
        if (!svc || typeof svc !== "object") return null;
        if (!svc.value) return null;

        return {
          value: svc.value,
          label: (
            <div className="flex items-center gap-2">
              {getIconOfService(svc.value, 16, 16)}
              <span className="capitalize">{svc.displayName || svc.value}</span>
            </div>
          ),
        };
      })
      .filter(Boolean);
  }, [SERVICES, isEmbedUser, showDefaultApikeys, apiKeyObjectIdData]);

  const handleServiceChange = useCallback(
    (serviceValue) => {
      const newService = serviceValue;
      const defaultModel = DEFAULT_MODEL?.[newService]?.model;
      setSelectedService(newService);

      dispatch(
        updateBridgeVersionAction({
          bridgeId: params.id,
          versionId: searchParams?.version,
          dataToSend: { service: newService, configuration: { model: defaultModel } },
        })
      );
    },
    [dispatch, params.id, searchParams?.version, DEFAULT_MODEL]
  );

  const isDisabled = bridgeType === "batch" && service === "openai";

  const renderServiceDropdown = () => (
    <Dropdown
      id="service-dropdown"
      disabled={isReadOnly}
      options={serviceOptions}
      value={selectedService || ""}
      onChange={handleServiceChange}
      placeholder="Select service"
      size="sm"
      className={`flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm whitespace-nowrap transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 border-base-200 text-base-content h-8 min-w-[150px] ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
      style={{ backgroundColor: "color-mix(in oklab, var(--color-white) 3%, transparent)" }}
      menuClassName="w-full min-w-[200px]"
      fullWidth={false}
      renderTriggerContent={({ selectedOption }) => {
        const currentValue = selectedService || selectedOption?.value;

        if (!currentValue) {
          return (
            <span id="service-dropdown-placeholder" className="flex items-center gap-2 text-gray-100/60">
              <span>Select service</span>
            </span>
          );
        }

        const serviceName = Array.isArray(SERVICES)
          ? SERVICES.find((svc) => svc?.value === currentValue)?.displayName || currentValue
          : currentValue;

        return (
          <div id="service-dropdown-trigger" className="flex justify-between w-full items-center gap-2">
            <span id="service-dropdown-selected" className="flex items-center gap-2">
              <span
                id="service-dropdown-icon-wrapper"
                className="flex h-4 w-4 items-center justify-center rounded-md bg-base-200"
              >
                {getIconOfService(currentValue, 16, 16)}
              </span>
              <span id="service-dropdown-selected-name" className="text-base-content/70 text-xs">
                {serviceName}
              </span>
            </span>
            <ChevronDownIcon id="service-dropdown-chevron" size={16} className="ml-2 h-4 w-4 opacity-70" />
          </div>
        );
      }}
    />
  );

  return (
    <div id="service-dropdown-container" className="space-y-4">
      <div id="service-dropdown-form-control" className="form-control">
        <div id="service-dropdown-wrapper" className="flex items-center gap-2 z-auto">
          {isDisabled && (
            <InfoTooltip id="service-dropdown-batch-warning" tooltipContent="Batch API is only applicable for OpenAI">
              <AlertIcon id="service-dropdown-alert-icon" size={16} className="text-warning" />
            </InfoTooltip>
          )}
          {renderServiceDropdown()}
        </div>
      </div>
    </div>
  );
};

export default Protected(React.memo(ServiceDropdown));
