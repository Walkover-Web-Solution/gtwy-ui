# Utilities, Hooks & Services

Check here before writing a new helper. A new function that duplicates one in `utils/utility.js` is the most likely mistake in this repo. Rule of three: logic used in more than two places moves to `utils/`.

## Core utilities — `utils/utility.js` (1,500 lines, 164 importers)

| Group              | Functions                                                                                                                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Modals & sliders   | `openModal(id)`, `closeModal(id)`, `focusDialogWhenOpen`, `toggleSidebar(id, direction)`, `openSidebar`, `closeSidebar`, `collapseMainSlider`                                                                            |
| Cookies / auth     | `setInCookies(name, value)`, `getFromCookies(name)`, `removeCookie(name)`, `clearCookie()`, `getSubdomain()`, `buildEmbedLoginUrl`                                                                                       |
| Embed bridge       | `sendDataToParent(status, data, message)`: `postMessage` to the host page                                                                                                                                                |
| Validation         | `isValidJson`, `validateUrl`, `isValidDomain`, `toBoolean`                                                                                                                                                               |
| Services/models    | `getIconOfService(service)`, `getServiceDisplayName`, `isServiceAllowedByPlan`, `handleResponseFormat`                                                                                                                   |
| Filtering          | `filterBridges(list, query)`, `filterOrganizations(list, query)`, `renderedOrganizations`                                                                                                                                |
| Prompt / variables | `extractPromptVariables`, `HIDDEN_VARIABLE_KEYS`, `omitHiddenVariables`, `transformAgentVariableToToolCallFormat`, `generateKeyValuePairs`                                                                               |
| Objects / JSON     | `updatedData`, `flattenParameters`, `trimPropertyNames`, `parseNestedJson`, `createDiff`                                                                                                                                 |
| Formatting         | `formatDate`, `formatRelativeTime`, `formatTimeUntil`, `toUtcIso`, `formatCostValue`, `formatTokensTable`, `getStatusClass`, `getApiKeyStatusClass`                                                                      |
| Usage limits       | `LIMIT_RESET_PERIOD_LABELS`, `normalizeLimitResetPeriod`, `getNextLimitReset`, `formatNextLimitReset`                                                                                                                    |
| Errors             | `extractErrorMessage(errorStr)`                                                                                                                                                                                          |
| Multi-tab          | `markUpdateInitiatedByCurrentTab(agentId)`, `didCurrentTabInitiateUpdate(agentId)`                                                                                                                                       |
| Misc               | `generateRandomID(len)`, `copyToClipboard`, `simulateStreaming`, `updateTitle`, `useOutsideClick` (a hook living in utils), `createConversationForTestCase`, `GetFileTypeIcon`, `GetPreBuiltToolTypeIcon`, `getToolName` |

## Other `utils/` files

| File                                                                                                                                                                                                                                     | Purpose                                                                                                                                                           |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `utils/enums.js`                                                                                                                                                                                                                         | Constants (127 importers): `MODAL_TYPE` (every modal ID), table column sets, `EMBED_*_KEYS`, `PRE_TOOL_*`, `TUTORIALS`, `TIME_RANGE_OPTIONS`, `getStatsConfig`, … |
| `utils/interceptor.js`                                                                                                                                                                                                                   | Axios instance with auth headers, 401 redirect and single retry. `rawAxios` skips the interceptors                                                                |
| `utils/errorHandler.js`                                                                                                                                                                                                                  | `getErrorMessage(error)`, `handleApiError(error, fallback)` (toasts), `isNetworkError`                                                                            |
| `utils/posthog.js`                                                                                                                                                                                                                       | `trackUserAction(event, props)`                                                                                                                                   |
| `utils/themeLoader.js`                                                                                                                                                                                                                   | `applyThemeObject()`, `VAR_ALIAS_MAP`: embed OKLCH theme → DaisyUI CSS variables                                                                                  |
| `utils/integrationSliderUtils.js`                                                                                                                                                                                                        | `CONFIG_SCHEMA`: 80+ embed config options                                                                                                                         |
| `utils/unsavedPromptGuard.js`                                                                                                                                                                                                            | Navigation guard for unsaved prompt edits (12 importers)                                                                                                          |
| `utils/variableValidation.js`                                                                                                                                                                                                            | `cleanVariablesPathByFields` and other variable checks                                                                                                            |
| `utils/promptUtils.js`, `templateEngine.js`                                                                                                                                                                                              | Prompt section handling and `{{variable}}` templating                                                                                                             |
| `utils/jevQuestions.js`                                                                                                                                                                                                                  | TypeSafe/Jev service: `JEV_SERVICE`, `isJevService`, question types and examples                                                                                  |
| `utils/executionTraceTransform.js`                                                                                                                                                                                                       | Shapes history data for `historyUi/executionTrace`                                                                                                                |
| `utils/attachmentUtils.js`, `colorUtils.js`, `timezoneData.js`, `markdownComponents.js`, `defaultJsonSchemas.js`, `comparisonCheck.js`, `billingPrice.js`, `billingReturn.js`, `gtwySkill.js`, `mainSliderHelper.js`, `sliderUtility.js` | Single-purpose helpers named after their job                                                                                                                      |

## Hooks — `customHooks/` (canonical) and `hooks/`

| Hook                                                        | File                                    | Purpose                                                                                         |
| ----------------------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `useCustomSelector(fn)`                                     | `customHooks/customSelector.js`         | `useSelector` with deep `isEqual`. **Always use this** (148 importers)                          |
| `useConfigurationSelector`, `usePromptSelector`             | `customHooks/useOptimizedSelector.js`   | Memoized selectors for the configuration page                                                   |
| `useConfigurationState`                                     | `customHooks/useConfigurationState.js`  | Configuration page state                                                                        |
| `useDeleteOperation(modalType, opts)`                       | `customHooks/useDeleteOperation.js`     | `{ isDeleting, error, executeDelete(fn, ...args) }`; keeps the modal open until the API settles |
| `useThemeManager` / `ThemeManager`                          | `customHooks/useThemeManager.js`        | Light/dark/system and `data-theme`; returns `actualTheme`                                       |
| `useRtLayerEventHandler`                                    | `customHooks/useRtLayerEventHandler.js` | Realtime events → Redux                                                                         |
| `useEmbedScriptLoader`, `isValidEmbedToken`                 | `customHooks/embedScriptLoader.js`      | Loads chatbot/KB/alerting embed scripts                                                         |
| `useMetricsData`, `convertApiData`, `aggregateDataByFactor` | `customHooks/useMetricsData.js`         | Metrics processing                                                                              |
| `useMetricsURL`, `useQueryParams`                           | `customHooks/`                          | URL ↔ state sync                                                                                |
| `usePortalDropdown`                                         | `customHooks/usePortalDropdown.js`      | Dropdown positioning in a portal                                                                |
| `useExpandableList`, `useJevQuestions`, `useSubscription`   | `customHooks/`                          |                                                                                                 |
| `useFolders`, `useTutorialVideos`                           | `hooks/`                                | Second hooks folder. Put new hooks in `customHooks/`                                            |

## API clients — `config/`

One file per backend domain. Each exports `async` functions that use `axios` from `@/utils/interceptor` and return the axios response (or `response.data`; check the function). `config/index.js` re-exports all of them **except `billingApi.js` and `walletApi.js`**. Endpoints are listed in [DATA_MODEL.md](DATA_MODEL.md#api-endpoints-by-client-file). **Only `store/action/*` may import these** (ESLint `no-restricted-imports`).

## Redux actions — `store/action/`

Thunks shaped `(args) => async (dispatch, getState) => { … }` that call `config/*`, dispatch slice reducers, toast and track. Hubs: `bridgeAction.js` (61 importers, about 1,000 lines), `orgAction.js`, `historyAction.js`. No `createAsyncThunk` is used anywhere; keep writing plain thunks.

Two kinds of thunk live side by side:

| Kind         | Shape                                                                                       | Use when                                                                                                  | Example                                                                         |
| ------------ | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Stateful     | `try { const r = await api(); dispatch(setXReducer(r)); toast… } catch { handleApiError… }` | The result belongs in Redux                                                                               | `saveApiKeysAction` (`apiKeyAction.js`)                                         |
| Pass-through | `export const xAction = (params) => async () => xApi(params);`                              | One-off call whose result stays in the component (login, switch org, optimize prompt, rerun, buy credits) | Grouped under a `// Pass-through thunks` comment at the end of each action file |

A pass-through returns the API's value unchanged and lets errors propagate, so the component keeps its own try/catch. Call it as `const res = await dispatch(xAction(params))`. Before writing one, check whether a stateful action already exists. Don't reuse a stateful action from a component that expects the raw response or a thrown error; stateful actions usually swallow errors and return `undefined`.

| Action file                                            | Domain                                                                     |
| ------------------------------------------------------ | -------------------------------------------------------------------------- |
| `authAction.js`, `authkeyAction.js`                    | Login, user switch, logout, auth keys                                      |
| `orgAction.js`                                         | Orgs, org switch, members, invites, blocked orgs                           |
| `bridgeAction.js`                                      | Agents, versions, tools, prompt/JSON/schema optimizers, templates, uploads |
| `historyAction.js`                                     | Threads, messages, recursive history                                       |
| `modelAction.js`                                       | Models, dry run (test chat), rerun                                         |
| `knowledgeBaseAction.js`                               | KB docs, resource chunks, KB query                                         |
| `integrationAction.js`                                 | Embed configs, embed/affiliate tokens, embed login                         |
| `analyticsAction.js`, `metricsAction.js`               | Analytics, metrics, fine-tune export                                       |
| `walletAction.js`, `planAction.js`, `billingAction.js` | Wallet, credits, plans, invoices, subscription/checkout                    |
| `chatBotAction.js`, `richUiTemplateAction.js`, …       | One file per remaining domain (see `ls store/action`)                      |
