import { ArrowLeft } from "lucide-react";

export function ResponseFullSlider({ response, onClose }) {
  const handleBack = () => {
    onClose();
  };

  const hasFinalResponse = Boolean(response?.updated_llm_message || response?.llm_message || response?.chatbot_message);
  const viewType = response?.viewType || (hasFinalResponse ? "response" : "user_prompt");

  const defaultConfig =
    viewType === "user_prompt"
      ? {
          sectionLabel: "USER PROMPT",
          title: "User Prompt",
          emptyText: "No prompt available",
        }
      : {
          sectionLabel: "RESPONSE",
          title: "Final Response",
          emptyText: "No response available",
        };

  const sectionLabel = response?.meta?.sectionLabel || defaultConfig.sectionLabel;
  const title = response?.meta?.title || defaultConfig.title;
  const emptyText = response?.meta?.emptyText || defaultConfig.emptyText;

  const content =
    response?.meta?.content ??
    (viewType === "user_prompt"
      ? response?.user || ""
      : response?.updated_llm_message || response?.llm_message || response?.chatbot_message || "");

  return (
    <aside
      id="response-full-slider"
      data-testid="response-full-slider"
      className={`sidebar-container fixed flex flex-col top-0 right-0 
                  w-full md:w-1/2 lg:w-[50vw] min-w-[600px] h-screen 
                  bg-base-100 transition-all duration-300 z-[999999] border-l border-base-300
                  ${response ? "translate-x-0" : "translate-x-full"}`}
      aria-label="Response Details Slider"
    >
      {/* Header */}
      <div
        data-testid="response-full-slider-header"
        className="flex items-center justify-between p-4 border-b border-base-300"
      >
        <button
          data-testid="response-full-slider-back"
          onClick={handleBack}
          className="flex items-center text-sm text-primary hover:text-primary/80"
        >
          <ArrowLeft size={16} className="mr-1" />
          GO BACK TO FLOW EDITOR
        </button>
        <div data-testid="response-full-slider-section-label" className="text-xs text-base-content/60">
          {sectionLabel}
        </div>
      </div>

      {/* Title */}
      <div data-testid="response-full-slider-title-section" className="px-6 py-4 border-b border-base-300">
        <h2 data-testid="response-full-slider-title" className="text-xl font-semibold text-base-content">
          {title}
        </h2>
      </div>

      {/* Content */}
      <div data-testid="response-full-slider-content" className="flex-1 overflow-y-auto p-6">
        {content ? (
          <div
            data-testid="response-full-slider-content-text"
            className="whitespace-pre-wrap text-sm text-base-content"
          >
            {content}
          </div>
        ) : (
          <div data-testid="response-full-slider-content-empty" className="text-sm text-base-content/60">
            {emptyText}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        data-testid="response-full-slider-footer"
        className="flex justify-end p-4 border-t border-base-300 bg-base-200"
      >
        <button
          data-testid="response-full-slider-close"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/80"
        >
          CLOSE
        </button>
      </div>
    </aside>
  );
}
