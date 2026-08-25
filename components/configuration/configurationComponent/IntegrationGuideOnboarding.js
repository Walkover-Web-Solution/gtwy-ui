"use client";

import { useEffect, useMemo, useState } from "react";
import { HeartPulse, Info, RefreshCw } from "lucide-react";
import CodeBlock from "@/components/codeBlock/CodeBlock";
import GenericTable from "@/components/table/Table";
import ExpandCollapse from "@/components/UI/ExpandCollapse";
import {
  getCurlCode,
  getCurlBatchCode,
  getPythonCode,
  getJavaScriptCode,
  getDotNetCode,
  getJavaCode,
  getGoCode,
  getPythonBatchCode,
  getJavaScriptBatchCode,
  getDotNetBatchCode,
  getJavaBatchCode,
  getGoBatchCode,
  getCurlResponseFormat,
  getSdkResponseFormat,
} from "./ApiGuideCodes";
import {
  GTWY_SDK_LANGUAGES,
  getGtwySdkCode,
  getGtwySdkBatchCode,
  getGtwySdkAccessorSnippet,
  PARAM_HEADERS,
  PARAM_DATA,
  CONFIGURATION_PARAM_HEADERS,
  CONFIGURATION_PARAM_DATA,
  SETTINGS_PARAM_HEADERS,
  SETTINGS_PARAM_DATA,
  BATCH_PARAM_HEADERS,
  BATCH_PARAM_DATA,
  getBatchResponseFormat,
  checkAgentHealth,
} from "./IntegrationGuideOnboardingCodes";

const CATEGORIES = [
  { id: "curl", label: "cURL" },
  { id: "gtwy", label: "GTWY SDK" },
  { id: "openai", label: "OpenAI SDK" },
];

const EXAMPLES = [
  { id: "api", label: "API" },
  { id: "batch", label: "Batch API" },
];

const OPENAI_LANGUAGES = [
  { id: "javascript", label: "JavaScript", prism: "javascript" },
  { id: "python", label: "Python", prism: "python" },
  { id: "dotnet", label: ".NET", prism: "csharp" },
  { id: "java", label: "Java", prism: "java" },
  { id: "go", label: "Go", prism: "go" },
];

const OPENAI_CODE_BY_LANG = {
  javascript: getJavaScriptCode,
  python: getPythonCode,
  dotnet: getDotNetCode,
  java: getJavaCode,
  go: getGoCode,
};

const OPENAI_BATCH_CODE_BY_LANG = {
  javascript: getJavaScriptBatchCode,
  python: getPythonBatchCode,
  dotnet: getDotNetBatchCode,
  java: getJavaBatchCode,
  go: getGoBatchCode,
};

const SegmentedControl = ({ items, activeId, onChange, testId, itemTestIdPrefix, size = "sm" }) => (
  <div
    className="inline-flex w-fit max-w-full items-center gap-0.5 overflow-x-auto rounded-lg bg-base-200 p-1 scrollbar-hide"
    role="tablist"
    data-testid={testId}
  >
    {items.map((item) => {
      const isActive = item.id === activeId;
      return (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={isActive}
          onClick={() => onChange(item.id)}
          {...(itemTestIdPrefix ? { "data-testid": `${itemTestIdPrefix}-${item.id}` } : {})}
          className={`shrink-0 whitespace-nowrap rounded-md transition-colors ${
            size === "md" ? "px-4 py-1.5 text-sm" : "px-3 py-1 text-xs"
          } ${
            isActive
              ? "bg-base-100 font-semibold text-base-content shadow-sm ring-1 ring-base-content/10"
              : "text-base-content/55 hover:text-base-content"
          }`}
        >
          {item.label}
        </button>
      );
    })}
  </div>
);

const IntegrationGuideOnboarding = ({ agentId, modelType, isEmbedUser, prompt = "" }) => {
  const [category, setCategory] = useState("curl");
  const [example, setExample] = useState("api");
  const [gtwyLang, setGtwyLang] = useState("python");
  const [openaiLang, setOpenaiLang] = useState("javascript");
  const [health, setHealth] = useState({ status: "loading", data: null });

  const isBatch = example === "batch";

  const activeGtwyLang = useMemo(
    () => GTWY_SDK_LANGUAGES.find((l) => l.id === gtwyLang) ?? GTWY_SDK_LANGUAGES[0],
    [gtwyLang]
  );
  const activeOpenaiLang = useMemo(
    () => OPENAI_LANGUAGES.find((l) => l.id === openaiLang) ?? OPENAI_LANGUAGES[0],
    [openaiLang]
  );

  const activeCode = useMemo(() => {
    if (category === "curl") {
      return isBatch ? getCurlBatchCode(agentId, isEmbedUser) : getCurlCode(agentId, modelType, isEmbedUser, prompt);
    }
    if (category === "gtwy") {
      return isBatch ? getGtwySdkBatchCode(gtwyLang, agentId) : getGtwySdkCode(gtwyLang, agentId);
    }
    return isBatch
      ? OPENAI_BATCH_CODE_BY_LANG[openaiLang](agentId, isEmbedUser)
      : OPENAI_CODE_BY_LANG[openaiLang](agentId, isEmbedUser, prompt);
  }, [category, isBatch, gtwyLang, openaiLang, agentId, modelType, isEmbedUser, prompt]);

  const activePrism =
    category === "curl" ? "bash" : category === "gtwy" ? activeGtwyLang.prism : activeOpenaiLang.prism;

  const responseFormat = isBatch
    ? getBatchResponseFormat()
    : category === "openai"
      ? getSdkResponseFormat()
      : getCurlResponseFormat();

  const accessorSnippet = useMemo(
    () => (!isBatch && category === "gtwy" ? getGtwySdkAccessorSnippet(gtwyLang) : null),
    [category, gtwyLang, isBatch]
  );

  const handleCheckHealth = async () => {
    setHealth((prev) => ({ status: "loading", data: prev.data }));
    const data = await checkAgentHealth(agentId);
    setHealth({ status: "done", data });
  };

  useEffect(() => {
    handleCheckHealth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  return (
    <div data-testid="integration-guide-onboarding" className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-xl border border-base-300 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HeartPulse size={18} className="text-primary" />
            <div>
              <h4 className="text-sm font-semibold">Health</h4>
              <p
                className={`text-xs ${
                  health.status === "loading"
                    ? "text-base-content/50"
                    : health.data?.status === "error"
                      ? "text-error"
                      : health.data?.status === "ok"
                        ? "text-success"
                        : "text-warning"
                }`}
                data-testid="onboarding-health-result"
              >
                {health.status === "loading"
                  ? "Checking..."
                  : health.data?.status === "error"
                    ? "Error"
                    : health.data?.message}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-ghost btn-circle"
            onClick={handleCheckHealth}
            disabled={health.status === "loading"}
            aria-label="Refresh health"
            data-testid="onboarding-check-health-button"
          >
            <RefreshCw size={14} className={health.status === "loading" ? "animate-spin" : ""} />
          </button>
        </div>

        {health.status === "done" && health.data?.status === "error" && (
          <div
            className="rounded-lg border border-error/30 bg-error/10 p-3 text-xs text-error"
            data-testid="onboarding-health-error-detail"
          >
            <ExpandCollapse collapsedHeight={36} fadeHeight={20} expandLabel="Show more" collapseLabel="Show less">
              <p className="whitespace-pre-wrap break-words">{health.data.message}</p>
            </ExpandCollapse>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <SegmentedControl
          items={CATEGORIES}
          activeId={category}
          onChange={setCategory}
          testId="onboarding-category-tabs"
          itemTestIdPrefix="onboarding-category"
          size="md"
        />

        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl
            items={EXAMPLES}
            activeId={example}
            onChange={setExample}
            testId="onboarding-example-tabs"
            itemTestIdPrefix="onboarding-example"
          />

          {category !== "curl" && (
            <select
              className="select select-sm select-bordered ml-auto w-auto text-xs"
              aria-label="Language"
              data-testid={category === "gtwy" ? "onboarding-gtwy-lang-tabs" : "onboarding-openai-lang-tabs"}
              value={category === "gtwy" ? gtwyLang : openaiLang}
              onChange={(e) => (category === "gtwy" ? setGtwyLang(e.target.value) : setOpenaiLang(e.target.value))}
            >
              {(category === "gtwy" ? GTWY_SDK_LANGUAGES : OPENAI_LANGUAGES).map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.label}
                </option>
              ))}
            </select>
          )}
        </div>

        {isBatch && (
          <div
            data-testid="onboarding-batch-limitations"
            className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3"
          >
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning" />
            <div>
              <p className="text-sm font-medium text-base-content">Batch API Limitations</p>
              <p className="text-xs text-base-content/70">
                Tools call, Agent call and Knowledge base call are not supported when using the Batch API.
              </p>
            </div>
          </div>
        )}

        {category === "gtwy" && !isBatch && activeGtwyLang.install && (
          <CodeBlock className="language-bash" showCopy={false}>
            {activeGtwyLang.install}
          </CodeBlock>
        )}

        <CodeBlock key={`${category}-${example}-${gtwyLang}-${openaiLang}`} className={`language-${activePrism}`}>
          {activeCode}
        </CodeBlock>
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-semibold">Response format</h4>
        <CodeBlock key={`response-${category}-${example}`} className="language-json">
          {responseFormat}
        </CodeBlock>

        {accessorSnippet && (
          <div className="mt-2 flex flex-col gap-2">
            <p className="text-xs text-base-content/60">
              The SDK parses this for you — access the fields you need directly, no need to traverse the JSON:
            </p>
            <CodeBlock key={`accessor-${gtwyLang}`} className={`language-${activeGtwyLang.prism}`} showCopy={false}>
              {accessorSnippet}
            </CodeBlock>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-semibold">Request parameters</h4>
        <p className="text-xs text-base-content/60">Top-level fields you can send in the request body.</p>
        <GenericTable
          headers={isBatch ? BATCH_PARAM_HEADERS : PARAM_HEADERS}
          data={isBatch ? BATCH_PARAM_DATA : PARAM_DATA}
        />
      </div>

      {!isBatch && (
        <>
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-semibold">
              <code>configuration</code> keys
            </h4>
            <p className="text-xs text-base-content/60">
              Per-request overrides — otherwise falls back to what's configured for this agent.
            </p>
            <GenericTable headers={CONFIGURATION_PARAM_HEADERS} data={CONFIGURATION_PARAM_DATA} />
          </div>

          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-semibold">
              <code>settings</code> keys
            </h4>
            <p className="text-xs text-base-content/60">
              Per-request delivery and safety settings — otherwise falls back to what's configured for this agent.
            </p>
            <GenericTable headers={SETTINGS_PARAM_HEADERS} data={SETTINGS_PARAM_DATA} />
          </div>
        </>
      )}
    </div>
  );
};

export default IntegrationGuideOnboarding;
