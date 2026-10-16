# CLAUDE.md

@AGENTS.md

## Claude Code specifics

- Detailed docs live in `docs/ai/`. Read the file for the area you're touching instead of loading all of them.
- Hub files are large (`utils/utility.js` about 1,500 lines, `store/action/bridgeAction.js` about 1,000, `app/org/[org_id]/layout.js` about 700). Grep for the symbol and read only that range.
- There are no tests. "Done" means `npm run lint` passes, `npm run build` passes and the flow was checked in `npm run dev`. Say which of these you actually ran.
- Check whether a dev server is already running (`lsof -ti:3000 -sTCP:LISTEN`) before `npm run build`. Building in the same checkout breaks it (see Known pitfalls in docs/ai/ARCHITECTURE.md).
