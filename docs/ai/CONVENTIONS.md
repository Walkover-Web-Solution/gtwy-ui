# Conventions & Recipes

Design principles (one intent per screen, one primary CTA, the cards-versus-table density rule, empty states, the AI "pulse" state) are in [../AI_INSTRUCTIONS.md](../AI_INSTRUCTIONS.md). Follow them for any UI work.

## Naming

- Components: PascalCase `.js` (some `.jsx`/`.tsx`). Name by job and feature: `KnowledgeBaseModal.js`, `BridgeVersionDropdown.js`.
- Modals: `components/modals/<Feature>Modal.js`. Modal IDs go in `MODAL_TYPE` in `utils/enums.js`.
- Hooks: `useX.js` in `customHooks/`.
- Thunks: `<verb><Thing>Action` in `store/action/<domain>Action.js`.
- Slice reducers: `<thing>Reducer` exported from `store/reducer/<domain>Reducer.js`. The default export is `slice.reducer`.
- API functions: plain verbs (`getAllBridges`, `saveApiKeys`) in `config/<domain>Api.js`.
- Constants: `UPPER_SNAKE_CASE` in `utils/enums.js`.
- Backend payload fields stay `snake_case` (`org_id`, `bridge_id`). New **public embed keys** are `snake_case` too (see `KEY_ALIASES` in `public/gtwy.js`).
- Element `id` / `data-testid`: kebab-case, prefixed by the component (`template-name-create-button`).

## Code style (enforced)

- Prettier (`.prettierrc.json`): double quotes, semicolons, `printWidth` 120, 2 spaces, `trailingComma: es5`.
- Imports use the `@/` alias (maps to the repo root). `import/no-unresolved` is an error.
- `unused-imports/no-unused-imports` and `no-unused-vars` are errors; prefix intentionally unused variables with `_`.
- `no-restricted-imports` blocks `@/config/*` in `app/`, `components/`, `customHooks/`, `hooks/` and `wrapper/`. Only `store/action/*` may import API clients.
- `no-commented-code` is an **error**. Delete dead code instead of commenting it out.
- Hooks lint rules (`rules-of-hooks`, `exhaustive-deps`) are **off**, so check dependency arrays and conditional hooks yourself.

## Do

- Read state with `useCustomSelector` from `@/customHooks/customSelector`, returning an object of the fields you need.
- Put new network calls in `config/<domain>Api.js` using `import axios from "@/utils/interceptor"`, and export them from `config/index.js`.
- **Always follow component → action → API → reducer.** The component dispatches a thunk from `store/action/`; the thunk calls the `config/*` function and dispatches a slice reducer with the result; the component reads it back with `useCustomSelector`. Toasts and tracking live in the thunk.
- Get user-facing error text from `getErrorMessage(error)` / `handleApiError(error)` in `utils/errorHandler.js`.
- Build modals on `<Modal MODAL_ID={MODAL_TYPE.X} title=…>` and control them with `openModal` / `closeModal`.
- Use `useDeleteOperation` + `DeleteModal` for destructive actions.
- Lazy-load heavy components with `next/dynamic` and `LoadingSpinner`.
- Wrap authenticated pages with `export default Protected(Page)`.
- Track meaningful user actions with `trackUserAction` (`utils/posthog.js`).
- Use DaisyUI semantic colors (`base-content`, `base-100/200/300`, `primary`, `error`) so light, dark and embed themes all work.

## Don't

- Don't use bare `axios` or `fetch` for backend calls; they skip the auth headers and the 401 handling.
- **Don't call APIs from components or pages.** No `import … from "@/config/…"` in `components/` or `app/`, even for one-off calls or calls whose result isn't stored. Write a thunk (it can `return` the response) and dispatch it. ESLint (`no-restricted-imports`) fails the build on violations.
- Don't guess an API function's argument style. `config/*` mixes single-object signatures (`getInvitedUsers({ page, limit, search })`) and positional ones (`getBridgeConfigHistory(versionId, page, pageSize, filters)`). A mismatch fails silently (e.g. `?search=undefined`). Read the signature, and match it in the action and the call site.
- Don't use `useSelector` directly. In `useCustomSelector`, select raw fields rather than doing heavy transforms (deep comparison runs on every store update).
- Don't rename `bridge*` symbols, or the misspelled files and slices (`gwtyAgent`, `orchetralFlow`, `AdvancedParamenter`). Many imports depend on them.
- Don't change the shape of a persisted slice (see the whitelist in `store/store.js`) without handling old rehydrated state.
- Don't hardcode colors (hex or rgb) in components; embed themes override DaisyUI variables at runtime.
- Don't add a helper before searching `utils/utility.js` and [UTILITIES.md](UTILITIES.md).
- Don't put secrets in `NEXT_PUBLIC_*` variables; they are bundled into client JS.
- Don't edit only one of `public/gtwy.js`, `gtwy_dev.js`, `gtwy_embed_local.js`; change all three.
- Don't use local `useState` for modal visibility (except for internal sub-modals).

## Styling

Tailwind v4 is configured in CSS: `app/globals.css` has `@import "tailwindcss"`, `@plugin "daisyui"` (themes `light` default and `dark`), custom `@plugin "daisyui/theme"` blocks and an `@theme` block. There is no `tailwind.config.js`. The theme is switched by `data-theme` on `<html>` (`useThemeManager`). Embed themes inject CSS variables via `utils/themeLoader.js`. Some surfaces use CSS variables such as `var(--ai-config-container-bg)` (see `components/UI/Modal.jsx`).

## Recipes

### Add a page under an org

1. Create `app/org/[org_id]/<route>/page.js` and copy `app/org/[org_id]/metrics/page.js` (`"use client"`, `Protected`) or `app/org/[org_id]/alerts/page.js` (role gate).
2. Add `export const runtime = "edge";` to match the neighbouring pages.
3. Read `org_id` with `useParams()`. Org-wide data is already loaded by `app/org/[org_id]/layout.js`; don't refetch it.
4. Use `PageHeader` + `MainLayout` for chrome.
5. Add a nav entry in `components/sliders/MainSlider.js` if the page needs one.

### Add an API call + Redux data

1. `config/<domain>Api.js`: `export const getThing = async (id) => axios.get(\`${URL}/api/thing/${id}\`)`(follow the try/catch style in`config/bridgeApi.js`).
2. If it's a new file, add `export * from "./<domain>Api";` to `config/index.js`.
3. `store/reducer/<domain>Reducer.js`: `createSlice` with `initialState` and reducers. Key data by `org_id` (`state.things[org_id]`) as `apiKeysReducer.js` does. Export the actions and default-export `.reducer`.
4. New slice: register it in `combineReducers` in `store/store.js`, and add it to `whitelist` only if it must survive reloads.
5. `store/action/<domain>Action.js` (one-off call with nothing to store: a pass-through `export const thingAction = (params) => async () => getThing(params);`): `export const getThingAction = (id, orgId) => async (dispatch) => { try { … dispatch(setThingReducer(…)) } catch (e) { handleApiError(e) } }`. Copy `store/action/apiKeyAction.js`.
6. Component: `const things = useCustomSelector((s) => s.<key>.things?.[orgId] || [])`, and `dispatch(getThingAction(...))` in an effect.

### Add a modal

1. Add `MY_MODAL: "my_modal"` to `MODAL_TYPE` in `utils/enums.js`.
2. Create `components/modals/MyModal.js` and copy `components/modals/TemplateNameModal.js`.
3. Render `<MyModal />` once in the page or parent. Open it with `openModal(MODAL_TYPE.MY_MODAL)`.

### Add a slider (side drawer)

Copy an existing file in `components/sliders/`. Give the root a stable `id`, start it translated off-screen, and toggle it with `toggleSidebar(id, "left" | "right")` from `utils/utility.js`.

### Add a hook

Create `customHooks/useThing.js` (not `hooks/`) and list it in [UTILITIES.md](UTILITIES.md).

### Add an embed config option

Follow [../AI_INSTRUCTIONS.md § Guidelines for Modifying Embed](../AI_INSTRUCTIONS.md#guidelines-for-modifying-embed): `EMBED_*_KEYS` in `utils/enums.js` → the message handler in `app/embed/layout.js` → `embedUserDetails` in `store/reducer/appInfoReducer.js` → `CONFIG_SCHEMA` in `utils/integrationSliderUtils.js`.

### Add an environment variable

1. Name it `NEXT_PUBLIC_*` if client code reads it. Every value becomes public.
2. Add the name, with no value, to `.env.example`.
3. Read it once at the top of the consuming `config/*.js` file (`const URL = process.env.NEXT_PUBLIC_…`).
4. Add a row to [DATA_MODEL.md § Environment variables](DATA_MODEL.md#environment-variables).

### Add a provider icon

Add `icons/<Provider>Icon.tsx` using `SvgHoc.tsx`, then map it in `getIconOfService` in `utils/utility.js`.

## Testing

There is no automated test suite and no test runner in `package.json`. Before finishing, run `npm run lint` and `npm run build`, then manually exercise the changed flow with `npm run dev`. Keep adding `id` / `data-testid` attributes; they appear to support external E2E tests (inferred).

## Git / PR

- Default and PR base branch: `testing`.
- Commits must pass commitlint (`commitlint.config.js`): `type: subject` with type one of `feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert`.
- The pre-commit hook (`.husky/pre-commit`) runs lint-staged: Prettier, then `next lint --fix` on staged JS/TS (`scripts/lint-staged.js`). A lint error blocks the commit.
