# `src/pipelines/`

**Owned by the team** (not scaffolded by Cursor). Put **orchestration** here: multi-step flows that combine Auth state, Firestore reads/writes, and local stores.

Examples you might add later:

- After Firebase Auth signs in → load `userProfiles/{uid}` → hydrate Zustand `authStore`.
- When lecturer starts a session → write Firestore session + update module `activeSessionId` in one coordinated flow.

See **[FIREBASE_INTEGRATION.md](../../FIREBASE_INTEGRATION.md)** for milestone user stories that reference this folder.
