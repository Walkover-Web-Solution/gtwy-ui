import React, { useState } from "react";
import { Check, ChevronDownIcon } from "lucide-react";

const MatchingTypeDropdown = ({
  matchingType,
  customPrompt,
  customPromptSaved,
  onMatchingTypeChange,
  onCustomPromptChange,
  onCustomPromptSave,
  onCustomPromptClear,
  conversation = [],
  label = "Matching",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localCustomPrompt, setLocalCustomPrompt] = useState(customPrompt);

  const handleMatchingTypeClick = (type) => {
    onMatchingTypeChange(type);
  };

  const handleSavePrompt = () => {
    onCustomPromptSave(localCustomPrompt);
    setIsOpen(false);
  };

  const handleClearPrompt = () => {
    setLocalCustomPrompt("");
    onCustomPromptClear();
  };

  const canSave = localCustomPrompt !== customPromptSaved;

  return (
    <div className="relative">
      <button
        data-testid="matching-type-dropdown-btn"
        onClick={() => setIsOpen((o) => !o)}
        className="flex items-center gap-2 px-2 py-1.5 bg-transparent border border-base-content/20 rounded-lg text-xs font-semibold text-base-content/70 cursor-pointer hover:bg-base-200 transition-colors"
      >
        {label}:
        <span className="text-primary font-bold">
          {matchingType}
          {matchingType === "AI" && customPromptSaved ? " (custom)" : ""}
        </span>
        <ChevronDownIcon
          size={14}
          className={`text-base-content/50 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[90]"
            data-testid="matching-type-dropdown-backdrop"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-[calc(100%+8px)] left-0 z-[100] w-[300px] bg-base-100 border border-base-300 rounded-2xl shadow-lg p-2">
            <div className="text-[11px] font-bold tracking-[0.05em] text-base-content/50 px-2.5 pt-1.5 pb-2.5 uppercase border-b border-base-200 mb-1.5">
              Matching Type
            </div>

            {[
              { id: "AI", label: "AI", description: "LLM judges how well the response matches." },
              { id: "Exact", label: "Exact", description: "Strict character-by-character match." },
              { id: "Cosine", label: "Cosine", description: "Semantic similarity via embeddings (0–1)." },
            ].map((opt) => {
              const isActive = matchingType === opt.id;
              return (
                <button
                  key={opt.id}
                  data-testid={`matching-type-option-${opt.id}`}
                  onClick={() => !opt.disabled && handleMatchingTypeClick(opt.id)}
                  disabled={isActive}
                  className={`w-full flex items-start gap-2.5 px-2.5 py-2.5 rounded-[10px] text-left mb-0.5 transition-colors ${
                    isActive ? "bg-primary/10 cursor-pointer" : "bg-transparent hover:bg-base-200 cursor-pointer"
                  }`}
                >
                  <span
                    className={`inline-flex items-center justify-center w-[18px] h-[18px] rounded-md flex-shrink-0 mt-px ${
                      isActive ? "bg-primary border-0" : "bg-base-200 border-[1.5px] border-base-300"
                    }`}
                  >
                    {isActive && <Check size={11} strokeWidth={3.5} className="text-primary-content" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-[13.5px] ${
                        isActive ? "font-bold text-primary" : "font-medium text-base-content/70"
                      }`}
                    >
                      {opt.label}
                    </div>
                    <div className="text-[11.5px] text-base-content/55 mt-0.5 leading-snug">{opt.description}</div>
                  </div>
                </button>
              );
            })}

            {/* Conversation History placeholder */}
            {conversation && conversation.length > 0 && <div className="border-t border-base-200 mt-1.5 pt-2.5 px-1" />}

            {/* Custom prompt — only shown when AI is selected */}
            {matchingType === "AI" && (
              <div className="border-t border-base-200 mt-1.5 pt-2.5 px-1">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-base-content/70 tracking-wide">
                    How AI should work
                    <span className="text-[11px] font-normal text-base-content/50">(optional)</span>
                    {customPromptSaved && (
                      <button
                        data-testid="matching-type-clear-prompt-btn"
                        onClick={handleClearPrompt}
                        className="px-2.5 py-1 rounded-md border border-base-300 bg-base-100 text-[11px] font-semibold text-base-content/60 cursor-pointer hover:bg-base-200 transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
                <textarea
                  data-testid="matching-type-custom-prompt-input"
                  value={localCustomPrompt}
                  onChange={(e) => setLocalCustomPrompt(e.target.value)}
                  placeholder="e.g. Score the response 0-100 based on accuracy, tone, and conciseness. Return only the score."
                  rows={4}
                  className="w-full resize-y px-3 py-2.5 text-[13px] leading-relaxed rounded-[10px] border border-base-300 bg-base-200 text-base-content outline-none box-border font-[inherit] focus:border-primary focus:bg-base-100 transition-colors"
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    data-testid="matching-type-save-prompt-btn"
                    onClick={handleSavePrompt}
                    disabled={!canSave}
                    className={`px-3.5 py-[7px] rounded-[9px] border-0 text-[13px] font-bold transition-colors ${
                      canSave
                        ? "bg-primary text-primary-content cursor-pointer hover:bg-primary/90"
                        : "bg-base-300 text-base-content/50 cursor-not-allowed"
                    }`}
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default MatchingTypeDropdown;
