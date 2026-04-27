# Skill: Acceptance-Criteria

Append a verification checklist to the TASK file before it goes to Claude Code.

This skill is NOT a separate step — it is appended to every codebase-research
or new-feature-plan prompt so Flash includes it automatically.

## Add this section to every TASK file generated:

---

## Acceptance Criteria

How to verify this task is fully and correctly implemented.
Claude Code must check every item before calling the task done.

### Functional checks (does it work?)
- [ ] [specific thing the user can do or see that confirms the feature works]
- [ ] [API endpoint returns expected response with correct data]
- [ ] [DB row exists / was updated / was deleted as expected]

### Negative checks (does it fail gracefully?)
- [ ] [what happens when invalid input is sent]
- [ ] [what happens when an unauthorized user tries to access it]
- [ ] [what happens when an external service is unavailable]

### Regression checks (did anything break?)
- [ ] [existing feature most likely to be affected still works]
- [ ] [existing tests still pass — run npm run build and any test suite]

### Migration checks (if DB changes were made)
- [ ] Migration runs cleanly with no errors: `alembic upgrade head`
- [ ] Migration can be rolled back cleanly: `alembic downgrade -1`
- [ ] Existing data is not corrupted after migration

---

## Rules for Flash when generating acceptance criteria:
- Be specific to THIS task — no generic placeholders
- Every check must be something a developer can verify in under 60 seconds
- Include at least one negative check for any auth or payment change
- Include migration checks whenever alembic is touched
- Do not include checks that require a full test suite if none exists

## Usage:
Add "invoke acceptance-criteria" at the end of any codebase-research
or new-feature-plan prompt.
Flash will append the Acceptance Criteria section to the TASK file.
