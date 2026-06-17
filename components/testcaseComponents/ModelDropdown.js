import React, { useState, useMemo } from "react";
import { Check, Zap, ChevronDownIcon } from "lucide-react";
import { useCustomSelector } from "@/customHooks/customSelector";

const TestCaseModelDropdown = ({ selectedModel, onModelChange, onServiceChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Fetch services and models from Redux
  const { SERVICES, serviceModels } = useCustomSelector((state) => {
    return {
      SERVICES: state?.serviceReducer?.services || [],
      serviceModels: state?.modelReducer?.serviceModels || {},
    };
  });

  // Group models by service from Redux data
  const groupedModels = useMemo(() => {
    const groups = [];

    // Get all services
    const servicesList = Array.isArray(SERVICES) ? SERVICES : [];

    servicesList.forEach((service) => {
      const serviceName = service?.value || service?.displayName;
      const models = serviceModels?.[serviceName];

      if (models && typeof models === "object") {
        const modelList = [];

        // Extract models from different categories (chat, embedding, image, etc.)
        Object.entries(models).forEach(([category, categoryModels]) => {
          if (categoryModels && typeof categoryModels === "object") {
            Object.entries(categoryModels).forEach(([modelKey, modelConfig]) => {
              const modelName = modelConfig?.configuration?.model?.default;
              if (modelName) {
                modelList.push({
                  name: modelName,
                  provider: serviceName,
                  category,
                });
              }
            });
          }
        });

        if (modelList.length > 0) {
          groups.push({
            provider: serviceName,
            models: modelList,
          });
        }
      }
    });

    return groups;
  }, [SERVICES, serviceModels]);

  const isDefault = !selectedModel;
  const iconTextColor = isDefault ? "text-base-content/60" : "text-base-content/50";

  const handleModelSelect = (modelName, provider) => {
    onModelChange(modelName);
    if (onServiceChange) {
      onServiceChange(provider);
    }
  };

  return (
    <div className="relative">
      <button
        data-testid="testcase-model-dropdown-btn"
        onClick={() => setIsOpen((o) => !o)}
        className="flex items-center gap-2 px-2 py-1 bg-transparent border border-base-content/20 rounded-lg text-xs font-semibold text-base-content/70 cursor-pointer hover:bg-base-200 transition-colors"
      >
        <Zap size={12} strokeWidth={2} className={iconTextColor} />
        <span className={`font-bold ${iconTextColor}`}>{isDefault ? "Default" : selectedModel}</span>
        <ChevronDownIcon
          size={12}
          className={`text-base-content/50 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[90]"
            data-testid="testcase-model-dropdown-backdrop"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-[calc(100%+8px)] left-0 z-[100] w-[280px] max-h-[400px] overflow-y-auto bg-base-100 border border-base-300 rounded-2xl shadow-lg p-2">
            <div className="text-[11px] font-bold tracking-[0.05em] text-base-content/50 px-2.5 pt-1.5 pb-2.5 uppercase border-b border-base-200 mb-1.5">
              Select Model
            </div>

            {/* Default Option */}
            <div className="mb-1.5 border-b border-base-200 pb-1.5">
              <button
                data-testid="testcase-model-option-default"
                onClick={() => {
                  onModelChange(null);
                  if (onServiceChange) {
                    onServiceChange(null);
                  }
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-2.5 rounded-[9px] text-left cursor-pointer transition-colors ${
                  isDefault ? "bg-base-200" : "bg-transparent hover:bg-base-200"
                }`}
              >
                <div>
                  <div
                    className={`text-[13.5px] ${
                      isDefault ? "font-bold text-base-content" : "font-medium text-base-content/70"
                    }`}
                  >
                    Default (version config)
                  </div>
                  <div className="text-[11.5px] text-base-content/50 mt-0.5">Use the LLM set in each version</div>
                </div>
                {isDefault && <Check size={14} strokeWidth={3} className="text-base-content/60 flex-shrink-0" />}
              </button>
            </div>

            {groupedModels.map((group) => (
              <div key={group.provider}>
                <div className="text-[11px] font-bold tracking-wide text-base-content/50 px-2.5 pt-1.5 pb-1">
                  {group.provider}
                </div>
                {group.models.map((model) => {
                  const isActive = selectedModel === model.name;
                  return (
                    <button
                      key={model.name}
                      data-testid={`testcase-model-option-${model.name}`}
                      onClick={() => {
                        handleModelSelect(model.name, group.provider);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-[9px] text-left text-[13.5px] cursor-pointer transition-colors ${
                        isActive
                          ? "bg-primary/10 font-bold text-primary"
                          : "bg-transparent font-normal text-base-content/70 hover:bg-base-200"
                      }`}
                    >
                      {model.name}
                      {isActive && <Check size={14} strokeWidth={3} className="text-primary flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default TestCaseModelDropdown;
