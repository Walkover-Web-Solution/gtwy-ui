"use client";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useDispatch } from "react-redux";
import { useCustomSelector } from "@/customHooks/customSelector";
import { getServiceAction } from "@/store/action/serviceAction";
import { getModelAction } from "@/store/action/modelAction";
import { toggleSidebar, openSidebar, closeSidebar } from "@/utils/utility";
import { ChevronRight, X, Check, Sparkles, Search } from "lucide-react";

export const runtime = "edge";

const SLIDER_ID = "model-detail-sidebar";

const ModelGardenPage = ({ params }) => {
  const dispatch = useDispatch();

  const { services, serviceModels } = useCustomSelector((state) => ({
    services: state.serviceReducer?.services || [],
    serviceModels: state.modelReducer?.serviceModels || {},
  }));

  console.log("all models:", serviceModels);

  const [selectedService, setSelectedService] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModel, setSelectedModel] = useState(null);

  useEffect(() => {
    dispatch(getServiceAction());
  }, [dispatch]);

  // Fetch models when a service is selected
  useEffect(() => {
    if (selectedService) {
      dispatch(getModelAction({ service: selectedService }));
    }
  }, [selectedService, dispatch]);

  const handleServiceClick = (serviceKey) => {
    setSelectedService(serviceKey);
    setIsPanelOpen(true);
    setSearchQuery("");
    closeSidebar(SLIDER_ID, "right"); // Close model details when switching services
    setSelectedModel(null);
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
    setTimeout(() => setSelectedService(null), 300);
  };

  const handleModelClick = useCallback((model) => {
    setSelectedModel(model);
    openSidebar(SLIDER_ID, "right");
  }, []);

  const handleCloseSlider = useCallback(() => {
    toggleSidebar(SLIDER_ID, "right");
    setTimeout(() => setSelectedModel(null), 300);
  }, []);

  // Flatten models for the selected service into table rows
  const modelRows = useMemo(() => {
    if (!selectedService || !serviceModels[selectedService]) return [];
    const serviceData = serviceModels[selectedService];
    const rows = [];

    Object.entries(serviceData).forEach(([type, models]) => {
      if (models && typeof models === "object") {
        Object.entries(models).forEach(([modelName, modelData]) => {
          const spec = modelData?.validationConfig?.specification || {};
          const configParams = modelData?.configuration?.additional_parameters || {};

          // Look for max_tokens in different possible locations
          const maxTokensData = configParams.max_tokens || spec.max_token || modelData.max_token;

          rows.push({
            name: modelData?.configuration?.model?.default || modelData?.model_name || modelName,
            type: modelData?.validationConfig?.type || type,
            maxTokens: typeof maxTokensData === "object" ? maxTokensData.max : maxTokensData || null,
            minTokens: typeof maxTokensData === "object" ? maxTokensData.min : null,
            inputCost: spec?.input_cost || null,
            outputCost: spec?.output_cost || null,
            description: spec?.description || null,
            knowledgeCutoff: spec?.knowledge_cutoff || null,
            vision: modelData?.validationConfig?.vision,
            files: modelData?.validationConfig?.files,
            _raw: modelData,
          });
        });
      }
    });

    return rows;
  }, [selectedService, serviceModels]);

  // Filter models by search
  const filteredModels = useMemo(() => {
    if (!searchQuery) return modelRows;
    const q = searchQuery.toLowerCase();
    return modelRows.filter(
      (m) =>
        m.name?.toLowerCase().includes(q) ||
        m.type?.toLowerCase().includes(q) ||
        m.description?.toLowerCase()?.includes(q)
    );
  }, [modelRows, searchQuery]);

  // Get display name for a service
  const getServiceDisplayName = (service) => {
    if (typeof service === "object" && service.displayName) return service.displayName;
    if (typeof service === "string") return service;
    return service?.value || "Unknown";
  };

  const serviceList = Array.isArray(services) ? services : Object.entries(services || {}).map(([key]) => key);

  // Build detail rows for the slider from the selected model
  const detailFields = useMemo(() => {
    if (!selectedModel) return [];
    const spec = selectedModel._raw?.validationConfig?.specification || {};
    const fields = [
      { label: "Model Name", value: selectedModel.name },
      { label: "Type", value: selectedModel.type },
      { label: "Description", value: selectedModel.description },
      { label: "Input Cost", value: selectedModel.inputCost },
      { label: "Output Cost", value: selectedModel.outputCost },
      { label: "Min Tokens", value: selectedModel.minTokens?.toLocaleString?.() || selectedModel.minTokens },
      { label: "Max Tokens", value: selectedModel.maxTokens?.toLocaleString?.() || selectedModel.maxTokens },
      { label: "Knowledge Cutoff", value: selectedModel.knowledgeCutoff },
      {
        label: "Vision (Support Images)",
        value:
          selectedModel.vision === true ? (
            <Check size={16} className="text-success" />
          ) : (
            <X size={16} className="text-error" />
          ),
      },
      {
        label: "Files (Support Files)",
        value:
          selectedModel.files === true ? (
            <Check size={16} className="text-success" />
          ) : (
            <X size={16} className="text-error" />
          ),
      },
    ];

    // Include any extra spec fields not already shown
    const knownKeys = new Set([
      "input_cost",
      "output_cost",
      "description",
      "knowledge_cutoff",
      "max_token",
      "vision",
      "files",
    ]);
    Object.entries(spec).forEach(([key, value]) => {
      if (knownKeys.has(key) || !value) return;
      if (Array.isArray(value) && value.length === 0) return;
      fields.push({
        label: key.replace(/_/g, " "),
        value: Array.isArray(value) ? value.join(", ") : typeof value === "object" ? JSON.stringify(value) : value,
      });
    });

    return fields.filter((f) => f.value !== null && f.value !== undefined && f.value !== "" && f.value !== "NaN");
  }, [selectedModel]);

  return (
    <div className="h-full flex flex-col">
      {/* Page Header */}
      <div className="px-6 pt-6 pb-4 border-b border-base-300">
        <div className="flex items-center gap-3 mb-1">
          <Sparkles size={24} className="text-primary" />
          <h1 className="text-2xl font-bold">Model Garden</h1>
        </div>
        <p className="text-sm text-base-content/60">
          Browse and explore all available AI models across different services.
        </p>
      </div>

      {/* Main Content: Inner Sidebar + Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Inner Sidebar - Service List */}
        <div className="w-56 border-r border-base-300 flex flex-col bg-base-100 overflow-y-auto shrink-0">
          <div className="p-3 border-b border-base-300">
            <h3 className="text-xs font-semibold text-base-content/50 uppercase tracking-wider">Services</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-1">
            {serviceList.length === 0 ? (
              <div className="p-4 text-sm text-base-content/50 text-center">Loading services...</div>
            ) : (
              serviceList.map((service) => {
                const key = typeof service === "object" ? service.value : service;
                const displayName = getServiceDisplayName(service);
                const isActive = selectedService === key;

                return (
                  <button
                    key={key}
                    onClick={() => handleServiceClick(key)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition-all duration-150 ${
                      isActive ? "bg-primary text-primary-content" : "hover:bg-base-200 text-base-content"
                    }`}
                  >
                    <span className="truncate capitalize">{displayName}</span>
                    <ChevronRight size={14} className="shrink-0 opacity-50" />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative overflow-hidden bg-base-200/30">
          {!isPanelOpen ? (
            /* Default Empty View */
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Sparkles size={48} className="mx-auto mb-4 text-base-content/20" />
                <h2 className="text-lg font-semibold text-base-content/50 mb-2">Select a Service</h2>
                <p className="text-sm text-base-content/40 max-w-xs mx-auto">
                  Choose a service from the sidebar to explore its available models.
                </p>
              </div>
            </div>
          ) : (
            /* Side Panel with Model Table */
            <div
              className="absolute inset-0 flex flex-col bg-base-100"
              style={{
                animation: "slideInFromRight 0.25s ease-out both",
              }}
            >
              {/* Panel Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-base-300">
                <div>
                  <h2 className="text-lg font-semibold capitalize">{selectedService}</h2>
                  <p className="text-xs text-base-content/50 mt-0.5">
                    {filteredModels.length} model{filteredModels.length !== 1 ? "s" : ""} available
                  </p>
                </div>
                <button onClick={handleClosePanel} className="btn btn-ghost btn-sm btn-square">
                  <X size={18} />
                </button>
              </div>

              {/* Search Bar */}
              {modelRows.length > 5 && (
                <div className="px-5 py-3 border-b border-base-300">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
                    <input
                      type="text"
                      placeholder="Search models..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="input input-bordered input-sm w-full pl-9"
                    />
                  </div>
                </div>
              )}

              {/* Model Table */}
              <div className="flex-1 overflow-auto">
                {filteredModels.length > 0 ? (
                  <table className="table table-sm w-full">
                    <thead className="sticky top-0 bg-base-200 z-10">
                      <tr>
                        <th className="text-xs uppercase tracking-wider">Name</th>
                        <th className="text-xs uppercase tracking-wider">Type</th>
                        <th className="text-xs uppercase tracking-wider">Description</th>
                        <th className="text-xs uppercase tracking-wider">Input Cost</th>
                        <th className="text-xs uppercase tracking-wider">Output Cost</th>
                        <th className="text-xs uppercase tracking-wider">Tokens (Min - Max)</th>
                        <th className="text-xs uppercase tracking-wider">Vision</th>
                        <th className="text-xs uppercase tracking-wider">Files</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredModels.map((model, idx) => (
                        <tr
                          key={`${model.name}-${idx}`}
                          onClick={() => handleModelClick(model)}
                          className="hover:bg-base-200/50 transition-colors cursor-pointer"
                        >
                          <td className="font-medium text-sm whitespace-nowrap">{model.name}</td>
                          <td>
                            <span className="badge badge-ghost badge-sm capitalize whitespace-nowrap">
                              {model.type}
                            </span>
                          </td>
                          <td className="text-sm text-base-content/70 max-w-xs">
                            {model.description ? (
                              <div className="tooltip cursor-help" data-tip={model.description}>
                                <span className="line-clamp-2 text-justify">{model.description}</span>
                              </div>
                            ) : (
                              <span className="text-base-content/30">—</span>
                            )}
                          </td>
                          <td className="text-sm text-base-content/70 whitespace-nowrap">
                            {model.inputCost ?? <span className="text-base-content/30">—</span>}
                          </td>
                          <td className="text-sm text-base-content/70 whitespace-nowrap">
                            {model.outputCost ?? <span className="text-base-content/30">—</span>}
                          </td>
                          <td className="text-sm text-base-content/70 whitespace-nowrap">
                            {model.minTokens || model.maxTokens ? (
                              <>
                                {model.minTokens?.toLocaleString?.() || model.minTokens || "0"} -{" "}
                                {model.maxTokens?.toLocaleString?.() || model.maxTokens || "∞"}
                              </>
                            ) : (
                              <span className="text-base-content/30">—</span>
                            )}
                          </td>
                          <td className="text-sm">
                            {model.vision === true ? (
                              <Check size={16} className="text-success" />
                            ) : (
                              <X size={16} className="text-error opacity-30" />
                            )}
                          </td>
                          <td className="text-sm">
                            {model.files === true ? (
                              <Check size={16} className="text-success" />
                            ) : (
                              <X size={16} className="text-error opacity-30" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center py-12">
                      <p className="text-base-content/50 text-sm">
                        {modelRows.length === 0 ? "Loading models..." : "No models match your search."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/*                     MODEL DETAIL SLIDER (Right)                     */}
      {/* ------------------------------------------------------------------ */}
      <aside
        id={SLIDER_ID}
        className="sidebar-container fixed flex flex-col top-0 right-0 w-full md:w-2/5 h-screen translate-x-full overflow-y-auto bg-base-100 transition-all duration-300 z-high border-l border-base-300 shadow-lg"
        aria-label="Model Details"
      >
        {selectedModel && (
          <>
            {/* Slider Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-base-300 sticky top-0 bg-base-100 z-10">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold truncate">{selectedModel.name}</h2>
              </div>
              <button onClick={handleCloseSlider} className="btn btn-ghost btn-sm btn-square shrink-0 ml-3">
                <X size={18} />
              </button>
            </div>

            {/* Slider Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {detailFields.map(({ label, value }) => (
                  <div key={label} className="border-b border-base-200 pb-3">
                    <dt className="text-xs font-medium text-base-content/50 uppercase tracking-wider mb-1">{label}</dt>
                    <dd className="text-sm text-base-content break-words">{value}</dd>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </aside>

      {/* Animation keyframes */}
      <style jsx>{`
        @keyframes slideInFromRight {
          0% {
            transform: translateX(100%);
            opacity: 0;
          }
          100% {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default ModelGardenPage;
