# Skill: Security-Audit

Audit the codebase for security issues relevant to a web app
with auth, payments, and user data.

## Steps:
1. Read CLAUDE.md — note auth system, payment provider, data stored
2. Check authentication:
   - JWT handling (storage, expiry, refresh)
   - Protected routes on both frontend and backend
   - Password hashing approach
3. Check authorization:
   - Every API endpoint — does it verify the user owns the resource?
   - Admin-only actions properly gated?
   - Free vs pro gating consistent?
4. Check input handling:
   - User inputs validated on backend (not just frontend)
   - No raw SQL queries
   - File uploads validated for type and size
5. Check sensitive data:
   - No secrets in frontend code or git
   - API keys in environment variables only
   - Sensitive data not logged
6. Check Stripe/payments:
   - Webhook signature verified
   - Pro features gated server-side, not just client-side
7. Save as TASK-security.md prioritized by severity:
   Critical → High → Medium → Low

## Rules:
- Only real vulnerabilities, not theoretical edge cases
- Client-side only checks are NOT security — backend must verify
- Be specific about the exploit, not just "this looks unsafe"
