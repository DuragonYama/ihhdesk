# Skill: Implement-Task

Read CLAUDE.md and TASK-[name].md first.

Implement everything in the plan exactly as described.
Do not re-research the codebase if the plan has all file paths
and line numbers needed.
Run npm run build when done.

## Rules:
- No `any` unless the plan explicitly permits it
- Code snippets in the plan are illustrative, not literal — apply proper typing
- Don't swallow errors, propagate to state[[claude-md-audit]]
- Don't mutate cached data in place
- If a snippet in the plan has a quality issue you can see, fix it silently

## After implementation:
1. Check every item in the Acceptance Criteria section of the TASK file
   - Mark each as PASS or FAIL
   - Do not mark done until all critical items pass
2. Invoke post-implementation-capture
   - Append results to CHANGES.md in the project root
   - Be honest about any deviations from the TASK file
