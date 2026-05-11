# `src/utils/firebase/`

**Owned by the team.** Small **pure helpers** (no UI): map Firebase error codes to user-facing messages, retry wrappers, batch write builders, timestamp helpers, etc.

Keep each file focused (e.g. `mapAuthError.ts`, `withFirestoreRetry.ts`). Repositories in `src/services/firebase/` should stay thin and call into utils when logic repeats.

See **[FIREBASE_INTEGRATION.md](../../FIREBASE_INTEGRATION.md)** for milestone tasks.
