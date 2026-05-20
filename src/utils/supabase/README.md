# `src/utils/supabase/`

**Owned by the team.** Small **pure helpers** (no UI): map Supabase/Auth error codes to user-facing messages, retry wrappers, batch upsert builders, timestamp helpers, etc.

Keep each file focused (e.g. `mapAuthError.ts`, `withPostgrestRetry.ts`, `mergeDelegationCapabilities.ts`). Repositories in `src/services/supabase/` should stay thin and call into utils when logic repeats. Mirror checks from `src/utils/delegation.ts` when enforcing session hosts in RLS tests.

See **[SUPABASE_INTEGRATION.md](../../SUPABASE_INTEGRATION.md)** for milestone tasks.
