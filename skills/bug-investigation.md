# Skill: Bug-Investigation

Investigate a bug and produce a precise fix plan as TASK-bugfix-[name].md.

## Steps:
1. Read CLAUDE.md fully
2. Understand the reported bug:
   - What the user expects to happen
   - What actually happens
   - Which component/page/feature is affected
3. Trace the code path:
   - Find the entry point (user action / API call / event)
   - Follow the data flow through to where it breaks
   - Identify the root cause (not just the symptom)
4. Check for related issues:
   - Does the same bug exist in similar components?
   - Could the fix break anything else?
5. Plan the minimal fix:
   - Exact file, function, line
   - What to change and why
   - How to verify the fix worked

## Rules:
- Fix root cause, not symptoms
- Minimal change — don't refactor while fixing
- One bug per task file
- Always explain WHY it's broken, not just what to change

## Usage:
Describe the bug after invoking this skill.
Include: what you did, what happened, what you expected.
Error messages and console logs are very helpful.
