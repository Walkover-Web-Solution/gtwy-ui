import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CircleDot, Gauge, ListChecks, Pencil, Plus, ToggleRight, Trash2, X } from "lucide-react";
import {
  JEV_EXAMPLE_QUESTIONS,
  createJevItem,
  itemsToQuestions,
  questionsToItems,
  validateJevItems,
} from "@/utils/jevQuestions";
import TypeSafeIcon from "@/icons/TypeSafeIcon";

const TYPES = {
  choice: {
    label: "Choice",
    icon: CircleDot,
    description: "Picks one option from a list",
    placeholder: "Which team should handle this?",
    keyPlaceholder: "department",
  },
  score: {
    label: "Score",
    icon: Gauge,
    description: "Rates it on a scale you define",
    placeholder: "How frustrated does the customer seem?",
    keyPlaceholder: "frustration",
  },
  noul: {
    label: "Yes / No",
    icon: ToggleRight,
    description: "Chance a statement is true",
    placeholder: "The message is urgent",
    keyPlaceholder: "is_urgent",
  },
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
        onChange={(e) => onChange({ instructions: e.target.value })}
      />
    </div>

    {item.type === "choice" && <ChoiceOptions options={item.options} onChange={(options) => onChange({ options })} />}
    {item.type === "score" && <ScoreLevels levels={item.levels} onChange={(levels) => onChange({ levels })} />}

    <div>
      <FieldLabel hint="Name of this answer in the response">Answer key</FieldLabel>
      <input
        data-testid={`jev-question-key-${index}`}
        className="input input-sm input-bordered w-full font-mono text-xs"
        placeholder={`e.g. ${TYPES[item.type].keyPlaceholder}`}
        value={item.id}
        onChange={(e) => onChange({ id: e.target.value.replace(/[^\w-]/g, "_") })}
      />
    </div>

    {error && (
      <p className="flex items-center gap-1.5 text-xs text-error">
        <AlertCircle size={13} /> {error}
      </p>
    )}
  </div>
);

const QuestionChip = ({ id, question }) => {
  const Icon = TYPES[question?.type]?.icon || CircleDot;
  return (
    <span
      title={question?.instructions}
      className="inline-flex max-w-[220px] items-center gap-1 rounded-full border border-base-300 bg-base-100 px-2 py-0.5 text-xs"
    >
      <Icon size={12} className="shrink-0 text-primary" />
      <span className="truncate">{question?.instructions || id}</span>
    </span>
  );
};

// Shown above the playground input for TypeSafe (Jev) agents. The chat message is sent as the
// `state`; the questions are kept in this browser per agent (not saved on the agent) and sent
// with each message as configuration.questions. The editor works on a draft: Save keeps it,
// closing any other way discards it.
// Changing `openRequest` opens the editor (used when a send is blocked).
function JevQuestionsPanel({ savedQuestions, canEdit, onSave, openRequest = 0 }) {
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [showErrors, setShowErrors] = useState(false);
  const dialogRef = useRef(null);

  const savedEntries = Object.entries(savedQuestions || {});
  const isOpen = draft !== null;

  const openEditor = () => {
    if (!canEdit) return;
    setDraft(questionsToItems(savedQuestions));
    setSaveError(null);
    setShowErrors(false);
  };
  const closeEditor = () => {
    if (!saving) setDraft(null);
  };

  useEffect(() => {
    if (openRequest) openEditor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openRequest]);

  // Native <dialog> renders in the top layer, so it is not clipped by the playground layout.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  const { errors, error } = useMemo(() => {
    // An empty list is a valid save: it clears the questions.
    if (!draft || draft.length === 0) return { errors: {}, error: null };
    return validateJevItems(draft);
  }, [draft]);

  const updateItem = (uid, patch) => setDraft((prev) => prev.map((i) => (i.uid === uid ? { ...i, ...patch } : i)));
  const addQuestion = () => setDraft((prev) => [...prev, createJevItem("choice")]);

  const handleSave = async () => {
    if (error) {
      setShowErrors(true);
      return;
    }
    setSaving(true);
    setSaveError(null);
    const result = await onSave(itemsToQuestions(draft));
    setSaving(false);
    if (result?.success === false) {
      setSaveError(result.error || "Could not save the questions. Please try again.");
      return;
    }
    setDraft(null);
  };

  const footerMessage = saveError
    ? saveError
    : showErrors && error
      ? error
      : `${draft?.length || 0} question${draft?.length === 1 ? "" : "s"}`;

  return (
    <div data-testid="jev-questions-panel" className="w-full">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-base-300 bg-base-200/40 px-3 py-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-base-content/80">
          <TypeSafeIcon width={16} height={16} />
          Jev will answer
        </span>
        {savedEntries.length === 0 ? (
          <span className="text-xs text-base-content/60">no questions yet</span>
        ) : (
          savedEntries.slice(0, 3).map(([id, question]) => <QuestionChip key={id} id={id} question={question} />)
        )}
        {savedEntries.length > 3 && (
          <span className="text-xs text-base-content/60">+{savedEntries.length - 3} more</span>
        )}
        {canEdit && (
          <button
            type="button"
            data-testid="jev-questions-toggle"
            className="btn btn-xs btn-primary btn-outline ml-auto gap-1"
            onClick={openEditor}
          >
            {savedEntries.length === 0 ? <Plus size={12} /> : <Pencil size={12} />}
            {savedEntries.length === 0 ? "Add questions" : "Edit questions"}
          </button>
        )}
      </div>

      <dialog
        ref={dialogRef}
        className="modal"
        data-testid="jev-questions-modal"
        onCancel={(e) => {
          // Esc: discard the draft (or keep the dialog open while a save is running).
          e.preventDefault();
          closeEditor();
        }}
      >
        {isOpen && (
          <div className="modal-box flex max-h-[85vh] w-11/12 max-w-2xl flex-col p-0">
            <div className="flex items-start gap-3 border-b border-base-300 px-5 py-4">
              <span className="shrink-0">
                <TypeSafeIcon width={36} height={36} />
              </span>
              <div className="flex-1">
                <h3 className="text-base font-semibold">Questions for Jev</h3>
                <p className="mt-0.5 text-xs text-base-content/60">
                  Jev reads the message you send in the chat and answers every question below, with a confidence for
                  each. To fill in a value, write <code>{"{{name}}"}</code> in any text and set <code>name</code> in the
                  Variables panel. Questions are kept in this browser and sent with each message.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close without saving"
                className="btn btn-ghost btn-sm btn-square"
                onClick={closeEditor}
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-1 flex-col gap-3 overflow-y-auto bg-base-200/40 px-5 py-4">
              {draft.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-base-300 bg-base-100 py-10 text-center">
                  <ListChecks size={24} className="text-base-content/40" />
                  <p className="text-sm font-medium">No questions yet</p>
                  <p className="max-w-xs text-xs text-base-content/60">
                    Add a question, or start from an example that routes a support message.
                  </p>
                  <div className="mt-1 flex gap-2">
                    <button
                      type="button"
                      data-testid="jev-add-first-question"
                      className="btn btn-sm btn-primary gap-1"
                      onClick={addQuestion}
                    >
                      <Plus size={14} /> Add question
                    </button>
                    <button
                      type="button"
                      data-testid="jev-questions-reset"
                      className="btn btn-sm btn-ghost"
                      onClick={() => setDraft(questionsToItems(JEV_EXAMPLE_QUESTIONS))}
                    >
                      Use example
                    </button>
                  </div>
                </div>
              ) : (
                draft.map((item, index) => (
                  <QuestionCard
                    key={item.uid}
                    item={item}
                    index={index}
                    error={showErrors ? errors[item.uid] : null}
                    onChange={(patch) => updateItem(item.uid, patch)}
                    onRemove={() => setDraft((prev) => prev.filter((i) => i.uid !== item.uid))}
                  />
                ))
              )}
              {draft.length > 0 && (
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

            <div className="flex items-center gap-2 border-t border-base-300 px-5 py-3">
              <span
                data-testid="jev-questions-status"
                className={`text-xs ${saveError || (showErrors && error) ? "text-error" : "text-base-content/60"}`}
              >
                {footerMessage}
              </span>
              <button
                type="button"
                data-testid="jev-questions-cancel"
                className="btn btn-sm btn-ghost ml-auto"
                onClick={closeEditor}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="jev-questions-done"
                className="btn btn-sm btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving && <span className="loading loading-spinner loading-xs" />}
                Save
              </button>
            </div>
          </div>
        )}
        <form
          method="dialog"
          className="modal-backdrop"
          onSubmit={(e) => {
            e.preventDefault();
            closeEditor();
          }}
        >
          <button type="submit">close</button>
        </form>
      </dialog>
    </div>
  );
}

export default JevQuestionsPanel;
