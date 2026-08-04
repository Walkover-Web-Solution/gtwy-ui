"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { CircleAlert, Loader2 } from "lucide-react";
import Dropdown from "@/components/UI/Dropdown";
import { updateBridgeVersionAction } from "@/store/action/bridgeAction";
import { getHuggingFaceModelProviders } from "@/config/modelApi";

const SUPPORTED_HF_TASKS = new Set(["conversational", "text-generation", "image-text-to-text"]);

const HuggingFaceModelResolver = ({
  params,
  searchParams,
  isReadOnly,
  currentModel,
  currentModelType,
  currentProviderConfig,
  catalogModelOptions = [],
}) => {
  const dispatch = useDispatch();
  const [modelIdInput, setModelIdInput] = useState(currentModel || "");
  const [resolution, setResolution] = useState(null); // { modelId, pipelineTag, providers }
  const [selectedProvider, setSelectedProvider] = useState(currentProviderConfig?.provider || "");
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState("");

  useEffect(() => {
    setModelIdInput(currentModel || "");
  }, [currentModel]);

  const handleSaveRef = useCallback(
    (modelId, provider) => {
      const provider_config = {
        provider,
        base_url: "https://router.huggingface.co/v1",
        provider_model_id: `${modelId}:${provider}`,
      };
      dispatch(
        updateBridgeVersionAction({
          bridgeId: params.id,
          versionId: searchParams?.version,
          dataToSend: {
            configuration: {
              model: modelId,
              type: "chat",
              provider_config,
            },
          },
        })
      );
    },
    [dispatch, params?.id, searchParams?.version]
  );

  const handleResolve = useCallback(
    async (modelIdOverride, { isInitialLoad = false, preferredProvider } = {}) => {
      const modelId = (modelIdOverride ?? modelIdInput)?.trim();
      if (!modelId) return;
      setIsResolving(true);
      setResolveError("");
      setResolution(null);
      const result = await getHuggingFaceModelProviders(modelId);
      setIsResolving(false);

      if (!result) {
        setResolveError("Could not look up this model on Hugging Face. Check the model id and try again.");
        return;
      }
      if (!result.providers?.length) {
        setResolveError("This model has no active inference provider right now — try another model.");
        return;
      }
      setResolution(result);

      const supported = result.isTaskSupported ?? SUPPORTED_HF_TASKS.has(result.pipelineTag);
      const firstProvider = result.providers[0].provider;
      if (preferredProvider && result.providers.some((p) => p.provider === preferredProvider)) {
        setSelectedProvider(preferredProvider);
        if (supported && !isInitialLoad) handleSaveRef(result.modelId, preferredProvider);
      } else {
        setSelectedProvider(firstProvider);
        if (supported && !isInitialLoad) handleSaveRef(result.modelId, firstProvider);
      }
    },
    [modelIdInput, handleSaveRef]
  );

  const autoResolvedModelRef = useRef(null);
  useEffect(() => {
    if (!currentModel || currentModelType === "image" || autoResolvedModelRef.current === currentModel) return;
    autoResolvedModelRef.current = currentModel;
    handleResolve(currentModel, { isInitialLoad: true, preferredProvider: currentProviderConfig?.provider });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentModel, currentModelType]);

  const handleCatalogSelect = useCallback(
    (val, opt) => {
      const modelId = opt?.meta?.modelName || val;
      setModelIdInput(modelId);
      if (opt?.meta?.group === "image") {
        setResolveError("");
        setResolution(null);
        dispatch(
          updateBridgeVersionAction({
            bridgeId: params.id,
            versionId: searchParams?.version,
            dataToSend: { configuration: { model: modelId, type: "image" } },
          })
        );
        return;
      }
      handleResolve(modelId);
    },
    [handleResolve, dispatch, params?.id, searchParams?.version]
  );

  const isTaskSupported = resolution
    ? (resolution.isTaskSupported ?? SUPPORTED_HF_TASKS.has(resolution.pipelineTag))
    : true;

  const providerOptions = (resolution?.providers || []).map((p) => {
    const inputCost = p.pricing?.input_cost != null ? `$${p.pricing.input_cost.toFixed(2)}` : null;
    const outputCost = p.pricing?.output_cost != null ? `$${p.pricing.output_cost.toFixed(2)}` : null;
    const description =
      inputCost && outputCost
        ? `in ${inputCost} / out ${outputCost} per 1M tokens`
        : inputCost
          ? `${inputCost} per 1M tokens`
          : undefined;
    return { value: p.provider, label: p.provider, description };
  });

  // Selecting a provider from the dropdown applies it immediately — no separate save step.
  const handleProviderSelect = useCallback(
    (provider) => {
      setSelectedProvider(provider);
      if (resolution && isTaskSupported) handleSaveRef(resolution.modelId, provider);
    },
    [resolution, isTaskSupported, handleSaveRef]
  );

  return (
    <div
      data-testid="huggingface-model-resolver"
      id="huggingface-model-resolver"
      className="flex flex-col gap-2 w-full"
    >
      {catalogModelOptions.length > 0 && (
        <div className="relative">
          <Dropdown
            testId="huggingface-catalog-model-dropdown"
            options={catalogModelOptions}
            value={catalogModelOptions.some((o) => o.value === modelIdInput) ? modelIdInput : ""}
            onChange={handleCatalogSelect}
            disabled={isReadOnly || isResolving}
            placeholder="Pick a known model…"
            size="sm"
            showGroupHeaders
            className="flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm whitespace-nowrap transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 border-base-content/20 text-base-content h-8 min-w-[150px]"
            style={{ backgroundColor: "color-mix(in oklab, var(--color-white) 3%, transparent)" }}
            menuClassName="w-full sm:w-[260px] max-h-[400px]"
          />
          {isResolving && (
            <Loader2
              size={14}
              className="animate-spin absolute right-8 top-1/2 -translate-y-1/2 text-base-content/50 pointer-events-none"
            />
          )}
        </div>
      )}

      {resolveError && (
        <div className="flex items-start gap-2 text-xs text-warning animate-in fade-in duration-200">
          <CircleAlert size={14} className="shrink-0 mt-0.5" />
          <span>{resolveError}</span>
        </div>
      )}

      {resolution && !isTaskSupported && (
        <div className="flex items-start gap-2 text-xs text-warning animate-in fade-in duration-200">
          <CircleAlert size={14} className="shrink-0 mt-0.5" />
          <span>
            This model is a <strong>{resolution.pipelineTag || "unknown"}</strong> model — Hugging Face support for this
            task isn't available yet. Only conversational (chat) models can be saved right now.
          </span>
        </div>
      )}

      {resolution && isTaskSupported && (
        <div className="flex flex-col gap-2 animate-in fade-in duration-200">
          {resolution.providers.length > 1 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-base-content/70">Inference provider</label>
              <Dropdown
                testId="huggingface-provider-dropdown"
                options={providerOptions}
                value={selectedProvider}
                onChange={handleProviderSelect}
                disabled={isReadOnly}
                size="sm"
                className="flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm whitespace-nowrap transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 border-base-content/20 text-base-content h-8 min-w-[150px]"
                style={{ backgroundColor: "color-mix(in oklab, var(--color-white) 3%, transparent)" }}
                menuClassName="w-full sm:w-[260px] max-h-[400px]"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HuggingFaceModelResolver;
