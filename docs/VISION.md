---
covers: ["*"]
verified_at: 1c52bf86
verified_on: 2026-11-04
---

# Product Vision & Strategic Direction

> **Draft.** Recovered from the repository only; an owner must review it before it is used to accept or decline requests. Anything the repository does not state is marked "Not stated: an owner decides" and listed in [OPEN_QUESTIONS.md](./OPEN_QUESTIONS.md).

GTWY Frontend is the web interface of the GTWY AI platform. It lets users build, configure and manage AI agents across multiple AI services, connect them to integrations, and monitor their metrics (`docs/ARCHITECTURE.md`). It also ships an embed surface so GTWY agents can run inside external websites, which the repository calls "a core product surface" (`docs/AI_INSTRUCTIONS.md`).

## Authoritative Sources & Status

Sources used:

- `README.md`: the repository is the GTWY web frontend built with Next.js.
- `docs/ARCHITECTURE.md`: project overview, layers, routes and patterns.
- `docs/AI_INSTRUCTIONS.md`: the Design Constitution, component rules and Embed Architecture.
- `app/layout.js` metadata: title "GTWY AI | Connect 5000+ apps in just 1 click", description "Simplified AI & chatbot integration".
- Product copy in `app/page.js`, `components/AgentEmptyState.js`, `app/org/[org_id]/plans/page.js`, and the navigation in `utils/mainSliderHelper.js`.
- Git history up to `1c52bf86`.

No PRD, roadmap or strategy document exists in the repository.

### Approved Direction

Only what the repository states as purpose or rule:

- Users manage AI agents, configure models, handle integrations and monitor metrics across multiple AI services (`docs/ARCHITECTURE.md`).
- "Build and manage AI agents for your workflows. Agents help automate tasks, answer queries, and deliver intelligent assistance." (agent empty state copy).
- Embedding GTWY agents in external websites is a core product surface (`docs/AI_INSTRUCTIONS.md`, Embed Architecture).
- Design follows the Design Constitution: "maximum clarity with minimum UI", "Clarity > Features, Flow > Flexibility, Meaning > Options" (`docs/AI_INSTRUCTIONS.md`).
- Agents must not act under uncertainty: unclear or conflicting requests are clarified first (`docs/AI_INSTRUCTIONS.md`).
- Secrets live in env files, never in code; `NEXT_PUBLIC_` variables are for non-secret values only (`README.md`).
- New public embed options use `snake_case` (`docs/AI_INSTRUCTIONS.md`).

### Current Implementation

What the code does today. This is not automatically intended direction.

- Organization-scoped dashboard under `/org/[org_id]/`. Navigation groups: agent types (API and chatbot agents), configuration (chatbot config, knowledge base, widgets, model garden, tools), security and access (pauthkey, API keys), monitoring (alerts, metrics), and developer (integration, RAG embed) (`utils/mainSliderHelper.js`).
- Agent configuration covering prompts, models, fallback models, tools, MCP servers with authentication, variables, versions and publishing, test cases with evaluation, chat history and analytics.
- Embed surfaces: the agent embed (`public/gtwy.js`, `app/embed/`) and the RAG / knowledge base embed (`components/ragEmbed/`), configured through `postMessage` and script attributes.
- A "GTWY skill" prompt that users paste into coding agents (Claude Code, Cursor, Codex, Windsurf, Copilot) so those agents can integrate GTWY agents into their apps (`utils/gtwySkill.js`). It points to `https://gtwy.ai/docs/agent-quickstart.md`, which is not in this repository.
- Workspace billing with Free and Pro plans and credit packs, enforced by the backend (`app/org/[org_id]/plans/page.js`). Lifetime access and refer-and-earn pages also exist.
- An OAuth consent page for "Auth 2.0" at `/proxy/oauth`.
- The backend lives elsewhere; this repository calls it through `config/` (`NEXT_PUBLIC_SERVER_URL`, `NEXT_PUBLIC_PYTHON_SERVER_URL`).

### Proposals & Roadmaps

- Widgets carry a Beta badge in navigation (`components/sliders/MainSlider.js`). An `orchestratal_model` key also gets a Beta badge there, but it is not in the current navigation sections.
- No written roadmap exists. Recent history (analytics filters per version, a typed question-answering model UI, MCP authentication, the OAuth consent page, the coding-agent skill) shows where work has gone recently, not an approved plan.

### Unknowns & Ambiguities

See [OPEN_QUESTIONS.md](./OPEN_QUESTIONS.md). The main ones are the target customer, success metrics, non-goals, and how important each surface is relative to the others.

## Target Audience & Ideal Customer Profile (ICP)

**Primary persona:** Not stated: an owner decides. The code points to a builder in an organization who creates API and chatbot agents, picks models, writes prompts and wires tools, then integrates those agents into their own product through the API, embeds, or a coding agent. The integration guides, API keys and pauthkeys suggest a technical or semi-technical user, but the repository never names the role or the technical level.

**Secondary personas, as implied by the code (not stated as targets):**

- Organization admins: manage workspace settings, members and invites, API keys, billing plans.
- Embed end users: people on an external site using a GTWY agent through the embed. Their capabilities are set by the host through UI toggles.
- Collaborators: invited organization members.
- Auditors / reviewers: Not stated: an owner decides. Chat history, metrics and alerts exist, but no audit-specific role is described.

## Problems Solved & Value Proposition

Stated value: "Simplified AI & chatbot integration" and "Connect 5000+ apps in just 1 click" (`app/layout.js`). The rows below link that copy to existing features. The differentiator column is only filled where the repository says something.

| Customer problem | How the product solves it | What sets it apart |
| --- | --- | --- |
| Building AI agents across several AI services is fragmented | One dashboard to configure agents, models and fallbacks across services (`docs/ARCHITECTURE.md`, model garden) | Not stated: an owner decides |
| Connecting AI agents to other apps | Tools, MCP servers and integrations | "Connect 5000+ apps in just 1 click" (site title) |
| Putting an agent into one's own website or product | Agent embed and RAG embed with theme and UI configuration; API agents; coding-agent skill prompt | Embed is "a core product surface" |
| Grounding answers in one's own documents | Knowledge base and RAG embed | Not stated: an owner decides |
| Knowing whether an agent works well | Test cases with evaluation, chat history, metrics and alerts | Not stated: an owner decides |

## Core Principles & Design Philosophy

Taken from `docs/AI_INSTRUCTIONS.md` and `README.md`. The trade-offs are the ones those rules decide.

1. **Clarity over features.** "Design = maximum clarity with minimum UI." Trade-off: when a feature adds UI that blurs the screen's intent, the feature gives way ("If it's not necessary for the current intent, it must not exist").
2. **One intent per screen, one primary action.** Trade-off: a flow that needs several primary actions is split or redesigned, not crowded ("Multiple intents = invalid design").
3. **Flow over flexibility, meaning over options.** Trade-off: fewer configuration choices on the main path; advanced options stay behind explicit toggles (as the embed's `showAdvancedParameters` / `showAdvancedConfigurations` already do).
4. **AI state is always visible (Pulse Law).** Trade-off: every AI action shows Idle, Thinking, Success or Failure, even if that costs extra UI work; a static control during processing is never acceptable.
5. **Ask before acting under uncertainty.** Trade-off: speed gives way to correctness; unclear or conflicting requests are clarified before code is written.
6. **Reuse existing patterns.** Trade-off: consistency over local convenience; new work uses the existing modals, sliders, hooks, Redux actions and `@/utils/utility.js` instead of new one-off solutions.

## Strategic Priorities & Success Measures

- **Top priorities:** Not stated: an owner decides. The only stated emphasis is that embed is a core product surface.
- **Success metrics:** Not stated: an owner decides. PostHog and Google Tag Manager are wired in, but no metric or target is stated.

## Boundaries & Non-Goals

Stated boundaries:

- This repository is the frontend only. Backend behaviour (billing enforcement, model execution, agent storage) belongs to the backend, which this repository calls through `config/`.
- Secrets are never hardcoded or committed, and never put into `NEXT_PUBLIC_` variables (`README.md`). The coding-agent skill prompt also tells agents never to write the pauthkey into code, commits or chat output (`utils/gtwySkill.js`).

Product non-goals: Not stated: an owner decides.

Anti-patterns that break the stated design direction (`docs/AI_INSTRUCTIONS.md`):

- Screens with several intents or several primary actions.
- UI that is clever, powerful or complex instead of simple ("If it feels clever → remove").
- AI actions without visible state.
- Empty states that do not explain their purpose and the next action.
- Layouts that do not work at about 390px wide without horizontal scrolling.
- Ad-hoc helpers, modals or sliders that duplicate existing ones.
- New public embed keys in camelCase.

## How Future Agents Must Evaluate Requests

1. **Compare** each request with the Approved Direction, the ICP, the Core Principles and the Boundaries above. Current Implementation describes what exists, not what is approved. Do not justify a request only because similar code already exists.
2. **Improve unclear requests before coding.** Restate the outcome and acceptance criteria. If something is still uncertain, ask, as `docs/AI_INSTRUCTIONS.md` requires.
3. **Explain conflicts.** If a request conflicts with this file, say which section it conflicts with and why, then recommend declining it or changing it into a version that fits.
4. **Make changes of direction explicit.** A deliberate change of direction must be approved by an owner and recorded by updating this file in the same change as the code. Never rewrite or loosen this file just to let a request through.
5. **Do not fake backend capabilities.** If a feature needs backend capabilities that do not exist, describe the needed contract in `docs/CONTRACTS.md` (create it if it does not exist). Never build mock endpoints or fake integrations.
6. **Where this file says "Not stated: an owner decides"**, treat the request as partly aligned and ask the owner, adding the question to [OPEN_QUESTIONS.md](./OPEN_QUESTIONS.md).
