// GTWY skill for coding agents (Claude Code, Cursor, Codex, Windsurf, Copilot).
// The skill itself is public at /docs/agent-quickstart.md (public/docs/agent-quickstart.md)
// and is the single source of truth: API, auth, errors and install paths live
// there. The prompt built here only points at it and carries what is specific
// to this org: the org ID, its agent IDs and a pauthkey, so the coding agent
// needs nothing else from the user. Without a pauthkey, the skill tells the
// coding agent to ask for one.

const GTWY_SKILL_URL = "https://gtwy.ai/docs/agent-quickstart.md";

// Keep the prompt a reasonable size for orgs with many agents.
const MAX_PROMPT_AGENTS = 50;

/** Active (non-deleted) agents from the Redux org slice, newest first. */
export const selectActiveAgents = (bridges = []) =>
  bridges
    .filter((b) => b && !b.deletedAt && (b.status === 1 || b.status === undefined))
    .map((b) => ({
      id: b._id,
      name: b.name || "Untitled agent",
      type: b.bridgeType === "chatbot" ? "chatbot" : "api",
      model: b.configuration?.model || "",
      published: Boolean(b.published_version_id),
    }));

const agentLine = (a) => {
  const meta = [a.type === "chatbot" ? "chatbot" : "API", a.model, a.published ? null : "not published yet"]
    .filter(Boolean)
    .join(", ");
  return `- ${a.name.replace(/\s+/g, " ").trim()}: \`${a.id}\`${meta ? ` (${meta})` : ""}`;
};

/**
 * The one prompt a user pastes into their coding agent.
 * @param {{ orgId?: string, orgName?: string, agents?: Array, pauthkey?: string }} opts
 */
export const buildGtwySkillPrompt = ({ orgId, orgName, agents = [], pauthkey } = {}) => {
  const listed = agents.slice(0, MAX_PROMPT_AGENTS);
  const extra = agents.length - listed.length;

  const agentSection = listed.length
    ? [
        `${listed.length === 1 ? "Use this agent from my" : "These are the agents in my"} GTWY organization${orgName ? ` "${orgName}"` : ""}${orgId ? ` (org ID \`${orgId}\`)` : ""}:`,
        "",
        ...listed.map(agentLine),
        ...(extra > 0 ? [`- …and ${extra} more in the GTWY dashboard.`] : []),
      ].join("\n")
    : `I haven't picked an agent yet${orgId ? ` (org ID \`${orgId}\`)` : ""}. Ask me for the agent_id.`;

  const keySection = pauthkey
    ? `My pauthkey: ${pauthkey}
Store it only in .env as GTWY_PAUTHKEY, and make sure .env is in .gitignore. Never write it into code, commits or chat output.`
    : "Ask me for my pauthkey once.";

  return `Set up GTWY in this project so the app can talk to my GTWY AI agent.

Read ${GTWY_SKILL_URL} and follow it. It covers installing the skill, the API, and where to keep my pauthkey.

${agentSection}

${keySection}
`;
};
