import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useCustomSelector } from "@/customHooks/customSelector";
import { getServiceAction } from "@/store/action/serviceAction";
import { getModelAction } from "@/store/action/modelAction";
import {
  EMPTY_DIRECT_CONFIG,
  getDirectModelOptions,
  readDirectConfig,
  writeDirectConfig,
} from "@/utils/directCompletion";

const DEFAULT_SERVICE = "openai";
// Owned by the Model and Prompt cards, so parameter patches never overwrite them.
const NON_PARAM_KEYS = new Set(["model", "type", "prompt"]);

const isResetValue = (value) => {
  if (value === "default" || value === null || value === undefined) return true;
  if (typeof value !== "object" || Array.isArray(value)) return false;
  const values = Object.values(value);
  return values.length > 0 && values.every((v) => v === "default");
};

// Runtime configuration for the direct playground (service, model, prompt, params, tools),
// kept per org in the browser. Nothing here is stored as an agent.
export default function useDirectConfig(orgId) {
  const dispatch = useDispatch();
  const [config, setConfig] = useState(EMPTY_DIRECT_CONFIG);
  const [hydrated, setHydrated] = useState(false);

  const { services, serviceModels } = useCustomSelector((state) => ({
    services: state.serviceReducer?.services || [],
    serviceModels: state.modelReducer?.serviceModels || {},
  }));

  useEffect(() => {
    setConfig(readDirectConfig(orgId));
    setHydrated(true);
  }, [orgId]);

  useEffect(() => {
    if (hydrated) writeDirectConfig(orgId, config);
  }, [config, hydrated, orgId]);

  useEffect(() => {
    if (!services.length) dispatch(getServiceAction());
  }, [dispatch, services.length]);

  useEffect(() => {
    if (!hydrated || config.service || !services.length) return;
    const preferred = services.find((s) => s.value === DEFAULT_SERVICE) || services[0];
    setConfig((c) => ({ ...c, service: preferred.value }));
  }, [hydrated, services, config.service]);

  const serviceModelGroups = serviceModels[config.service];
  useEffect(() => {
    if (config.service && !serviceModelGroups) dispatch(getModelAction({ service: config.service }));
  }, [dispatch, config.service, serviceModelGroups]);

  const modelOptions = useMemo(() => getDirectModelOptions(serviceModelGroups), [serviceModelGroups]);

  // Select the first model when none is selected or the saved one no longer exists.
  useEffect(() => {
    if (!modelOptions.length || modelOptions.some((m) => m.name === config.model)) return;
    const [first] = modelOptions;
    setConfig((c) => ({ ...c, model: first.name, modelType: first.group, params: {} }));
  }, [modelOptions, config.model]);

  const updateConfig = useCallback((patch) => setConfig((c) => ({ ...c, ...patch })), []);

  // Params are model specific, so switching service or model clears them.
  const setService = useCallback((service) => updateConfig({ service, model: "", params: {} }), [updateConfig]);

  const setModel = useCallback(
    (name) => {
      const option = modelOptions.find((m) => m.name === name);
      updateConfig({ model: name, modelType: option?.group || "chat", params: {} });
    },
    [modelOptions, updateConfig]
  );

  // Applies a configuration patch from AdvancedParameters. "default" (or null) means the
  // parameter was reset, so it is dropped and the backend falls back to the model default.
  // Picking "default" in the select of an object parameter such as reasoning sends an object
  // whose effort is "default", which is a reset too.
  const applyParamsPatch = useCallback((patch) => {
    setConfig((c) => {
      const params = { ...c.params };
      Object.entries(patch).forEach(([key, value]) => {
        if (NON_PARAM_KEYS.has(key)) return;
        if (isResetValue(value)) delete params[key];
        else params[key] = value;
      });
      return { ...c, params };
    });
  }, []);

  return {
    config,
    updateConfig,
    setService,
    setModel,
    services,
    modelOptions,
    applyParamsPatch,
  };
}
