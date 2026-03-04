# Skill: UI-Review

Audit the UI/UX of the project and produce an implementation plan
for improvements as TASK-ui-review.md.

## Steps:
1. Read CLAUDE.md for design system, theme variables, breakpoints
2. Find all page and component files
3. Review for:

### Layout issues:
- Overflow or clipping at common breakpoints (375px, 768px, 1280px)
- Elements not fitting on mobile
- Inconsistent spacing or alignment
- Poor use of available screen space

### Visual consistency:
- Buttons that don't follow the design system
- Hardcoded colors instead of CSS variables
- Inconsistent font sizes or weights
- Mixed icon styles

### UX issues:
- Actions that are hard to reach on mobile
- Missing loading or error states
- Unintuitive interaction patterns
- Missing feedback on user actions (no toast, no confirmation)

### Accessibility basics:
- Tap targets smaller than 44px on mobile
- Missing hover/focus states
- Poor color contrast

4. Prioritize issues: Critical (broken) → High (annoying) → Low (polish)
5. Save as TASK-ui-review.md with specific file + line references
6. Include before/after description for each fix

## Rules:
- Be specific — "button overflows at 375px in Toolbar.tsx line 142"
  not "mobile looks bad"
- Only flag real issues, not personal preference
- Follow existing design system, don't introduce new patterns
