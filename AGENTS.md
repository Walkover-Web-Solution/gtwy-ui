# AI Agent Guidelines & Workflow

This document defines the mandatory workflow for all AI coding assistants and agents working on this project. Please follow these steps strictly for all tasks.

---

## 📋 Mandatory Workflow

### 1. 🔍 Read the Code & Docs First

- Before making any assumptions or starting to write code, search the codebase and read the relevant source code, configuration files, and documentation.
- Understand the architecture, current abstractions, state management, API layouts, and any dependencies.
- **Essential Documentation Paths:**
  - **[docs/ARCHITECTURE.md](file:///Users/natwarsinghrathor/Desktop/gtwy/AI-middleware-frontend/docs/ARCHITECTURE.md)**: Next.js App Router structure, Redux store/reducers, custom hooks (`useCustomSelector`), API integration (Axios client/interceptors), and folder conventions.
  - **[docs/AI_INSTRUCTIONS.md](file:///Users/natwarsinghrathor/Desktop/gtwy/AI-middleware-frontend/docs/AI_INSTRUCTIONS.md)**: UI design guidelines (clarity over features, alignment, and responsiveness), component/modal rules, global helper policies, and embed/iframe communication protocol.

### 2. 📝 Create an Implementation Plan First

- Write down a clear, structured implementation plan describing:
  - **Goal:** What you are trying to solve.
  - **Research Findings:** Why the issue is happening and how the code currently behaves.
  - **Proposed Changes:** A detailed list of files you intend to modify, add, or delete.
  - **Verification Plan:** How you will test the changes (manual steps or automated test commands).
- **DO NOT** modify any source code files until the plan is approved.

### 3. 💬 Ask for Explicit User Approval

- Present your implementation plan clearly to the user.
- Ask for confirmation or feedback.
- **Wait** for the user's explicit approval before proceeding to the execution phase.

### 4. 🚀 Execute & Verify

- Only after receiving approval, implement the changes as defined in the plan.
- Keep edits minimal, focused, and clean.
- Verify the changes thoroughly using your defined verification steps and report the final outcome.
