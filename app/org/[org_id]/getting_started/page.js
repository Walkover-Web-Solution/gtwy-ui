"use client";
import CodeBlock from "@/components/codeBlock/CodeBlock";
import {
  getCurlCode,
  getDotNetCode,
  getGoCode,
  getJavaCode,
  getJavaScriptCode,
  getPythonCode,
} from "@/components/configuration/configurationComponent/ApiGuideCodes";
import {
  getGtwySdkCode,
  GTWY_SDK_LANGUAGES,
} from "@/components/configuration/configurationComponent/IntegrationGuideOnboardingCodes";
import {
  CheckIcon,
  CopyIcon,
  DatabaseIcon,
  ExternalLinkIcon,
  KeyRoundIcon,
  LineChartIcon,
  MessageCircleMoreIcon,
  RocketIcon,
  SparklesIcon,
  SquareFunctionIcon,
} from "@/components/Icons";
import Protected from "@/components/Protected";
import { dryRun } from "@/config/index";
import { useCustomSelector } from "@/customHooks/customSelector";
import { MODAL_TYPE } from "@/utils/enums";
import { getIconOfService, getServiceDisplayName, openModal } from "@/utils/utility";
import { BookOpen, Eye, EyeOff, MessagesSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { use, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

export const runtime = "edge";

const DOCS_LINK = "https://gtwy.ai/resources";
const DISCORD_LINK = "https://discord.com/invite/udkaC4WsP";

const MODES = [
  { id: "default", label: "Default" },
  { id: "custom", label: "Custom" },
];

const FORMATS = [
  { id: "curl", label: "cURL" },
  { id: "gtwy", label: "GTWY SDK" },
  { id: "openai", label: "OpenAI SDK" },
];

const OPENAI_LANGUAGES = [
  { id: "javascript", label: "JavaScript", prism: "javascript", generator: getJavaScriptCode },
  { id: "python", label: "Python", prism: "python", generator: getPythonCode },
  { id: "dotnet", label: ".NET", prism: "csharp", generator: getDotNetCode },
  { id: "java", label: "Java", prism: "java", generator: getJavaCode },
  { id: "go", label: "Go", prism: "go", generator: getGoCode },
];

/**
 * The shared guide generators build their URLs from a different env var than the one this app is
 * configured with, so point every generated endpoint back at the configured python server.
 */
const API_SERVER_URL = process.env.NEXT_PUBLIC_PYTHON_SERVER_URL || "";
const withConfiguredServer = (code = "") =>
  code.replace(/[^\s'"`]*\/api\/v2\/model\//g, `${API_SERVER_URL}/api/v2/model/`);

const CHATBOT_SCRIPT_SRC =
  process.env.NEXT_PUBLIC_CHATBOT_SCRIPT_SRC || "https://chatbot-embed.viasocket.com/chatbot-prod.js";

/* Same embed script the chatbot integration guide shows */
const getChatbotEmbedCode = (slugName) =>
  [
    "<script",
    '  id="chatbot-main-script"',
    '  embedToken="YOUR_EMBED_TOKEN"',
    `  src="${CHATBOT_SCRIPT_SRC}"`,
    '  threadId="YOUR_THREAD_ID"',
    `  bridgeName="${slugName || "YOUR_AGENT_SLUG_NAME"}"`,
    '  theme="dark/light"',
    "></script>",
  ].join("\n");

const getChatbotSendDataCode = (slugName) =>
  [
    "window.Chatbot.sendData({",
    `  bridgeName: '${slugName || "YOUR_AGENT_SLUG_NAME"}',`,
    "  threadId: '<thread_id>',",
    "  subthreadId: '<subthread_id>',",
    "  parentId: '<parent_container_id>',",
    "  fullScreen: 'true/false',",
    "  hideCloseButton: 'true/false',",
    "  hideIcon: 'true/false',",
    "  variables: {},",
    "  theme: 'dark/light'",
    "});",
  ].join("\n");

const CHATBOT_METHODS = [
  "window.Chatbot.open();          // open the chatbot",
  "window.Chatbot.close();         // close the chatbot",
  "window.Chatbot.show();          // show the chatbot icon",
  "window.Chatbot.hide();          // hide the chatbot icon",
  "window.Chatbot.reloadChats();   // reload the conversation",
  "window.Chatbot.askAi(data);     // ask the agent programmatically",
].join("\n");

const CHATBOT_LISTENER = [
  "window.addEventListener('message', (event) => {",
  "  const receivedData = event.data;",
  "});",
].join("\n");

const maskKey = (value = "") => {
  if (!value) return "";
  if (value.length <= 8) return "*".repeat(value.length);
  return `${value.slice(0, 3)}${"*".repeat(22)}${value.slice(-3)}`;
};

/* Small circle + connector used by the vertical step rail */
const StepRail = ({ done, index, isLast }) => (
  <div className="relative flex flex-col items-center">
    <span
      data-testid={`getting-started-step-marker-${index}`}
      className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
        done ? "bg-success text-success-content" : "border-2 border-base-300 bg-base-100 text-base-content/50"
      }`}
    >
      {done ? <CheckIcon size={14} /> : index}
    </span>
    {!isLast && <span className="mt-1 w-px flex-1 bg-base-300" />}
  </div>
);

/* Pill toggle used for Default/Custom and for the code format tabs */
const SegmentedToggle = ({ items, activeId, onChange, testId }) => (
  <div
    className="inline-flex w-fit max-w-full items-center gap-0.5 overflow-x-auto rounded-lg bg-base-200 p-1"
    role="tablist"
    data-testid={testId}
  >
    {items.map((item) => (
      <button
        key={item.id}
        type="button"
        role="tab"
        aria-selected={item.id === activeId}
        data-testid={`${testId}-${item.id}`}
        onClick={() => onChange(item.id)}
        className={`shrink-0 whitespace-nowrap rounded-md px-3 py-1 text-xs transition-colors ${
          item.id === activeId
            ? "bg-base-100 font-semibold text-base-content shadow-sm ring-1 ring-base-content/10"
            : "text-base-content/55 hover:text-base-content"
        }`}
      >
        {item.label}
      </button>
    ))}
  </div>
);

const StatusRow = ({ done, title, action, children }) => (
  <div className="rounded-lg border border-base-300 bg-base-200/40 p-4">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="flex items-start gap-2">
        <span className={`mt-0.5 ${done ? "text-success" : "text-base-content/40"}`}>
          {done ? <CheckIcon size={16} /> : <SparklesIcon size={16} />}
        </span>
        <p className="text-sm font-medium text-base-content">{title}</p>
      </div>
      {action}
    </div>
    {children ? <div className="mt-3">{children}</div> : null}
  </div>
);

function Page({ params, isEmbedUser }) {
  const resolvedParams = use(params);
  const orgId = resolvedParams?.org_id || "";
  const router = useRouter();

  const [showKey, setShowKey] = useState(false);
  const [mode, setMode] = useState("default");
  const [format, setFormat] = useState("curl");
  const [gtwyLang, setGtwyLang] = useState("python");
  const [openaiLang, setOpenaiLang] = useState("javascript");
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [tryItQuestion, setTryItQuestion] = useState("");
  const [isTrying, setIsTrying] = useState(false);
  const [tryItAnswer, setTryItAnswer] = useState("");
  const [tryItRaw, setTryItRaw] = useState("");
  const [tryItError, setTryItError] = useState("");

  const { userName, authData, apikeyData, allBridges, orgDefaultAgent, SERVICES, linksData } = useCustomSelector(
    (state) => ({
      userName: state?.userDetailsReducer?.userDetails?.name || "",
      authData: state?.authDataReducer?.authData || [],
      apikeyData: state?.apiKeysReducer?.apikeys?.[orgId] || [],
      allBridges: state?.bridgeReducer?.org?.[orgId]?.orgs || [],
      orgDefaultAgent: state?.bridgeReducer?.org?.[orgId]?.default_agent || null,
      SERVICES: state?.serviceReducer?.services || [],
      linksData: state?.flowDataReducer?.flowData?.linksData || [],
    })
  );

  const authKey = authData?.[0]?.authkey || "";
  const hasAuthKey = !!authKey;
  const hasProvider = apikeyData?.length > 0;
  const hasAgent = allBridges?.length > 0;

  const docLink = linksData?.find((link) => link.title === "API Key")?.blog_link || "https://gtwy.ai/blogs";

  const isCustom = mode === "custom";

  /* The agent GTWY creates along with the workspace — falls back to the org's first agent */
  const defaultAgent = orgDefaultAgent || allBridges?.[0] || null;

  const activeAgent = useMemo(() => {
    if (!isCustom) return defaultAgent;
    if (!hasAgent) return null;
    return allBridges.find((bridge) => bridge?._id === selectedAgentId) || allBridges[0];
  }, [allBridges, hasAgent, isCustom, defaultAgent, selectedAgentId]);

  /* Default mode always shows the API guide; the chatbot guide only applies to a picked chatbot agent */
  const isChatbotAgent = isCustom && activeAgent?.bridgeType?.toLowerCase() === "chatbot";
  const agentSlugName = activeAgent?.slugName || "";

  const activeGtwyLang = useMemo(
    () => GTWY_SDK_LANGUAGES.find((item) => item.id === gtwyLang) || GTWY_SDK_LANGUAGES[0],
    [gtwyLang]
  );

  const activeOpenaiLang = useMemo(
    () => OPENAI_LANGUAGES.find((item) => item.id === openaiLang) || OPENAI_LANGUAGES[0],
    [openaiLang]
  );

  const codeString = useMemo(() => {
    const bridgeId = activeAgent?._id || "YOUR_AGENT_ID";
    const prompt = activeAgent?.configuration?.prompt || "";
    if (isChatbotAgent) return getChatbotEmbedCode(agentSlugName);
    if (isCustom && format === "gtwy") return getGtwySdkCode(activeGtwyLang.id, bridgeId);
    if (isCustom && format === "openai")
      return withConfiguredServer(activeOpenaiLang.generator(bridgeId, isEmbedUser, prompt));
    return withConfiguredServer(getCurlCode(bridgeId, activeAgent?.configuration?.type, isEmbedUser, prompt));
  }, [isCustom, isChatbotAgent, agentSlugName, format, activeGtwyLang, activeOpenaiLang, activeAgent, isEmbedUser]);

  const codeClass = useMemo(() => {
    if (isChatbotAgent) return "language-jsx";
    if (!isCustom || format === "curl") return "language-bash";
    return `language-${format === "gtwy" ? activeGtwyLang.prism : activeOpenaiLang.prism}`;
  }, [isChatbotAgent, isCustom, format, activeGtwyLang, activeOpenaiLang]);

  /* A result belongs to one org + agent, so drop it the moment either changes */
  useEffect(() => {
    setTryItQuestion("");
    setTryItAnswer("");
    setTryItRaw("");
    setTryItError("");
  }, [orgId, activeAgent?._id]);

  /* Fires a real request at the selected agent, the same call the playground uses */
  const runTryIt = async () => {
    const question = tryItQuestion.trim();
    if (!question || !activeAgent?._id) return;

    setIsTrying(true);
    setTryItError("");
    setTryItAnswer("");
    setTryItRaw("");

    try {
      const result = await dryRun({
        localDataToSend: {
          configuration: { type: activeAgent?.configuration?.type || "chat" },
          user: question,
          thread_id: `getting_started_${orgId}_${activeAgent._id}`,
        },
        bridge_id: activeAgent._id,
      });

      setTryItRaw(JSON.stringify(result?.data ?? result, null, 2));
      const content = result?.data?.response?.data?.content;
      if (content) setTryItAnswer(typeof content === "string" ? content : JSON.stringify(content, null, 2));
      else if (!result?.success) setTryItError("The agent did not return a response. Check the raw response below.");
    } catch (error) {
      setTryItError(error?.message || "Request failed. Make sure the agent is published and has a provider key.");
    } finally {
      setIsTrying(false);
    }
  };

  const copyToClipboard = (content) => {
    navigator.clipboard
      .writeText(content || "")
      .then(() => toast.success("Content copied to clipboard"))
      .catch(() => toast.error("Failed to copy"));
  };

  const quickLinks = [
    { label: "Developer Docs", icon: <BookOpen size={14} />, href: DOCS_LINK },
    { label: "Join Our Discord", icon: <MessagesSquare size={14} />, href: DISCORD_LINK },
  ];

  const exploreCards = [
    {
      label: "Knowledge Base",
      description: "Ground your agents on your own documents.",
      icon: <DatabaseIcon size={16} />,
      path: `/org/${orgId}/knowledge_base`,
    },
    {
      label: "Tools",
      description: "Let agents call your functions and APIs.",
      icon: <SquareFunctionIcon size={16} />,
      path: `/org/${orgId}/tools`,
    },
    {
      label: "Metrics",
      description: "Track usage, latency and spend per agent.",
      icon: <LineChartIcon size={16} />,
      path: `/org/${orgId}/metrics`,
    },
    {
      label: "Auth Keys",
      description: "Manage the keys that authenticate requests.",
      icon: <KeyRoundIcon size={16} />,
      path: `/org/${orgId}/pauthkey`,
    },
  ];

  const steps = [
    { key: "environment", done: hasAuthKey && hasProvider },
    { key: "agent", done: hasAgent },
    { key: "integrate", done: hasAuthKey && hasProvider && hasAgent },
  ];

  return (
    <div
      data-testid="getting-started-container"
      id="getting-started-container"
      className="flex w-full flex-col gap-8 px-4 pb-16 pt-4"
    >
      {/* Hero banner */}
      <section
        data-testid="getting-started-hero"
        id="getting-started-hero"
        className="relative overflow-hidden rounded-xl bg-zoom"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
        <div className="relative px-6 py-8 sm:px-8">
          <h1 className="text-2xl font-bold text-white">Hi {userName || "there"}, welcome to GTWY!</h1>
          <p className="mt-1 text-sm text-white/70">
            Take your Gen AI apps to production <em>confidently</em> in just a few steps
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            {quickLinks.map((link) => (
              <a
                key={link.label}
                data-testid={`getting-started-quick-link-${link.label}`}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-white/80 transition-colors hover:text-white"
              >
                {link.icon}
                {link.label}
              </a>
            ))}
            {!isEmbedUser && (
              <button
                data-testid="getting-started-talk-to-us-button"
                id="getting-started-talk-to-us-button"
                type="button"
                onClick={() => openModal(MODAL_TYPE.DEMO_MODAL)}
                className="flex items-center gap-2 text-sm text-white/80 transition-colors hover:text-white"
              >
                <MessageCircleMoreIcon size={14} />
                Talk to us
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Steps */}
      <section data-testid="getting-started-steps" id="getting-started-steps" className="mx-auto w-full max-w-4xl">
        {/* Step 1 - Setup your environment */}
        <div className="flex gap-6">
          <StepRail done={steps[0].done} index={1} />
          <div className="w-full pb-10">
            <h2 className="text-lg font-semibold text-base-content">Setup your environment</h2>
            <p className="mt-1 text-sm text-base-content/60">Get your GTWY auth key & create a new LLM integration</p>

            <div className="mt-4 flex flex-col gap-3 rounded-xl border border-base-300 bg-base-100 p-4">
              <StatusRow
                done={hasAuthKey}
                title={hasAuthKey ? "Your GTWY auth key is ready to use" : "Create your GTWY auth key"}
                action={
                  <button
                    data-testid="getting-started-auth-key-action"
                    type="button"
                    className="btn btn-ghost btn-xs text-primary"
                    onClick={() => router.push(`/org/${orgId}/pauthkey`)}
                  >
                    {hasAuthKey ? "Manage" : "Create"}
                  </button>
                }
              >
                <p className="mb-2 text-xs text-base-content/60">Use this to authenticate all your requests to GTWY</p>
                {hasAuthKey ? (
                  <div className="flex items-center justify-between gap-3 rounded-md border border-base-300 bg-base-200/60 px-3 py-2">
                    <span className="truncate font-mono text-sm text-base-content/80">
                      {showKey ? authKey : maskKey(authKey)}
                    </span>
                    <span className="flex flex-shrink-0 items-center gap-3">
                      <button
                        data-testid="getting-started-toggle-auth-key"
                        type="button"
                        className="text-base-content/60 transition-colors hover:text-base-content"
                        onClick={() => setShowKey((prev) => !prev)}
                        aria-label={showKey ? "Hide auth key" : "Show auth key"}
                      >
                        {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        data-testid="getting-started-copy-auth-key"
                        type="button"
                        className="text-base-content/60 transition-colors hover:text-base-content"
                        onClick={() => copyToClipboard(authKey)}
                        aria-label="Copy auth key"
                      >
                        <CopyIcon size={14} />
                      </button>
                    </span>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-base-300 px-3 py-2 text-sm text-base-content/50">
                    No auth key yet — create one to start sending requests.
                  </div>
                )}
              </StatusRow>

              <StatusRow
                done={hasProvider}
                title={
                  hasProvider
                    ? "Great job 👏 your AI provider is now integrated! Keep moving"
                    : "Connect your first AI provider"
                }
                action={
                  <button
                    data-testid="getting-started-provider-action"
                    type="button"
                    className="btn btn-ghost btn-xs text-primary"
                    onClick={() => router.push(`/org/${orgId}/apikeys`)}
                  >
                    {hasProvider ? "Edit" : "Add"}
                  </button>
                }
              >
                {hasProvider ? (
                  <div className="flex flex-wrap gap-2">
                    {apikeyData.slice(0, 4).map((item) => (
                      <span
                        key={item?._id}
                        className="flex items-center gap-2 rounded-md border border-base-300 bg-base-200/60 px-3 py-1.5 text-xs text-base-content/70"
                      >
                        {getIconOfService(item?.service, 14, 14)}
                        {getServiceDisplayName(item?.service, SERVICES)}
                        <span className="font-mono text-base-content/50">( {item?.name} )</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-base-300 px-3 py-2 text-sm text-base-content/50">
                    Add an OpenAI, Anthropic, Groq or any supported provider key.
                  </div>
                )}
              </StatusRow>
            </div>
          </div>
        </div>

        {/* Step 2 - Create your first agent */}
        <div className="flex gap-6">
          <StepRail done={steps[1].done} index={2} />
          <div className="w-full pb-10">
            <h2 className="text-lg font-semibold text-base-content">Create your first agent</h2>
            <p className="mt-1 text-sm text-base-content/60">
              An agent holds your prompt, model and tools — everything your app calls at runtime
            </p>

            <div className="mt-4 rounded-xl border border-base-300 bg-base-100 p-4">
              <StatusRow
                done={hasAgent}
                title={
                  hasAgent
                    ? `${allBridges.length} agent${allBridges.length > 1 ? "s" : ""} ready in this workspace`
                    : "You haven't created an agent yet"
                }
                action={
                  <button
                    data-testid="getting-started-agent-action"
                    type="button"
                    className="btn btn-primary btn-xs"
                    onClick={() => router.push(`/org/${orgId}/agents?type=api`)}
                  >
                    {hasAgent ? "View agents" : "+ Create Agent"}
                  </button>
                }
              >
                {hasAgent ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <SegmentedToggle
                        items={MODES}
                        activeId={mode}
                        onChange={setMode}
                        testId="getting-started-mode-toggle"
                      />
                      <p className="text-xs text-base-content/50">
                        {isCustom
                          ? "Pick any agent — the guide below switches to match its type."
                          : "Showing the ready-to-use guide for this workspace."}
                      </p>
                    </div>

                    {isCustom && (
                      <select
                        data-testid="getting-started-agent-select"
                        id="getting-started-agent-select"
                        className="select select-bordered select-sm w-full"
                        value={activeAgent?._id || ""}
                        onChange={(e) => setSelectedAgentId(e.target.value)}
                      >
                        {allBridges.map((bridge) => (
                          <option key={bridge?._id} value={bridge?._id}>
                            {bridge?.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-base-300 px-3 py-2 text-sm text-base-content/50">
                    Create an API or Chatbot agent to get an agent id for your requests.
                  </div>
                )}
              </StatusRow>
            </div>
          </div>
        </div>

        {/* Step 3 - Integrate GTWY */}
        <div className="flex gap-6">
          <StepRail done={steps[2].done} index={3} isLast />
          <div className="w-full pb-4">
            <h2 className="text-lg font-semibold text-base-content">Integrate GTWY</h2>
            <p className="mt-1 text-sm text-base-content/60">
              {isChatbotAgent
                ? "Drop the embed script into your site, then drive the widget with the methods below."
                : isCustom
                  ? "Pick an agent and a client, then send a test request from your AI app."
                  : "Copy the request below and fire it from your app — nothing else is required."}
            </p>

            <div className="mt-4 flex flex-col gap-4 rounded-xl border border-base-300 bg-base-100 p-4">
              {isCustom ? (
                isChatbotAgent ? (
                  <p className="text-xs text-base-content/50">
                    This is a Chatbot agent, so it integrates through the embed script rather than the API.
                  </p>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <SegmentedToggle
                      items={FORMATS}
                      activeId={format}
                      onChange={setFormat}
                      testId="getting-started-format-tabs"
                    />

                    {format !== "curl" && (
                      <select
                        data-testid="getting-started-sdk-language-select"
                        className="select select-bordered select-sm ml-auto w-auto text-xs"
                        aria-label="Language"
                        value={format === "gtwy" ? gtwyLang : openaiLang}
                        onChange={(e) =>
                          format === "gtwy" ? setGtwyLang(e.target.value) : setOpenaiLang(e.target.value)
                        }
                      >
                        {(format === "gtwy" ? GTWY_SDK_LANGUAGES : OPENAI_LANGUAGES).map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )
              ) : (
                <div className="flex flex-wrap items-center gap-2 text-xs text-base-content/60">
                  <span className="rounded-md bg-base-200 px-2 py-1 font-medium text-base-content/70">
                    {isChatbotAgent ? "Embed script" : "cURL"}
                  </span>
                  {activeAgent ? null : <span>Create an agent to get a real agent id here.</span>}
                </div>
              )}

              {!isChatbotAgent && isCustom && format === "gtwy" && activeGtwyLang?.install ? (
                <CodeBlock className="language-bash" showCopy={false}>
                  {activeGtwyLang.install}
                </CodeBlock>
              ) : null}

              <CodeBlock key={`${mode}-${format}-${gtwyLang}-${openaiLang}-${activeAgent?._id}`} className={codeClass}>
                {codeString}
              </CodeBlock>

              {isChatbotAgent ? (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-semibold text-base-content">Send data to the chatbot</p>
                    <CodeBlock className="language-javascript">{getChatbotSendDataCode(agentSlugName)}</CodeBlock>
                  </div>

                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-semibold text-base-content">Control the widget</p>
                    <CodeBlock className="language-javascript">{CHATBOT_METHODS}</CodeBlock>
                  </div>

                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-semibold text-base-content">Receive data back</p>
                    <CodeBlock className="language-javascript">{CHATBOT_LISTENER}</CodeBlock>
                  </div>
                </div>
              ) : null}

              {/* Try it live — default mode only */}
              {!isCustom && activeAgent ? (
                <div
                  data-testid="getting-started-try-it"
                  className="flex flex-col gap-3 rounded-lg border border-base-300 bg-base-200/40 p-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-base-content">Try it live</p>
                    <p className="text-xs text-base-content/60">Send a real request without leaving this page.</p>
                  </div>

                  <form
                    className="flex flex-col gap-2 sm:flex-row"
                    onSubmit={(e) => {
                      e.preventDefault();
                      runTryIt();
                    }}
                  >
                    <input
                      data-testid="getting-started-try-it-input"
                      type="text"
                      className="input input-bordered input-sm w-full"
                      placeholder="Ask your agent something..."
                      value={tryItQuestion}
                      onChange={(e) => setTryItQuestion(e.target.value)}
                      disabled={isTrying}
                    />
                    <button
                      data-testid="getting-started-try-it-send"
                      type="submit"
                      className="btn btn-primary btn-sm sm:w-28"
                      disabled={isTrying || !tryItQuestion.trim()}
                    >
                      {isTrying ? <span className="loading loading-spinner loading-xs" /> : "Send"}
                    </button>
                  </form>

                  {tryItError ? (
                    <p className="text-xs text-error" data-testid="getting-started-try-it-error">
                      {tryItError}
                    </p>
                  ) : null}

                  {tryItAnswer ? (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-medium text-base-content/70">Response</p>
                      <div className="whitespace-pre-wrap rounded-md border border-base-300 bg-base-100 px-3 py-2 text-sm text-base-content">
                        {tryItAnswer}
                      </div>
                    </div>
                  ) : null}

                  {tryItRaw ? (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-base-content/60 hover:text-base-content">
                        View raw response
                      </summary>
                      <div className="mt-2">
                        <CodeBlock className="language-json">{tryItRaw}</CodeBlock>
                      </div>
                    </details>
                  ) : null}
                </div>
              ) : null}

              {/* Logs teaser */}
              <div className="overflow-hidden rounded-xl bg-zoom p-5">
                <p className="flex items-center gap-2 text-lg font-semibold text-white">
                  <RocketIcon size={18} />
                  That was easy!
                </p>
                <p className="mt-2 max-w-2xl text-sm text-white/70">
                  Your request gets logged, and all future requests from your app will be tracked. View the logs and
                  other details on the logs page.
                </p>
                {isCustom && (
                  <button
                    data-testid="getting-started-view-logs-button"
                    type="button"
                    className="mt-4 text-sm font-medium text-white underline-offset-4 hover:underline"
                    onClick={() =>
                      router.push(
                        activeAgent?._id ? `/org/${orgId}/agents/history/${activeAgent._id}` : `/org/${orgId}/metrics`
                      )
                    }
                  >
                    View logs →
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-base-300 bg-base-200/40 px-4 py-3">
                <p className="text-sm text-base-content/60">
                  Having trouble? Check out our docs for help with a specific integration.
                </p>
                <a
                  data-testid="getting-started-view-docs-link"
                  href={docLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm gap-2"
                >
                  View Docs <ExternalLinkIcon size={14} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Explore next */}
      <section
        data-testid="getting-started-explore"
        id="getting-started-explore"
        className="mx-auto w-full max-w-4xl pl-[52px]"
      >
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-base-content/50">Explore next</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {exploreCards.map((card) => (
            <button
              key={card.label}
              data-testid={`getting-started-explore-${card.label}`}
              type="button"
              onClick={() => router.push(card.path)}
              className="flex items-start gap-3 rounded-xl border border-base-300 bg-base-100 p-4 text-left transition-colors hover:border-primary/40"
            >
              <span className="mt-0.5 text-base-content/60">{card.icon}</span>
              <span>
                <span className="block text-sm font-medium text-base-content">{card.label}</span>
                <span className="block text-xs text-base-content/60">{card.description}</span>
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Protected(Page);
