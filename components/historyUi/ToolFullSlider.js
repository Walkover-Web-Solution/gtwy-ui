import { useState } from "react";
import { ChevronDown, ChevronRight, ArrowLeft } from "lucide-react";

const CollapsibleSection = ({ title, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-base-300">
      <button
        className="w-full flex items-center justify-between p-4 text-left font-medium text-base-content hover:bg-base-200"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{title}</span>
        {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
      </button>
      {isOpen && <div className="p-4 bg-base-100">{children}</div>}
    </div>
  );
};

const JsonViewer = ({ data }) => {
  if (!data) return null;

  return (
    <pre className="bg-base-200 text-base-content p-4 rounded text-sm overflow-auto max-h-64">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
};

const getKeyCount = (data) => {
  if (!data || typeof data !== "object") return 0;
  return Object.keys(data).length;
};

const formatTimestamp = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
};

export function ToolFullSlider({ tool, onClose, onBack }) {
  const handleBack = () => {
    onBack?.();
    onClose();
  };

  const toolData = tool || {};
  const payload = toolData.payload || toolData.args || null;
  const responseData = toolData.response || toolData.data?.response || null;
  const responseTimestamp = toolData.data?.response?.timestamp || toolData.data?.timestamp || null;
  const responseOutput = responseData?.output || responseData || null;
  const metadata = {
    tool_id: toolData.id ?? toolData.metadata?.tool_id ?? null,
    tool_name: toolData.name ?? toolData.metadata?.tool_name ?? null,
    status: toolData.data?.status ?? toolData.metadata?.status ?? null,
    execution_time: toolData.data?.execution_time ?? toolData.metadata?.execution_time ?? null,
    error: toolData.error ?? toolData.data?.error ?? toolData.metadata?.error ?? false,
  };

  return (
    <aside
      id="tool-full-slider"
      className={`sidebar-container fixed flex flex-col top-0 right-0 
                  w-full md:w-1/2 lg:w-[50vw] min-w-[600px] h-screen 
                  bg-base-100 transition-all duration-300 z-[999999] border-l border-base-300
                  ${tool ? "translate-x-0" : "translate-x-full"}`}
      aria-label="Tool Details Slider"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-base-300">
        <button onClick={handleBack} className="flex items-center text-sm text-primary hover:text-primary/80">
          <ArrowLeft size={16} className="mr-1" />
          GO BACK TO FLOW EDITOR
        </button>
        <div className="text-xs text-base-content/60">SECURED BY VIASOCKET</div>
      </div>

      {/* Title */}
      <div className="px-6 py-4 border-b border-base-300">
        <h2 className="text-xl font-semibold text-base-content">Run History</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <CollapsibleSection title="Payload">
          {payload ? (
            <>
              <div className="text-xs text-base-content/60 mb-2">payload ({getKeyCount(payload)})</div>
              <JsonViewer data={payload} />
            </>
          ) : (
            <div className="text-xs text-base-content/60">No payload</div>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Response">
          {responseOutput ? (
            <>
              {formatTimestamp(responseTimestamp) && (
                <div className="text-xs text-base-content/60 mb-2">{formatTimestamp(responseTimestamp)}</div>
              )}
              <div className="text-xs text-base-content/60 mb-2">output ({getKeyCount(responseOutput)})</div>
              <JsonViewer data={responseOutput} />
            </>
          ) : (
            <div className="text-xs text-base-content/60">No response</div>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Metadata">
          <JsonViewer data={metadata} />
        </CollapsibleSection>
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
