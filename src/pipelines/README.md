# `src/pipelines/`

**Owned by the team** (not scaffolded by Cursor). Put **orchestration** here: multi-step flows that combine Auth state, Supabase reads/writes, and local stores.

Examples you might add later:

- After Supabase Auth signs in → load `user_profiles` row → hydrate Zustand `authStore`.
- When lecturer starts a session → write attendance session row + update module `activeSessionId` in one coordinated flow.

See **[FIREBASE_INTEGRATION.md](../../FIREBASE_INTEGRATION.md)** for milestone user stories that reference this folder.
