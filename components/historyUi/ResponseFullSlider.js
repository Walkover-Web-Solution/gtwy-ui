import { ArrowLeft } from "lucide-react";

export function ResponseFullSlider({ response, onClose, onBack }) {
  const handleBack = () => {
    onBack?.();
    onClose();
  };

  const content =
    response?.updated_llm_message || response?.llm_message || response?.chatbot_message || response?.user || "";

  return (
    <aside
      id="response-full-slider"
      className={`sidebar-container fixed flex flex-col top-0 right-0 
                  w-full md:w-1/2 lg:w-[50vw] min-w-[600px] h-screen 
                  bg-base-100 transition-all duration-300 z-[999999] border-l border-base-300
                  ${response ? "translate-x-0" : "translate-x-full"}`}
      aria-label="Response Details Slider"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-base-300">
        <button onClick={handleBack} className="flex items-center text-sm text-primary hover:text-primary/80">
          <ArrowLeft size={16} className="mr-1" />
          GO BACK TO FLOW EDITOR
        </button>
        <div className="text-xs text-base-content/60">RESPONSE</div>
      </div>

      {/* Title */}
      <div className="px-6 py-4 border-b border-base-300">
        <h2 className="text-xl font-semibold text-base-content">Final Response</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {content ? (
          <div className="whitespace-pre-wrap text-sm text-base-content">{content}</div>
        ) : (
          <div className="text-sm text-base-content/60">No response available</div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end p-4 border-t border-base-300 bg-base-200">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/80"
        >
          CLOSE
        </button>
      </div>
    </aside>
  );
}
