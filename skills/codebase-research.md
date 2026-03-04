# Skill: Codebase-Research

Research the codebase and produce a detailed implementation plan as
TASK-[feature-name].md in the project root.

Do NOT implement anything. Only research and plan.

## Steps:
1. Read CLAUDE.md fully to understand project conventions
2. Find all files relevant to the task
3. For each change needed, provide:
   - Exact file path
   - Relevant function/component name
   - Line number range
   - Minimal change needed
   - Edge cases to watch for
4. Include exact code snippets where the change is simple enough
5. Note existing patterns to follow (how other similar things are done)
6. Note any DB migrations needed
7. Note any new dependencies needed
8. Save output as TASK-[feature-name].md in project root

## Rules:
- Reference exact line numbers where possible
- Never guess — if unsure, read the file first
- Follow existing code conventions found in the codebase
- Keep the plan minimal — smallest change that achieves the goal
- Flag any risks or breaking changes

## Usage:
Replace [feature-name] with the feature being planned.
Describe the feature after invoking this skill.
