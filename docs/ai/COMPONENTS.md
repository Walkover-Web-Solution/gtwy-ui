# Component Catalog

All UI lives in `components/` (about 280 files). Folder strategy and design rules are in [../AI_INSTRUCTIONS.md](../AI_INSTRUCTIONS.md); this file is the lookup table. Coverage was sampled, not exhaustive: run `ls components/<folder>` for the full list.

## Component tree (app shell)

```
RootLayout                      app/layout.js            (fonts, GTM, edge runtime)
├── PaletteFocusGuard           components/PaletteFocusGuard.js
├── Wrapper                     wrapper/Wrapper.js       ("use client")
│   ├── <Provider store> + <PersistGate>                 store/store.js
│   ├── PostHogProvider         components/PostHogProvider.js
│   ├── {children}
│   │   └── /org/[org_id]/* →   app/org/[org_id]/layout.js  (wrapped with Protected)
│   │        ├── Navbar         components/Navbar.js        (dynamic import)
│   │        ├── MainSlider     components/sliders/MainSlider.js (left nav)
│   │        ├── BlockedOrgBanner, ServiceInitializer, KeyboardShortcutsModal, ChatDetails
│   │        └── page
│   ├── CommandPalette          components/command/CommandPalette.js
│   └── <Toaster> portal        mounted inside the top-most open <dialog>, else <body>
└── NetworkStatus               components/NetworkStatus.js
```

## Primitives — `components/UI/` and shared root components

| Component                                                           | File                                                | Key props                                                                                                                             | Notes                                                                                                                                                                     |
| ------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Modal`                                                             | `components/UI/Modal.jsx`                           | `MODAL_ID`, `title`, `description`, `icon`, `footer`, `widthClass`, `onClose`, `children`                                             | Wraps a native `<dialog id={MODAL_ID}>`. With `title` it renders a standard header, scrolling body and footer. Open and close with `openModal`/`closeModal`. 53 importers |
| `ConfirmationModal`                                                 | `components/UI/ConfirmationModal.jsx`               | `modalType`, `title`, `message`, `onConfirm`, `onCancel`, `confirmText`, `confirmButtonClass`, `icon`                                 | Generic confirm dialog                                                                                                                                                    |
| `DeleteModal`                                                       | `components/UI/DeleteModal.jsx`                     | `modalType` (default `MODAL_TYPE.DELETE_MODAL`), `onConfirm`, `item`, `name`, `title`, `description`, `loading`, `isAsync`, `warning` | Pair with `useDeleteOperation`                                                                                                                                            |
| `Dropdown`                                                          | `components/UI/Dropdown.jsx`                        | `options`, `value`, `onChange`, `placeholder`, `searchable`, `size`, `disabled`                                                       | Use instead of a raw `<select>`                                                                                                                                           |
| `SearchItems`                                                       | `components/UI/SearchItems.js`                      | `data`, `setFilterItems`, `item`, `placeholder`, `onSearchChange`                                                                     | List filter input; syncs with search params                                                                                                                               |
| `ExpandCollapse`, `AutoResizeTextarea`, `LimitUsageCell`, `ThemeUi` | `components/UI/`                                    | —                                                                                                                                     |                                                                                                                                                                           |
| `CustomTable`                                                       | `components/customTable/CustomTable.js`             | `data`, `columnsToShow`, `sorting`, `sortingColumns`, `handleRowClick`, `showRowSelection`, `endComponent`                            | Standard table for lists of 15+ rows (density rule)                                                                                                                       |
| `PageHeader`                                                        | `components/Pageheader.js`                          | `title`, `description`, `docLink`                                                                                                     | Top of every org page                                                                                                                                                     |
| `MainLayout`                                                        | `components/layoutComponents/MainLayout.js`         | `withPadding`                                                                                                                         | Page body wrapper                                                                                                                                                         |
| `InfoTooltip`                                                       | `components/InfoTooltip.js`                         | `tooltipContent`, `docLink`, `video`, `disabled`                                                                                      | Floating-UI tooltip, can open a tutorial video                                                                                                                            |
| `LoadingSpinner`                                                    | `components/LoadingSpinner.tsx`                     | `height`, `width`, `inline`, `size`                                                                                                   | Default `loading:` for `next/dynamic`                                                                                                                                     |
| `CodeBlock`                                                         | `components/codeBlock/CodeBlock.js`                 | `className` (language), `showCopy`, `plain`                                                                                           | Markdown code renderer                                                                                                                                                    |
| `CopyButton`                                                        | `components/copyButton/CopyButton.tsx`              | —                                                                                                                                     | Or `copyToClipboard()` from `utils/utility.js`                                                                                                                            |
| Icons                                                               | `components/Icons.js` (84 importers), `icons/*.tsx` | —                                                                                                                                     | App icons, and provider brand icons via `SvgHoc.tsx`. Prefer `lucide-react` for generic glyphs                                                                            |
| Skeletons                                                           | `components/skeletons/`                             | —                                                                                                                                     | `ConfigurationSkeleton`, `AnalyticsSkeleton`, `NavbarSkeleton`                                                                                                            |
| `Protected` (HOC)                                                   | `components/Protected.js`                           | wraps a page; injects `isEmbedUser`, `isFocus`                                                                                        | `export default Protected(Page)`                                                                                                                                          |

## Feature components

### Agent configuration — `components/configuration/` (largest area)

| Component                                           | File                                                                                                                   | Purpose                                                                                                                                                                        |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ConfigurationPage`                                 | `components/configuration/ConfigurationPage.js`                                                                        | Left pane of `agents/configure/[id]`                                                                                                                                           |
| `ConfigurationProvider` / `useConfigurationContext` | `components/configuration/ConfigurationContext.js`                                                                     | Context shared by all config sections (18 importers). Throws if used outside the provider                                                                                      |
| Tabs                                                | `components/configuration/sections/{Prompt,Model,Connectors,Memory,Settings,IntegrationGuide}Tab.js`                   | One per config tab                                                                                                                                                             |
| Section layouts                                     | `components/configuration/sections/layouts/{Accordion,Stacked,Stepper}SectionsLayout.js`, `useGuardedSectionChange.js` | Layout variants for the tabs                                                                                                                                                   |
| `Chat`, `ChatTextInput`                             | `components/configuration/Chat.js`                                                                                     | Right-pane test chat                                                                                                                                                           |
| Building blocks                                     | `components/configuration/configurationComponent/*` (48 files)                                                         | `ModelDropdown`, `ServiceDropdown`, `PromptTextarea`, `EmbedList`, `KnowledgebaseList`, `McpServerList`, `FallbackModel`, `ResponseFormatSelector`, `BridgeVersionDropdown`, … |
| Jev / TypeSafe                                      | `components/configuration/JevQuestionsPanel.js`, `JevAnswers.js`                                                       | Question editor for the `typesafe` service (`utils/jevQuestions.js`)                                                                                                           |

### History — `components/historyUi/`, `components/historyPageComponents/`

`historyPageComponents/` holds the thread list and chat pane (`Sidebar`, `ThreadContainer`, `ThreadItem`, `ChatDetails`, `BatchSubthreadPanel`). `historyUi/` holds per-message visualizations (`MainAgentUi`, `ChildAgentUI`, `ToolFullSlider`, `components/historyUi/executionTrace/ExecutionTraceView.jsx`; data shaped by `utils/executionTraceTransform.js`).

### Other feature folders

| Folder                             | Purpose                                                                                                                                                                |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/modals/` (43)          | All dialogs, named `<Feature>Modal.js`. Small reference: `TemplateNameModal.js`                                                                                        |
| `components/sliders/` (7)          | Side drawers: `MainSlider` (app nav), `BridgeSlider`, `OrgSlider`, `ChatBotSlider`, `ConfigHistorySlider`, `VariableCollectionSlider`. Toggle with `toggleSidebar(id)` |
| `components/integration/`          | Embed integration detail view: configuration, testing, analytics, event logs                                                                                           |
| `components/gtwy_embed/`           | Embed-only editors: `ThemePaletteEditor`, `EmbedPromptBuilder`, `ToolsConfiguration`                                                                                   |
| `components/ragEmbed/`             | RAG embed setup and testing tabs                                                                                                                                       |
| `components/chatbotConfiguration/` | Chatbot config wizard (`FirstStep`, `SecondStep`, preview, guide)                                                                                                      |
| `components/richUI/`               | JSON-to-UI renderer: `componentRegistry.js` maps node types to `components/*Component.js`; `RenderNode.js` recurses                                                    |
| `components/metrics/`              | `MetricsChart` (Recharts), `MetricsFilters`, `TokenUsageOverview`                                                                                                      |
| `components/folders/`              | `FolderContext`, `FolderTabs`, `MoveToFolderMenu`, `ResourcePage`                                                                                                      |
| `components/testcaseComponents/`   | Test case editing panels and dropdowns                                                                                                                                 |
| `components/organization/`         | Org grid, search, `BlockedOrgBanner`, `ServiceInitializer`                                                                                                             |
| `components/wallet/`               | `WalletCard`, `WalletSidebarWidget`                                                                                                                                    |
| Root-level files                   | Large standalone features: `Navbar.js`, `AgentToAgentConnection.js` (xyflow canvas), `Playground.js`, `OnBoarding.js`, `Tutorial.js`                                   |

## Patterns

- **Client components everywhere.** Pages start with `"use client"`. Heavy children load with `next/dynamic` and `{ loading: () => <LoadingSpinner /> }`. See `app/org/[org_id]/agents/configure/[id]/page.js`.
- **Data:** read with `useCustomSelector((state) => ({ … }))`, returning an object; deep equality prevents re-renders. Write with `dispatch(someAction())` from `store/action/*`.
- **Local UI state** (tabs, inputs) uses `useState`. Modal open/close goes through the DOM `<dialog>` with `openModal`/`closeModal`, not React state.
- **Test hooks:** interactive elements carry a stable `id` and often a `data-testid` (211 files). Keep adding them, kebab-case and prefixed by the component, e.g. `template-name-create-button`.
- **Styling:** DaisyUI classes (`btn btn-sm btn-primary`, `input input-md`, `modal`) plus Tailwind utilities and semantic colors (`text-base-content`, `bg-base-200`, `border-base-content/10`). See [CONVENTIONS.md § Styling](CONVENTIONS.md#styling).
- **Role gating:** `state.userDetailsReducer.organizations[org_id].role_name`; `"Viewer"` gets a locked view. See `app/org/[org_id]/alerts/page.js`.
- **Reference files to copy:** modal → `components/modals/TemplateNameModal.js`; page → `app/org/[org_id]/alerts/page.js` (small) or `app/org/[org_id]/metrics/page.js` (with `Protected`).
