"use client";
import React, { useMemo, useState } from "react";
import { Cpu, Eye, EyeOff, KeyRound, RotateCcw, SlidersHorizontal, SquareTerminal } from "lucide-react";
import DirectCard from "./DirectCard";
import RuntimeToolsEditor from "./RuntimeToolsEditor";
import AdvancedParameters from "@/components/configuration/configurationComponent/AdvancedParamenter";
import { ConfigurationProvider } from "@/components/configuration/ConfigurationContext";
import { DIRECT_MODEL_GROUPS } from "@/utils/directCompletion";

// AdvancedParameters reads discardPromptDraft from the configuration context; the direct
// playground has no prompt drafts to discard.
const DIRECT_CONFIGURATION_CONTEXT = { discardPromptDraft: () => {} };

const FieldLabel = ({ htmlFor, children }) => (
  <label htmlFor={htmlFor} className="block text-xs font-medium text-base-content/70 mb-1.5">
    {children}
  </label>
);

const ApiKeyInput = ({ apikey, setApikey }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex items-center border border-base-content/15 bg-base-100 focus-within:border-base-content/40">
      <input
        data-testid="direct-apikey-input"
        type={visible ? "text" : "password"}
        autoComplete="off"
        spellCheck={false}
        className="w-full bg-transparent px-3 py-2 text-sm font-mono outline-none placeholder:font-sans placeholder:text-base-content/40"
        placeholder="Paste your provider key"
        value={apikey}
        onChange={(e) => setApikey(e.target.value)}
      />
      <button
        type="button"
        className="px-3 text-base-content/50 hover:text-base-content"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide key" : "Show key"}
      >
        {visible ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
};

const DirectConfigPanel = ({
  config,
  updateConfig,
  setService,
  setModel,
  services,
  modelOptions,
  applyParamsPatch,
  apikey,
  setApikey,
}) => {
  const customizedCount = Object.keys(config.params).length;

  // Same parameter editor as the agent configure page, fed from the runtime config.
  const directParamsConfig = useMemo(
    () => ({
      service: config.service,
      configuration: { model: config.model, type: config.modelType, ...config.params },
      onChange: applyParamsPatch,
    }),
    [config.service, config.model, config.modelType, config.params, applyParamsPatch]
  );

  return (
    <div className="min-h-0 overflow-y-auto bg-base-200 p-4 flex flex-col gap-3 border-r border-base-content/10">
      <DirectCard
        icon={Cpu}
        title="Model"
        description="Provider and model that answer each message"
        testId="direct-model-card"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <FieldLabel htmlFor="direct-service-select">Provider</FieldLabel>
            <select
              id="direct-service-select"
              data-testid="direct-service-select"
              className="select select-sm w-full"
              value={config.service}
              onChange={(e) => setService(e.target.value)}
            >
              {!services.length && <option value="">Loading…</option>}
              {services.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.displayName || s.value}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel htmlFor="direct-model-select">Model</FieldLabel>
            <select
              id="direct-model-select"
              data-testid="direct-model-select"
              className="select select-sm w-full"
              value={config.model}
              onChange={(e) => setModel(e.target.value)}
              disabled={!modelOptions.length}
            >
              {!modelOptions.length && <option value="">Loading…</option>}
              {DIRECT_MODEL_GROUPS.map((group) => {
                const groupModels = modelOptions.filter((m) => m.group === group);
                if (!groupModels.length) return null;
                return (
                  <optgroup key={group} label={group.charAt(0).toUpperCase() + group.slice(1)}>
                    {groupModels.map((m) => (
                      <option key={m.name} value={m.name}>
                        {m.name}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
          </div>
        </div>
      </DirectCard>

      <DirectCard
        icon={SquareTerminal}
        title="Prompt"
        description="System instructions sent with every message"
        testId="direct-prompt-card"
      >
        <textarea
          data-testid="direct-prompt-input"
          className="textarea w-full min-h-40 text-sm leading-relaxed resize-y"
          placeholder="You are a helpful assistant. Answer clearly and briefly."
          value={config.prompt}
          onChange={(e) => updateConfig({ prompt: e.target.value })}
        />
        <div className="mt-1.5 text-right text-[11px] text-base-content/45 tabular-nums">
          {config.prompt.length.toLocaleString()} characters
        </div>
      </DirectCard>

      <RuntimeToolsEditor tools={config.tools} onChange={(tools) => updateConfig({ tools })} />

      <DirectCard
        icon={SlidersHorizontal}
        title="Parameters"
        description="Unset values use the model defaults"
        collapsible
        summary={customizedCount ? `${customizedCount} customized` : "All defaults"}
        testId="direct-params-card"
        actions={
          customizedCount > 0 && (
            <button
              type="button"
              data-testid="direct-params-reset-all"
              className="btn btn-ghost btn-xs gap-1 text-base-content/60"
              onClick={() => updateConfig({ params: {} })}
            >
              <RotateCcw size={12} /> Reset all
            </button>
          )
        }
      >
        <ConfigurationProvider value={DIRECT_CONFIGURATION_CONTEXT}>
          <AdvancedParameters
            directConfig={directParamsConfig}
            isEmbedUser={false}
            level={1}
            compact
            className="!mt-0"
          />
        </ConfigurationProvider>
      </DirectCard>

      <DirectCard
        icon={KeyRound}
        title="Provider API key"
        description="Optional, use your own key for this provider"
        collapsible
        defaultOpen={false}
        summary={apikey ? "Key set" : "Wallet billing"}
        testId="direct-apikey-card"
      >
        <ApiKeyInput apikey={apikey} setApikey={setApikey} />
        <p className="mt-2 text-xs leading-relaxed text-base-content/55">
          Without a key the call runs on the platform key and is billed to your wallet. The key stays in this tab only
          and is never saved.
        </p>
      </DirectCard>
    </div>
  );
};

export default DirectConfigPanel;
