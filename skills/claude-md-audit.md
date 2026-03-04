# Skill: CLAUDE-MD-Audit

Audit the entire codebase and compare against the current CLAUDE.md.

1. Read CLAUDE.md fully
2. Scan all source files — components, hooks, routes, features,
   new tools, context providers, API endpoints, DB models
3. Find everything implemented but missing or wrong in CLAUDE.md
4. Update CLAUDE.md directly — add missing, correct wrong, remove outdated
5. Do not change existing structure or formatting, only content
6. Report what was added/changed when done

Do not ask for confirmation. Execute and report.

After this session, update projects/[name].md in ~/Documents/Obsidian with what changed today.