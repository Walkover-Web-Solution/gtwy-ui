// GTWY skill for coding agents (Claude Code, Cursor, Codex, Windsurf, Copilot).
// The prompt built here is self-contained: it carries the skill text and this
// org's agent IDs, and tells the coding agent to ask for the pauthkey itself.
// The pauthkey is never put in the prompt.

const CODING_AGENTS = [
  { name: "Claude Code", skillPath: ".claude/skills/gtwy/SKILL.md" },
  { name: "Cursor", skillPath: ".cursor/rules/gtwy.mdc" },
  { name: "Codex", skillPath: "AGENTS.md" },
  { name: "Windsurf", skillPath: ".windsurf/rules/gtwy.md" },
  { name: "Copilot", skillPath: ".github/copilot-instructions.md" },
];

// Keep the prompt a reasonable size for orgs with many agents.
const MAX_PROMPT_AGENTS = 50;

const GTWY_SKILL_MARKDOWN = `---
name: gtwy
description: Connect an app to a GTWY AI agent through the GTWY completion API. Use when the user wants their app to call, chat with, or integrate a GTWY agent.
---

# Agent quickstart

The shortest path from "I have an app" to "my app talks to my GTWY agent". GTWY runs the AI (model, prompt, tools, memory). Your app only sends the user's message and shows the reply.

You need exactly two things from the user:

- **agent_id**: which GTWY agent to call. It is 24 hex characters, for example \`6694ece414e1d217f9973fc7\`.
- **pauthkey**: the key that authorizes calls for their GTWY organization.

If the user hasn't given you both, ask for them once. Both are in the GTWY dashboard at gtwy.ai: the agent's page shows its ID, and the API keys section creates a pauthkey. Don't guess or invent either one.

For anything beyond a plain chat call, see the Completion API Reference.

## Before you write code

Four rules. Breaking any of them is the most common way this goes wrong:

1. **The pauthkey is a secret.** Store it in an environment variable called \`GTWY_PAUTHKEY\`, never in source code. Put it in \`.env\` and make sure \`.env\` is in \`.gitignore\`.
2. **Call GTWY from the server, never from the browser.** A key in frontend code (React, Vue, plain JS, a mobile bundle) is public. If the app has no backend, add one small server route or serverless function, such as \`/api/chat\`, and have the browser call that.
3. **Store the agent ID as config too:** use \`GTWY_AGENT_ID\`. It isn't secret, but keeping it in the environment lets the user switch agents without a code change.
4. **Don't rebuild what the agent already has.** The system prompt, model, tools and knowledge base are all set up inside GTWY. Don't copy the prompt into the app or add a second LLM call.

\`\`\`bash
# .env
GTWY_PAUTHKEY=the-users-pauthkey
GTWY_AGENT_ID=the-users-agent-id
\`\`\`

## 1. Test the agent first

Before you write any app code, make one real call to confirm that the key and the agent work:

\`\`\`bash
curl -sS -X POST "https://api.gtwy.ai/api/v2/model/chat/completion" \\
  -H "pauthkey: $GTWY_PAUTHKEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "user": "Hello! Reply with one short sentence.",
    "agent_id": "'"$GTWY_AGENT_ID"'",
    "response_type": "text"
  }'
\`\`\`

A working call returns \`200\` with:

\`\`\`json
{
  "success": true,
  "response": {
    "data": {
      "content": "Hi! How can I help you today?",
      "role": "assistant",
      "model": "gpt-5",
      "finish_reason": "completed",
      "message_id": "abdd920a-ec69-11f0-b14a-928ade59a1ee"
    },
    "usage": { "input_tokens": 300, "output_tokens": 200, "total_tokens": 500, "cost": 0.0025 }
  }
}
\`\`\`

The reply text is at \`response.data.content\`.

If you don't get \`success: true\`, stop and go to [Errors](#errors). Don't start building on a call that doesn't work yet.

## 2. Wire it into the app

Add one server-side function that every part of the app uses. Don't spread raw fetch calls around the codebase.

### Node.js / TypeScript

\`\`\`js
// gtwy.js (server only)
const GTWY_URL = "https://api.gtwy.ai/api/v2/model/chat/completion";

export async function askAgent(message, threadId, variables = {}) {
  const res = await fetch(GTWY_URL, {
    method: "POST",
    headers: {
      "pauthkey": process.env.GTWY_PAUTHKEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user: message,
      agent_id: process.env.GTWY_AGENT_ID,
      thread_id: threadId,
      response_type: "text",
      variables,
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) {
    const detail = body.detail?.error ?? body.detail ?? body.error ?? res.statusText;
    throw new Error(\`GTWY \${res.status}: \${typeof detail === "string" ? detail : JSON.stringify(detail)}\`);
  }
  return body.response.data.content;
}
\`\`\`

A route for the browser to call (Express shown; Next.js route handlers, Hono and the like follow the same idea):

\`\`\`js
app.post("/api/chat", async (req, res) => {
  try {
    const reply = await askAgent(req.body.message, req.body.threadId);
    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "The assistant is unavailable right now." });
  }
});
\`\`\`

### Python

\`\`\`python
# gtwy.py (server only)
import os
import httpx

GTWY_URL = "https://api.gtwy.ai/api/v2/model/chat/completion"

def ask_agent(message: str, thread_id: str | None = None, variables: dict | None = None) -> str:
    res = httpx.post(
        GTWY_URL,
        headers={"pauthkey": os.environ["GTWY_PAUTHKEY"]},
        json={
            "user": message,
            "agent_id": os.environ["GTWY_AGENT_ID"],
            "thread_id": thread_id,
            "response_type": "text",
            "variables": variables or {},
        },
        timeout=120,
    )
    body = res.json() if res.content else {}
    if res.status_code != 200 or body.get("success") is False:
        raise RuntimeError(f"GTWY {res.status_code}: {body.get('detail') or body.get('error')}")
    return body["response"]["data"]["content"]
\`\`\`

Use a long timeout: 60–120 seconds. An agent that calls tools can take a while to answer.

## 3. Keep the conversation going

GTWY remembers the conversation per \`thread_id\`:

- **Same \`thread_id\`** means the agent sees the earlier messages in that thread.
- **New or missing \`thread_id\`** means a fresh conversation with no memory.

Give each conversation a stable ID. For example, use the logged-in user's ID plus a chat ID, or generate a UUID when a chat starts and keep it in the session or database. Don't create a new ID for every message, or the agent forgets everything between turns.

The app doesn't need to store the chat history to give the agent context, because GTWY keeps it. Store it only if the app shows past chats.

## 4. Pass app data with variables

If the agent's prompt uses variables such as \`{{customer_name}}\`, send them on every call:

\`\`\`json
"variables": { "customer_name": "Riya", "order_id": "ORD12345" }
\`\`\`

Ask the user which variables their agent expects, or check the agent's prompt in GTWY. Missing variables don't cause an error, but the agent answers without that information.

## 5. Verify, then report

Run the app and send one real message through the UI, all the way through to the reply on screen. Then send a second message in the same chat and confirm the agent remembers the first. Only then tell the user it works.

Tell them three things:

1. Where the key lives (\`GTWY_PAUTHKEY\` in \`.env\`, not committed).
2. Which route the browser calls (for example \`POST /api/chat\`).
3. That the agent's behavior (prompt, model, tools) is changed in the GTWY dashboard. No code change or redeploy is needed.

If the app is deployed, remind them to set \`GTWY_PAUTHKEY\` and \`GTWY_AGENT_ID\` on the host as well. A \`.env\` file isn't uploaded.

## Errors

Error bodies come back as \`{"detail": ...}\`, and for agent errors as \`{"detail": {"success": false, "error": "..."}}\`.

| Status | Message | What it means | What to do |
|---|---|---|---|
| 401 | \`invalid pauthkey\` | The key is wrong, revoked, or has extra spaces. | Ask the user to copy the key again from GTWY. Don't retry with the same key. |
| 401 | \`missing proxy credentials\` | The \`pauthkey\` header wasn't sent. | Check the header name (\`pauthkey\`, lowercase) and that the env var is loaded. |
| 403 | \`Organization is disabled\` | The GTWY org is blocked. | Tell the user to contact GTWY support. |
| 400 | \`User message is compulsory\` | \`user\` was empty or missing. | Don't send empty messages; check the input field. |
| 400 | anything about the agent or bridge | The \`agent_id\` is wrong or belongs to another org, or the agent has no published version. | Ask the user to confirm the ID and that the agent is published. |
| 400 | anything about credits | The org is out of credits. | Tell the user to top up in GTWY. Retrying won't help. |
| 422 | Validation error | The request body is malformed, for example \`agent_id\` is missing. | Read \`errors\` in the reply and fix the payload. |
| 429 | \`Too many requests for ...\` | Rate limited: about 100/min per agent, 20/min per thread. | Wait for the \`Retry-After\` header's seconds, then retry once. |
| 5xx | | Temporary GTWY-side problem. | Retry once after a few seconds; if it persists, show the user a friendly error. |

Never show raw GTWY errors or the key to the app's end users. Log the error on the server and show a short message.

## Rules for agents

- Ask for \`agent_id\` and \`pauthkey\` once, at the start. Ask for nothing else unless an error needs it.
- Never print the full pauthkey back in chat, logs or commits.
- Never put the pauthkey in code the browser downloads.
- Always send \`"response_type": "text"\` for chat replies. Without it, GTWY defaults to a JSON reply format.
- Test with curl (step 1) before writing app code.

## What's next

| You need | Go to |
|---|---|
| Target a fixed version (\`version_id\`) or an environment (\`environment\`) | Completion API Reference |
| Change the model or provider for one call (\`configuration\`, \`service\`) | Completion API Reference |
| Give the agent your own API as a tool (\`extra_tools\`) | Completion API Reference |
| Get the reply on a webhook instead of waiting | Completion API Reference |
| Many prompts at once | Batch API |
| A ready-made chat widget instead of your own UI | Embed Chatbot |
`;

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
 * @param {{ orgId?: string, orgName?: string, agents?: Array }} opts
 */
export const buildGtwySkillPrompt = ({ orgId, orgName, agents = [] } = {}) => {
  const listed = agents.slice(0, MAX_PROMPT_AGENTS);
  const extra = agents.length - listed.length;
  const install = CODING_AGENTS.map((a) => `   - ${a.name}: \`${a.skillPath}\``).join("\n");

  const agentSection = listed.length
    ? [
        `These are the agents in my GTWY organization${orgName ? ` "${orgName}"` : ""}${orgId ? ` (org ID \`${orgId}\`)` : ""}:`,
        "",
        ...listed.map(agentLine),
        ...(extra > 0 ? [`- …and ${extra} more in the GTWY dashboard.`] : []),
        "",
        listed.length === 1
          ? "Use this agent unless I say otherwise."
          : "Ask me which agent this project should call, unless it's obvious from the codebase.",
      ].join("\n")
    : "I haven't picked an agent yet. Ask me for the agent_id; it's on the agent's page in the GTWY dashboard.";

  return `Set up GTWY in this project so the app can talk to my GTWY AI agent.

1. Install the GTWY skill below. Save it unchanged at the path your tool reads project instructions from:
${install}
   If that file already exists, add the skill as a new section instead of replacing the file.
2. Follow the skill to wire GTWY into this codebase.
3. Ask me for my pauthkey once. Store it only in .env as GTWY_PAUTHKEY, and make sure .env is in .gitignore. Never write it into code, commits or chat output.

${agentSection}

<gtwy-skill>
${GTWY_SKILL_MARKDOWN}</gtwy-skill>
`;
};
