import React from "react";

const percent = (value) => `${Math.round((Number(value) || 0) * 100)}%`;

const ProbabilityBars = ({ probabilities, legend, highlight }) => {
  const entries = Object.entries(probabilities || {}).sort(([, a], [, b]) => (Number(b) || 0) - (Number(a) || 0));
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-col gap-1 mt-2">
      {entries.map(([key, value]) => {
        const label = legend?.[key] ? `${key} · ${legend[key]}` : key;
        const isTop = String(key) === String(highlight);
        return (
          <div key={key} className="flex items-center gap-2 text-xs">
            <span className={`w-40 truncate ${isTop ? "font-medium" : "text-base-content/70"}`} title={label}>
              {label}
            </span>
            <div className="flex-1 h-1.5 rounded-full bg-base-300 overflow-hidden">
              <div
                className={`h-full rounded-full ${isTop ? "bg-primary" : "bg-base-content/30"}`}
                style={{ width: percent(value) }}
              />
            </div>
            <span className="w-10 text-right tabular-nums text-base-content/70">{percent(value)}</span>
          </div>
        );
      })}
    </div>
  );
};

const AnswerValue = ({ answer }) => {
  if (answer.type === "choice") return <span className="font-semibold">{String(answer.choice)}</span>;
  if (answer.type === "score") {
    const label = answer.legend?.[String(Math.round(Number(answer.score)))];
    return (
      <span className="font-semibold">
        {answer.score}
        {label ? <span className="font-normal text-base-content/70"> · {label}</span> : null}
      </span>
    );
  }
  return <span className="font-semibold">{percent(answer.noul)} true</span>;
};

// Renders the answers map returned by TypeSafe (Jev) for choice / score / noul questions.
function JevAnswers({ answers }) {
  return (
    <div data-testid="jev-answers" className="flex flex-col gap-2 w-full not-prose">
      {Object.entries(answers).map(([id, answer]) => (
        <div key={id} className="rounded-lg border border-base-300 bg-base-100 p-3">
          <div className="flex flex-wrap items-baseline gap-2">
            <code className="text-xs">{id}</code>
            <span className="badge badge-ghost badge-xs">{answer.type}</span>
            <span className="text-sm ml-auto">
              <AnswerValue answer={answer} />
            </span>
          </div>
          {answer.confidence !== undefined && (
            <p className="text-xs text-base-content/60 mt-1">Confidence {percent(answer.confidence)}</p>
          )}
          {answer.type !== "noul" && (
            <ProbabilityBars
              probabilities={answer.probabilities}
              legend={answer.legend}
              highlight={answer.type === "choice" ? answer.choice : Math.round(Number(answer.score))}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default JevAnswers;
