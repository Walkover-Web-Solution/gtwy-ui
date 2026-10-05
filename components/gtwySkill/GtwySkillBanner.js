"use client";
import { Copy, Terminal } from "lucide-react";
import useGtwySkillPrompt from "@/customHooks/useGtwySkillPrompt";

/**
 * "Integrate GTWY with your coding agent" banner. Above the agents table it
 * lists every agent; in an agent's Integration Guide, pass agentId to list only that one.
 */
export default function GtwySkillBanner({ orgId, agentId }) {
  const { copyPrompt, isCopying } = useGtwySkillPrompt(orgId, agentId);

  return (
    <section
      data-testid="gtwy-skill-banner"
      aria-label="Integrate GTWY with your coding agent"
      className="mb-5 flex flex-col gap-4 border border-base-300 bg-base-200/40 p-4 sm:flex-row sm:items-center"
    >
      <div className="flex min-w-0 flex-1 items-start gap-4 sm:items-center">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-content">
          <Terminal size={18} />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-base-content">Integrate GTWY with your coding agent</h2>
            <span className="badge badge-warning badge-sm font-medium">New</span>
          </div>
          <p className="mt-0.5 text-sm text-base-content/70">
            {agentId
              ? "Copy one prompt into Claude Code, Cursor, Codex, Windsurf or Copilot. It installs the GTWY skill and wires this agent into your codebase."
              : "Copy one prompt into Claude Code, Cursor, Codex, Windsurf or Copilot. It installs the GTWY skill and wires your agents into your codebase."}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 pl-14 sm:pl-0">
        <button
          type="button"
          data-testid="gtwy-skill-banner-copy"
          className="btn btn-sm btn-primary"
          onClick={copyPrompt}
          disabled={isCopying}
        >
          <Copy size={14} />
          Copy prompt
        </button>
      </div>
    </section>
  );
}
