# Skill: Task-Review

Review a TASK-*.md file for structural errors, logical gaps, and
implementation risks before handing to Claude Code.

## Two Modes

### Haiku Mode (review only)
Do NOT rewrite the task. Do NOT implement anything.
Flag issues only. Output a REVIEW-[task-name].md in the project root.

### Sonnet Mode (review + fix)
Review the task, then fix all issues directly in the TASK file.
Do NOT output a REVIEW file. Update the TASK file in place.
Make it unambiguous and implementation-ready for Claude Code.

---

## Steps:
1. Read CLAUDE.md fully — use it as ground truth for file paths,
   table names, DB schema, and existing patterns.
2. Read the TASK file fully.
3. Check every section against the checklist below.
4. **Haiku**: output REVIEW file grouped by severity.
   **Sonnet**: fix all issues directly in the TASK file, report what changed.

## Review Checklist

### SQL & Migrations
- [ ] Every CREATE TABLE includes PRIMARY KEY, NOT NULL, and UNIQUE constraints
      where appropriate — not just column names
- [ ] No `CREATE TABLE x AS SELECT` without explicit constraint redeclaration
- [ ] Every ALTER TABLE has a corresponding DOWN migration or rollback note
- [ ] Foreign keys reference columns that will exist at migration time
      (order of operations matters)
- [ ] No DROP TABLE or DROP COLUMN without explicit confirmation it is safe
- [ ] Cross-database foreign keys flagged — PostgreSQL does not support these natively

### File Paths & Line Numbers
- [ ] Every file path matches a real file documented in CLAUDE.md
- [ ] Any path not in CLAUDE.md is explicitly flagged as unverified
- [ ] Line numbers are cited as approximate if not verified against actual file

### Completeness
- [ ] Every question in the original prompt was answered
- [ ] Every system the task touches has a migration or update plan
- [ ] No "handle accordingly", "update as needed", or "implement similarly"
      — these are placeholders, not plans
- [ ] If a DB migration is needed, SQL DDL appears in full with all constraints
- [ ] If a new env variable is needed, it is listed explicitly
- [ ] Acceptance criteria section exists and is specific to this task

### Logic & Correctness
- [ ] No circular dependencies introduced
- [ ] No new pattern invented when an existing one in CLAUDE.md could be followed
- [ ] Assumptions are listed and each one is plausible given CLAUDE.md
- [ ] If two options are presented, a recommendation is made — not left open

### Risk Coverage
- [ ] Risk register exists for any task touching auth, payments, or DB schema
- [ ] Each risk has a stated mitigation, not just a label
- [ ] "Zero live users" is not used as a reason to skip rollback planning

---

## Haiku Output Format

### REVIEW-[task-name].md

**Verdict**: PASS / PASS WITH FIXES / FAIL

**Critical (blocks implementation)**
- [issue] — [why it breaks] — [what to fix, specific enough for Flash to act on without re-reading the codebase]

**High (likely to cause bugs)**
- [issue] — [why it matters] — [suggested fix]

**Low (polish / completeness)**
- [issue] — [suggested fix]

**Unanswered questions from original prompt**
- List any prompt questions not addressed in the TASK file

**Missing acceptance criteria**
- List what "done" should look like if the TASK file doesn't define it

**Assumptions to verify**
- List any assumption in the TASK file that should be confirmed
  before Claude Code proceeds

---

## Sonnet Output Format

No REVIEW file. Update the TASK file directly.
After updating, report:
- What was fixed and where
- Any assumptions made during fixes
- Anything that still needs developer confirmation before Claude Code proceeds

---

## Rules:
- CLAUDE.md is the source of truth — if the task contradicts it, fix it
- Haiku: flag and describe with enough specificity that Flash can fix each
  item without re-reading the codebase
- Sonnet: fix directly, follow existing CLAUDE.md patterns, never invent
  new conventions
- A PASS verdict means Claude Code can proceed without changes
- A PASS WITH FIXES verdict means proceed to Sonnet, do not loop back to Flash
- A FAIL verdict means go back to Flash for revision

## Usage:
**Haiku**: paste CLAUDE.md + TASK file. Output REVIEW file.
  Run after every Flash TASK file. Loop Flash → Haiku until PASS WITH FIXES or PASS.
**Sonnet**: paste CLAUDE.md + TASK file. Fix TASK file directly.
  Run once as final gate before Claude Code. Then /clear and implement.
