-- ====================================================================
-- SECURITY FIX: lock down public.audit_logs
-- ====================================================================
-- Found during security testing (2026-09-07): audit_logs had RLS DISABLED and
-- the `anon` role held full SELECT/INSERT/UPDATE/DELETE/TRUNCATE grants — i.e.
-- anyone with the public anon key could READ, FORGE, or WIPE the entire audit
-- trail over the internet. Governance/tamper-evidence data must never be
-- anon-accessible.
--
-- Fix (non-breaking — verified against src/services/auditLogService.ts, which
-- reads + fire-and-forget-inserts audit rows as the *authenticated* user):
--   * anon           → no access at all.
--   * authenticated  → keep SELECT + INSERT only (drop UPDATE/DELETE/TRUNCATE),
--                      so a signed-in user can no longer tamper with or wipe logs.
--
-- FOLLOW-UP (team / JOB-023): enable RLS on audit_logs and add per-role scoped
-- SELECT policies so the server enforces the scoping that the client currently
-- does in the query (a signed-in student can still over-read via direct API).
-- ====================================================================

REVOKE ALL PRIVILEGES ON TABLE public.audit_logs FROM anon;
REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.audit_logs FROM authenticated;
-- authenticated intentionally retains SELECT + INSERT (required by the app).
