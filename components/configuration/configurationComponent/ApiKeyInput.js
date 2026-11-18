import ApiKeyModal from "@/components/modals/ApiKeyModal";
import { useCustomSelector } from "@/customHooks/customSelector";
import { updateBridgeVersionAction } from "@/store/action/bridgeAction";
import { MODAL_TYPE } from "@/utils/enums";
import { openModal, ANTHROPIC_SERVICE, CLAUDE_CODE_SERVICE, isAnthropicFamily } from "@/utils/utility";
import React, { useCallback, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import Dropdown from "@/components/UI/Dropdown";
import InfoTooltip from "@/components/InfoTooltip";
import { KeyRound } from "lucide-react";

// Anthropic agents pick either one of the org's Anthropic API keys or the org's Claude login.
// Picking the login moves the agent to the claude_code service; picking a key moves it back.
const CONNECT_CLAUDE_LOGIN = "CONNECT_CLAUDE_LOGIN";
const REPLACE_CLAUDE_LOGIN = "REPLACE_CLAUDE_LOGIN";

const ApiKeyInput = ({
  params,
  searchParams,
  apiKeySectionRef,
  isEmbedUser,
  showAdvancedParameters = false,
  isPublished,
  isEditor = true,
  hasError = false,
  compact = false,
}) => {
  // Determine if content is read-only (either published or user is not an editor)
  const isReadOnly = isPublished || !isEditor;
  const dispatch = useDispatch();

  const { bridge, apikeydata, bridgeApikey_object_id, currentService, bridgeType, serviceModels, DEFAULT_MODEL } =
    useCustomSelector((state) => {
      const versionData = state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[searchParams?.version];
      const bridgeDataFromState = state?.bridgeReducer?.allBridgesMap?.[params?.id];
      const apikeys = state?.apiKeysReducer?.apikeys || {};

      // Use bridgeData when isPublished=true, otherwise use versionData
      const activeData = isPublished ? bridgeDataFromState : versionData;

      return {
        bridge: activeData || {},
        apikeydata: apikeys[params?.org_id] || [], // Ensure apikeydata is an array
        bridgeApikey_object_id: isPublished ? bridgeDataFromState?.apikey_object_id : versionData?.apikey_object_id,
        currentService: isPublished ? bridgeDataFromState?.service : versionData?.service,
        bridgeType: state?.bridgeReducer?.allBridgesMap?.[params?.id]?.bridgeType,
        serviceModels: state?.modelReducer?.serviceModels,
        DEFAULT_MODEL: state?.serviceReducer?.default_model,
      };
    });

  const isAnthropic = isAnthropicFamily(bridge?.service);
  // The service whose key the modal adds: an Anthropic agent can add an API key or a Claude login.
  const [modalService, setModalService] = useState(null);

  // Memoize filtered API keys (for an Anthropic agent: its Anthropic API keys, never the login)
  const filteredApiKeys = useMemo(() => {
    const service = isAnthropic ? ANTHROPIC_SERVICE : bridge?.service;
    return apikeydata.filter((apiKey) => apiKey?.service === service);
  }, [apikeydata, bridge?.service, isAnthropic]);

  // The org's one Claude login (saving another replaces it)
  const claudeLogin = useMemo(
    () => (isAnthropic ? apikeydata.find((apiKey) => apiKey?.service === CLAUDE_CODE_SERVICE) : null),
    [apikeydata, isAnthropic]
  );

  // Move an Anthropic agent between anthropic (API key) and claude_code (Claude login). Both carry the
  // same models, so the model stays unless the target service doesn't have it.
  const switchAnthropicService = useCallback(
    (targetService, apikeyObjectId) => {
      const model = bridge?.configuration?.model;
      const type = bridge?.configuration?.type?.toLowerCase() || "chat";
      const targetModels = serviceModels?.[targetService]?.[type];
      const keepModel = model && (!targetModels || targetModels[model]);
      const dataToSend = {};
      if (targetService !== bridge?.service) {
        dataToSend.service = targetService;
        dataToSend.configuration = { model: keepModel ? model : DEFAULT_MODEL?.[targetService]?.model };
      }
      if (apikeyObjectId) {
        dataToSend.apikey_object_id = { ...bridgeApikey_object_id, [targetService]: apikeyObjectId };
      }
      if (!Object.keys(dataToSend).length) return;
      dispatch(updateBridgeVersionAction({ bridgeId: params?.id, versionId: searchParams?.version, dataToSend }));
    },
    [bridge, serviceModels, DEFAULT_MODEL, bridgeApikey_object_id, dispatch, params?.id, searchParams?.version]
  );

  const openKeyModal = useCallback((service) => {
    setModalService(service);
    openModal(MODAL_TYPE.API_KEY_MODAL);
  }, []);

  const handleDropdownChange = useCallback(
    (selectedApiKeyId) => {
      if (isAnthropic) {
        if (selectedApiKeyId === "add_new") return openKeyModal(ANTHROPIC_SERVICE);
        if (selectedApiKeyId === CONNECT_CLAUDE_LOGIN || selectedApiKeyId === REPLACE_CLAUDE_LOGIN) {
          return openKeyModal(CLAUDE_CODE_SERVICE);
        }
        // An Anthropic key picked while on the Claude login: move back to anthropic with that key.
        if (bridge?.service === CLAUDE_CODE_SERVICE) return switchAnthropicService(ANTHROPIC_SERVICE, selectedApiKeyId);
      }
      if (selectedApiKeyId === "add_new") {
        openKeyModal(bridge?.service);
      } else if (selectedApiKeyId !== "GPT5_NANO_DEFAULT_KEY") {
        const service = bridge?.service;
        const rawCurrentId = bridgeApikey_object_id?.[service];
        const currentId = rawCurrentId && typeof rawCurrentId === "object" ? rawCurrentId._id : rawCurrentId;

        const updated = { ...bridgeApikey_object_id };
        if (currentId && String(currentId) === String(selectedApiKeyId)) {
          delete updated[service];
        } else {
          updated[service] = selectedApiKeyId;
        }

        dispatch(
          updateBridgeVersionAction({
            bridgeId: params?.id,
            versionId: searchParams?.version,
            dataToSend: { apikey_object_id: updated },
          })
        );
      }
      if (
        selectedApiKeyId === "GPT5_NANO_DEFAULT_KEY" &&
        bridge?.configuration?.model === "gpt-5-nano" &&
        bridgeType === "chatbot"
      ) {
        const service = bridge?.service;
        const updated = { ...bridgeApikey_object_id };
        delete updated[service]; // Remove only the current service's key
        dispatch(
          updateBridgeVersionAction({
            bridgeId: params?.id,
            versionId: searchParams?.version,
            dataToSend: { apikey_object_id: updated },
          })
        );
        return;
      }
    },
    [
      params.id,
      searchParams?.version,
      bridge?.service,
      bridge,
      bridgeType,
      bridgeApikey_object_id,
      isAnthropic,
      openKeyModal,
      switchAnthropicService,
    ]
  );

  // Determine the currently selected value
  const selectedValue = useMemo(() => {
    if (bridge?.service === CLAUDE_CODE_SERVICE) return claudeLogin ? REPLACE_CLAUDE_LOGIN : undefined;
    const rawServiceApiKeyId =
      typeof bridgeApikey_object_id === "object" ? bridgeApikey_object_id?.[bridge?.service] : bridgeApikey_object_id;
    const serviceApiKeyId =
      rawServiceApiKeyId && typeof rawServiceApiKeyId === "object" ? rawServiceApiKeyId._id : rawServiceApiKeyId;
    const currentApiKey = apikeydata.find((apiKey) => String(apiKey?._id) === String(serviceApiKeyId));

    // Special handling for gpt-5-nano model - show default key if no API key is added and bridge type is chatbot
    if (bridge?.configuration?.model === "gpt-5-nano" && bridgeType === "chatbot" && !serviceApiKeyId) {
      return "GPT5_NANO_DEFAULT_KEY";
    }

    return currentApiKey?._id;
  }, [apikeydata, bridgeApikey_object_id, bridge?.service, bridge?.configuration?.model, bridgeType, claudeLogin]);

  // Build dropdown options
  const dropdownOptions = useMemo(() => {
    const opts = [];

    // Add default key for gpt-5-nano model only when bridge type is chatbot (like old ai_ml case)
    if (bridge?.configuration?.model === "gpt-5-nano" && bridgeType === "chatbot") {
      opts.push({ value: "GPT5_NANO_DEFAULT_KEY", label: "GPT-5-Nano Default Key" });
    }

    if (filteredApiKeys.length > 0) {
      filteredApiKeys.forEach((apiKey) => {
        opts.push({ value: apiKey._id, label: apiKey.name, status: apiKey?.status });
      });
    } else {
      // Disabled informational option pattern can be represented by not adding an option here; placeholder will handle it
    }

    // Anthropic: one Claude option. The login belongs to the organization, not to this agent.
    // - no login yet: connect one
    // - a login is saved: replace it. An agent not on it yet can switch to it from that modal
    //   without a new token.
    if (isAnthropic) {
      opts.push(
        claudeLogin
          ? {
              value: REPLACE_CLAUDE_LOGIN,
              label: "Replace Claude login",
              description:
                bridge?.service === CLAUDE_CODE_SERVICE
                  ? "In use · shared by your whole organization"
                  : "Saved for your organization · not used by this agent",
              status: claudeLogin?.status,
            }
          : {
              value: CONNECT_CLAUDE_LOGIN,
              label: "Connect Claude login",
              description: "Use your Claude subscription instead of a key",
            }
      );
    }
    return opts;
  }, [filteredApiKeys, bridge.service, bridge?.configuration?.model, bridgeType, isAnthropic, claudeLogin]);

  // The modal adds a key for the service picked in the menu, and that key is then used by this agent.
  const keyModal = (
    <ApiKeyModal
      params={params}
      searchParams={searchParams}
      service={isAnthropic ? modalService || ANTHROPIC_SERVICE : currentService}
      bridgeApikey_object_id={bridgeApikey_object_id}
      onUseSavedLogin={
        isAnthropic && claudeLogin && bridge?.service !== CLAUDE_CODE_SERVICE
          ? () => switchAnthropicService(CLAUDE_CODE_SERVICE)
          : undefined
      }
      onSaved={
        isAnthropic
          ? (saved) =>
              (modalService || ANTHROPIC_SERVICE) === CLAUDE_CODE_SERVICE
                ? switchAnthropicService(CLAUDE_CODE_SERVICE)
                : switchAnthropicService(ANTHROPIC_SERVICE, saved?._id)
          : undefined
      }
    />
  );
  const placeholder = isAnthropic
    ? "Pick a key or Claude login"
    : filteredApiKeys.length === 0
      ? "No API keys for this service"
      : "Select API key";

  // Nothing to pick from (no keys saved for this service, no default-key
  // fallback) — showing an always-empty selector just invites a dead click,
  // so hide it entirely instead of a disabled/placeholder state.
  if (dropdownOptions.length === 0) return null;

  if (compact) {
    return (
      <div data-testid="apikey-input-compact-container" id="apikey-input-compact-container" className="relative">
        <Dropdown
          testId="apikey-input-compact-dropdown"
          id="apikey-input-compact-dropdown"
          disabled={isReadOnly}
          options={dropdownOptions}
          value={selectedValue || ""}
          onChange={(val) => handleDropdownChange(val)}
          placeholder={placeholder}
          showSearch
          searchPlaceholder="Search API keys..."
          size="sm"
          fullWidth={false}
          placement="bottom-end"
          menuClassName="w-[240px]"
          hasError={hasError}
          bottomOption={{ value: "add_new", label: "+  Add new API Key" }}
          isEmbedUser={isEmbedUser}
          className={`btn-ghost border border-base-300 px-2 ${selectedValue ? "" : "opacity-70"}`}
          renderTriggerContent={() => (
            <InfoTooltip tooltipContent={selectedValue ? "Update API Key" : "Configure API Key"}>
              <KeyRound size={16} className={selectedValue ? "text-warning" : "text-gray-400"} />
            </InfoTooltip>
          )}
        />
        {keyModal}
      </div>
    );
  }

  return (
    <div
      data-testid="apikey-input-container"
      id="apikey-input-container"
      className="relative form-control w-auto text-base-content"
      ref={apiKeySectionRef}
    >
      <Dropdown
        testId="apikey-input-dropdown"
        id="apikey-input-dropdown"
        disabled={isReadOnly}
        options={dropdownOptions}
        value={selectedValue || ""}
        onChange={(val) => handleDropdownChange(val)}
        placeholder={placeholder}
        showSearch
        searchPlaceholder="Search API keys..."
        size="sm"
        className="flex w-full items-center justify-between gap-2 rounded-none border px-3 py-2 text-sm whitespace-nowrap transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 border-base-300 text-base-content h-8 min-w-[150px]"
        style={{ backgroundColor: "color-mix(in oklab, var(--color-white) 3%, transparent)" }}
        maxLabelLength={20}
        menuClassName="w-full min-w-[200px]"
        hasError={hasError}
        bottomOption={{ value: "add_new", label: "+  Add new API Key" }}
        isEmbedUser={isEmbedUser}
      />
      {keyModal}
    </div>
  );
};

export default React.memo(ApiKeyInput);
