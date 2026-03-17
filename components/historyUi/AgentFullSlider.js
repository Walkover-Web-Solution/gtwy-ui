import { useState } from "react";
import { ChevronDown, ChevronRight, ArrowLeft } from "lucide-react";

const CollapsibleSection = ({ title, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const sectionSlug = title.toLowerCase().replace(/\s+/g, "-");

  return (
    <div data-testid={`collapsible-section-wrapper-${sectionSlug}`} className="border-b border-base-300">
      <button
        data-testid={`collapsible-section-${sectionSlug}`}
        className="w-full flex items-center justify-between p-4 text-left font-medium text-base-content hover:bg-base-200"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{title}</span>
        {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
      </button>
      {isOpen && (
        <div data-testid={`collapsible-section-content-${sectionSlug}`} className="p-4 bg-base-100">
          {children}
        </div>
      )}
    </div>
  );
};

const JsonViewer = ({ data, testId }) => {
  if (!data) return null;

  return (
    <pre data-testid={testId} className="bg-base-200 text-base-content p-4 rounded text-sm overflow-auto max-h-64">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
};

export function AgentFullSlider({ agent, onClose }) {
  const handleBack = () => {
    onClose();
  };

  const agentData = agent || {};
  const functionData = agentData.functionData || {};
  const agentName = agentData.name || "Unknown Agent";
  const tools = Array.isArray(agentData.tools) ? agentData.tools : [];

  return (
    <aside
      id="agent-full-slider"
      data-testid="agent-full-slider"
      className={`sidebar-container fixed flex flex-col top-0 right-0 
                  w-full md:w-1/2 lg:w-[50vw] min-w-[600px] h-screen 
                  bg-base-100 transition-all duration-300 z-[999999] border-l border-base-300
                  ${agent ? "translate-x-0" : "translate-x-full"}`}
      aria-label="Agent Details Slider"
    >
      {/* Header */}
      <div
        data-testid="agent-full-slider-header"
        className="flex items-center justify-between p-4 border-b border-base-300"
      >
        <button
          data-testid="agent-full-slider-back"
          onClick={handleBack}
          className="flex items-center text-sm text-primary hover:text-primary/80"
        >
          <ArrowLeft size={16} className="mr-1" />
          GO BACK TO FLOW EDITOR
        </button>
        <div data-testid="agent-full-slider-branding" className="text-xs text-base-content/60">
          SECURED BY VIASOCKET
        </div>
      </div>

      {/* Title */}
      <div
        data-testid="agent-full-slider-title-section"
        className="px-6 py-4 border-b border-base-300 flex flex-row gap-2 items-center"
      >
        <h2 data-testid="agent-full-slider-title" className="text-md font-semibold text-base-content">
          Agent Details
        </h2>
        <p data-testid="agent-full-slider-name" className="text-md text-base-content/60">
          {agentName}
        </p>
      </div>

      {/* Content */}
      <div data-testid="agent-full-slider-content" className="flex-1 overflow-y-auto">
        <CollapsibleSection title="Function Data">
          {functionData.id || functionData.args || functionData.data ? (
            <div className="space-y-3">
              <div>
                <div className="text-xs text-base-content/60 mb-1">Id</div>
                <div className="bg-base-200 px-2 py-1 text-base-content text-sm rounded">
                  {functionData.id || "null"}
                </div>
              </div>

              {functionData.args && (
                <div>
                  <div className="text-xs text-base-content/60 mb-1">Args</div>
                  <JsonViewer data={functionData.args} testId="agent-full-slider-args-json" />
                </div>
              )}

              {functionData.data && (
                <div>
                  <div className="text-xs text-base-content/60 mb-1">Data</div>
                  <JsonViewer data={functionData.data} testId="agent-full-slider-data-json" />
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-base-content/60">No function data</div>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Tools">
          {tools.length > 0 ? (
            <>
              <div className="text-xs text-base-content/60 mb-2">
                {tools.length} tool{tools.length === 1 ? "" : "s"}
              </div>
              <JsonViewer data={tools} testId="agent-full-slider-tools-json" />
            </>
          ) : (
            <div className="text-xs text-base-content/60">No tools found</div>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Metadata">
          <JsonViewer
            data={{
              agent_name: agentName,
              error: agentData.error ?? false,
            }}
            testId="agent-full-slider-metadata-json"
          />
        </CollapsibleSection>
      </div>

      {/* Footer */}
      <div data-testid="agent-full-slider-footer" className="flex justify-end p-4 border-t border-base-300 bg-base-200">
        <button
          data-testid="agent-full-slider-close"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/80"
        >
          CLOSE
        </button>
      </div>
    </aside>
  );
}
