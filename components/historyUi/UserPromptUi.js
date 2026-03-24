import { User } from "lucide-react";

export function UserPromptUI({ text, onClick }) {
  const isClickable = typeof onClick === "function";

  return (
    <div
      data-testid="user-prompt-ui"
      className={`space-y-2 bg-base-100 flex flex-col items-center justify-center border-primary ${
        isClickable ? "cursor-pointer" : ""
      }`}
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div
        data-testid="user-prompt-icon"
        className="w-10 h-10 flex items-center justify-center border border-primary bg-base-200 "
      >
        <User size={18} className="text-base-content" />
      </div>
      <div data-testid="user-prompt-label" className="text-xs text-base-content/60 font-semibold">
        USER PROMPT
      </div>
      <div
        data-testid="userprompt-preview"
        className="border border-base-300 hover:border-success p-3 hover:bg-success/10 cursor-pointer transition-all"
      >
        <p data-testid="userprompt-preview-text" className="text-sm text-base-content/80 line-clamp-3">
          {text}
        </p>
      </div>
    </div>
  );
}
