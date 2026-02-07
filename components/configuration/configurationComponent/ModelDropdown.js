import { useCustomSelector } from "@/customHooks/customSelector";
import { updateBridgeVersionAction } from "@/store/action/bridgeAction";
import React, { memo, useCallback, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { createPortal } from "react-dom";
import Dropdown from "@/components/UI/Dropdown";
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
                      <h4 clclassName="text-xs font-medium text-base-content capitalize">{type.replace("_", " ")}</h4>
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

const ModelDropdown = ({ params, searchParams, isPublished, isEditor = true }) => {
  // Determine if content is read-only (either published or user is not an editor)
  const isReadOnly = isPublished || !isEditor;
  const dispatch = useDispatch();
  const dropdownRef = useRef(null);
  const { model, fineTuneModel, modelType, modelsList, bridgeType } = useCustomSelector((state) => {
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
    };
  });

  const [hoveredModel, setHoveredModel] = useState(null);
  const [modelSpecs, setModelSpecs] = useState();

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
        const specs = cfg?.validationConfig?.specification;
        const displayLabel =
          modelName === "gpt-5-nano" && bridgeType === "chatbot" ? (
            <div className="flex items-center gap-2">
              <span>{modelName}</span>
              <span className="badge badge-success badge-sm text-xs">FREE</span>
            </div>
          ) : (
            modelName
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
  }, [modelsList, bridgeType]);

  const handleSelect = useCallback(
    (val, opt) => {
      const selectedGroup = opt?.meta?.group;
      const modelName = opt?.meta?.modelName || val;
      dispatch(
        updateBridgeVersionAction({
          bridgeId: params.id,
          versionId: searchParams?.version,
          dataToSend: { configuration: { model: modelName, type: selectedGroup } },
        })
      );
      setHoveredModel(null);
    },
    [dispatch, params.id, searchParams?.version]
  );

  const handleOptionHover = useCallback((opt) => {
    const name = opt?.meta?.modelName || opt?.label;
    setHoveredModel(name);
    setModelSpecs(opt?.meta?.specs);
  }, []);

  return (
    <div id="model-dropdown-container" className="flex flex-col items-start gap-4 relative">
      <div className="w-full" ref={dropdownRef}>
        <Dropdown
          disabled={isReadOnly}
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

      <ModelPreview hoveredModel={hoveredModel} modelSpecs={modelSpecs} dropdownRef={dropdownRef} />

      {/* If model is fine-tuned model */}
      {modelType === "fine-tune" && (
        <div id="fine-tune-model-section" className="w-full sm:max-w-xs">
          <div className="label">
            <span className="label-text text-base-content">Fine-Tune Model</span>
          </div>
          <input
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
  );
};

export default ModelDropdown;
