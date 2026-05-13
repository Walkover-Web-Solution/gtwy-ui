import { Bot } from "lucide-react";
import { FileClockIcon } from "@/components/Icons";

export function MainAgentUI({
  name,
  onToolClick,
  onToolSliderClick,
  onResponseClick,
  responsePreview,
  tools = [],
  agentCount = 0,
  toolCount = 0,
}) {
  const handleToolClick = (tool) => {
    if (!onToolClick) return;
    onToolClick(tool?.functionData ?? tool);
  };

  const handleToolSliderClick = (event, tool) => {
    event.stopPropagation();
    if (!onToolSliderClick) return;
    onToolSliderClick(tool?.functionData ?? tool);
  };

  return (
    <div data-testid="main-agent-ui" className="space-y-3 z-10">
      {/* Agent Header */}
      <div data-testid="main-agent-header" className="flex flex-col items-center gap-2">
        <div
          data-testid="main-agent-icon"
          className="w-8 h-8 flex items-center justify-center border border-primary rounded-none bg-base-200"
        >
          <Bot size={16} className="text-base-content" />
        </div>
        <div data-testid="main-agent-label" className="text-xs text-base-content/60 font-semibold">
          MAIN AGENT
        </div>
        <div
          data-testid="main-agent-name"
          className="font-semibold border border-primary text-primary text-sm p-2 bg-primary/10"
        >
          {name}
        </div>
      </div>

      {/* Tools Section */}
      {tools.length > 0 && (
        <div data-testid="main-agent-tools-section" className="space-y-2">
          <div
            data-testid="main-agent-tools-label"
            className="text-center text-xs tracking-widest text-base-content/60"
          >
            TOOL CALLS
          </div>
          <div data-testid="main-agent-tools-list" className="space-y-2">
            {tools.map((tool, index) => (
              <div
                key={`${tool?.name || "tool"}-${index}`}
                data-testid={`main-agent-tool-${index}`}
                className="flex items-center justify-between border border-base-300 hover:border-primary p-2 hover:bg-primary/10 cursor-pointer"
                onClick={() => handleToolClick(tool)}
              >
                <div data-testid={`main-agent-tool-content-${index}`} className="flex items-center gap-2">
                  <span data-testid={`main-agent-tool-icon-${index}`} className="text-primary">
                    🔧
                  </span>
                  <span data-testid={`main-agent-tool-name-${index}`} className="text-sm text-base-content truncate">
                    {tool?.name || "Unknown Tool"}
                  </span>
                </div>
                <button
                  data-testid={`main-agent-tool-log-${index}`}
                  type="button"
                  onClick={(event) => handleToolSliderClick(event, tool)}
                  className="p-1 border border-base-300 rounded hover:border-primary hover:text-primary"
                  title="Open tool logs"
                >
                  <FileClockIcon size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Response Section */}
      {responsePreview && (
        <div data-testid="main-agent-response-section" className="space-y-2">
          <div
            data-testid="main-agent-response-label"
            className="text-center text-xs tracking-widest text-base-content/60"
          >
            RESPONSE
          </div>
          <div data-testid="main-agent-response-summary" className="text-[10px] text-base-content/60 text-center">
            {agentCount} agent{agentCount === 1 ? "" : "s"} • {toolCount} tool{toolCount === 1 ? "" : "s"} called
          </div>
          <div
            data-testid="main-agent-response-preview"
            className="border border-base-300 hover:border-success p-3 hover:bg-success/10 cursor-pointer transition-all"
            onClick={onResponseClick}
          >
            <div data-testid="main-agent-response-status" className="flex items-center gap-2 mb-2">
              <span data-testid="main-agent-response-status-icon" className="text-success">
                ✓
              </span>
              <span data-testid="main-agent-response-status-text" className="text-xs font-semibold text-success">
                Delivered
              </span>
            </div>
            <p data-testid="main-agent-response-preview-text" className="text-sm text-base-content/80 line-clamp-3">
              {responsePreview}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
