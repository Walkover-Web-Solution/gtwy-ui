import { useCustomSelector } from "@/customHooks/customSelector";
import { updateBridgeVersionAction } from "@/store/action/bridgeAction";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { createPortal } from "react-dom";
import Dropdown from "@/components/UI/Dropdown";
import { CircleQuestionMark, Sparkles, CircleAlert } from "lucide-react";
import InfoTooltip from "@/components/InfoTooltip";
// Model Preview component to display model specifications
const ModelPreview = memo(({ hoveredModel, modelSpecs, dropdownRef }) => {
  if (!hoveredModel || !modelSpecs || !dropdownRef?.current) return null;

  // Calculate position relative to dropdown with viewport constraints
  const dropdownRect = dropdownRef.current.getBoundingClientRect();
  const viewportHeight = window.innerHeight;

  const previewStyle = {
    position: "fixed",
    top: Math.max(20, dropdownRect?.top - 50),
    left: dropdownRect?.right + -125, // Position to the right of dropdown
    zIndex: 99999,
    maxHeight: `${viewportHeight}px`,
    overflowY: "auto",
  };

  // Use createPortal to render directly to document body
  return createPortal(
    <div
      data-testid="model-preview-container"
      id="model-preview-container"
      className="w-[260px] bg-base-100 border border-base-content/20 rounded-lg shadow-xl p-4 transition-all duration-200 ease-in-out"
      style={previewStyle}
    >
      <div className="space-y-3">
        <div className="border-b border-base-300 pb-2">
          <h3 className="text-lg font-semibold text-base-content truncate">{hoveredModel}</h3>
          {modelSpecs?.description && <p className="text-xs text-base-content/80 mt-1">{modelSpecs.description}</p>}
        </div>

        {modelSpecs && ["input_cost", "output_cost"].some((type) => modelSpecs[type]) && (
          <div className="space-y-2">
            {["input_cost", "output_cost"].map((type) => {
              const spec = modelSpecs?.[type];
              const cost = modelSpecs?.cost?.[type];
              return (
                spec && (
                  <div key={type} className="bg-base-200/50 p-2 rounded-md">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-xs font-medium text-base-content capitalize">{type.replace("_", " ")}</h4>
                      {cost && <span className="text-xs text-base-content/70">{cost}</span>}
                    </div>
                    <p className="text-xs text-base-content/80 break-words leading-tight">
                      {typeof spec === "object" ? JSON.stringify(spec, null, 2) : spec}
                    </p>
                  </div>
                )
              );
            })}
          </div>
        )}

        {modelSpecs &&
          Object.entries(modelSpecs).filter(
            ([key, value]) =>
              !["input_cost", "output_cost", "description"].includes(key) &&
              value &&
              (!Array.isArray(value) || value.length > 0)
          ).length > 0 && (
            <div className="space-y-2">
              {Object.entries(modelSpecs)
                .filter(
                  ([key, value]) =>
                    !["input_cost", "output_cost", "description"].includes(key) &&
                    value &&
                    (!Array.isArray(value) || value.length > 0)
                )
                .map(([key, value]) => (
                  <div key={key} className="bg-base-200/50 p-2 rounded-md">
                    <h4 className="text-xs font-medium text-base-content mb-1 capitalize">{key.replace(/_/g, " ")}</h4>
                    {Array.isArray(value) ? (
                      <ul className="space-y-0.5">
                        {value.slice(0, 3).map(
                          (item, index) =>
                            item && (
                              <li key={index} className="text-xs text-base-content/80 pl-2">
                                • {item}
                              </li>
                            )
                        )}
                      </ul>
                    ) : (
                      <p className="text-xs text-base-content/80 break-words leading-tight">
                        {typeof value === "object" ? JSON.stringify(value, null, 2) : value}
                      </p>
                    )}
                  </div>
                ))}
            </div>
          )}
      </div>
    </div>,
    document.body
  );
});

ModelPreview.displayName = "ModelPreview";

const ModelDropdown = ({
  params,
  searchParams,
  isPublished,
  isEditor = true,
  isEmbedUser = false,
  hideAdvancedConfigurations = false,
}) => {
  // Determine if content is read-only (either published or user is not an editor)
  const isReadOnly = isPublished || !isEditor;
  const dispatch = useDispatch();
  const dropdownRef = useRef(null);
  const {
    model,
    fineTuneModel,
    modelType,
    modelsList,
    bridgeType,
    service,
    modelsConfig,
    isAutoModelSupported,
    autoModelSelect,
    fallbackModel,
  } = useCustomSelector((state) => {
    const versionData = state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[searchParams?.version];
    const bridgeDataFromState = state?.bridgeReducer?.allBridgesMap?.[params?.id];
    const isPublished = searchParams?.isPublished === "true";

    // Use bridgeData when isPublished=true, otherwise use versionData
    const activeData = isPublished ? bridgeDataFromState : versionData;

    return {
      model: isPublished ? bridgeDataFromState?.configuration?.model : versionData?.configuration?.model,
      fineTuneModel: isPublished
        ? bridgeDataFromState?.configuration?.fine_tune_model?.current_model
        : versionData?.configuration?.fine_tune_model?.current_model,
      modelType: isPublished ? bridgeDataFromState?.configuration?.type : versionData?.configuration?.type,
      modelsList: state?.modelReducer?.serviceModels[activeData?.service],
      bridgeType: state?.bridgeReducer?.allBridgesMap?.[params?.id]?.bridgeType,
      service: activeData?.service,
      modelsConfig: state?.appInfoReducer?.embedUserDetails?.models || {},
      isAutoModelSupported: state?.serviceReducer?.default_model?.[activeData?.service]?.autoRouterSupport || false,
      autoModelSelect: isPublished
        ? (bridgeDataFromState?.auto_model_select ?? false)
        : (versionData?.auto_model_select ?? false),
      fallbackModel: activeData?.fall_back,
    };
  });

  const isFallbackEnabled = !!fallbackModel?.is_enable;
  const fallbackServiceName = fallbackModel?.service || service || "Not set";
  const fallbackModelName = fallbackModel?.model || "Not set";

  const [hoveredModel, setHoveredModel] = useState(null);
  const [modelSpecs, setModelSpecs] = useState();

  useEffect(() => {
    if (!isAutoModelSupported && autoModelSelect) {
      dispatch(
        updateBridgeVersionAction({
          bridgeId: params.id,
          versionId: searchParams?.version,
          dataToSend: { auto_model_select: false },
        })
      );
    }
  }, [isAutoModelSupported]);

  const handleFinetuneModelChange = (e) => {
    const selectedFineTunedModel = e.target.value;
    dispatch(
      updateBridgeVersionAction({
        bridgeId: params.id,
        versionId: searchParams?.version,
        dataToSend: {
          configuration: {
            fine_tune_model: {
              current_model: selectedFineTunedModel,
            },
          },
        },
      })
    );
  };
  // Build flat options for global Dropdown while preserving group info and specs
  const modelOptions = useMemo(() => {
    const opts = [];
    Object.entries(modelsList || {}).forEach(([group, options]) => {
      const isInvalidGroup =
        group === "models" ||
        (bridgeType === "chatbot" && group === "embedding") ||
        (bridgeType === "batch" && (group === "image" || group === "embedding"));
      if (isInvalidGroup) return;

      Object.keys(options || {}).forEach((optionKey) => {
        const cfg = options?.[optionKey];
        const modelName = cfg?.configuration?.model?.default;
        if (!modelName) return;

        const serviceConfig = modelsConfig?.[service];
        const modelConfig = serviceConfig?.[modelName];
        if (modelConfig?.hide === true) return;

        const specs = cfg?.validationConfig?.specification;

        const displayName = modelConfig?.value || modelName;

        const displayLabel =
          modelName === "gpt-5-nano" && bridgeType === "chatbot" ? (
            <div className="flex items-center gap-2">
              <span>{displayName}</span>
              <span className="badge badge-success badge-sm text-xs">FREE</span>
            </div>
          ) : (
            displayName
          );

        opts.push({
          value: modelName,
          label: displayLabel,
          // pass meta to use in onChange and onOptionHover
          meta: { group, modelName, specs },
        });
      });
    });
    return opts;
  }, [modelsList, bridgeType, modelsConfig, service]);
  const handleSelect = useCallback(
    (val, opt) => {
      const selectedGroup = opt?.meta?.group;
      const modelName = opt?.meta?.modelName || val;
      const configUpdate = { model: modelName, type: selectedGroup };
      const dataToSend = { configuration: configUpdate };
      if (selectedGroup !== "chat") {
        dataToSend.auto_model_select = false;
      }
      dispatch(
        updateBridgeVersionAction({
          bridgeId: params.id,
          versionId: searchParams?.version,
          dataToSend,
        })
      );
      setHoveredModel(null);
    },
    [dispatch, params.id, searchParams?.version]
  );

  const handleAutoSelectModelToggle = useCallback(
    (e) => {
      const isEnabled = e.target.checked;
      dispatch(
        updateBridgeVersionAction({
          bridgeId: params.id,
          versionId: searchParams?.version,
          dataToSend: { auto_model_select: isEnabled },
        })
      );
    },
    [dispatch, params.id, searchParams?.version]
  );

  const handleOptionHover = useCallback((opt) => {
    const name = opt?.meta?.modelName || opt?.label;
    setHoveredModel(name);
    setModelSpecs(opt?.meta?.specs);
  }, []);

  const showFallbackModelHint = ((isEmbedUser && !hideAdvancedConfigurations) || !isEmbedUser) && modelType !== "image";

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <label className="block text-base-content/70 text-sm font-medium">Model</label>
        {isAutoModelSupported && modelType === "chat" && (
          <div className="flex items-center gap-1">
            <span className="flex items-center gap-1 text-xs">
              <Sparkles size={10} />
              Auto Select Model
            </span>
            <InfoTooltip tooltipContent="Let GTWY's Smart Model Router select the model depending on User Query. Only works for chat type models.">
              <CircleQuestionMark
                size={14}
                className={
                  autoModelSelect ? "text-warning cursor-help" : "text-gray-500 hover:text-gray-700 cursor-help"
                }
              />
            </InfoTooltip>
            <input
              data-testid="auto-select-model-toggle"
              id="auto-select-model-toggle"
              disabled={isReadOnly}
              type="checkbox"
              className="toggle toggle-xs"
              checked={!!autoModelSelect}
              onChange={handleAutoSelectModelToggle}
            />
          </div>
        )}
      </div>
      <div
        data-testid="model-dropdown-container"
        id="model-dropdown-container"
        className="flex flex-col items-start gap-4 relative"
        style={{ opacity: autoModelSelect ? 0.5 : 1, pointerEvents: autoModelSelect ? "none" : "auto" }}
      >
        <div className="flex items-center gap-2 w-full">
          <div className="flex-1" ref={dropdownRef}>
            <Dropdown
              testId="model-dropdown"
              disabled={isReadOnly || autoModelSelect}
              options={modelOptions}
              value={model || ""}
              onChange={handleSelect}
              onOptionHover={handleOptionHover}
              showGroupHeaders
              placeholder="Select model"
              size="sm"
              className="flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm whitespace-nowrap transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 border-base-200 text-base-content h-8 min-w-[150px]"
              style={{ backgroundColor: "color-mix(in oklab, var(--color-white) 3%, transparent)" }}
              menuClassName="w-full sm:w-[260px] max-h-[500px] min-w-[200px]"
              maxLabelLength={20}
            />
          </div>
          {showFallbackModelHint && (
            <InfoTooltip
              tooltipContent={
                !isFallbackEnabled ? (
                  <span className="text-xs max-w-[220px] flex flex-col gap-1">
                    <span className="font-semibold text-warning">Fallback Model</span>
                    <span className="opacity-80">You can select a fallback model below.</span>
                  </span>
                ) : (
                  <span className="text-xs flex flex-col gap-1">
                    <span className="font-semibold text-warning">Fallback Model</span>
                    <span>
                      <span className="opacity-70">Service:</span>{" "}
                      <span className="font-medium capitalize">{fallbackServiceName}</span>
                    </span>
                    <span>
                      <span className="opacity-70">Model:</span>{" "}
                      <span className="font-medium">{fallbackModelName}</span>
                    </span>
                  </span>
                )
              }
            >
              <button
                type="button"
                className={`btn btn-sm btn-ghost border rounded border-base-200 px-2 ${isFallbackEnabled ? "" : "opacity-70"}`}
              >
                <CircleAlert size={16} className={isFallbackEnabled ? "text-warning" : "text-gray-400"} />
              </button>
            </InfoTooltip>
          )}
        </div>

        <ModelPreview hoveredModel={hoveredModel} modelSpecs={modelSpecs} dropdownRef={dropdownRef} />

        {/* If model is fine-tuned model */}
        {modelType === "fine-tune" && (
          <div id="fine-tune-model-section" className="w-full sm:max-w-xs">
            <div className="label">
              <span className="label-text text-base-content">Fine-Tune Model</span>
            </div>
            <input
              data-testid="fine-tune-model-input"
              id="fine-tune-model-input"
              type="text"
              name="name"
              key={fineTuneModel}
              defaultValue={fineTuneModel}
              onBlur={handleFinetuneModelChange}
              placeholder="Fine-tune model Name"
              disabled={isReadOnly}
              className="input input-bordered input-sm w-full bg-base-100 text-base-content focus:border-primary focus:ring-1 focus:ring-primary min-h-[2.5rem] sm:min-h-[2rem]"
            />
          </div>
        )}
      </div>
    </>
  );
};

export default ModelDropdown;
