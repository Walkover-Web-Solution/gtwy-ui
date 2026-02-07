import { Bot } from "lucide-react";

export function AgentUI({ label, name, status, statusClass, onToolClick, emptyToolsMessage, tools = [] }) {
  const handleToolClick = (tool) => {
    if (!onToolClick) return;
    onToolClick(tool?.functionData ?? tool);
  };

  return (
    <div className="space-y-1 z-10">
      {/* Icon + Heading */}
      <div className="flex flex-col items-center gap-2">
        {/* Robot Icon Box */}
        <div className="w-8 h-8 flex items-center justify-center border border-primary rounded-none bg-base-200">
          <Bot size={16} className="text-base-content" />
        </div>

        {/* Heading */}
        <div className="text-xs text-base-content/60 font-semibold">{label}</div>
        {/* Agent Name */}
        <div className="font-semibold border border-primary text-primary text-sm p-2 bg-primary/10">{name}</div>
      </div>
      {status === "FINALIZING" && (
        <div className="bg-base-100">
          <div className="text-center text-xs tracking-widest text-base-content/60 mb-4">PROCESSING</div>

          {tools.length > 0 ? (
            tools.map((tool, index) => (
              <div
                key={`${tool?.name || "tool"}-${index}`}
                className="flex items-center justify-between border border-base-300 hover:border-primary p-2 mb-3 hover:bg-primary/10 cursor-pointer"
                onClick={() => handleToolClick(tool)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-primary">🔧</span>
                  <span className="text-sm text-base-content">{tool?.name || "Unknown Tool"}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="border border-base-300 bg-base-200 text-xs text-base-content/60 p-3 text-center">
              {emptyToolsMessage || "No tool calls for this agent."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
