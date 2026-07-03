import React, { useState, useMemo, useEffect } from "react";
import { Check, Zap, ChevronDownIcon, Search, AlertCircle } from "lucide-react";
import { useDispatch } from "react-redux";
import { useCustomSelector } from "@/customHooks/customSelector";
import { getBridgeApikeysByVersionAction } from "@/store/action/apiKeyAction";
import InfoTooltip from "@/components/InfoTooltip";

const TestCaseModelDropdown = ({ selectedModels = [], onChange, selectedVersions = [], versions = [], bridgeId }) => {
  const dispatch = useDispatch();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // Fetch services, models, and per-version API-key availability from Redux
  const { SERVICES, serviceModels, apikeysByVersion } = useCustomSelector((state) => {
    return {
      SERVICES: state?.serviceReducer?.services || [],
      serviceModels: state?.modelReducer?.serviceModels || {},
      apikeysByVersion: state?.apiKeysReducer?.apikeysByBridgeVersion?.[bridgeId] || {},
    };
  });
  // Fetch per-version API key services for this bridge on mount / bridge change.
  useEffect(() => {
    if (bridgeId) dispatch(getBridgeApikeysByVersionAction(bridgeId));
  }, [dispatch, bridgeId]);

  const getVersionsMissingService = (service) => {
    if (!Array.isArray(selectedVersions) || selectedVersions.length === 0) return [];
    const missing = [];
    selectedVersions.forEach((version) => {
      const versionId = typeof version === "string" ? version : version?.id || version?._id;
      if (!versionId) return;
      const versionData = apikeysByVersion[versionId];
      const servicesArray = Array.isArray(versionData?.services) ? versionData.services : [];
      if (servicesArray.includes(service)) return;
      const idx = Array.isArray(versions) ? versions.indexOf(versionId) : -1;
      missing.push({ id: versionId, label: idx >= 0 ? `V${idx + 1}` : versionId });
    });
    return missing;
  };

  const getVersionsWithModel = (modelName) => {
    if (!Array.isArray(selectedVersions) || selectedVersions.length === 0) return [];
    const versionsWithModel = [];
    selectedVersions.forEach((version) => {
      const versionId = typeof version === "string" ? version : version?.id || version?._id;
      if (!versionId) return;
      const versionData = apikeysByVersion[versionId];
      if (versionData?.model === modelName) {
        const idx = Array.isArray(versions) ? versions.indexOf(versionId) : -1;
        versionsWithModel.push({ id: versionId, label: idx >= 0 ? `V${idx + 1}` : versionId });
      }
    });
    return versionsWithModel;
  };

  // Group models by service from Redux data
  const groupedModels = useMemo(() => {
    const groups = [];
    const servicesList = Array.isArray(SERVICES) ? SERVICES : [];

    servicesList.forEach((service) => {
      const serviceName = service?.value || service?.displayName;
      const models = serviceModels?.[serviceName];

      if (models && typeof models === "object") {
        const modelList = [];
        Object.entries(models).forEach(([category, categoryModels]) => {
          if (categoryModels && typeof categoryModels === "object") {
            Object.entries(categoryModels).forEach(([, modelConfig]) => {
              const modelName = modelConfig?.configuration?.model?.default;
              if (modelName) {
                modelList.push({ name: modelName, provider: serviceName, category });
              }
            });
          }
        });
        if (modelList.length > 0) {
          groups.push({ provider: serviceName, models: modelList });
        }
      }
    });
    return groups;
  }, [SERVICES, serviceModels]);

  const isDefault = !Array.isArray(selectedModels) || selectedModels.length === 0;
  const iconTextColor = isDefault ? "text-base-content/60" : "text-base-content/50";

  // Trigger label: "Default", "gpt-4o", or "gpt-4o +2"
  const triggerLabel = useMemo(() => {
    if (isDefault) return "Default";
    if (selectedModels.length === 1) return selectedModels[0]?.model;
    return `${selectedModels[0]?.model} +${selectedModels.length - 1}`;
  }, [isDefault, selectedModels]);

  const triggerTitle = useMemo(() => {
    if (isDefault) return "Use each version's configured model";
    return selectedModels.map((m) => m.model).join(", ");
  }, [isDefault, selectedModels]);

  // Filter groups/models by the search query (case-insensitive).
  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return groupedModels;
    return groupedModels
      .map((group) => {
        const providerMatches = group.provider?.toLowerCase().includes(q);
        const models = providerMatches ? group.models : group.models.filter((m) => m.name?.toLowerCase().includes(q));
        return models.length > 0 ? { ...group, models } : null;
      })
      .filter(Boolean);
  }, [groupedModels, searchQuery]);

  const isModelSelected = (modelName, provider) =>
    selectedModels.some((m) => m.model === modelName && m.service === provider);

  const toggleModel = (modelName, provider) => {
    if (isModelSelected(modelName, provider)) {
      onChange(selectedModels.filter((m) => !(m.model === modelName && m.service === provider)));
    } else {
      onChange([...selectedModels, { model: modelName, service: provider }]);
    }
  };

  return (
    <div className="relative">
      <button
        data-testid="testcase-model-dropdown-btn"
        onClick={() => setIsOpen((o) => !o)}
        title={triggerTitle}
        className="flex items-center gap-2 px-2 py-1 bg-transparent border border-base-content/20 rounded-lg text-xs font-semibold text-base-content/70 cursor-pointer hover:bg-base-200 transition-colors max-w-[200px]"
      >
        <Zap size={12} strokeWidth={2} className={iconTextColor} />
        <span className={`font-bold truncate ${iconTextColor}`}>{triggerLabel}</span>
        <ChevronDownIcon
          size={12}
          className={`text-base-content/50 transition-transform duration-200 flex-shrink-0 ${isOpen ? "rotate-180" : ""}`}
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
            <div className="flex items-center justify-between gap-2 px-2.5 pt-1.5 pb-2.5 border-b border-base-200 mb-1.5">
              <span className="text-[11px] font-bold tracking-[0.05em] text-base-content/50 uppercase">
                Select Models
              </span>
              {!isDefault && (
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="text-[11px] font-semibold text-primary hover:underline"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Default Option */}
            <div className="mb-1.5 border-b border-base-200 pb-1.5">
              <button
                data-testid="testcase-model-option-default"
                onClick={() => {
                  onChange([]);
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

            {/* Search */}
            <div className="px-1.5 pb-1.5">
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-[9px] border border-base-content/30 bg-base-100 focus-within:border-primary">
                <Search size={12} className="text-base-content/40 flex-shrink-0" />
                <input
                  type="text"
                  data-testid="testcase-model-dropdown-search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search models"
                  className="w-full bg-transparent outline-none text-[12.5px] text-base-content placeholder:text-base-content/40"
                />
              </div>
            </div>

            {filteredGroups.length === 0 ? (
              <div className="px-2.5 py-3 text-[12px] text-base-content/50 text-center">
                No models match "{searchQuery}"
              </div>
            ) : null}

            {filteredGroups.map((group) => {
              const missingVersions = getVersionsMissingService(group.provider);
              const isServiceUnavailable = missingVersions.length > 0;
              const missingLabels = missingVersions.map((v) => v.label).join(", ");
              const missingVisible = missingVersions
                .slice(0, 3)
                .map((v) => v.label)
                .join(", ");
              const missingHidden = Math.max(0, missingVersions.length - 3);
              const unavailableTooltip = isServiceUnavailable
                ? `No API key configured for ${group.provider} in ${missingLabels}`
                : "";
              return (
                <div key={group.provider}>
                  <div className="flex items-center justify-between gap-2 px-2.5 pt-1.5 pb-1">
                    <span className="text-[11px] font-bold tracking-wide text-base-content/50">{group.provider}</span>
                    {isServiceUnavailable && (
                      <InfoTooltip tooltipContent={unavailableTooltip}>
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-error bg-error/10 px-1.5 py-0.5 rounded cursor-help"
                          data-testid={`testcase-model-service-missing-${group.provider}`}
                        >
                          <AlertCircle size={10} />
                          No Api Key: {missingVisible}
                          {missingHidden > 0 && <span className="opacity-80">... +{missingHidden}</span>}
                        </span>
                      </InfoTooltip>
                    )}
                  </div>
                  {group.models.map((model) => {
                    const isActive = isModelSelected(model.name, group.provider);
                    const disabled = isServiceUnavailable && !isActive;
                    const versionsWithModel = getVersionsWithModel(model.name);
                    const versionsLabel = versionsWithModel.map((v) => v.label).join(", ");
                    const isConnected = versionsWithModel.length > 0;
                    return (
                      <button
                        key={model.name}
                        onClick={() => toggleModel(model.name, group.provider)}
                        disabled={disabled}
                        title={disabled ? unavailableTooltip : versionsLabel ? `Connected to: ${versionsLabel}` : ""}
                        className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-[9px] text-left text-[13.5px] transition-colors ${
                          disabled
                            ? "cursor-not-allowed opacity-50 bg-transparent text-base-content/40"
                            : isActive
                              ? "cursor-pointer bg-primary/10 font-bold text-primary"
                              : "cursor-pointer bg-transparent font-normal text-base-content/70 hover:bg-base-200"
                        }`}
                      >
                        <span
                          className={`w-4 h-4 flex-shrink-0 rounded border flex items-center justify-center ${
                            isActive
                              ? "bg-primary border-primary"
                              : disabled
                                ? "bg-base-200 border-base-content/20"
                                : "bg-base-100 border-base-content/40"
                          }`}
                        >
                          {isActive && <Check size={12} strokeWidth={3} className="text-primary-content" />}
                        </span>
                        <span className="truncate min-w-0 flex-1">{model.name}</span>
                        {isConnected && (
                          <InfoTooltip tooltipContent={`Connected to: ${versionsLabel}`}>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-success cursor-help flex-shrink-0">
                              {versionsWithModel.slice(0, 3).map((v) => (
                                <span key={v.id} className="border border-success/40 px-1.5 py-0.5 rounded">
                                  {v.label}
                                </span>
                              ))}
                              {versionsWithModel.length > 3 && (
                                <span className="border border-success/40 px-1.5 py-0.5 rounded">
                                  +{versionsWithModel.length - 3}
                                </span>
                              )}
                            </span>
                          </InfoTooltip>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default TestCaseModelDropdown;
