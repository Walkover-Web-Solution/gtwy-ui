While writing or modifying code, do not act under uncertainty.
If the user input is not 100% clear, ask clarifying questions.
If the request conflicts with existing AI guidelines or framework rules, pause and ask questions to resolve the conflict before proceeding.

# DESIGN CONSTITUTION (AI-ONLY)

## Prime Directive

Design = **maximum clarity with minimum UI**.
Remove friction until intent is obvious.
If it's not necessary for the current intent, it must not exist.

---

## Decision Order (Always)

1. **Single intent** per screen
2. **Visual hierarchy** (first / second / last)
3. **Reduction** (remove without losing meaning)

Multiple intents = invalid design.

---

## First-Principles Laws

- Clarity > Features
- Flow > Flexibility
- Meaning > Options

If the user has to think, redesign.

---

## Golden Ratio Law

When dividing space or attention:

- Use **~62% / 38%** dominance
- One side must clearly lead
- Symmetry only when intent is equal

Balance = visual weight, not equality.

---

## Layout Rules

- Flow: **top → bottom**, broad → narrow
- Hierarchy before components
- Containers may be centered
- **Content is always left-aligned**

---

## Geometry System

Hybrid geometry:

- Default: sharp
- If friction → fully rounded
- Else → semi-rounded

Rounded = interactive
Sharp = structural

Consistency > preference.

---

## Density Rules

- <15 items → cards
- ≥15 items → list / table

Scanning beats decoration.

---

## Empty State Law

Empty space must:

- Explain purpose
- Indicate next action

No silent emptiness.

---

## Pulse Law (AI State Transparency)

Every AI action must expose state:
Idle → Thinking → Success / Failure.

Never allow a static control during processing.

---

## Responsive Intent Law

If intent is not clear at ~390px width without horizontal scroll, redesign.

---

## Actions & CTAs

- One **Primary** action only
- Secondary only if unavoidable
- Cancel / Discard = plain text

Icons only if they reduce cognition.
Copy actions never use buttons.

---

## Absolute Rule

If it feels:

- Clever → remove
- Powerful → simplify
- Complex → redesign

Best design is invisible.

# Component Structure Rule

The component architecture uses a hybrid organization strategy: generic UI elements are grouped by type (e.g., modals, sliders) for consistent behavior, while complex features are grouped by domain (e.g., chat, configuration) to keep business logic co-located.

## Folder Strategy

The `/components` directory is organized primarily by **feature context** and **UI pattern**.

### 1. High-Level Categories

- **`/components/common`**:
  - Contains reusable, atomic UI primitives used across the application.
  - Examples: Buttons, Inputs, Cards that don't satisfy a specific business logic but a UI need.

- **`/components/modals`**:
  - Contains all popup modals used in the application.
  - **Naming Convention**: `[FeatureName]Modal.js` (e.g., `KnowledgeBaseModal.js`).
  - **Usage**: Typically controlled by local state or Redux state triggers.

- **`/components/sliders`**:
  - Contains side-sheet / drawer components (sliders).
  - **Usage**: Used for complex forms or details that slide in from the create/edit actions.

- **`/components/configuration`**:
  - Contains components specific to the "Configuration" feature of the middleware.
  - Examples: `ChatbotConfigSection.js`, `Chat.js`.

### 2. Feature-Specific Directories

When a feature is complex, it gets its own directory within `components`.

- **`/components/chat`**: Components related to the chat interface.
- **`/components/organization`**: Components for organization management.
- **`/components/metrics`**: Analytics and dashboard components.

Naming convention and structure

1. **Descriptive Naming**:
   - Component filenames should describe _what_ they do and _where_ they belong if specific.
   - Example: `KnowledgeBaseResourceModal.js` clearly indicates it's a Modal for Knowledge Base Resources.

2. **Prop Drilling vs. Redux**:
   - Major data (User, Org, Models) is accessed via Redux `useCustomSelector`.
   - Local UI state (isModalOpen, activeTab) is kept in `useState`.
   - AI agents should look at `store/action` files to understand how to fetch data for a component.

3. **File Size**:
   - Keep components focused. If a file exceeds 300-400 lines, consider breaking it down into sub-components in a sub-folder.

## Component Creation Pattern

When creating a new component:

1. **Determine Scope**:
   - Is it a global UI element? -> `/components/common`
2. **Modal Implementation**:
   - **Wrapper**: Always wrap the modal content size and logic within the generic `<Modal>` component from `@/components/UI/Modal`.
   - **ID Management**:
     - Add a unique ID to `MODAL_TYPE` in `@/utils/enums.js`.
     - Pass this ID to the `MODAL_ID` prop of the `<Modal>` component.
   - **Control**:
     - Use `openModal(MODAL_TYPE.YOUR_ID)` and `closeModal(MODAL_TYPE.YOUR_ID)` from `@/utils/utility` to control visibility.
     - Do not create local state for open/close unless absolutely necessary for internal sub-modals.

3. **Utility Refactoring**:
   - **Rule of Three**: If a function or logic is used in more than two places, move it to `@/utils/utility.js` (or a specific utility file like `timeUtils.js`).
   - **Check First**: Always search `@/utils/utility.js` before writing a new helper function.

4. **Use Existing Logic First**:
   - **Sliders**: If creating a slide-over panel, do not build from scratch. Use existing slider components in `/components/sliders` and control them using `toggleSidebar` from `@/utils/utility`.
   - **Custom Hooks**: Check `/customHooks` before writing complex effects. Common operations like deletion (`useDeleteOperation`), dropdown positioning (`usePortalDropdown`), or metrics fetching (`useMetricsData`) are already abstracted.
   - **Utility Functions**: Avoid creating ad-hoc helpers. Use `@/utils/utility.js` for:
     - Cookie/Auth management (`setInCookies`, `getFromCookies`)
     - Validation (`isValidJson`, `validateUrl`)
     - UI Logic (`openModal`, `closeModal`, `toggleSidebar`)
     - Data formatting (`updatedData`, `removeDuplicateFields`)

---

# Embed Architecture

The embed system allows GTWY agents to be embedded as iframes in external websites. It is a core product surface and touches multiple layers of the application.

## High-Level Flow

```
External Website                         GTWY Embed (iframe)
─────────────────                        ────────────────────
<script id="gtwy-main-script"           app/embed/layout.js
  embedToken="..." src="gtwy.js" />        ↓
        ↓                               Parses URL params → sets sessionStorage
GtwyEmbedManager (public/gtwy.js)       Dispatches setEmbedUserDetailsAction()
  → POST /api/embed/login                   ↓
  → Creates iframe container             Redux: appInfoReducer.embedUserDetails
  → Exposes window.openGtwy()               ↓
        ↓                               Renders agent UI (chat, config, etc.)
postMessage('gtwyInterfaceData', {...})      ↓
        ↑                               sendDataToParent(status, data, message)
postMessage({ type: 'gtwy', ... })       → window.parent.postMessage(...)
```

## Key Files

| File                              | Purpose                                                                                                                                                     |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public/gtwy.js`                  | Embed manager script loaded on external sites. Creates iframe, handles auth, exposes global API (`window.openGtwy`, `window.closeGtwy`, `window.GtwyEmbed`) |
| `app/embed/layout.js`             | Iframe entry point. Parses URL params, listens for `postMessage`, dispatches Redux state, routes to agent creation or configuration                         |
| `store/reducer/appInfoReducer.js` | Stores `embedUserDetails` (theme, models, prompt, UI toggles)                                                                                               |
| `store/action/bridgeAction.js`    | `createEmbedAgentAction()` — creates agents from embed context                                                                                              |
| `utils/utility.js`                | `sendDataToParent()` — sends postMessage to parent window                                                                                                   |
| `utils/enums.js`                  | `EMBED_OBJECT_KEYS`, `EMBED_ARRAY_KEYS`, `EMBED_PASSTHROUGH_KEYS`, `EMBED_SKIP_KEYS` — config key classification                                            |

## Embed Components

| Component            | Path                                                           | Purpose                                                     |
| -------------------- | -------------------------------------------------------------- | ----------------------------------------------------------- |
| `ThemePaletteEditor` | `components/gtwy_embed/ThemePaletteEditor.js`                  | OKLCH color palette editor for light/dark themes            |
| `ToolsConfiguration` | `components/gtwy_embed/ToolsConfiguration.js`                  | Tools/functions configuration for embed agents              |
| `EmbedPromptBuilder` | `components/gtwy_embed/EmbedPromptBuilder.js`                  | Dynamic prompt builder with `{{variable}}` field generation |
| `EmbedList`          | `components/configuration/configurationComponent/EmbedList.js` | Tools/functions list UI with prebuilt tools support         |

## RAG Embed

RAG (Knowledge Base) embed is a separate embed surface for document management:

| Component            | Path                                        | Purpose                                   |
| -------------------- | ------------------------------------------- | ----------------------------------------- |
| `RAGEmbedContent`    | `components/ragEmbed/RAGEmbedContent.js`    | Integration guide and script setup        |
| `RAGEmbedDetailView` | `components/ragEmbed/RAGEmbedDetailView.js` | Detail view with integration/testing tabs |
| `RAGIntegrationTab`  | `components/ragEmbed/RAGIntegrationTab.js`  | Integration documentation                 |
| `RAGTestingTab`      | `components/ragEmbed/RAGTestingTab.js`      | Test interface for RAG global functions   |

**RAG Global API:** `window.openRag()`, `window.closeRag()`, `window.showDocuments()`, `window.openDocument(docId)`

## Communication Protocol

### Parent → Embed (postMessage)

```javascript
sendMessageToGtwy({
  type: "gtwyInterfaceData",
  data: {
    agent_id,
    agent_name,
    agent_purpose,
    meta,
    history,
    theme_config,
    themeMode,
    models,
    prompt,
    tools_id,
    slide,
    showCloseButton,
    showFullScreenButton,
    showHeader,
    defaultOpen,
    parentId,
  },
});
```

### Embed → Parent (postMessage)

```javascript
// Loaded notification
window.parent.postMessage({ type: "gtwyLoaded", data: "gtwyLoaded" }, "*");

// Agent events via sendDataToParent()
window.parent.postMessage(
  {
    type: "gtwy",
    status: "drafted" | "success",
    data: { agent_id, name },
    message: "...",
  },
  "*"
);

// Close notification
window.parent.postMessage({ type: "closeGtwy", data: {} }, "*");
```

## Embed Redux State Shape

```javascript
state.appInfoReducer.embedUserDetails = {
  isEmbedUser: boolean,
  theme_config: { light: {...}, dark: {...} },  // OKLCH color tokens
  themeMode: 'light' | 'dark' | 'system',
  models: [],
  apikey_object_id: string,
  prompt: {
    useDefaultPrompt: boolean,
    customPrompt: string,
    embedFields: [{ name, type, hidden, displayValue, description }]
  },
  showAdvancedParameters: boolean,
  showCreateManuallyButton: boolean,
  showAdvancedConfigurations: boolean,
  showPreTool: boolean,
  // ... additional UI toggle flags
}
```

## Theme System in Embed

1. Parent sends `theme_config` (OKLCH color values for light/dark) and `themeMode`
2. `useThemeManager` hook applies theme via `document.documentElement.setAttribute('data-theme', ...)`
3. `applyThemeObject()` in `utils/themeLoader.js` injects `<style id="gtwy-theme-style">` with CSS variables
4. Colors map to DaisyUI variables (`--b1`, `--p`, `--s`, `--a`, etc.) via `VAR_ALIAS_MAP`

## Script Attributes (gtwy.js)

The embed script reads these attributes from `<script id="gtwy-main-script">`:

| Attribute              | Purpose                                                 |
| ---------------------- | ------------------------------------------------------- |
| `embedToken`           | Authentication token                                    |
| `parentId`             | DOM container ID (optional, defaults to fixed position) |
| `slide`                | Position: `"full"` \| `"left"` \| `"right"`             |
| `defaultOpen`          | Auto-open on page load                                  |
| `showCloseButton`      | Show close button in header                             |
| `showFullScreenButton` | Show fullscreen toggle                                  |
| `showHeader`           | Show entire embed header                                |
| `agent_id`             | Target a specific agent                                 |
| `agent_name`           | Create agent with this name                             |
| `agent_purpose`        | Create agent with AI-generated config                   |

## Extensible Config Schema

`utils/integrationSliderUtils.js` defines 80+ configurable options organized by category (Interface, Display, Advanced, Theme, Pre-Tool). When adding new embed configuration options, add them to `CONFIG_SCHEMA` and the appropriate `EMBED_*_KEYS` set in `enums.js`.

## Guidelines for Modifying Embed

1. **Adding new config options**: Add key to the appropriate set in `EMBED_OBJECT_KEYS` / `EMBED_ARRAY_KEYS` / `EMBED_PASSTHROUGH_KEYS` in `utils/enums.js`, handle in `app/embed/layout.js` message handler, and add to `embedUserDetails` reducer state.
2. **Adding new postMessage events**: Follow the existing pattern — define type constant, handle in layout.js `window.addEventListener('message', ...)`, and document the event contract.
3. **Modifying theme tokens**: Update both `ThemePaletteEditor.js` and `utils/themeLoader.js` `VAR_ALIAS_MAP` to keep the editor and runtime in sync.
4. **Testing embeds locally**: Use `public/gtwy_embed_local.js` which points to `localhost`.
