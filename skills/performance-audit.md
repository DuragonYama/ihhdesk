# Skill: Performance-Audit

Audit the codebase for performance issues and produce a fix plan
as TASK-performance.md.

## Steps:
1. Read CLAUDE.md — note any existing performance notes
2. Scan for common React performance issues:
   - Components re-rendering unnecessarily (missing memo, useMemo, useCallback)
   - Large lists without virtualization
   - Heavy computations inside render
   - useEffect with missing or wrong dependencies
   - State updates that trigger full tree re-renders
3. Scan for API/backend performance issues:
   - N+1 queries
   - Missing indexes on frequently queried columns
   - Endpoints fetching more data than needed
   - No pagination on list endpoints
4. Scan for bundle size issues:
   - Large imports that could be tree-shaken
   - Libraries imported entirely when only one function is needed
5. Prioritize by impact: High (noticeable lag) → Medium → Low
6. Save as TASK-performance.md with specific fixes

## Rules:
- Only flag real issues with measurable impact
- Don't over-optimize — premature optimization is a waste
- Focus on the most used parts of the app first
- Include the reason why each item is a problem
