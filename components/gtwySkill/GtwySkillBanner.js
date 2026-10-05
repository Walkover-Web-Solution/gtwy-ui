"use client";
import { useMemo } from "react";
import { Copy, Terminal } from "lucide-react";
import { useCustomSelector } from "@/customHooks/customSelector";
import { buildGtwySkillPrompt, selectActiveAgents } from "@/utils/gtwySkill";
import { copyToClipboard } from "@/utils/utility";

/** "Integrate GTWY with your coding agent" banner shown above the agents table. */
export default function GtwySkillBanner({ orgId }) {
  const { bridges, orgName } = useCustomSelector((state) => ({
    bridges: state.bridgeReducer.org?.[orgId]?.orgs || [],
    orgName: state.userDetailsReducer.organizations?.[orgId]?.name || "",
  }));
  const agents = useMemo(() => selectActiveAgents(bridges), [bridges]);

  const onCopy = () =>
    copyToClipboard(
      buildGtwySkillPrompt({ orgId, orgName, agents }),
      "Prompt copied. Paste it into your coding agent."
    );

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
            Copy one prompt into Claude Code, Cursor, Codex, Windsurf or Copilot. It installs the GTWY skill and wires
            your agents into your codebase.
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 pl-14 sm:pl-0">
        <button type="button" data-testid="gtwy-skill-banner-copy" className="btn btn-sm btn-primary" onClick={onCopy}>
          <Copy size={14} />
          Copy prompt
        </button>
      </div>
    </section>
  );
}
