import { useState } from "react";
import { CheckCircle2, XCircle, RotateCcw, Loader2, ChevronDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { mdComponentsDark, mdRemarkPlugins } from "@/utils/markdownComponents";

function RoundEntry({ entry }) {
  const isFailed = !entry.isStreaming && entry.passed === false;
  const [roundOpen, setRoundOpen] = useState(isFailed);

  const icon = entry.isStreaming ? (
    <Loader2 size={11} className="animate-spin" />
  ) : entry.passed ? (
    <CheckCircle2 size={11} className="text-success" />
  ) : (
    <XCircle size={11} className="text-error" />
  );

  const label = entry.isStreaming ? "Reviewing…" : entry.passed ? "Passed" : "Failed";
  const hasDetails = entry.isStreaming || entry.reviewContent || isFailed;

  return (
    <div className="rounded border border-base-300 overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left font-semibold text-base-content/60 hover:text-base-content transition-colors"
        onClick={() => hasDetails && setRoundOpen((o) => !o)}
        style={{ cursor: hasDetails ? "pointer" : "default" }}
      >
        {icon}
        <span className="flex-1">
          Round {entry.round} — {label}
        </span>
        {entry.isStreaming && <span className="loading loading-dots loading-xs opacity-60" />}
        {hasDetails && (
          <span
            style={{
              display: "inline-flex",
              transition: "transform 0.2s ease",
              transform: roundOpen ? "rotate(-180deg)" : "rotate(0deg)",
            }}
          >
            <ChevronDown className="h-3 w-3" />
          </span>
        )}
      </button>

      {roundOpen && hasDetails && (
        <div className="border-t border-base-300 px-3 py-2 flex flex-col gap-1.5 bg-base-100/40">
          {entry.reviewContent && (
            <div className="text-base-content/70 leading-relaxed">
              <ReactMarkdown components={mdComponentsDark} remarkPlugins={mdRemarkPlugins}>
                {entry.reviewContent}
              </ReactMarkdown>
            </div>
          )}
          {isFailed && entry.error && (
            <div className="rounded bg-error/10 border border-error/30 px-2 py-1.5 text-error/90 font-mono break-all">
              {entry.error}
            </div>
          )}
          {isFailed && entry.reason && !entry.error && (
            <div className="text-error/80 italic border-l-2 border-error/40 pl-2">{entry.reason}</div>
          )}
          {entry.snapshotContent && (
            <details className="mt-1">
              <summary className="cursor-pointer text-base-content/40 hover:text-base-content/70">
                Failed attempt
              </summary>
              <div className="mt-1 text-base-content/50 whitespace-pre-wrap font-mono leading-relaxed">
                {entry.snapshotContent}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function ReviewPhaseAccordion({ reviewPhases }) {
  const [open, setOpen] = useState(true);

  if (!Array.isArray(reviewPhases) || reviewPhases.length === 0) return null;

  const isAnyStreaming = reviewPhases.some((e) => e.isStreaming);

  const headerIcon = isAnyStreaming ? (
    <Loader2 size={13} className="animate-spin" />
  ) : reviewPhases.some((e) => e.phase === "reviewer_done" && e.passed === false) ? (
    <XCircle size={13} className="text-error" />
  ) : (
    <CheckCircle2 size={13} className="text-success" />
  );

  const headerLabel = isAnyStreaming ? "Reviewing…" : "Review";

  return (
    <div className="mb-2 rounded-lg border border-base-300 bg-base-200/60 text-xs overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2 text-left font-medium text-base-content/70 hover:text-base-content transition-colors duration-150"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="flex items-center">{headerIcon}</span>
        <span className="flex-1">{headerLabel}</span>
        {isAnyStreaming && <span className="loading loading-dots loading-xs opacity-60" />}
        <span
          style={{
            display: "inline-flex",
            transition: "transform 0.3s ease",
            transform: open ? "rotate(-180deg)" : "rotate(0deg)",
          }}
        >
          <ChevronDown className="h-3 w-3" />
        </span>
      </button>

      {open && (
        <div className="border-t border-base-300 px-3 py-2 flex flex-col gap-2">
          {reviewPhases.map((entry, i) => {
            if (entry.phase === "reviewer_start" || entry.phase === "reviewer_done") {
              return <RoundEntry key={i} entry={entry} />;
            }

            if (entry.phase === "main_rerun_start") {
              return (
                <div key={i} className="flex items-center gap-1.5 text-base-content/50 italic px-1">
                  <RotateCcw size={11} />
                  <span>Rerunning (round {entry.round})…</span>
                </div>
              );
            }

            return null;
          })}
        </div>
      )}
    </div>
  );
}

export default ReviewPhaseAccordion;
