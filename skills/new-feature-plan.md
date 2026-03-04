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

4. Save as TASK-[feature-name].md in project root
5. Include a checklist of implementation steps in order

## Rules:
- Always check if similar functionality already exists before planning new code
- Reuse existing patterns — don't invent new conventions
- Keep scope minimal — plan only what's needed for the feature
- Flag anything that could break existing functionality
