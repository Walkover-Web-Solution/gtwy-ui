# AGENTS.md

## Project

GTWY AI frontend: the web UI for a multi-tenant platform where users build, configure, test and monitor LLM agents across providers. It can also run embedded in customer sites as an iframe. Stack: Next.js 15 App Router (client components), React 19, Redux Toolkit + redux-persist, Axios, Tailwind v4 + DaisyUI 5, JavaScript (no TypeScript config).

## Read first

- Architecture: [docs/ai/ARCHITECTURE.md](docs/ai/ARCHITECTURE.md)
- Components: [docs/ai/COMPONENTS.md](docs/ai/COMPONENTS.md)
- Utilities, hooks, API clients: [docs/ai/UTILITIES.md](docs/ai/UTILITIES.md)
- Data model, Redux state, endpoints, env vars: [docs/ai/DATA_MODEL.md](docs/ai/DATA_MODEL.md)
- Conventions & recipes: [docs/ai/CONVENTIONS.md](docs/ai/CONVENTIONS.md)
- Domain terms: [docs/ai/GLOSSARY.md](docs/ai/GLOSSARY.md)
- Design rules, component rules, embed architecture: [docs/AI_INSTRUCTIONS.md](docs/AI_INSTRUCTIONS.md)

## Setup & commands

- Install: `npm install`, then copy `.env.example` to `.env.local` and fill it in
- Dev: `npm run dev`
- Lint: `npm run lint` (autofix: `npm run lint:fix`)
- Format: `npm run format`
- Build: `npm run build`
- Tests: none exist. Verify with lint + build + a manual check in the dev server.

## Repo map

```
app/            Next.js routes; tenant pages under app/org/[org_id]/, iframe entry in app/embed/
components/     All UI; primitives in components/UI/, dialogs in modals/, drawers in sliders/
config/         API clients per backend domain (index.js re-exports most)
store/          Redux: store.js, action/ (thunks), reducer/ (slices)
customHooks/    Hooks (canonical). hooks/ is a small legacy second folder
utils/          utility.js (shared helpers), enums.js (MODAL_TYPE, constants), interceptor.js (axios)
public/         gtwy.js, gtwy_dev.js, gtwy_embed_local.js: embed loader scripts for customer sites
wrapper/        Client provider shell (Redux, PersistGate, PostHog, Toaster)
```

## Critical rules

- "Bridge" in code means **agent**. Don't rename `bridge*` symbols or the misspelled files and slices (`gwtyAgent`, `orchetralFlow`).
- Read Redux state only with `useCustomSelector` (`@/customHooks/customSelector`).
- **Data flow is always component → action → API → reducer.** Components dispatch a thunk from `store/action/*`; the thunk calls `config/*Api.js` (axios from `@/utils/interceptor`) and dispatches a reducer; components read the result with `useCustomSelector`. Never import `config/*` in `components/` or `app/`.
- Search `utils/utility.js` and `customHooks/` before writing a helper or hook.
- Modals: `<Modal MODAL_ID={MODAL_TYPE.X}>` + `openModal`/`closeModal`; the ID goes in `utils/enums.js`.
- Authenticated pages: `export default Protected(Page)`.
- No commented-out code (an ESLint error). Hooks lint rules are disabled, so check hook deps by hand.
- Use DaisyUI semantic color classes; no hardcoded colors (embed themes override variables at runtime).
- `NEXT_PUBLIC_*` env vars are public; never put secrets in them.
- Embed changes: update all three `public/gtwy*.js` scripts and follow docs/AI_INSTRUCTIONS.md § Embed.
- If a request is ambiguous or conflicts with these docs, ask before coding.

## Before finishing a task

- Run `npm run lint` and `npm run build`.
- Commit messages follow Conventional Commits (`feat:`, `fix:`, …), enforced by commitlint. PRs target `testing`.
- If you added a route, slice, API client, env var, shared component, hook or convention, update the matching file in `docs/ai/` and add a line to the Changelog in `docs/ai/ARCHITECTURE.md`.
