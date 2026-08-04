import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useDispatch } from "react-redux";
import { AlertIcon, ChevronDownIcon, ChevronUpIcon } from "@/components/Icons";
import { useCustomSelector } from "@/customHooks/customSelector";
import { updateBridgeVersionAction } from "@/store/action/bridgeAction";
import InfoTooltip from "@/components/InfoTooltip";
import { getIconOfService } from "@/utils/utility";
import { CircleQuestionMark } from "lucide-react";
import { ModelPreview } from "./ModelDropdown";
import Dropdown from "@/components/UI/Dropdown";

const FallbackModel = ({
  params,
  searchParams,
  bridgeType,
  isPublished,
  shouldRenderApiKey,
  isEditor = true,
  isEmbedUser,
}) => {
  // Determine if content is read-only (either published or user is not an editor)
  const isReadOnly = isPublished || !isEditor;
  const [showApiKeysToggle, setShowApiKeysToggle] = useState(false);
  const [selectedApiKeys, setSelectedApiKeys] = useState({});
  const dropdownContainerRef = useRef(null);
  const fallbackModelDropdownRef = useRef(null);
  const [hoveredModel, setHoveredModel] = useState(null);
  const [modelSpecs, setModelSpecs] = useState();

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
    embedModelsConfig,
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
      fallbackModel: isPublished ? bridgeDataFromState?.settings?.fall_back : versionData?.settings?.fall_back,
      DefaultModel: state?.serviceReducer?.default_model || [],
      embedDefaultApiKeys: state.appInfoReducer.embedUserDetails?.apikey_object_id || {},
      showDefaultApikeys: state.appInfoReducer.embedUserDetails?.addDefaultApiKeys,
      embedModelsConfig: state.appInfoReducer.embedUserDetails?.models || {},
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
      if (isReadOnly) return;
      setSelectedApiKeys((prev) => {
        const updated = { ...prev };
        if (prev[service] === apiKeyId) {
          delete updated[service];
        } else {
          updated[service] = apiKeyId;
        }
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

  const getServiceDefaultFallbackModel = useCallback(
    (service) => {
      if (!service) return null;
      return DefaultModel?.[service]?.default_fallback_model || DefaultModel?.[service]?.model || null;
    },
    [DefaultModel]
  );

  // Fallback model + service state and handlers
  const [fallbackService, setFallbackService] = useState(fallbackModel?.service || currentService);
  const [fallbackModelName, setFallbackModelName] = useState(
    fallbackModel?.model || getServiceDefaultFallbackModel(currentService)
  );
  const [isFallbackEnabled, setIsFallbackEnabled] = useState(fallbackModel?.is_enable || false);

  useEffect(() => {
    setFallbackService(fallbackModel?.service || currentService);
    setFallbackModelName(
      fallbackModel?.model || getServiceDefaultFallbackModel(fallbackModel?.service || currentService)
    );
    setIsFallbackEnabled(fallbackModel?.is_enable || false);
  }, [fallbackModel, currentService, getServiceDefaultFallbackModel]);

  // Check if batch API has non-OpenAI service selected and show alert
  useEffect(() => {
    if (bridgeType === "batch" && fallbackService && fallbackService !== "openai") {
      const openaiModels = serviceModels?.openai || {};
      let selectedModel = getServiceDefaultFallbackModel("openai");

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
  }, [bridgeType, fallbackService, currentModel, serviceModels, DefaultModel, getServiceDefaultFallbackModel]);

  const handleFallbackServiceChange = useCallback(
    (service, model) => {
      const newDefaultModel = model || getServiceDefaultFallbackModel(service);
      setFallbackService(service);
      setFallbackModelName(newDefaultModel);
      // Persist immediately using explicit values (avoid stale state)
      dispatch(
        updateBridgeVersionAction({
          bridgeId: params.id,
          versionId: searchParams?.version,
          dataToSend: {
            settings: {
              fall_back: {
                ...(fallbackModel || {}),
                is_enable: !!isFallbackEnabled,
                service: service || null,
                model: newDefaultModel || null,
              },
            },
          },
        })
      );
    },
    [dispatch, params.id, searchParams?.version, fallbackModel, isFallbackEnabled, getServiceDefaultFallbackModel]
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
            settings: {
              fall_back: {
                ...(fallbackModel || {}),
                is_enable: enableNext,
                service: fallbackService || null,
                model: model || null,
              },
            },
          },
        })
      );
    },
    [dispatch, params.id, searchParams?.version, fallbackModel, isFallbackEnabled, fallbackService, fallbackModelName]
  );

  const handleFallbackModelToggle = useCallback(() => {
    const next = !isFallbackEnabled;
    const nextService = fallbackService || currentService || null;
    const resolvedModel = fallbackModelName || getServiceDefaultFallbackModel(nextService);
    setIsFallbackEnabled(next);
    if (!fallbackService && nextService) setFallbackService(nextService);
    if (!fallbackModelName && resolvedModel) setFallbackModelName(resolvedModel);
    // Use `next` directly to avoid stale state in dispatch
    dispatch(
      updateBridgeVersionAction({
        bridgeId: params.id,
        versionId: searchParams?.version,
        dataToSend: {
          settings: {
            fall_back: {
              ...(fallbackModel || {}),
              is_enable: next,
              service: nextService,
              model: resolvedModel || null,
            },
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
    currentService,
    getServiceDefaultFallbackModel,
  ]);

  const computedModelsList = serviceModels?.[fallbackService] || {};

  const fallbackModelOptions = useMemo(() => {
    const opts = [];
    Object.entries(computedModelsList || {}).forEach(([group, options]) => {
      if (group === "image") return;

      Object.keys(options || {}).forEach((optionKey) => {
        const optionConfig = options?.[optionKey];
        const modelName = optionConfig?.configuration?.model?.default || optionKey;

        const serviceConfig = embedModelsConfig?.[fallbackService];
        const modelConfig = serviceConfig?.[modelName];
        if (modelConfig?.hide === true) return;

        const displayName = modelConfig?.value || modelName;
        const specs = optionConfig?.validationConfig?.specification;

        opts.push({
          value: modelName,
          label: displayName,
          meta: { group, modelName, specs },
        });
      });
    });
    return opts;
  }, [computedModelsList, embedModelsConfig, fallbackService]);

  const fallbackServiceOptions = useMemo(() => {
    if (!Array.isArray(SERVICES)) return [];
    return SERVICES.filter((svc) => {
      if (showDefaultApikeys && embedDefaultApiKeys) {
        return embedDefaultApiKeys.hasOwnProperty(svc.value);
      }
      return true;
    }).map((svc) => {
      const hasApiKeys = hasApiKeysForService(svc.value);
      const serviceIcon = getIconOfService(svc.value, 16, 16);

      return {
        value: svc.value,
        label: (
          <div className="flex items-center gap-2 truncate">
            {serviceIcon}
            <span>{svc.displayName || svc.value}</span>
          </div>
        ),
        disabled: !hasApiKeys,
        description: !hasApiKeys ? "No API Key Available" : undefined,
      };
    });
  }, [SERVICES, showDefaultApikeys, embedDefaultApiKeys, bridgeApikey_object_id, apikeydata]);

  const handleServiceSelect = useCallback(
    (val) => {
      handleFallbackServiceChange(val);
    },
    [handleFallbackServiceChange]
  );

  const handleOptionHover = useCallback((opt) => {
    const name = opt?.meta?.modelName || opt?.label;
    setHoveredModel(name);
    setModelSpecs(opt?.meta?.specs);
  }, []);

  const handleSelect = useCallback(
    (val, opt) => {
      const modelName = opt?.meta?.modelName || val;
      handleFallbackModelChange(modelName);
      setHoveredModel(null);
    },
    [handleFallbackModelChange]
  );

  return (
    <div data-testid="fallback-model-container" id="fallback-model-container" className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <label className="block text-base-content/70 text-sm font-medium">Fallback Model</label>
          <InfoTooltip tooltipContent="Enable and configure a fallback model and service to retry when the primary fails.">
            <CircleQuestionMark size={14} className="text-gray-500 hover:text-gray-700 cursor-help" />
          </InfoTooltip>
        </div>
        <input
          autoComplete="off"
          data-testid="fallback-model-toggle"
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
            <div className="space-y-2 flex-1">
              <label className="block text-base-content/70 text-xs font-medium">Fallback Service</label>
              <div className="relative w-full">
                <Dropdown
                  testId="fallback-service-dropdown"
                  disabled={bridgeType === "batch" || isReadOnly}
                  options={fallbackServiceOptions}
                  value={fallbackService || ""}
                  onChange={handleServiceSelect}
                  placeholder="Select a Service"
                  size="sm"
                  placement="top"
                  className="flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs whitespace-nowrap transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 border-base-content/20 text-base-content h-8 min-w-[150px]"
                  style={{ backgroundColor: "color-mix(in oklab, var(--color-white) 3%, transparent)" }}
                  menuClassName="w-full min-w-[200px] mb-6"
                />

                {bridgeType === "batch" && (
                  <div className="absolute right-8 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                    <InfoTooltip tooltipContent="Batch API is only applicable for OpenAI">
                      <AlertIcon size={16} className="text-warning" />
                    </InfoTooltip>
                  </div>
                )}
              </div>
            </div>

            {/* Fallback Model */}
            <div className="space-y-2 flex-1">
              <label className="block text-base-content/70 text-xs font-medium">Fallback Model</label>
              <div className="w-full" ref={fallbackModelDropdownRef}>
                <Dropdown
                  testId="fallback-model-dropdown"
                  disabled={isReadOnly}
                  options={fallbackModelOptions}
                  value={fallbackModelName || ""}
                  onChange={handleSelect}
                  onOptionHover={handleOptionHover}
                  showGroupHeaders
                  isEmbedUser={isEmbedUser}
                  placeholder="Select a Model"
                  size="sm"
                  placement="top"
                  className="flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs whitespace-nowrap transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 border-base-content/20 text-base-content h-8 min-w-[150px]"
                  style={{ backgroundColor: "color-mix(in oklab, var(--color-white) 3%, transparent)" }}
                  menuClassName="w-[260px] max-h-[340px] min-w-[200px] mb-6"
                  maxLabelLength={30}
                />
              </div>
              <ModelPreview
                hoveredModel={hoveredModel}
                modelSpecs={modelSpecs}
                dropdownRef={fallbackModelDropdownRef}
              />
            </div>
          </div>

          {fallbackModelName && currentModel && fallbackModelName === currentModel && (
            <div
              data-testid="fallback-model-same-model-alert"
              id="fallback-model-same-model-alert"
              className="alert alert-warning mt-3 py-2 px-2"
            >
              <div className="flex items-center gap-2">
                <AlertIcon size={12} />
                <span className="text-xs">This model is already selected please change the model</span>
              </div>
            </div>
          )}
        </div>
      )}

      {shouldRenderApiKey && (
        <div className="mt-4">
          <div className="flex flex-col gap-3 w-full">
            {/* Multiple API Keys Label */}
            <div className="flex items-center gap-1">
              <span className="label-text font-medium">Multiple API Keys</span>
              <InfoTooltip tooltipContent="Add API keys for different models/services. This ensures your agent continues working when switching models in runtime or using fallback options.">
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
                                  autoComplete="off"
                                  disabled={isReadOnly}
                                  type="radio"
                                  name={`apiKey-${service?.value}`}
                                  value={apiKey?._id}
                                  checked={selectedApiKeys[service?.value] === apiKey?._id}
                                  onClick={() => handleSelectionChange(service?.value, apiKey?._id)}
                                  onChange={() => {}}
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
