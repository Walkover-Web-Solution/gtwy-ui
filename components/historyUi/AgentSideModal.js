export function AgentSideModal({ agent, top, onClose }) {
  return (
    <div
      style={{ top }}
      className="
        absolute left-full ml-4
        w-64
        h-60
        border border-base-300
        bg-base-100
        p-3
        shadow
        z-[999999]
        overflow-y-auto
      "
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <div className="text-xs font-semibold text-base-content/60">AGENT DETAILS</div>
        <button onClick={onClose} className="text-xs text-base-content/40 hover:text-base-content">
          ✕
        </button>
      </div>

      {/* Agent Info */}
      <div className="text-sm font-semibold mb-2">{agent.name}</div>

      {agent.parallelTools && (
        <div>
          <div className="text-xs text-base-content/60 mb-1">TOOLS</div>

          {agent.parallelTools.map((tool) => (
            <div key={tool} className="border border-base-300 px-2 py-1 text-xs mb-1 text-base-content">
              {tool}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
