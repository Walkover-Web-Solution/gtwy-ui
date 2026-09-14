"use client";

import React, { createContext, useContext, useMemo, useState } from "react";
import { AlertTriangle, BookOpen, Brackets, ChevronRight, History, SquareFunction } from "lucide-react";
import { ExpandCollapse } from "@/components/UI/ExpandCollapse";
import {
  HUE_THEME,
  NEUTRAL_HEAD,
  NEUTRAL_HEAD_OPEN,
  NEUTRAL_RAIL,
  TRACE_ROW_BORDER,
  agentInitials,
  resolveAgentHue,
} from "./traceTheme";
import CodeBlock from "../../codeBlock/CodeBlock";

const TRACE_HIDDEN_VAR_KEYS = new Set(["_user_message"]);

const formatToolName = (name) =>
  String(name || "tool")
    .replace(/\(\)\s*$/, "")
    .trim();

function formatIoValue(value) {
  if (value == null) return "—";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "—";
    try {
      return JSON.stringify(JSON.parse(trimmed), null, 2);
    } catch {
      return value;
    }
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

/** Reference: bordered INPUT / OUTPUT blocks */
function IoPanel({ label, value }) {
  const panelKey = String(label || "").toLowerCase();
  return (
    <div
      className={`mx-2 mb-2 overflow-hidden rounded-lg ${TRACE_ROW_BORDER} bg-base-100`}
      data-testid={`io-panel-${panelKey}`}
    >
      <div
        className="border-b border-base-content/20 bg-base-200/60 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-base-content/45"
        data-testid={`io-panel-label-${panelKey}`}
      >
        {label}
      </div>
      <pre
        className="max-h-52 overflow-auto whitespace-pre-wrap break-words bg-base-100 px-3 py-2.5 font-mono text-[11px] leading-relaxed text-base-content/80"
        data-testid={`io-panel-pre-${panelKey}`}
      >
        {formatIoValue(value)}
      </pre>
    </div>
  );
}

const RAIL_NODE_CLASS = "absolute z-[1] -left-[29px] top-1 flex h-5 w-5 items-center justify-center";

const TraceRailCtx = createContext({ railClass: NEUTRAL_RAIL });

function AgentBodyRail({ children, hue, className = "" }) {
  const railClass = hue ? HUE_THEME[hue]?.rail : NEUTRAL_RAIL;
  return (
    <TraceRailCtx.Provider value={{ railClass }}>
      <div className={`relative ml-[13px] border-l-2 py-1 pl-[22px] pr-1 ${railClass} ${className}`}>{children}</div>
    </TraceRailCtx.Provider>
  );
}

function TraceRow({ children, node, textRow = false }) {
  const nodeClasses = textRow
    ? "absolute z-[1] -left-[27px] top-[15px] h-[9px] w-[9px] rounded-full border-2 border-base-100 bg-base-content/40"
    : RAIL_NODE_CLASS;

  return (
    <div className="relative my-[4px]">
      {node ? <span className={nodeClasses}>{node}</span> : null}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function FlatRow({ children, className = "" }) {
  return <div className={`my-1 pr-1 ${className}`}>{children}</div>;
}

function StepIconBox({ children, className = "" }) {
  return (
    <span
      className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border border-base-300/60 bg-base-200/80 text-base-content/60 ${className}`}
    >
      {children}
    </span>
  );
}

function StepRowHeader({ open, inRail, icon, children, onClick, headerClass = "", ...props }) {
  return (
    <div
      className={`flex min-h-[30px] cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1 transition-colors ${TRACE_ROW_BORDER} ${headerClass}`}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick(e) : undefined}
      role="button"
      tabIndex={0}
      {...props}
    >
      <ChevronRight
        size={14}
        className={`shrink-0 text-base-content/40 transition-transform duration-150 ${open ? "rotate-90" : ""}`}
      />
      {icon}
      {children}
    </div>
  );
}

const TraceCtx = createContext({
  detail: "medium",
  showMeta: true,
  onToolLogsClick: null,
  onToolDataClick: null,
  onAgentDataClick: null,
  onAgentHistoryClick: null,
});

function AgentAvatar({ name, hue, glyph, large = false }) {
  const initials = agentInitials(name, glyph);
  const theme = hue ? HUE_THEME[hue] : null;
  const size = large ? "h-8 w-8 text-xs rounded-lg" : "h-6 w-6 text-[10px] rounded-md";
  const colors = theme ? theme.avatar : "border border-base-300/40 bg-base-300/50 text-base-content/70";

  return <span className={`grid shrink-0 place-items-center font-bold ${size} ${colors}`}>{initials}</span>;
}

function Meta({ latency, tokens, cost }) {
  const { showMeta } = useContext(TraceCtx);
  if (!showMeta) return null;
  const fmt = (s) => {
    const num = Number(s);
    if (num >= 1) return `${num.toFixed(1)}s`;
    return `${(num * 1000).toFixed(0)}ms`;
  };
  const tokObj = tokens && typeof tokens === "object" ? tokens : null;
  const tokTotal = tokObj ? tokObj.total : tokens;
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-base-content/45 font-medium shrink-0 ml-auto mr-1 select-none">
      {latency != null && <span>{fmt(latency)}</span>}
      {tokObj ? (
        <span
          className="cursor-help"
          title={`Tokens: ${(tokObj.input ?? 0).toLocaleString()} input • ${(tokObj.output ?? 0).toLocaleString()} output • ${(tokObj.total ?? (tokObj.input ?? 0) + (tokObj.output ?? 0)).toLocaleString()} total`}
        >
          {(tokObj.input ?? 0).toLocaleString()} IN • {(tokObj.output ?? 0).toLocaleString()} OUT •{" "}
          {(tokObj.total ?? (tokObj.input ?? 0) + (tokObj.output ?? 0)).toLocaleString()} TOTAL
        </span>
      ) : (
        tokTotal != null && (
          <span className="cursor-help" title={`Total Tokens: ${tokTotal.toLocaleString()}`}>
            {tokTotal.toLocaleString()} TOTAL
          </span>
        )
      )}
      {cost != null && <span>${Number(cost).toFixed(3)}</span>}
    </div>
  );
}

function KindTag({ children, className = "" }) {
  return (
    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${className}`}>
      {children}
    </span>
  );
}

function TextStep({ step }) {
  const [open, setOpen] = useState(false);
  return (
    <TraceRow textRow>
      <div className="min-w-0">
        <StepRowHeader
          open={open}
          headerClass={NEUTRAL_HEAD}
          onClick={() => setOpen((o) => !o)}
          data-testid="text-step-header"
        >
          <span className="text-xs font-medium text-base-content/70">Message</span>
        </StepRowHeader>
        {open && (
          <div
            className={`mt-1 rounded-lg ${TRACE_ROW_BORDER} bg-base-200/50 px-3 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-wrap text-base-content`}
          >
            {step.text}
          </div>
        )}
      </div>
    </TraceRow>
  );
}

function ToolNodeIcon({ err = false, size = 12 }) {
  return (
    <StepIconBox className={err ? "border-error/30 bg-error/10 text-error" : ""}>
      {err ? <AlertTriangle size={size} /> : <SquareFunction size={size} />}
    </StepIconBox>
  );
}

function KbNodeIcon({ size = 12 }) {
  return (
    <StepIconBox className="border-trace-blue/25 bg-trace-blue/8 text-trace-blue">
      <BookOpen size={size} />
    </StepIconBox>
  );
}

function VarsNodeIcon({ size = 12 }) {
  return (
    <StepIconBox className="border-trace-gold/25 bg-trace-gold/8 text-trace-gold">
      <Brackets size={size} />
    </StepIconBox>
  );
}

function VariableRow({ label, value, isLong, ...props }) {
  // Parse JSON if possible
  const parsedJson = useMemo(() => {
    if (!value) return null;
    const trimmed = value.trim();
    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return null;
      }
    }
    return null;
  }, [value]);

  return (
    <div
      className="grid grid-cols-[minmax(120px,180px)_1fr] gap-4 border-b border-base-content/15 px-4 py-2.5 text-xs last:border-0"
      {...props}
    >
      <span className="font-mono font-medium text-trace-blue break-words">{label}</span>
      <div className="font-mono text-base-content overflow-hidden w-full">
        {parsedJson !== null ? (
          (() => {
            const prettyJson = JSON.stringify(parsedJson, null, 2);
            return (
              <ExpandCollapse collapsedHeight={150} fadeHeight={50}>
                <CodeBlock className="language-json" showCopy={false}>
                  {prettyJson}
                </CodeBlock>
              </ExpandCollapse>
            );
          })()
        ) : (
          <span className="break-all whitespace-pre-wrap block">
            <ExpandCollapse collapsedHeight={150} fadeHeight={40}>
              {value}
            </ExpandCollapse>
          </span>
        )}
      </div>
    </div>
  );
}

function VariablesBlock({ vars, inRail = true }) {
  const entries = Object.entries(vars || {}).filter(([k]) => !TRACE_HIDDEN_VAR_KEYS.has(k));
  const [open, setOpen] = useState(false);
  if (!entries.length) return null;

  const previewKeys = entries.slice(0, 4);
  const overflow = entries.length - previewKeys.length;
  const varsHead = "bg-gradient-to-r from-trace-gold/14 via-trace-gold/6 to-transparent hover:from-trace-gold/20";

  const body = (
    <div className="min-w-0" data-testid="variables-block">
      <StepRowHeader
        open={open}
        inRail={inRail}
        icon={<VarsNodeIcon />}
        headerClass={varsHead}
        onClick={() => setOpen((o) => !o)}
        data-testid="variables-block-header"
      >
        <KindTag className="inline-flex items-center gap-1 text-trace-gold" data-testid="variables-block-tag">
          <Brackets size={12} /> variables
        </KindTag>
        <span
          className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-trace-blue/20 bg-trace-blue/10 px-1.5 text-[11px] font-mono text-trace-blue"
          data-testid="variables-block-count"
        >
          {entries.length}
        </span>
        {!open &&
          previewKeys.map(([k]) => (
            <span
              key={k}
              className="rounded-md bg-trace-gold/8 px-2 py-0.5 text-[11px] font-mono text-base-content/60"
              data-testid={`variables-block-preview-${k}`}
            >
              {k}
            </span>
          ))}
        {!open && overflow > 0 && (
          <span className="text-[11px] font-mono text-base-content/50" data-testid="variables-block-overflow">
            +{overflow}
          </span>
        )}
      </StepRowHeader>
      {open && (
        <div
          className={`mt-1.5 overflow-hidden rounded-lg ${TRACE_ROW_BORDER} bg-trace-blue/[0.06]`}
          data-testid="variables-block-expanded"
        >
          {entries.map(([k, v]) => {
            const raw = typeof v === "object" && v !== null ? JSON.stringify(v, null, 2) : String(v ?? "");
            const isLong = raw.length > 200;
            return (
              <VariableRow key={k} label={k} value={raw} isLong={isLong} data-testid={`variables-block-row-${k}`} />
            );
          })}
        </div>
      )}
    </div>
  );

  if (!inRail) return <FlatRow data-testid="variables-block-flat-row">{body}</FlatRow>;
  return (
    <TraceRow node={<VarsNodeIcon />} data-testid="variables-block-trace-row">
      {body}
    </TraceRow>
  );
}

function ToolActionButtons({ rawTool, isRag }) {
  const { onToolLogsClick } = useContext(TraceCtx);
  if (!rawTool) return null;

  return (
    <div className="flex shrink-0 items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      {!isRag && onToolLogsClick && (
        <button
          type="button"
          className="flex items-center gap-1 rounded border border-primary/30 bg-primary/5 hover:bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary transition-all duration-100 active:scale-95 cursor-pointer shadow-xs"
          title="function logs"
          onClick={(e) => onToolLogsClick(e, rawTool)}
        >
          <span>Logs</span>
        </button>
      )}
    </div>
  );
}

function ToolStep({ step, inRail = true }) {
  const [open, setOpen] = useState(false);
  const err = step.status === "error";
  const toolKind = step.toolKind || "tool";
  const isPreFunction = toolKind === "pre_function";
  const isPostFunction = toolKind === "post_function";
  const toolHead = open
    ? "rounded-lg bg-gradient-to-r from-base-200/80 via-base-200/40 to-transparent"
    : isPreFunction
      ? "bg-gradient-to-r from-warning/14 via-warning/6 to-transparent hover:from-warning/20"
      : isPostFunction
        ? "bg-gradient-to-r from-info/14 via-info/6 to-transparent hover:from-info/20"
        : "bg-gradient-to-r from-base-200/60 via-base-200/25 to-transparent hover:from-base-200/80";

  const kindTag = isPreFunction ? (
    <KindTag className="border border-warning/25 bg-warning/10 text-warning">pre function</KindTag>
  ) : isPostFunction ? (
    <KindTag className="border border-info/25 bg-info/10 text-info">post function</KindTag>
  ) : (
    <KindTag className="bg-base-300/50 text-base-content/55">tool</KindTag>
  );

  const body = (
    <div className="min-w-0">
      <StepRowHeader
        open={open}
        inRail={inRail}
        icon={<ToolNodeIcon err={err} />}
        headerClass={toolHead}
        onClick={() => setOpen((o) => !o)}
        data-testid={`trace-tool-header-${formatToolName(step.name)}`}
      >
        {kindTag}
        <span
          className="max-w-[180px] truncate text-xs font-medium text-base-content"
          title={formatToolName(step.name)}
        >
          {formatToolName(step.name)}
        </span>
        {!err && <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">ok</span>}
        {err && <span className="badge badge-xs badge-error">err</span>}
        <span className="min-w-0 flex-1 truncate text-xs text-base-content/60" title={step.summary}>
          {step.summary}
        </span>
        <Meta latency={step.latency} tokens={step.tokens} />
        <ToolActionButtons rawTool={step.rawTool} />
      </StepRowHeader>
      {open && (
        <div className="pb-1 pt-1">
          <IoPanel label="Input" value={step.input} />
          {step.queryParams && <IoPanel label="Query Params" value={step.queryParams} />}
          <IoPanel label="Output" value={step.output} />
        </div>
      )}
    </div>
  );

  if (!inRail) return <FlatRow>{body}</FlatRow>;
  return <TraceRow node={<ToolNodeIcon err={err} />}>{body}</TraceRow>;
}

function VarsStep({ step, inRail = true }) {
  return <VariablesBlock vars={step.vars} inRail={inRail} />;
}

function KbQueryBox({ query }) {
  if (!query) return null;
  return (
    <div
      className={`mx-2 mb-2 rounded-lg ${TRACE_ROW_BORDER} bg-trace-blue/[0.06] px-3 py-2`}
      data-testid="kb-query-box"
    >
      <div className="text-[10px] font-semibold uppercase tracking-wider text-base-content/45">Query</div>
      <div className="mt-1 text-xs leading-relaxed text-base-content/80">{query}</div>
    </div>
  );
}

function KbChunkCard({ chunk, index }) {
  const scorePct = chunk.score != null ? Math.round(Number(chunk.score) * 100) : null;
  return (
    <div
      className={`mx-2 mb-2 overflow-hidden rounded-lg ${TRACE_ROW_BORDER} bg-base-100`}
      data-testid={`kb-chunk-card-${index}`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-base-content/20 bg-base-200/50 px-3 py-1.5 text-[11px]">
        <span className="truncate text-base-content/55">{chunk.source || `chunk ${index + 1}`}</span>
        {scorePct != null && (
          <span className="shrink-0 rounded-full bg-trace-blue/10 px-2 py-0.5 font-mono text-[10px] text-trace-blue">
            {scorePct}%
          </span>
        )}
      </div>
      <div className="px-3 py-2 text-xs leading-relaxed text-base-content/75">{chunk.text}</div>
    </div>
  );
}

function KbStep({ step, inRail = true }) {
  const [open, setOpen] = useState(false);
  const chunks = step.chunks || [];
  const query = step.query || step.input?.query || "";
  const kbHead = open
    ? "rounded-lg bg-gradient-to-r from-trace-blue/14 via-trace-blue/6 to-transparent"
    : "bg-gradient-to-r from-trace-blue/10 via-trace-blue/4 to-transparent hover:from-trace-blue/16";

  const body = (
    <div className="min-w-0">
      <StepRowHeader
        open={open}
        inRail={inRail}
        icon={<KbNodeIcon />}
        headerClass={kbHead}
        onClick={() => setOpen((o) => !o)}
        data-testid={`trace-kb-header-${step.name || "kb"}`}
      >
        <KindTag className="border border-trace-blue/20 bg-trace-blue/10 text-trace-blue">knowledge base</KindTag>
        <span className="truncate text-xs font-medium text-base-content">{step.name}</span>
        <span className="min-w-0 flex-1 truncate text-xs text-base-content/60" title={step.summary}>
          {step.summary}
        </span>
        <ToolActionButtons rawTool={step.rawTool} isRag />
      </StepRowHeader>
      {open && (
        <div className="pb-1 pt-1">
          <KbQueryBox query={query} />
          {chunks.length > 0 ? (
            chunks.map((c, i) => <KbChunkCard key={i} chunk={c} index={i} />)
          ) : (
            <>
              <IoPanel label="Input" value={step.input} />
              <IoPanel label="Output" value={step.output} />
            </>
          )}
        </div>
      )}
    </div>
  );

  if (!inRail) return <FlatRow>{body}</FlatRow>;
  return <TraceRow node={<KbNodeIcon />}>{body}</TraceRow>;
}

/** ~6 lines at text-xs / leading-snug — matches line-clamp-6 */
const TRACE_BUBBLE_CLAMP_HEIGHT = 120;

function MessageBubble({ text, align = "left", expandable = true, isError = false }) {
  if (!text) return null;

  const isLeft = align === "left";

  return (
    <div className="relative my-[7px] min-w-0">
      <div
        className={`px-3 py-2 text-xs leading-snug ${
          isError ? "border border-error/40 bg-error/10 text-error/90" : "bg-base-200/55 text-base-content/70"
        } ${isLeft ? "rounded-[4px_12px_12px_12px] text-left" : "rounded-[12px_4px_12px_12px] text-right"}`}
      >
        {isError && (
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle size={12} className="text-error" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-error">Error</span>
          </div>
        )}
        {expandable ? (
          <ExpandCollapse
            collapsedHeight={TRACE_BUBBLE_CLAMP_HEIGHT}
            fadeHeight={40}
            style={{
              "--expand-collapse-fade": isError ? "oklch(var(--er) / 0.10)" : "oklch(var(--b2) / 0.55)",
            }}
          >
            <div className="whitespace-pre-wrap">{text}</div>
          </ExpandCollapse>
        ) : (
          <div className="whitespace-pre-wrap">{text}</div>
        )}
      </div>
    </div>
  );
}

function QueryBubble({ text }) {
  return <MessageBubble text={text} align="left" expandable={false} />;
}

function ResponseBubble({ text, isError = false }) {
  return <MessageBubble text={text} align="left" expandable isError={isError} />;
}

function canOpenAgentHistory(rawTool) {
  const isAgent = rawTool?.data?.metadata?.type === "agent" || rawTool?.type === "AGENT" || Boolean(rawTool?.bridge_id);
  const agentId = rawTool?.data?.metadata?.agent_id || rawTool?.bridge_id;
  return isAgent && Boolean(agentId);
}

const AGENT_ROW_BTN =
  "grid h-5 w-5 shrink-0 place-items-center rounded text-base-content/60 hover:bg-base-300/50 hover:text-primary";

function AgentActionButtons({ payload, rawTool }) {
  const { onAgentHistoryClick } = useContext(TraceCtx);
  const canHistory = Boolean(onAgentHistoryClick && canOpenAgentHistory(rawTool));

  if (!canHistory) return null;

  return (
    <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
      {canHistory && (
        <button
          type="button"
          className={AGENT_ROW_BTN}
          title="Open agent history"
          onClick={(e) => onAgentHistoryClick(e, rawTool)}
        >
          <History size={14} />
        </button>
      )}
    </div>
  );
}

function buildAgentSliderPayload(node, agents, agentMeta) {
  const tools = (node.steps || [])
    .map((s) => {
      if (s.type === "tool") {
        return { name: s.name, functionData: s.rawTool || { args: s.input, data: s.output } };
      }
      if (s.type === "agent") {
        return {
          name: agents[s.agent]?.name || s.agent,
          nodeType: "agent",
          functionData: s.rawTool || { args: { query: s.question }, data: { response: s.responseText } },
        };
      }
      return null;
    })
    .filter(Boolean);

  if (node.rawTool) {
    return {
      name: agentMeta.name,
      functionData: {
        id: node.rawTool.id ?? node.rawTool.message_id ?? null,
        args: node.rawTool.args ?? {},
        data: node.rawTool.data ?? {},
      },
      tools,
    };
  }

  if (node.rawMessage) {
    return {
      name: agentMeta.name,
      functionData: {
        id: node.rawMessage.message_id ?? null,
        args: {
          user: node.rawMessage.user,
          variables: node.rawMessage.variables,
        },
        data: node.rawMessage,
      },
      tools,
    };
  }

  return { name: agentMeta.name, functionData: null, tools };
}

function HistoryExecutionSteps({ node, agents, inRail = false }) {
  const steps = node.steps || [];
  if (steps.length === 0) return null;

  const renderRootStep = (s, i) => {
    if (s.type === "text") return <TextStep key={i} step={s} />;
    if (s.type === "tool") return <ToolStep key={i} step={s} inRail={inRail} />;
    if (s.type === "variables") return <VarsStep key={i} step={s} inRail={inRail} />;
    if (s.type === "kb") return <KbStep key={i} step={s} inRail={inRail} />;
    if (s.type === "agent") return <AgentBlock key={i} node={s} agents={agents} embedded depth={1} />;
    return null;
  };

  return <div className="w-full space-y-1">{steps.map(renderRootStep)}</div>;
}

function countExecutionSteps(steps = []) {
  const c = { tool: 0, kb: 0, vars: 0, agent: 0 };
  steps.forEach((s) => {
    if (c[s.type] != null) c[s.type]++;
  });
  return c;
}

function StepCountBadges({ stepCounts, responsePreview }) {
  return (
    <span className="ml-0.5 flex min-w-0 flex-wrap gap-1">
      {stepCounts.tool > 0 && (
        <span className="shrink-0 rounded-full bg-base-300/40 px-1.5 py-0.5 text-[10px] text-base-content/70">
          {stepCounts.tool} tool{stepCounts.tool > 1 ? "s" : ""}
        </span>
      )}
      {stepCounts.kb > 0 && (
        <span className="shrink-0 rounded-full bg-base-300/40 px-1.5 py-0.5 text-[10px] text-base-content/70">
          {stepCounts.kb} KB
        </span>
      )}
      {stepCounts.agent > 0 && (
        <span className="shrink-0 rounded-full bg-base-300/40 px-1.5 py-0.5 text-[10px] text-base-content/70">
          {stepCounts.agent} agent{stepCounts.agent > 1 ? "s" : ""}
        </span>
      )}
      {responsePreview && (
        <span className="hidden max-w-[180px] truncate text-[11px] text-base-content/50 sm:inline">
          {responsePreview}
        </span>
      )}
    </span>
  );
}

/** Parent agent wrapper — gold shell/header, user message + colored rail for children */
function RootExecutionShell({ node, agents, userMessage }) {
  const [open, setOpen] = useState(true);
  const steps = node.steps || [];
  if (steps.length === 0) return null;

  const totalSteps = steps.length;

  return (
    <div className="w-full flex flex-col gap-2 items-start">
      {/* Accordion Header */}
      <div
        className="inline-flex items-center gap-2 cursor-pointer select-none rounded-lg px-3 transition-all duration-200"
        onClick={() => setOpen((o) => !o)}
        data-testid="trace-tool-calls-header"
      >
        <ChevronRight
          size={13}
          className={`shrink-0 text-base-content/50 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
        />
        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-base-content/70">
          <span className="font-mono text-xs text-trace-blue font-bold">&lt;&gt;</span>
          <span>Tool Calls</span>
        </span>
        <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold bg-trace-blue/10 text-trace-blue border border-trace-blue/20 leading-none">
          {totalSteps}
        </span>
      </div>

      {/* Expanded Container */}
      {open && (
        <div className="w-full border border-base-200 dark:border-base-content/20 rounded-xl p-4 bg-base-200/10 shadow-sm space-y-2">
          <HistoryExecutionSteps node={node} agents={agents} inRail={false} />
        </div>
      )}
    </div>
  );
}

function AgentBlock({ node, agents, root, embedded, depth = 1 }) {
  const { detail: _detail } = useContext(TraceCtx);
  const a = agents[node.agent] || {
    name: node.agent,
    model: "—",
    role: "Sub-agent",
  };
  const [open, setOpen] = useState(false);
  const stepCounts = useMemo(() => countExecutionSteps(node.steps), [node.steps]);

  const question = node.question || node.reason;
  const hasVars = useMemo(() => {
    return Object.keys(node.vars || {}).filter((k) => !TRACE_HIDDEN_VAR_KEYS.has(k)).length > 0;
  }, [node.vars]);
  const hasBody = (node.steps?.length ?? 0) > 0 || question || node.responseText || hasVars;

  const hue = root && !embedded ? null : resolveAgentHue(a, node.agent, node.hue);
  const theme = hue ? HUE_THEME[hue] : null;
  const shellClass = theme ? theme.shell : "";

  const renderStep = (s, i) => {
    if (s.type === "text") return <TextStep key={i} step={s} />;
    if (s.type === "tool") return <ToolStep key={i} step={s} inRail />;
    if (s.type === "variables") return <VarsStep key={i} step={s} inRail />;
    if (s.type === "kb") return <KbStep key={i} step={s} inRail />;
    if (s.type === "agent")
      return <AgentBlock key={i} node={s} agents={agents} embedded={embedded} depth={depth + 1} />;
    return null;
  };

  const sliderPayload = useMemo(() => buildAgentSliderPayload(node, agents, a), [node, agents, a]);

  const stepCountBadges = <StepCountBadges stepCounts={stepCounts} responsePreview={node.responsePreview} />;

  const headClass = open && hasBody ? theme?.headOpen || NEUTRAL_HEAD_OPEN : theme?.head || NEUTRAL_HEAD;

  const renderAgentHeader = () => {
    const barColor =
      hue === "trace-blue"
        ? "bg-trace-blue/40"
        : hue === "trace-green"
          ? "bg-trace-green/40"
          : hue === "trace-gold"
            ? "bg-trace-gold/40"
            : "bg-base-content/10";
    return (
      <div
        className={`relative flex min-h-[30px] cursor-pointer items-center gap-2 rounded-lg pl-4 pr-3 py-1 transition-colors ${headClass}`}
        onClick={() => setOpen((o) => !o)}
        data-testid={`trace-agent-header-${a.name}`}
      >
        <div className={`absolute left-0 top-0 bottom-0 w-[2px] rounded-l-lg ${barColor}`} />

        <ChevronRight
          size={14}
          className={`shrink-0 text-base-content/40 transition-transform duration-150 ${open ? "rotate-90" : ""}`}
        />
        <AgentAvatar name={a.name} hue={hue} glyph={a.glyph} large={root && !embedded} />
        <span className="truncate text-sm font-semibold text-base-content">{a.name}</span>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-wider font-semibold ${theme?.roleTag || "border-base-300/40 bg-base-300/30 text-base-content/55"}`}
        >
          {a.role}
        </span>
        {!open && stepCountBadges}
        {node.responseIsError && (
          <span className="shrink-0 badge badge-xs badge-error" title="Agent returned an error">
            err
          </span>
        )}
        <span className="flex-1" />
        <Meta latency={node.latency} tokens={node.tokens} cost={node.cost} />
        <AgentActionButtons payload={sliderPayload} rawTool={node.rawTool} />
      </div>
    );
  };

  const renderExpandedBody = () => {
    const hasInnerContent = (node.steps?.length ?? 0) > 0 || question || hasVars || node.responseText;
    if (!hasInnerContent) return null;

    return (
      <AgentBodyRail hue={hue}>
        <QueryBubble text={question} />
        {node.vars && <VariablesBlock vars={node.vars} inRail />}
        {node.steps?.map(renderStep)}
        <ResponseBubble text={node.responseText} isError={node.responseIsError} />
      </AgentBodyRail>
    );
  };

  if (embedded) {
    return (
      <div className={`my-1.5 w-full overflow-hidden ${shellClass}`}>
        {renderAgentHeader()}
        {open && hasBody ? renderExpandedBody() : null}
      </div>
    );
  }

  return (
    <div className={`my-1.5 w-full overflow-hidden ${shellClass}`}>
      {renderAgentHeader()}
      {open && hasBody ? renderExpandedBody() : null}
    </div>
  );
}

export function MessageRunTrace({
  run,
  agents,
  embedded = true,
  userMessage,
  onToolLogsClick,
  onToolDataClick,
  onAgentDataClick,
  onAgentHistoryClick,
}) {
  if (!run) return null;
  return (
    <TraceCtx.Provider
      value={{
        detail: "compact",
        showMeta: true,
        onToolLogsClick,
        onToolDataClick,
        onAgentDataClick,
        onAgentHistoryClick,
      }}
    >
      {embedded ? (
        <RootExecutionShell node={run} agents={agents || {}} userMessage={userMessage} />
      ) : (
        <AgentBlock node={run} agents={agents || {}} root={true} embedded={false} />
      )}
    </TraceCtx.Provider>
  );
}

export default function ExecutionTraceView({
  trace,
  agents,
  detail = "medium",
  showMeta = true,
  embedded = false,
  onToolLogsClick,
  onToolDataClick,
  onAgentDataClick,
  onAgentHistoryClick,
}) {
  if (!trace?.turns?.length) {
    return <div className="p-4 text-sm text-base-content/60">No execution trace available.</div>;
  }

  const turn = trace.turns[0];

  if (embedded) {
    return (
      <TraceCtx.Provider
        value={{ detail, showMeta, onToolLogsClick, onToolDataClick, onAgentDataClick, onAgentHistoryClick }}
      >
        <MessageRunTrace
          run={turn.run}
          agents={agents}
          embedded
          onToolLogsClick={onToolLogsClick}
          onToolDataClick={onToolDataClick}
          onAgentDataClick={onAgentDataClick}
          onAgentHistoryClick={onAgentHistoryClick}
        />
      </TraceCtx.Provider>
    );
  }

  const meta = trace.meta || {};

  return (
    <TraceCtx.Provider
      value={{
        detail,
        showMeta,
        onToolLogsClick,
        onToolDataClick,
        onAgentDataClick,
        onAgentHistoryClick,
      }}
    >
      <div className="bg-base-100 text-base-content">
        <div className="flex flex-wrap items-center gap-4 border-b border-base-300 px-4 py-3">
          <div>
            <div className="text-sm font-semibold">Execution Trace</div>
            {meta.started && <div className="mt-0.5 text-xs text-base-content/50">{meta.started}</div>}
          </div>
          <div className="ml-1 flex flex-wrap gap-4">
            {meta.totalLatency != null && (
              <div className="flex flex-col">
                <b className="text-sm">
                  {meta.totalLatency >= 1000
                    ? `${(meta.totalLatency / 1000).toFixed(1)}s`
                    : `${Math.round(meta.totalLatency)}ms`}
                </b>
                <span className="text-[11px] text-base-content/50">latency</span>
              </div>
            )}
            {meta.totalTokens != null && (
              <div
                className="flex flex-col cursor-help"
                title={
                  typeof meta.totalTokens === "object"
                    ? `Tokens: ${meta.totalTokens.input.toLocaleString()} input • ${meta.totalTokens.output.toLocaleString()} output • ${(meta.totalTokens.total ?? (meta.totalTokens.input ?? 0) + (meta.totalTokens.output ?? 0)).toLocaleString()} total`
                    : `Total Tokens: ${meta.totalTokens.toLocaleString()}`
                }
              >
                {typeof meta.totalTokens === "object" ? (
                  <b className="text-sm">
                    {meta.totalTokens.input.toLocaleString()}IN {meta.totalTokens.output.toLocaleString()}OUT{" "}
                    {(
                      meta.totalTokens.total ?? (meta.totalTokens.input ?? 0) + (meta.totalTokens.output ?? 0)
                    ).toLocaleString()}
                    TOTAL
                  </b>
                ) : (
                  <b className="text-sm">{meta.totalTokens.toLocaleString()}</b>
                )}
                <span className="text-[11px] text-base-content/50">tokens</span>
              </div>
            )}
          </div>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-4 py-5">
          <MessageRunTrace
            run={turn.run}
            agents={agents}
            embedded={false}
            onToolLogsClick={onToolLogsClick}
            onToolDataClick={onToolDataClick}
            onAgentDataClick={onAgentDataClick}
            onAgentHistoryClick={onAgentHistoryClick}
          />
        </div>
      </div>
    </TraceCtx.Provider>
  );
}
