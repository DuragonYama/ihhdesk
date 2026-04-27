# Skill: New-Feature-Plan

Plan a new feature from scratch, considering the existing codebase,
architecture, and conventions.

## Steps:
1. Read CLAUDE.md fully
2. Understand the existing architecture (auth, DB models, API patterns,
   frontend state management, component structure)
3. Plan the feature with:

### Backend:
- New DB models or migrations needed
- New API endpoints (method, path, request/response shape)
- Auth/permission requirements
- Which existing patterns to follow (look at similar routes)

### Frontend:
- New pages or components needed
- Where they live in the file structure
- Which existing hooks/contexts to use
- State management approach
- Which existing UI patterns to follow

### Integration:
- How frontend calls backend (follow existing api.ts patterns)
- Error handling approach
- Loading states

4. Append an Acceptance Criteria section (invoke acceptance-criteria)
5. Save as TASK-[feature-name].md in project root
6. Include a checklist of implementation steps in order

## Rules:
- Always check if similar functionality already exists before planning new code
- Reuse existing patterns — don't invent new conventions
- Keep scope minimal — plan only what's needed for the feature
- Flag anything that could break existing functionality

## Code Snippet Quality Rules:
- All code snippets must be production-ready, not illustrative pseudocode
- Never use `any` — define typed interfaces for all new data shapes
- If a function is async or involves promises, show the correct async/await
  pattern explicitly
- Never show in-place mutation of cached or shared objects — use immutable
  patterns (map, spread)
- Always show error propagation to state, never `.catch(console.error)` alone
- If a snippet touches shared state, note race condition risks explicitly
- New interfaces and types must be defined in the plan, not left for CC to infer

`This plan will be executed by an AI coding agent. Code snippets must be
unambiguous and production-ready — the implementer will follow them literally.`

## Usage:
Always invoke acceptance-criteria at the end.
