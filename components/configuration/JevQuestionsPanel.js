import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CircleDot, Gauge, ListChecks, Pencil, Plus, ToggleRight, Trash2, X } from "lucide-react";
import {
  JEV_EXAMPLE_QUESTIONS,
  createJevItem,
  itemsToQuestions,
  questionsToItems,
  toAnswerKey,
  validateJevItems,
} from "@/utils/jevQuestions";
import TypeSafeIcon from "@/icons/TypeSafeIcon";

const storageKey = (agentId) => `jevQuestions:${agentId}`;

const TYPES = {
  choice: {
    label: "Choice",
    icon: CircleDot,
    description: "Picks one option from a list",
    placeholder: "Which team should handle this?",
  },
  score: {
    label: "Score",
    icon: Gauge,
    description: "Rates it on a scale you define",
    placeholder: "How frustrated does the customer seem?",
  },
  noul: {
    label: "Yes / No",
    icon: ToggleRight,
    description: "Chance a statement is true",
    placeholder: "The message is urgent",
  },
};

const loadItems = (agentId) => {
  try {
    const stored = localStorage.getItem(storageKey(agentId));
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
      // Earlier builds stored the raw questions map.
      if (parsed && typeof parsed === "object") return questionsToItems(parsed);
    }
  } catch {
    // Unreadable or unavailable storage starts empty.
  }
  return [];
};

const FieldLabel = ({ children, hint }) => (
  <div className="flex items-baseline justify-between gap-2 mb-1">
    <span className="text-xs font-medium text-base-content/80">{children}</span>
    {hint && <span className="text-[11px] text-base-content/50">{hint}</span>}
  </div>
);

const RemoveButton = ({ onClick, disabled, label }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    disabled={disabled}
    onClick={onClick}
    className="btn btn-ghost btn-xs btn-square text-base-content/50 hover:text-error disabled:bg-transparent"
  >
    <X size={14} />
  </button>
);

const OPTION_PLACEHOLDERS = [
  ["billing", "Payment or subscription issues"],
  ["technical", "Bugs or integration problems"],
  ["sales", "Pricing or account questions"],
];

const ChoiceOptions = ({ options, onChange }) => {
  const update = (index, patch) => onChange(options.map((o, i) => (i === index ? { ...o, ...patch } : o)));
  return (
    <div>
      <FieldLabel hint="Jev answers with one of these">Options</FieldLabel>
      <div className="rounded-lg border border-base-300 bg-base-100">
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_28px] gap-2 rounded-t-lg border-b border-base-300 bg-base-200/60 px-2 py-1.5 text-[11px] uppercase tracking-wide text-base-content/50">
          <span>Option</span>
          <span>When to pick it</span>
          <span />
        </div>
        {options.map((option, index) => (
          <div
            key={index}
            className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_28px] items-center gap-2 border-b border-base-300 px-2 py-1.5 last:border-b-0"
          >
            <input
              data-testid={`jev-choice-key-${index}`}
              className="input input-sm input-bordered w-full"
              placeholder={OPTION_PLACEHOLDERS[index]?.[0] || "option"}
              value={option.key}
              onChange={(e) => update(index, { key: e.target.value })}
            />
            <input
              data-testid={`jev-choice-description-${index}`}
              className="input input-sm input-bordered w-full"
              placeholder={OPTION_PLACEHOLDERS[index]?.[1] || "Describe this option"}
              value={option.description}
              onChange={(e) => update(index, { description: e.target.value })}
            />
            <RemoveButton
              label="Remove option"
              disabled={options.length <= 2}
              onClick={() => onChange(options.filter((_, i) => i !== index))}
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        data-testid="jev-add-choice-option"
        className="btn btn-ghost btn-xs mt-1 gap-1 text-primary"
        onClick={() => onChange([...options, { key: "", description: "" }])}
      >
        <Plus size={12} /> Add option
      </button>
    </div>
  );
};

const LEVEL_PLACEHOLDERS = ["Calm, just stating facts", "Frustrated but civil", "Very angry, strong language"];

const ScoreLevels = ({ levels, onChange }) => (
  <div>
    <FieldLabel hint="Lowest first">Scale</FieldLabel>
    <div className="flex flex-col gap-1.5">
      {levels.map((level, index) => (
        <div key={index} className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-base-200 text-xs font-semibold tabular-nums">
            {index}
          </span>
          <input
            data-testid={`jev-score-level-${index}`}
            className="input input-sm input-bordered min-w-0 flex-1"
            placeholder={LEVEL_PLACEHOLDERS[index] || "Describe this level"}
            value={level}
            onChange={(e) => onChange(levels.map((l, i) => (i === index ? e.target.value : l)))}
          />
          <RemoveButton
            label="Remove level"
            disabled={levels.length <= 2}
            onClick={() => onChange(levels.filter((_, i) => i !== index))}
          />
        </div>
      ))}
    </div>
    <button
      type="button"
      data-testid="jev-add-score-level"
      className="btn btn-ghost btn-xs mt-1 gap-1 text-primary"
      onClick={() => onChange([...levels, ""])}
    >
      <Plus size={12} /> Add level
    </button>
  </div>
);

const TypePicker = ({ value, onChange, index }) => (
  <div className="grid grid-cols-3 gap-2">
    {Object.entries(TYPES).map(([type, meta]) => {
      const Icon = meta.icon;
      const active = value === type;
      return (
        <button
          key={type}
          type="button"
          data-testid={`jev-question-type-${type}-${index}`}
          aria-pressed={active}
          onClick={() => onChange(type)}
          className={`flex flex-col items-start gap-0.5 rounded-lg border p-2 text-left transition-colors ${
            active
              ? "border-primary bg-primary/5 ring-1 ring-primary"
              : "border-base-300 bg-base-100 hover:border-base-content/30"
          }`}
        >
          <span className={`flex items-center gap-1.5 text-sm font-medium ${active ? "text-primary" : ""}`}>
            <Icon size={14} /> {meta.label}
          </span>
          <span className="text-[11px] leading-tight text-base-content/60">{meta.description}</span>
        </button>
      );
    })}
  </div>
);

const QuestionCard = ({ item, index, error, onChange, onRemove }) => (
  <div
    data-testid={`jev-question-${index}`}
    className={`flex flex-col gap-3 rounded-xl border bg-base-100 p-4 ${error ? "border-error/60" : "border-base-300"}`}
  >
    <div className="flex items-center gap-2">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
        {index + 1}
      </span>
      <span className="text-sm font-semibold">Question {index + 1}</span>
      <button
        type="button"
        data-testid={`jev-remove-question-${index}`}
        className="btn btn-ghost btn-xs ml-auto gap-1 text-base-content/60 hover:text-error"
        onClick={onRemove}
      >
        <Trash2 size={13} /> Remove
      </button>
    </div>

    <TypePicker index={index} value={item.type} onChange={(type) => onChange({ type })} />

    <div>
      <FieldLabel>{item.type === "noul" ? "Statement to check" : "Question"}</FieldLabel>
      <input
        data-testid={`jev-question-instructions-${index}`}
        className="input input-sm input-bordered w-full"
        placeholder={`e.g. ${TYPES[item.type].placeholder}`}
        value={item.instructions}
        onChange={(e) =>
          onChange({
            instructions: e.target.value,
            ...(item.keyEdited ? {} : { id: toAnswerKey(e.target.value) }),
          })
        }
      />
    </div>

    {item.type === "choice" && <ChoiceOptions options={item.options} onChange={(options) => onChange({ options })} />}
    {item.type === "score" && <ScoreLevels levels={item.levels} onChange={(levels) => onChange({ levels })} />}

    <div>
      <FieldLabel hint="Name of this answer in the response">Answer key</FieldLabel>
      <input
        data-testid={`jev-question-key-${index}`}
        className="input input-sm input-bordered w-full font-mono text-xs"
        placeholder="Filled in from the question"
        value={item.id}
        onChange={(e) => onChange({ id: e.target.value.replace(/[^\w-]/g, "_"), keyEdited: true })}
      />
    </div>

    {error && (
      <p className="flex items-center gap-1.5 text-xs text-error">
        <AlertCircle size={13} /> {error}
      </p>
    )}
  </div>
);

const QuestionChip = ({ item }) => {
  const Icon = TYPES[item.type]?.icon || CircleDot;
  return (
    <span
      title={item.instructions}
      className="inline-flex max-w-[220px] items-center gap-1 rounded-full border border-base-300 bg-base-100 px-2 py-0.5 text-xs"
    >
      <Icon size={12} className="shrink-0 text-primary" />
      <span className="truncate">{item.instructions || item.id || "Untitled question"}</span>
    </span>
  );
};

// Shown above the playground input for TypeSafe (Jev) agents. The chat message is sent as
// the `state`; these questions go in configuration.questions. Changing `openRequest` opens the editor.
function JevQuestionsPanel({ agentId, onChange, openRequest = 0 }) {
  const [items, setItems] = useState(null);
  const [open, setOpen] = useState(false);
  const dialogRef = useRef(null);

  // Loaded after mount: localStorage is not available during SSR.
  useEffect(() => {
    setItems(loadItems(agentId));
  }, [agentId]);

  useEffect(() => {
    if (openRequest) setOpen(true);
  }, [openRequest]);

  // Native <dialog> renders in the top layer, so it is not clipped by the playground layout.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open, items]);

  const { errors, error } = useMemo(() => (items ? validateJevItems(items) : { errors: {}, error: null }), [items]);

  useEffect(() => {
    if (!items) return;
    try {
      localStorage.setItem(storageKey(agentId), JSON.stringify(items));
    } catch {
      // Storage can be unavailable (private mode); the builder still works for this session.
    }
    onChange({ questions: error ? null : itemsToQuestions(items), error });
  }, [agentId, items, error, onChange]);

  if (!items) return null;

  const updateItem = (uid, patch) => setItems((prev) => prev.map((i) => (i.uid === uid ? { ...i, ...patch } : i)));
  const addQuestion = () => setItems((prev) => [...prev, createJevItem("choice")]);

  return (
    <div data-testid="jev-questions-panel" className="w-full">
      <div
        className={`flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 ${
          error ? "border-error/40 bg-error/5" : "border-base-300 bg-base-200/40"
        }`}
      >
        <span className="flex items-center gap-1.5 text-xs font-semibold text-base-content/80">
          <TypeSafeIcon width={16} height={16} />
          Jev will answer
        </span>
        {items.length === 0 ? (
          <span className="text-xs text-base-content/60">no questions yet</span>
        ) : (
          items.slice(0, 3).map((item) => <QuestionChip key={item.uid} item={item} />)
        )}
        {items.length > 3 && <span className="text-xs text-base-content/60">+{items.length - 3} more</span>}
        {error && items.length > 0 && <span className="text-xs text-error">· {error}</span>}
        <button
          type="button"
          data-testid="jev-questions-toggle"
          className="btn btn-xs btn-primary btn-outline ml-auto gap-1"
          onClick={() => setOpen(true)}
        >
          {items.length === 0 ? <Plus size={12} /> : <Pencil size={12} />}
          {items.length === 0 ? "Add questions" : "Edit questions"}
        </button>
      </div>

      <dialog ref={dialogRef} className="modal" onClose={() => setOpen(false)} data-testid="jev-questions-modal">
        <div className="modal-box flex max-h-[85vh] w-11/12 max-w-2xl flex-col p-0">
          <div className="flex items-start gap-3 border-b border-base-300 px-5 py-4">
            <span className="shrink-0">
              <TypeSafeIcon width={36} height={36} />
            </span>
            <div className="flex-1">
              <h3 className="text-base font-semibold">Questions for Jev</h3>
              <p className="mt-0.5 text-xs text-base-content/60">
                Jev reads the message you send in the chat and answers every question below, with a confidence for each.
                You can use <code>{"{{variables}}"}</code> in any text.
              </p>
            </div>
            <button
              type="button"
              aria-label="Close"
              className="btn btn-ghost btn-sm btn-square"
              onClick={() => setOpen(false)}
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex flex-1 flex-col gap-3 overflow-y-auto bg-base-200/40 px-5 py-4">
            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-base-300 bg-base-100 py-10 text-center">
                <ListChecks size={24} className="text-base-content/40" />
                <p className="text-sm font-medium">No questions yet</p>
                <p className="max-w-xs text-xs text-base-content/60">
                  Add a question, or start from an example that routes a support message.
                </p>
                <div className="mt-1 flex gap-2">
                  <button type="button" className="btn btn-sm btn-primary gap-1" onClick={addQuestion}>
                    <Plus size={14} /> Add question
                  </button>
                  <button
                    type="button"
                    data-testid="jev-questions-reset"
                    className="btn btn-sm btn-ghost"
                    onClick={() => setItems(questionsToItems(JEV_EXAMPLE_QUESTIONS))}
                  >
                    Use example
                  </button>
                </div>
              </div>
            ) : (
              items.map((item, index) => (
                <QuestionCard
                  key={item.uid}
                  item={item}
                  index={index}
                  error={errors[item.uid]}
                  onChange={(patch) => updateItem(item.uid, patch)}
                  onRemove={() => setItems((prev) => prev.filter((i) => i.uid !== item.uid))}
                />
              ))
            )}
            {items.length > 0 && (
              <button
                type="button"
                data-testid="jev-add-question"
                className="btn btn-sm btn-ghost gap-1 border border-dashed border-base-300 bg-base-100"
                onClick={addQuestion}
              >
                <Plus size={14} /> Add another question
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 border-t border-base-300 px-5 py-3">
            <span className={`text-xs ${error ? "text-error" : "text-base-content/60"}`}>
              {error || `${items.length} question${items.length === 1 ? "" : "s"} ready`}
            </span>
            <button
              type="button"
              data-testid="jev-questions-done"
              className="btn btn-sm btn-primary ml-auto"
              onClick={() => setOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button type="submit">close</button>
        </form>
      </dialog>
    </div>
  );
}

export default JevQuestionsPanel;
