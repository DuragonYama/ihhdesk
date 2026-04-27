# Skill: CLAUDE-MD-Audit

Audit the entire codebase and compare against the current CLAUDE.md.

1. Read CLAUDE.md fully
2. Read CHANGES.md if it exists — these are recent implementation changes
   not yet reflected in CLAUDE.md. Prioritize these before scanning.
3. Scan all source files — components, hooks, routes, features, new tools,
   context providers, API endpoints, DB models, migrations,
   docker-compose, config files
4. Find everything implemented but missing or wrong in CLAUDE.md
5. Update CLAUDE.md directly — add missing, correct wrong, remove outdated
6. Do not change existing structure or formatting, only content
7. Delete CHANGES.md after all its contents are absorbed into CLAUDE.md
8. Report what was added/changed when done

## Data Flows Section
If CLAUDE.md does not have a Data Flows section, create one.
If it exists, update it to reflect current implementation.

For each major user-facing feature, trace and document:
- Entry point (frontend component or user action)
- Files touched in order, with function/hook names
- DB tables read and written
- External services called (Stripe, Resend, Cloudflare, etc.)
- Where auth/ownership is checked in the flow

Features to cover at minimum:
- Auth (register, login, token validation, password change)
- Pattern save/load
- Stripe checkout (monthly and lifetime)
- Stripe webhook handling
- Email sending
- Theme save/sync

Keep each flow to 8 lines maximum. Dense and technical.
These flows are read by AI research tools — precision over readability.

## Rules:
- Never guess — read the file before documenting it
- Never change structure or formatting, only content
- Flag any flow where the implementation contradicts CLAUDE.md
- If a flow touches auth or payments, double-check it — these are critical
- CHANGES.md must be deleted after audit — never leave stale entries behind

Do not ask for confirmation. Execute and report.

After this session, update projects/[name].md in
~/Documents/Obsidian with what changed today.