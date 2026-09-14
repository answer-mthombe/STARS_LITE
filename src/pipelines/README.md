# `src/pipelines/`

**Owned by the team** (not scaffolded by Cursor). Put **orchestration** here: multi-step flows that combine Auth state, Supabase reads/writes, and local stores.

Examples you might add later:

- After Supabase Auth signs in → load `user_profiles` row → hydrate Zustand `authStore`.
- When lecturer starts a session → write attendance session row + update module `activeSessionId` in one coordinated flow.

See **[SUPABASE_INTEGRATION.md](../../docs/SUPABASE_INTEGRATION.md)** for milestone user stories (**JOB-007**, **JOB-010**, **JOB-019**, etc.) that reference this folder.
