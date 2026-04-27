# Skill: Post-Implementation-Capture

After implementing a TASK file, append a summary of what actually happened
to CHANGES.md in the project root. Create CHANGES.md if it does not exist.

Do this AFTER implementation is complete and verified.
Do NOT do this before the acceptance criteria are checked.

## Steps:
1. Read the TASK file you just implemented
2. Read the acceptance criteria section
3. For each acceptance criteria item, note: PASS / FAIL / SKIPPED (with reason)
4. Note any deviations from the TASK file — what you changed and why
5. Note any files you touched that were NOT in the TASK file
6. Note any decisions you made that weren't specified in the TASK
7. Append the block below to CHANGES.md

## Output block to append to CHANGES.md:

---

## [TASK-name] — [date]

**What was implemented:**
- [one line per major change, specific]

**Acceptance criteria results:**
- [ ] PASS / FAIL — [criteria item]
- [ ] PASS / FAIL — [criteria item]

**Deviations from TASK file:**
- [what you changed vs what was planned, and why]
- None — if you followed the plan exactly

**Files touched not in TASK file:**
- [file path] — [why it was needed]
- None — if you stayed within scope

**Decisions made during implementation:**
- [any choice you made that wasn't specified]
- None — if everything was specified

**Needs follow-up:**
- [anything you noticed that should be a future task]
- None

---

## Rules:
- Never skip this step — it is the memory of what actually happened
- Be honest about FAIL criteria — do not mark PASS if unverified
- Deviations are normal — document them, do not hide them
- This file feeds the next claude-md-audit — accuracy matters

## Usage:
Add "invoke post-implementation-capture" at the end of any implement-task
prompt. Claude Code runs this after all acceptance criteria are checked.
Output: appended block in CHANGES.md in project root.
