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

* Clarity > Features
* Flow > Flexibility
* Meaning > Options

If the user has to think, redesign.

---

## Golden Ratio Law

When dividing space or attention:

* Use **~62% / 38%** dominance
* One side must clearly lead
* Symmetry only when intent is equal

Balance = visual weight, not equality.

---

## Layout Rules

* Flow: **top → bottom**, broad → narrow
* Hierarchy before components
* Containers may be centered
* **Content is always left-aligned**

---

## Geometry System

Hybrid geometry:

* Default: sharp
* If friction → fully rounded
* Else → semi-rounded

Rounded = interactive
Sharp = structural

Consistency > preference.

---

## Density Rules

* <15 items → cards
* ≥15 items → list / table

Scanning beats decoration.

---

## Empty State Law

Empty space must:

* Explain purpose
* Indicate next action

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

* One **Primary** action only
* Secondary only if unavoidable
* Cancel / Discard = plain text

Icons only if they reduce cognition.
Copy actions never use buttons.

---

## Absolute Rule

If it feels:

* Clever → remove
* Powerful → simplify
* Complex → redesign

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
    - Component filenames should describe *what* they do and *where* they belong if specific.
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
4. **Modal Implementation**:
    - **Wrapper**: Always wrap the modal content size and logic within the generic `<Modal>` component from `@/components/UI/Modal`.
    - **ID Management**:
        - Add a unique ID to `MODAL_TYPE` in `@/utils/enums.js`.
        - Pass this ID to the `MODAL_ID` prop of the `<Modal>` component.
    - **Control**:
        - Use `openModal(MODAL_TYPE.YOUR_ID)` and `closeModal(MODAL_TYPE.YOUR_ID)` from `@/utils/utility` to control visibility.
        - Do not create local state for open/close unless absolutely necessary for internal sub-modals.

2. **Utility Refactoring**:
    - **Rule of Three**: If a function or logic is used in more than two places, move it to `@/utils/utility.js` (or a specific utility file like `timeUtils.js`).
    - **Check First**: Always search `@/utils/utility.js` before writing a new helper function.

3. **Use Existing Logic First**:
    - **Sliders**: If creating a slide-over panel, do not build from scratch. Use existing slider components in `/components/sliders` and control them using `toggleSidebar` from `@/utils/utility`.
    - **Custom Hooks**: Check `/customHooks` before writing complex effects. Common operations like deletion (`useDeleteOperation`), dropdown positioning (`usePortalDropdown`), or metrics fetching (`useMetricsData`) are already abstracted.
    - **Utility Functions**: Avoid creating ad-hoc helpers. Use `@/utils/utility.js` for:
        - Cookie/Auth management (`setInCookies`, `getFromCookies`)
        - Validation (`isValidJson`, `validateUrl`)
        - UI Logic (`openModal`, `closeModal`, `toggleSidebar`)
        - Data formatting (`updatedData`, `removeDuplicateFields`)