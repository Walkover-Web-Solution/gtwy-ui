import React, { useState, useCallback, useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { AlertIcon, ChevronDownIcon, ChevronUpIcon } from "@/components/Icons";
import { useCustomSelector } from "@/customHooks/customSelector";
import { updateBridgeVersionAction } from "@/store/action/bridgeAction";
import InfoTooltip from "@/components/InfoTooltip";
import { getIconOfService } from "@/utils/utility";
import { CircleQuestionMark } from "lucide-react";

const FallbackModel = ({ params, searchParams, bridgeType, isPublished, isEditor = true, isEmbedUser }) => {
  // Determine if content is read-only (either published or user is not an editor)
  const isReadOnly = isPublished || !isEditor;
  const [showApiKeysToggle, setShowApiKeysToggle] = useState(false);
  const [selectedApiKeys, setSelectedApiKeys] = useState({});
  const dropdownContainerRef = useRef(null);

  const dispatch = useDispatch();

  const {
    bridge,
    apikeydata,
    bridgeApikey_object_id,
    SERVICES,
    serviceModels,
    currentService,
    fallbackModel,
    DefaultModel,
    currentModel,
    embedDefaultApiKeys,
    showDefaultApikeys,
  } = useCustomSelector((state) => {
    const versionData = state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[searchParams?.version];
    const bridgeDataFromState = state?.bridgeReducer?.allBridgesMap?.[params?.id];
    const apikeys = state?.apiKeysReducer?.apikeys || {};

    // Use bridgeData when isPublished=true, otherwise use versionData
    const activeData = isPublished ? bridgeDataFromState : versionData;
    const service = activeData?.service;

    return {
      bridge: activeData || {},
      apikeydata: apikeys[params?.org_id] || [],
      bridgeApikey_object_id: isPublished
        ? bridgeDataFromState?.apikey_object_id || {}
        : versionData?.apikey_object_id || {},
      SERVICES: state?.serviceReducer?.services,
      serviceModels: state?.modelReducer?.serviceModels || {},
      currentService: service,
      currentModel: isPublished ? bridgeDataFromState?.configuration?.model : versionData?.configuration?.model,
      fallbackModel: isPublished ? bridgeDataFromState?.fall_back : versionData?.fall_back,
      DefaultModel: state?.serviceReducer?.default_model || [],
      embedDefaultApiKeys: state.appInfoReducer.embedUserDetails?.apikey_object_id || {},
      showDefaultApikeys: state.appInfoReducer.embedUserDetails?.addDefaultApiKeys,
    };
  });
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownContainerRef.current && !dropdownContainerRef.current.contains(event.target)) {
        const serviceDropdown = document.getElementById("fallback-service-dropdown");
        const modelDropdown = document.getElementById("fallback-model-dropdown");
        serviceDropdown?.removeAttribute("open");
        modelDropdown?.removeAttribute("open");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (bridgeApikey_object_id && typeof bridgeApikey_object_id === "object") {
      setSelectedApiKeys(bridgeApikey_object_id);
    }
  }, [bridgeApikey_object_id]);

  // Check if a service has available API keys
  const hasApiKeysForService = (service) => {
    const regularApiKeys = Object.keys(bridgeApikey_object_id).filter((key) => key === service);

    // For embed users with showDefaultApikeys, also check embedDefaultApiKeys
    if (showDefaultApikeys && embedDefaultApiKeys && embedDefaultApiKeys[service]) {
      return regularApiKeys.length > 0 || !!embedDefaultApiKeys[service];
    }

    return regularApiKeys.length > 0;
  };

  const filterApiKeysByService = (service) => {
    const regularApiKeys = apikeydata.filter((apiKey) => apiKey?.service === service);
    return regularApiKeys;
  };

  const handleSelectionChange = useCallback(
    (service, apiKeyId) => {
      setSelectedApiKeys((prev) => {
        const updated = { ...prev, [service]: apiKeyId };
        dispatch(
          updateBridgeVersionAction({
            bridgeId: params?.id,
            versionId: searchParams?.version,
            dataToSend: { apikey_object_id: updated },
          })
        );
        return updated;
      });
    },
    [dispatch, params?.id, searchParams?.version]
  );

  const toggleApiKeys = () => {
    setShowApiKeysToggle((prev) => !prev);
  };

  const truncateText = (text, maxLength) => {
    return text?.length > maxLength ? text.slice(0, maxLength) + "..." : text;
  };

  // Fallback model + service state and handlers
  const [fallbackService, setFallbackService] = useState(fallbackModel?.service || currentService);
  const [fallbackModelName, setFallbackModelName] = useState(
    fallbackModel?.model || DefaultModel[currentService]?.model
  );
  const [isFallbackEnabled, setIsFallbackEnabled] = useState(fallbackModel?.is_enable || false);

  useEffect(() => {
    setFallbackService(fallbackModel?.service || currentService);
    setFallbackModelName(fallbackModel?.model || DefaultModel[currentService]?.model);
    setIsFallbackEnabled(fallbackModel?.is_enable || false);
  }, [fallbackModel]);

  // Check if batch API has non-OpenAI service selected and show alert
  useEffect(() => {
    if (bridgeType === "batch" && fallbackService && fallbackService !== "openai") {
      const openaiModels = serviceModels?.openai || {};
      let selectedModel = DefaultModel["openai"]?.model;

      if (selectedModel === currentModel) {
        // Flatten all models in one array and find the first different one
        const allModels = Object.values(openaiModels)
          .flatMap((modelsObj) => Object.entries(modelsObj))
          .map(([modelKey, modelData]) => modelData?.configuration?.model?.default || modelKey);

        const differentModel = allModels.find((modelName) => modelName !== currentModel);
        if (differentModel) selectedModel = differentModel;
      }
      handleFallbackServiceChange("openai", selectedModel);
    }
  }, [bridgeType, fallbackService, currentModel, serviceModels, DefaultModel]);

  const handleFallbackServiceChange = useCallback(
    (service, model) => {
      const newDefaultModel = model || DefaultModel[service]?.model || null;
      setFallbackService(service);
      setFallbackModelName(newDefaultModel);
      // Persist immediately using explicit values (avoid stale state)
      dispatch(
        updateBridgeVersionAction({
          bridgeId: params.id,
          versionId: searchParams?.version,
          dataToSend: {
            fall_back: {
              ...(fallbackModel || {}),
              is_enable: !!isFallbackEnabled,
              service: service || null,
              model: newDefaultModel || null,
            },
          },
        })
      );
    },
    [dispatch, params.id, searchParams?.version, fallbackModel, isFallbackEnabled, fallbackModelName]
  );

  const handleFallbackModelChange = useCallback(
    (model) => {
      setFallbackModelName(model);
      const enableNext = true;
      if (!isFallbackEnabled) setIsFallbackEnabled(true);
      // Persist immediately using explicit values
      dispatch(
        updateBridgeVersionAction({
          bridgeId: params.id,
          versionId: searchParams?.version,
          dataToSend: {
            fall_back: {
              ...(fallbackModel || {}),
              is_enable: enableNext,
              service: fallbackService || null,
              model: model || null,
            },
          },
        })
      );
    },
    [dispatch, params.id, searchParams?.version, fallbackModel, isFallbackEnabled, fallbackService, fallbackModelName]
  );

  const handleFallbackModelToggle = useCallback(() => {
    const next = !isFallbackEnabled;
    setIsFallbackEnabled(next);
    // Use `next` directly to avoid stale state in dispatch
    dispatch(
      updateBridgeVersionAction({
        bridgeId: params.id,
        versionId: searchParams?.version,
        dataToSend: {
          fall_back: {
            ...(fallbackModel || {}),
            is_enable: next,
          },
        },
      })
    );
  }, [
    dispatch,
    params.id,
    searchParams?.version,
    isFallbackEnabled,
    fallbackModel,
    fallbackService,
    fallbackModelName,
  ]);

  const computedModelsList = serviceModels?.[fallbackService] || {};

  return (
    <div id="fallback-model-container" className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <label className="block text-base-content/70 text-sm font-medium">Fallback Model</label>
          <InfoTooltip tooltipContent="Enable and configure a fallback model and service to retry when the primary fails.">
            <CircleQuestionMark size={14} className="text-gray-500 hover:text-gray-700 cursor-help" />
          </InfoTooltip>
        </div>
        <input
          id="fallback-model-toggle"
          disabled={isReadOnly}
          type="checkbox"
          className="toggle toggle-sm"
          checked={isFallbackEnabled}
          onChange={handleFallbackModelToggle}
        />
      </div>

      {!isFallbackEnabled && (
        <div className="alert alert-warning mb-4 py-2 px-3">
          <div className="flex items-center gap-2">
            <AlertIcon size={14} />
            <span className="text-sm">Enable fallback model</span>
          </div>
        </div>
      )}

      {isFallbackEnabled && (
        <div className="w-full p-3 border border-base-200 rounded-lg bg-base-50" ref={dropdownContainerRef}>
          <div className="grid grid-cols-2 gap-4">
            {/* Fallback Service */}
            <div className="space-y-2">
              <label className="block text-base-content/70 text-xs font-medium">Fallback Service</label>
              <div className="relative w-full">
                <details
                  id="fallback-service-dropdown"
                  className="dropdown dropdown-end w-full"
                  onToggle={(e) => {
                    if (e.currentTarget.open) {
                      const modelDropdown = document.getElementById("fallback-model-dropdown");
                      if (modelDropdown) modelDropdown.removeAttribute("open");
                    }
                  }}
                  disabled={bridgeType === "batch" || isReadOnly}
                >
                  <summary
                    id="fallback-service-dropdown-button"
                    tabIndex={0}
                    disabled={isReadOnly}
                    role="button"
                    className={`btn btn-sm border-base-200 bg-base-300 text-base-content/70 capitalize w-full justify-between ${bridgeType === "batch" ? "btn-disabled cursor-not-allowed opacity-50" : ""}`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {fallbackService && getIconOfService(fallbackService, 16, 16)}
                      <span>
                        {fallbackService
                          ? SERVICES?.find((s) => s.value === fallbackService)?.displayName || fallbackService
                          : "Select a Service"}
                      </span>
                    </div>
                    <ChevronDownIcon size={16} />
                  </summary>
                  <ul
                    id="fallback-service-dropdown-menu"
                    tabIndex={0}
                    className="dropdown-content z-high menu bg-base-100 rounded-box w-full p-1 shadow border border-base-300 max-h-80 overflow-y-auto"
                  >
                    {Array.isArray(SERVICES) &&
                      SERVICES.map((svc) => {
                        const hasApiKeys = hasApiKeysForService(svc.value);
                        return (
                          <li key={svc.value}>
                            {hasApiKeys ? (
                              <a
                                id={`fallback-service-item-${svc.value}`}
                                className={`flex items-center gap-2 ${fallbackService === svc.value ? "active" : ""}`}
                                onClick={(e) => {
                                  handleFallbackServiceChange(svc.value);
                                  const details = e.currentTarget.closest("details");
                                  if (details) details.removeAttribute("open");
                                }}
                                disabled={isPublished}
                              >
                                {getIconOfService(svc.value, 16, 16)}
                                <span className="capitalize">{svc.displayName || svc.value}</span>
                              </a>
                            ) : (
                              <div className="w-full flex items-center justify-between">
                                <span className="flex items-center gap-2 opacity-50 cursor-not-allowed pointer-events-none">
                                  {getIconOfService(svc.value, 16, 16)}
                                  <span className="capitalize">{svc.displayName || svc.value}</span>
                                </span>
                                <span className="text-xs text-error">No API Key Available</span>
                              </div>
                            )}
                          </li>
                        );
                      })}
                  </ul>
                </details>

                {bridgeType === "batch" && (
                  <div className="absolute right-8 top-1/2 -translate-y-1/2">
                    <InfoTooltip tooltipContent="Batch API is only applicable for OpenAI">
                      <AlertIcon size={16} className="text-warning" />
                    </InfoTooltip>
                  </div>
                )}
              </div>
            </div>

            {/* Fallback Model */}
            <div className="space-y-2">
              <label className="block text-base-content/70 text-xs font-medium">Fallback Model</label>
              <details id="fallback-model-dropdown" className="dropdown w-full">
                <summary
                  id="fallback-model-dropdown-button"
                  tabIndex={0}
                  disabled={isReadOnly}
                  role="button"
                  className="btn btn-sm w-full justify-between border border-base-200 bg-base-300 text-base-content/70 hover:bg-base-200 font-normal"
                >
                  <span>{fallbackModelName ? truncateText(fallbackModelName, 30) : "Select a Model"}</span>
                  <ChevronDownIcon size={16} />
                </summary>
                <ul
                  id="fallback-model-dropdown-menu"
                  tabIndex={0}
                  className="dropdown-content mb-6 z-high p-2 shadow bg-base-100 rounded-lg mt-1 max-h-[340px] w-[260px] overflow-y-auto border border-base-300"
                >
                  {Object.entries(computedModelsList || {}).map(([group, options]) => {
                    if (group === "image") return null;

                    // 1️⃣ Pre-filter valid models
                    const validModels = Object.keys(options || {}).filter((option) => {
                      const modelName = options?.[option]?.configuration?.model?.default || option;
                      return currentModel !== modelName && currentModel !== option;
                    });
                    if (validModels.length === 0) return null;
                    return (
                      <li key={group} id={`fallback-model-group-${group}`} className="px-2 py-1 cursor-pointer">
                        <span className="text-sm text-base-content">{group}</span>
                        <ul>
                          {Object.keys(options || {}).map((option) => {
                            const modelName = options?.[option]?.configuration?.model?.default || option;
                            const selected = fallbackModelName === modelName || fallbackModelName === option;

                            if (currentModel === modelName || currentModel === option) return null;

                            return (
                              <li
                                key={`${group}-${option}`}
                                className={`hover:bg-base-200 rounded-md py-1 ${selected ? "bg-base-200" : ""}`}
                                onClick={(e) => {
                                  handleFallbackModelChange(modelName);
                                  const details = e.currentTarget.closest("details");
                                  if (details) details.removeAttribute("open");
                                }}
                              >
                                {selected && <span className="flex-shrink-0 ml-2">✓</span>}
                                <span className={`truncate flex-1 pl-2 ${!selected ? "ml-4" : ""}`}>
                                  {truncateText(modelName || option, 30)}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </li>
                    );
                  })}
                </ul>
              </details>
            </div>
          </div>

          {fallbackModelName && currentModel && fallbackModelName === currentModel && (
            <div id="fallback-model-same-model-alert" className="alert alert-warning mt-3 py-2 px-2">
              <div className="flex items-center gap-2">
                <AlertIcon size={12} />
                <span className="text-xs">This model is already selected please change the model</span>
              </div>
            </div>
          )}
        </div>
      )}

      {((!showDefaultApikeys && isEmbedUser) || !isEmbedUser) && (
        <div className="mt-4">
          <div className="flex flex-col gap-3 w-full">
            {/* Multiple API Keys Label */}
            <div className="flex items-center gap-1">
              <span className="label-text font-medium">Multiple API Keys</span>
              <InfoTooltip tooltipContent="Add multiple API keys from different services to use with your agent for enhanced functionality and redundancy.">
                <CircleQuestionMark size={14} className="text-gray-500 hover:text-gray-700 cursor-help" />
              </InfoTooltip>
            </div>

            <div className="w-full">
              <div className="relative">
                <div
                  className={`flex items-center gap-2 input input-sm w-full min-h-[2.5rem] cursor-pointer ${showApiKeysToggle ? "rounded-x-md rounded-b-none rounded-t-md" : "rounded-md"}`}
                  onClick={toggleApiKeys}
                >
                  <span className="text-base-content">Configure API keys...</span>
                  <div className="ml-auto">
                    {showApiKeysToggle ? <ChevronUpIcon size={16} /> : <ChevronDownIcon size={16} />}
                  </div>
                </div>

                {showApiKeysToggle && (
                  <div
                    className={`bg-base-100 z-low max-h-80 overflow-y-auto p-2 transition-all ${showApiKeysToggle ? "rounded-x-lg border-base-content/20 border-t-0 rounded-t-none rounded-b-lg duration-300 ease-in-out" : ""}`}
                  >
                    {SERVICES?.filter((service) => service?.value !== bridge?.service).map((service) => (
                      <div key={service?.value} className="p-2 border-b last:border-b-0">
                        <div className="font-semibold capitalize mb-2 text-sm">{service?.displayName}</div>

                        {filterApiKeysByService(service?.value)?.length > 0 ? (
                          filterApiKeysByService(service?.value).map((apiKey) => (
                            <div key={apiKey?._id} className="p-2 hover:bg-base-200 cursor-pointer rounded">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  disabled={isReadOnly}
                                  type="radio"
                                  name={`apiKey-${service?.value}`}
                                  value={apiKey?._id}
                                  checked={selectedApiKeys[service?.value] === apiKey?._id}
                                  onChange={() => handleSelectionChange(service?.value, apiKey?._id)}
                                  className="radio radio-sm h-4 w-4"
                                />
                                <span
                                  className={`text-sm flex items-center gap-2 ${apiKey?.isDefaultEmbedKey ? "font-medium text-primary" : ""}`}
                                >
                                  {truncateText(apiKey?.name, 25)}
                                </span>
                              </label>
                            </div>
                          ))
                        ) : (
                          <div className="p-2 text-sm text-gray-500">
                            No API keys available for {service?.displayName}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FallbackModel;
