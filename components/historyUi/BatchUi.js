import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BotIcon, WrenchIcon, FileClockIcon } from "@/components/Icons";
import { Zap } from "lucide-react";

export function BatchUI({ agents, onToolClick, onToolSliderClick, isLoading = false }) {
  const [openAgentKey, setOpenAgentKey] = useState(null);
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });
  const [selectedFunctionData, setSelectedFunctionData] = useState(null);
  const [selectedAgentMeta, setSelectedAgentMeta] = useState(null);
  const rowRefs = useRef({});
  const popupRef = useRef(null);

  const handleToolClick = (tool) => {
    if (!onToolClick) return;
    onToolClick(tool?.functionData ?? tool);
  };

  const handleToolSliderClick = (event, tool) => {
    event.stopPropagation();
    if (!onToolSliderClick) return;
    onToolSliderClick(tool?.functionData ?? tool);
  };

  const handleAgentClick = (agentKey, functionData, agentName, tools) => {
    const nextOpen = openAgentKey === agentKey ? null : agentKey;
    setOpenAgentKey(nextOpen);
    setSelectedFunctionData(nextOpen ? functionData : null);
    setSelectedAgentMeta(
      nextOpen
        ? {
            name: agentName || "Unknown Agent",
            tools: Array.isArray(tools) ? tools : [],
            error: false,
          }
        : null
    );
  };

  const renderToolGrid = (tools, depth = 0) => {
    if (!Array.isArray(tools) || tools.length === 0) return null;
    return (
      <div className="grid grid-cols-2 gap-2" style={{ marginLeft: depth * 12 }}>
        {tools.map((tool, index) => {
          const isLastOdd = tools.length % 2 !== 0 && index === tools.length - 1;
          const toolName = typeof tool === "string" ? tool : tool?.name || tool?.id || `tool_${index + 1}`;
          const hasChildren = Array.isArray(tool?.children) && tool.children.length > 0;
          const isAgentNode = tool?.nodeType === "agent";

          return (
            <div key={`${toolName}-${index}`} className={isLastOdd ? "col-span-2" : ""}>
              <div
                onClick={() =>
                  isAgentNode
                    ? handleAgentClick(
                        `child-${depth}-${index}`,
                        tool?.functionData ?? tool,
                        toolName,
                        tool?.children || []
                      )
                    : handleToolClick(tool)
                }
                className={`cursor-pointer flex items-center justify-between border px-3 py-2 text-xs text-base-content gap-2
                              ${isAgentNode ? "hover:border-blue-400 hover:bg-blue-400/10" : "hover:border-orange-400 hover:bg-orange-400/10"}`}
                title={toolName}
              >
                <span className="flex items-center gap-2 flex-1 min-w-0">
                  {isAgentNode ? (
                    <BotIcon size={12} className="text-base-content/70 shrink-0" />
                  ) : (
                    <WrenchIcon size={12} className="text-base-content/70 shrink-0" />
                  )}
                  <span className="truncate">{toolName}</span>
                </span>
                <span className="flex items-center gap-2 text-[10px] font-semibold text-base-content/60 shrink-0">
                  {isAgentNode ? "AGENT" : "TOOL"}
                  {!isAgentNode && (
                    <button
                      type="button"
                      onClick={(event) => handleToolSliderClick(event, tool)}
                      className="p-1 border border-base-300 rounded hover:border-primary hover:text-primary"
                      title="Open tool logs"
                    >
                      <FileClockIcon size={12} />
                    </button>
                  )}
                  <span className="text-green-500 flex-shrink-0">✔</span>
                </span>
              </div>
              {hasChildren && (
                <div className="col-span-2 mt-2">
                  {/* Show summary for child agents */}
                  {isAgentNode &&
                    (() => {
                      const childToolCount = tool.children.filter((t) => t?.nodeType !== "agent").length;
                      const childAgentCount = tool.children.filter((t) => t?.nodeType === "agent").length;
                      const parts = [];
                      if (childAgentCount > 0) parts.push(`${childAgentCount} agent${childAgentCount > 1 ? "s" : ""}`);
                      if (childToolCount > 0) parts.push(`${childToolCount} tool${childToolCount > 1 ? "s" : ""}`);
                      const summary = parts.join(" ");

                      return summary ? (
                        <div className="flex items-center gap-2 text-[10px] text-base-content/60 mb-2 ml-3">
                          <Zap size={10} className="text-yellow-500" />
                          <span>
                            {summary} called by {toolName}
                          </span>
                        </div>
                      ) : null;
                    })()}
                  {renderToolGrid(tool.children, depth + 1)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  useEffect(() => {
    if (!openAgentKey) return;

    const updatePosition = () => {
      const el = rowRefs.current[openAgentKey];
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const popupWidth = 420;
      const gap = 12;
      let left = rect.right + gap;
      if (left + popupWidth > window.innerWidth - 8) {
        left = Math.max(8, rect.left - popupWidth - gap);
      }
      const top = Math.max(8, rect.top);
      setPopupPos({ top, left });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [openAgentKey]);

  useEffect(() => {
    if (!openAgentKey) return;

    const handleOutsideClick = (event) => {
      const popupEl = popupRef.current;
      if (popupEl && popupEl.contains(event.target)) return;
      setOpenAgentKey(null);
      setSelectedFunctionData(null);
      setSelectedAgentMeta(null);
    };

    document.addEventListener("pointerdown", handleOutsideClick, true);
    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick, true);
    };
  }, [openAgentKey]);

  const isBatchEmpty = !Array.isArray(agents) || agents.length === 0;

  if (isLoading || isBatchEmpty) {
    return (
      <div className="flex items-center gap-2 text-xs text-base-content/60">
        <span
          className="h-4 w-4 border-2 hover:border-primary border-t-transparent rounded-full animate-spin"
          aria-label="Loading"
        />
        <span>Loading batch data...</span>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 bg-base-100">
        {agents?.map((agent, agentIndex) => {
          const agentKey = `${agentIndex}`;

          // Check if this is an actual agent (has functionData) or just "FUNCTIONS" group
          const isActualAgent = Boolean(agent.functionData);
          const functionData = agent.functionData;
          return (
            <div key={agentIndex} className="space-y-2">
              {/* AGENT ROW - Only show for actual agents */}
              {isActualAgent && (
                <div className="relative">
                  <div
                    onClick={() => handleAgentClick(agentKey, functionData, agent.name, agent.parallelTools)}
                    ref={(node) => {
                      if (node) rowRefs.current[agentKey] = node;
                    }}
                    className="flex justify-between items-center border px-2 py-2 text-sm text-base-content cursor-pointer hover:border-blue-400 hover:bg-blue-400/10"
                    title={agent.name}
                  >
                    <span className="truncate flex items-center gap-2">
                      <BotIcon size={14} className="text-base-content/70" />
                      {agent.name}
                    </span>
                    <span className="flex items-center gap-2 text-[10px] font-semibold text-base-content/60">
                      AGENT
                      <span className="text-green-500 flex-shrink-0">✔</span>
                    </span>
                  </div>
                </div>
              )}

              {/* Show FUNCTIONS label for non-agent groups */}
              {!isActualAgent && agent.name === "FUNCTIONS" && (
                <div className="text-xs font-semibold text-base-content/60 mb-1">MAIN AGENT TOOLS</div>
              )}

              {isActualAgent && agent.isLoading && (
                <div
                  className={`flex items-center gap-2 text-[10px] text-base-content/60 ${isActualAgent ? "ml-4" : ""}`}
                >
                  <span className="h-3 w-3 border-2 hover:border-primary border-t-transparent rounded-full animate-spin" />
                  <span>Loading tools...</span>
                </div>
              )}

              {/* PARALLEL TOOLS */}
              {Array.isArray(agent.parallelTools) && agent.parallelTools.length > 0 && (
                <div className={`space-y-1 ${isActualAgent ? "ml-4" : ""}`}>
                  {isActualAgent &&
                    (() => {
                      const toolCount = agent.parallelTools.filter((t) => t?.nodeType !== "agent").length;
                      const agentCount = agent.parallelTools.filter((t) => t?.nodeType === "agent").length;
                      const parts = [];
                      if (agentCount > 0) parts.push(`${agentCount} agent${agentCount > 1 ? "s" : ""}`);
                      if (toolCount > 0) parts.push(`${toolCount} tool${toolCount > 1 ? "s" : ""}`);
                      const summary = parts.join(" ");

                      return (
                        <div className="flex items-center gap-2 text-[10px] text-base-content/60 mb-2">
                          <Zap size={12} className="text-yellow-500" />
                          <span>
                            {summary} called by {agent.name}
                          </span>
                        </div>
                      );
                    })()}

                  {renderToolGrid(agent.parallelTools)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {openAgentKey &&
        selectedFunctionData &&
        createPortal(
          <div
            ref={popupRef}
            className="fixed z-[9999] w-[420px] overflow-y-auto bg-base-100 border hover:border-primary shadow-xl p-4 text-xs text-base-content"
            style={{
              top: popupPos.top,
              left: popupPos.left,
              maxHeight: "70vh",
              overscrollBehavior: "contain",
            }}
          >
            <div className="text-[11px] font-semibold text-base-content tracking-wide mb-3">FUNCTION DATA:</div>

            <div className="space-y-3">
              <div>
                <div className="text-[11px] text-base-content/60 mb-1">Id:</div>
                <div className="border hover:border-primary bg-base-200 px-2 py-1 text-base-content">
                  {selectedFunctionData.id || "null"}
                </div>
              </div>

              <div>
                <div className="text-[11px] text-base-content/60 mb-1">Args:</div>
                <pre className="border hover:border-primary bg-base-200 px-2 py-2 whitespace-pre-wrap text-base-content leading-5">
                  {JSON.stringify(selectedFunctionData.args, null, 2)}
                </pre>
              </div>

              <div>
                <div className="text-[11px] text-base-content/60 mb-1">Data:</div>
                <pre className="border hover:border-primary bg-base-200 px-2 py-2 whitespace-pre-wrap text-base-content leading-5">
                  {JSON.stringify(selectedFunctionData.data, null, 2)}
                </pre>
              </div>

              <div>
                <div className="text-[11px] text-base-content/60 mb-1">Name:</div>
                <div className="border hover:border-primary bg-base-200 px-2 py-1 text-base-content">
                  {selectedAgentMeta?.name || "Unknown Agent"}
                </div>
              </div>

              <div>
                <div className="text-[11px] text-base-content/60 mb-1">Error:</div>
                <div className="border hover:border-primary bg-base-200 px-2 py-1 text-base-content">
                  {selectedAgentMeta?.error ? "true" : "false"}
                </div>
              </div>

              <div>
                <div className="text-[11px] text-base-content/60 mb-1">Tools:</div>
                {(selectedAgentMeta?.tools || []).length === 0 ? (
                  <div className="border hover:border-primary bg-base-200 px-2 py-1 text-base-content/60">
                    No tools found
                  </div>
                ) : (
                  <pre className="border hover:border-primary bg-base-200 px-2 py-2 whitespace-pre-wrap text-base-content leading-5">
                    {JSON.stringify(selectedAgentMeta?.tools || [], null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
