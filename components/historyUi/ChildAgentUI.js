import { Bot } from "lucide-react";

export function ChildAgentUI({ name, onToolClick, tools = [] }) {
  const handleToolClick = (tool) => {
    if (!onToolClick) return;
    onToolClick(tool?.functionData ?? tool);
  };

  // Filter to show only direct tool calls (not child agents)
  const directTools = tools.filter((tool) => tool?.nodeType !== "agent");

  return (
    <div className="space-y-3 z-10">
      {/* Agent Header */}
      <div className="flex flex-col items-center gap-2">
        <div className="w-8 h-8 flex items-center justify-center border border-blue-400 rounded-none bg-base-200">
          <Bot size={16} className="text-base-content" />
        </div>
        <div className="text-xs text-base-content/60 font-semibold">CHILD AGENT</div>
        <div className="font-semibold border border-blue-400 text-blue-400 text-sm p-2 bg-blue-400/10">{name}</div>
      </div>

      {/* Tools Section - Only direct tools, not child agents */}
      {directTools.length > 0 && (
        <div className="space-y-2">
          <div className="text-center text-xs tracking-widest text-base-content/60">TOOL CALLS</div>
          <div className="space-y-2">
            {directTools.map((tool, index) => (
              <div
                key={`${tool?.name || "tool"}-${index}`}
                className="flex items-center justify-between border border-base-300 hover:border-primary p-2 hover:bg-primary/10 cursor-pointer"
                onClick={() => handleToolClick(tool)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-primary">🔧</span>
                  <span className="text-sm text-base-content truncate">{tool?.name || "Unknown Tool"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
