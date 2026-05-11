# STARS — Firebase (Auth + Firestore) integration

**Audience:** Brightman, Gugulethu, Basil — and anyone new to the codebase.

This document ties **milestones**, **user stories**, and **file ownership** together so you know *where* to work without step-by-step implementation (you design the internals and tests).

---

## How to use this guide (beginner-friendly)

1. **Read the tree once** — know the difference between **`src/firebase/`** (SDK wiring + converters), **`src/services/firebase/`** (one collection or concern per file), **`src/pipelines/`** (your multi-step flows), and **`src/utils/firebase/`** (your helpers).
2. **Pick a milestone** in order (M0 → M1 → …). Do not skip M0: without env and Firebase project setup, nothing else is verifiable.
3. **Claim user stories by job number** (`JOB-xxx`) in stand-up — one **primary owner** per job; you still review each other’s PRs.
4. **Approach a story** using this loop (not spoon-fed — you fill in details):
   - **Reproduce** the behaviour today (mock path) vs desired (live path).
   - **Locate** the files in the tables below; open **one** repository or pipeline at a time.
   - **Define “done”** using acceptance criteria; add a minimal test plan (device + web if relevant).
   - **Integrate** behind a flag or parallel branch until screens are switched safely.

**Already scaffolded in the repo (Cursor):**

| Area | Path | What exists |
|------|------|-------------|
| Firebase app + DB + Auth getters | `src/firebase/app.ts` | `tryGetFirebaseApp`, `requireFirebaseApp`, `getFirebaseDb`, `getFirebaseAuth` |
| Collection names | `src/firebase/collections.ts` | `COLLECTIONS` — align with Firestore rules |
| Converters (id ↔ document body) | `src/firebase/converters/` | Generic `idBasedConverter` + per-entity exports |
| Auth API | `src/services/firebase/authRepository.ts` | Sign-in, sign-out, auth state subscription |
| Read-by-id repositories | `src/services/firebase/*Repository.ts` | `get*ById` patterns for each main entity + `getUserProfileByUid` |

**Your team builds:**

| Area | Path | You add |
|------|------|---------|
| Pipelines | `src/pipelines/` | Orchestration between Auth, Firestore, and stores |
| Helpers | `src/utils/firebase/` | Error mapping, retries, batch utilities, etc. |

Domain **models** stay in `src/models/` (already used by mocks). Firestore-specific profile shape: `src/types/firebaseUserProfile.ts`.

---

## Milestone map (project numbering)

| ID | Name | Goal |
|----|------|------|
| **M0** | Foundation | Firebase project, env vars, console sanity check |
| **M1** | Authentication | Email/password Auth works from the app; session observable |
| **M2** | Profiles & roles | `userProfiles` documents map Auth UID → STARS role + links |
| **M3** | Read paths | Replace mock **reads** for dashboards/lists with Firestore queries |
| **M4** | Write paths | Sessions + attendance **writes** + rules that enforce ownership |
| **M5** | Cutover & hardening | Feature flag removal, migration, observability, web/native parity |

---

## Team roles in the STARS system (who does what, and why it matters)

STARS has **three audiences** in the product: **students** (join classes, mark attendance), **lecturers** (run sessions, manage modules), and **admins** (oversight). The Firebase work turns the app from a **demo mock** into a **real system of record** for identity, profiles, modules, sessions, and attendance.

| Team member | Overall **purpose** on this project | **System role** (what the product “sees” them as responsible for) |
|-------------|-------------------------------------|---------------------------------------------------------------------|
| **Brightman** | **Platform & write-path owner** — the parts that **create** authoritative state (sessions, production truth). | Owns the **Firebase project boundary**, proves **Auth sign-in** end-to-end, designs **multi-step writes** (registration, start session), optimises **read efficiency** for shared reference data, and **production cutover** so real users never depend on mock data by accident. |
| **Gugulethu** | **Connectivity & data-path owner** — the glue between **Expo**, **env**, **Auth state**, and **Firestore reads/writes** that screens depend on. | Owns **runtime configuration**, **auth session lifecycle** (who is logged in, when the app should re-fetch), **profile documents** that tell STARS *which role and which person record* a UID maps to, **student-facing read paths**, **attendance record persistence**, and the **feature flag** that chooses mock vs live safely. |
| **Basil** | **Trust, clarity & governance owner** — users understand failures; the backend **enforces** who may do what. | Owns the **data contract** (schema doc), **human-readable auth errors**, **route protection** aligned with live roles, **lecturer-facing read paths**, **Firestore security rules** (the real “backend” for tamper prevention), and **observability** so support can diagnose issues without leaking passwords or personal data. |

These roles **overlap on purpose**: everyone reviews everyone else’s PRs, but each job still has **one primary owner** so nothing falls between two people.

---

## Job number register (all user stories)

Each row is **one** assignable job. Use the **job number** in commits, PR titles, and stand-up (“I’m on **JOB-012**”). The **Purpose / role in STARS** column explains **why this job exists in the product**, not only what you type in the editor.

| Job # | Owner | Milestone | Title | Purpose / role in STARS |
|-------|-------|-----------|--------|-------------------------|
| **JOB-001** | Brightman | M0 | Firebase project (Auth + Firestore + web app) | Creates the **live home** for all STARS data and identities so the app can eventually replace the mock DB as the single source of truth. |
| **JOB-002** | Gugulethu | M0 | Local `.env` + Expo public Firebase keys | Connects the **running Expo app** to that Firebase project so every developer’s build can reach the same backend behaviour without hardcoding secrets. |
| **JOB-003** | Basil | M0 | Schema agreement (`COLLECTIONS` ↔ Firestore ↔ models) | Defines the **contract** between screens, TypeScript models, and Firestore so student/lecturer flows do not drift into incompatible shapes or duplicate meanings. |
| **JOB-004** | Brightman | M1 | Wire sign-in to Firebase Auth (dev path) | Proves **real login** works: STARS can identify *who* is using the device before any Firestore profile or dashboard logic is trusted. |
| **JOB-005** | Gugulethu | M1 | Auth state subscription + hydration pattern | Keeps the **session layer** correct across restarts and navigation so the app always knows “signed in or not” and can load the right home screen. |
| **JOB-006** | Basil | M1 | Auth error mapping + login UI feedback | Makes failed login **understandable** to students/lecturers (wrong password vs network) so support load stays low and trust in STARS stays high. |
| **JOB-007** | Gugulethu | M2 | `userProfiles/{uid}` create/update + repository writes | Stores **role + linkage** (student vs lecturer vs admin, link to person doc) so routing, guards, and queries know *what STARS should show* for this Firebase user. |
| **JOB-008** | Brightman | M2 | Registration pipeline (Auth + student + profile order) | Ensures **new students** become real users **atomically** (no Auth account without a student row/profile, or a documented recovery path). |
| **JOB-009** | Basil | M2 | `useRoleGuard` + store use live profile when Firebase on | Prevents **cross-role access** (e.g. student hitting lecturer URLs) using live profile data, which is critical for privacy and academic integrity. |
| **JOB-010** | Gugulethu | M3 | Student dashboard modules from Firestore | Powers the **student home experience** from cloud data: enrolled modules, navigation to attendance, reflects real enrollment state. |
| **JOB-011** | Basil | M3 | Lecturer modules list/query from Firestore | Powers the **lecturer hub** from cloud data: which modules they teach, entry points to sessions and student management. |
| **JOB-012** | Brightman | M3 | Faculty/course lookups without N+1 (batch/utils) | Keeps **registration and browse flows fast and cheap** by avoiding dozens of sequential reads; important for scale and mobile data usage. |
| **JOB-013** | Brightman | M4 | Persist “create attendance session” to Firestore | Makes **live class sessions** a server-backed fact: seed, radius, expiry, and `activeSessionId` so students see the same truth as lecturers. |
| **JOB-014** | Gugulethu | M4 | Persist “mark attendance” + student stats updates | Makes **attendance marks** durable and auditable and keeps **student statistics** aligned with records (compliance and reporting). |
| **JOB-015** | Basil | M4 | Firestore security rules + emulator tests | Acts as the **server-side gatekeeper**: only legitimate writes pass even if someone tampers with the client; protects MUT academic data. |
| **JOB-016** | Gugulethu | M5 | Feature flag `mock` vs `firebase` data source | Lets the team **demo with mock** while **staging/production use Firestore** without maintaining two codebases forever. |
| **JOB-017** | Brightman | M5 | Production cutover checklist (mock off in prod) | Guarantees **real deployments** never accidentally ship demo behaviour or mock-only assumptions to students or staff. |
| **JOB-018** | Basil | M5 | Observability / logging policy for Auth + Firestore | Gives **operations** enough signal to fix outages while respecting **privacy** (no raw passwords, minimal PII in logs). |

---

## Assignments by team member (with system purpose)

### Brightman — assigned jobs

| Job # | Milestone | What you deliver | Purpose / role in STARS |
|-------|-----------|------------------|-------------------------|
| **JOB-001** | M0 | Firebase project + Auth + Firestore (+ web app if needed) | **Backend home**: without this, STARS has nowhere real to persist users or attendance. |
| **JOB-004** | M1 | First real sign-in from the app | **Identity proof**: confirms Firebase Auth is the future source of “who is this user?”. |
| **JOB-008** | M2 | Registration pipeline (order + error handling) | **Student onboarding integrity**: new MUT students must exist consistently across Auth + Firestore. |
| **JOB-012** | M3 | Faculty/course read strategy (batch/utils + doc) | **Performance & cost**: keeps lookups from blocking UI as data grows. |
| **JOB-013** | M4 | Session create write path | **Teaching moment truth**: when a lecturer starts class, the system of record must update everywhere. |
| **JOB-017** | M5 | Prod cutover checklist | **Release safety**: separates “demo” from “real campus use”. |

### Gugulethu — assigned jobs

| Job # | Milestone | What you deliver | Purpose / role in STARS |
|-------|-----------|------------------|-------------------------|
| **JOB-002** | M0 | Working `.env` + verified `tryGetFirebaseApp()` | **Developer bridge**: every machine can point at the same Firebase project reliably. |
| **JOB-005** | M1 | Auth subscription + lifecycle doc/code | **Session continuity**: app-wide gate for splash → login → dashboards. |
| **JOB-007** | M2 | Profile CRUD + rules alignment | **Authorisation data**: maps Firebase UID → STARS role + person id for all downstream screens. |
| **JOB-010** | M3 | Student dashboard from Firestore | **Student experience source of truth**: modules shown = modules enrolled in cloud. |
| **JOB-014** | M4 | Attendance write + stats | **Academic record**: marks must survive app restarts and match policy. |
| **JOB-016** | M5 | Data-source flag implementation | **Operational flexibility**: mock for labs, Firebase for pilots/production. |

### Basil — assigned jobs

| Job # | Milestone | What you deliver | Purpose / role in STARS |
|-------|-----------|------------------|-------------------------|
| **JOB-003** | M0 | Schema / ownership document | **Shared language**: devs, rules, and UI all mean the same thing by “module”, “session”, etc. |
| **JOB-006** | M1 | Auth error helpers + login UX | **User trust**: failed auth is explained, not silent. |
| **JOB-009** | M2 | Live role in guard + store | **Access control**: matches how MUT expects staff vs student separation. |
| **JOB-011** | M3 | Lecturer Firestore reads + UI | **Lecturer experience source of truth**: teaches only modules Firestore says they own. |
| **JOB-015** | M4 | Rules + emulator tests | **Tamper resistance**: attendance cannot be forged by a modified client. |
| **JOB-018** | M5 | Logging policy | **Runbook quality**: incidents can be debugged responsibly. |

---

## User stories (detail — Auth + Firestore)

Each job below repeats the **user story** format, then spells out **purpose in STARS** (why the campus cares) and **role in the system** (which layer of the architecture you are changing).

### M0 — Foundation

**JOB-001 — Brightman — M0**  
*As a developer, I want a Firebase project with Auth (email/password) and Firestore enabled so the app has a real backend to talk to.*  

**Purpose in STARS:** STARS stops being a self-contained demo and gains a **real cloud home** where MUT identities and attendance data can live, be backed up, and be governed by institutional policies.  
**Role in the system:** You are establishing the **hosting boundary**—the Firebase project, Auth provider, and Firestore database—that every later job assumes exists.  
**Acceptance:** Project created; web app registered if testing on web; no secrets committed.  
**Approach hint:** Firebase Console; document project id in team wiki, not in git.

**JOB-002 — Gugulethu — M0**  
*As a developer, I want `.env` with public Firebase keys so Expo can load config at build time.*  

**Purpose in STARS:** Every developer (and every build flavour) can point the **same app binary** at the **correct backend** so students and lecturers see consistent behaviour in testing.  
**Role in the system:** You own the **configuration / connectivity layer** between Expo’s public env vars and `src/firebase/app.ts`.  
**Acceptance:** `.env` exists locally (gitignored); `npx expo start` runs; `tryGetFirebaseApp()` returns an app when vars are set.  
**Files:** `.env.example` (reference only), `src/firebase/app.ts` (read — do not hardcode keys).

**JOB-003 — Basil — M0**  
*As a developer, I want collection names and field shapes aligned between Firestore, rules, and `COLLECTIONS`.*  

**Purpose in STARS:** Prevents silent bugs where, for example, a “module” in the UI is not the same shape as a “module” in the database—something that would break **enrollment** and **attendance** in production.  
**Role in the system:** You are the **contract owner** between **domain models**, **Firestore documents**, and future **security rules** documentation.  
**Acceptance:** Table of collections + owner (lecturer/student) documented; matches `src/firebase/collections.ts` and `src/models/*`.  
**Approach hint:** Draw on paper first; then update team doc — **avoid** renaming collections casually after M4.

---

### M1 — Authentication

**JOB-004 — Brightman — M1**  
*As a student, I want to sign in with email and password against Firebase Auth so my identity is not mock-only.*  

**Purpose in STARS:** Proves that **who you are** is decided by **MUT-controlled identity** (Firebase Auth), not by whichever mock JSON happened to be loaded—essential before any attendance claim is trusted.  
**Role in the system:** You validate the **credential path** (email/password → Firebase user) that all screens will eventually depend on.  
**Acceptance:** Call `signInWithEmailPassword` from a dev-only screen or temporary button; Firebase Auth user appears in console.  
**Files:** `src/services/firebase/authRepository.ts`, later `src/pipelines/` for production wiring.

**JOB-005 — Gugulethu — M1**  
*As the app shell, I want to observe auth state changes so I can route to login vs home.*  

**Purpose in STARS:** Users must land on **onboarding/login** when signed out and on the **correct role dashboard** when signed in, every time the app cold-starts or the session token changes.  
**Role in the system:** You implement the **session observer / lifecycle** layer that connects Firebase Auth events to Expo Router navigation and Zustand hydration.  
**Acceptance:** Subscribe with `subscribeAuthState`; log uid on change; unsubscribe on unmount pattern documented.  
**Files:** `authRepository.ts`, future `src/pipelines/authHydrationPipeline.ts` (you create).

**JOB-006 — Basil — M1**  
*As a user, I want clear feedback when credentials are wrong or the network fails.*  

**Purpose in STARS:** Reduces **wrong-password panic** and **needless IT tickets**; students and lecturers understand whether to retry, reset password, or check connectivity.  
**Role in the system:** You own **UX for failure modes** at the boundary of Firebase Auth (mapping error codes → copy) and the login screen.  
**Acceptance:** Map common `auth/` error codes to short messages (Zulu/English copy later).  
**Files:** `src/utils/firebase/` (you create helpers), UI in `app/(auth)/login.tsx`.

---

### M2 — Profiles & roles

**JOB-007 — Gugulethu — M2**  
*As a signed-in user, I want a `userProfiles/{uid}` document that stores my STARS role and linkage to student/lecturer records.*  

**Purpose in STARS:** Firebase Auth only knows **email + uid**; STARS must know **student vs lecturer vs admin** and which **studentNumber / lecturer record** to load for dashboards and attendance.  
**Role in the system:** You implement the **authorisation profile store** (`userProfiles`) and repository writes so the rest of the app can answer “what is this user allowed to do?”  
**Acceptance:** First sign-up / admin seed creates profile; `getUserProfileByUid` returns data in dev.  
**Files:** `src/types/firebaseUserProfile.ts`, `src/services/firebase/userProfileRepository.ts` (extend with `set`/`merge`), Firestore rules draft.

**JOB-008 — Brightman — M2**  
*As a new student, I want registration to create both Auth user and Firestore student + profile in a consistent order.*  

**Purpose in STARS:** A new MUT student must become a **single coherent account**—not an Auth user without a student row, or a student row they can never log into.  
**Role in the system:** You design **transactional orchestration** (pipelines) across Auth creation and Firestore writes, comparable in intent to `mockAuthService.registerStudent`.  
**Acceptance:** No orphan Auth users without profile (or compensating cleanup job defined).  
**Files:** `src/pipelines/` (you create), compare with `src/services/mockAuthService.ts` behaviour.

**JOB-009 — Basil — M2**  
*As the app, I want `useRoleGuard` to use live profile role when Firebase mode is on.*  

**Purpose in STARS:** Stops a student from opening **lecturer-only** tools (or vice versa) using deep links—protecting **privacy** and **assessment integrity**.  
**Role in the system:** You connect **route guards** and **auth store** to **live `userProfiles`** instead of mock-only role assumptions.  
**Acceptance:** Guard blocks wrong role using Firestore-backed role, not mock.  
**Files:** `src/hooks/useRoleGuard.ts`, `src/store/authStore.ts`, pipeline that hydrates store.

---

### M3 — Read paths (Firestore)

**JOB-010 — Gugulethu — M3**  
*As a student, I want my modules list to load from Firestore.*  

**Purpose in STARS:** The **student dashboard** becomes the live reflection of **what modules I am enrolled in today**—the starting point for **join class**, **mark attendance**, and **history**.  
**Role in the system:** You shift **student read traffic** from `mockDB` to Firestore queries and any pipelines that assemble list + loading state.  
**Acceptance:** Dashboard lists enrolled modules with same UX as mock; loading and empty states preserved.  
**Files:** `app/student/dashboard.tsx`, extend `src/services/firebase/moduleRepository.ts` (queries), pipelines for batch reads.

**JOB-011 — Basil — M3**  
*As a lecturer, I want modules I teach loaded from Firestore.*  

**Purpose in STARS:** The **lecturer hub** must only show modules **assigned to that staff member**, so they start sessions and manage rosters on the correct cohorts.  
**Role in the system:** You own **lecturer read paths** and UI wiring from Firestore (including composite indexes if you filter/sort).  
**Acceptance:** Query by `lecturerId` (index if needed); performance acceptable on seed data.  
**Files:** `moduleRepository.ts`, `app/lecturer/dashboard.tsx` / management screens.

**JOB-012 — Brightman — M3**  
*As a screen, I want faculties and courses resolved without N+1 query storms.*  

**Purpose in STARS:** Registration and browse flows stay **fast on campus Wi‑Fi and mobile data**; avoids draining battery and Firebase quota with dozens of sequential reads.  
**Role in the system:** You define **read optimisation**—batch reads, caching, or denormalised fields—and implement supporting utils.  
**Acceptance:** Document query strategy (batch `getAll` or cached denormalization).  
**Files:** `courseRepository.ts`, `facultyRepository.ts`, utils for batching in `src/utils/firebase/`.

---

### M4 — Write paths (sessions + attendance)

**JOB-013 — Brightman — M4**  
*As a lecturer, I want “start session” to persist to Firestore with seed, radius, expiry.*  

**Purpose in STARS:** When a class goes “live”, **every student device** must see the **same session** (seed, radius, expiry) so rotating codes and GPS checks are fair and auditable.  
**Role in the system:** You implement the **authoritative write** for `attendanceSessions` and the **module.activeSessionId** update—the same responsibility as `attendanceSimulationService.createSession` today.  
**Acceptance:** Parity with `attendanceSimulationService.createSession` fields; module gets `activeSessionId`.  
**Files:** New write methods (you design) in `src/services/firebase/attendanceSessionRepository.ts` or dedicated service; compare `src/services/attendanceSimulationService.ts`.

**JOB-014 — Gugulethu — M4**  
*As a student, I want a successful mark to create a Firestore attendance record and update stats.*  

**Purpose in STARS:** A successful mark becomes a **permanent academic event** tied to a session and student, feeding **attendance rate** and future reporting for MUT.  
**Role in the system:** You implement **student-side attendance persistence** (records + stats updates) coordinated with validation rules Basil defines.  
**Acceptance:** Rules reject invalid code / distance / duplicate (server-side where possible).  
**Files:** `attendanceRecordRepository.ts`, Cloud Functions **optional** (document if used).

**JOB-015 — Basil — M4**  
*As an admin, I want Firestore rules that enforce lecturer/student ownership and field immutability.*  

**Purpose in STARS:** Even if someone sideloads a modified APK or tampers with web JS, **Firestore is the referee**—only valid writes succeed, protecting **MUT’s academic records**.  
**Role in the system:** You are the **policy-as-code** owner: rules files, emulator tests, and alignment with JOB-003’s schema contract.  
**Acceptance:** Rules file versioned in repo (e.g. `firebase/rules/firestore.rules`) or linked doc; tests with Emulator.  
**Approach hint:** Start from deny-all, open least privilege.

---

### M5 — Cutover & hardening

**JOB-016 — Gugulethu — M5**  
*As a release manager, I want to toggle mock vs Firebase per build or env.*  

**Purpose in STARS:** Lecturers can **demo STARS in a lab** with mock data while a **pilot cohort** hits real Firestore—without branching the whole codebase.  
**Role in the system:** You implement a **configuration switch** that routes repositories/pipelines to mock or Firebase implementations safely.  
**Acceptance:** `EXPO_PUBLIC_DATA_SOURCE=mock|firebase` (or similar) documented; no runtime crash when mock.  
**Files:** `src/store/` or small `src/config/dataSource.ts` (you create).

**JOB-017 — Brightman — M5**  
*As a stakeholder, I want production builds to use only Firebase.*  

**Purpose in STARS:** Real students and staff never run against **ephemeral mock data** in production; attendance is always backed by the **institutional database**.  
**Role in the system:** You own the **release checklist**: EAS profiles, env injection, QA gates, and “mock off” verification before go-live.  
**Acceptance:** Mock path still available for demos if desired; prod pipeline never ships mock secrets.

**JOB-018 — Basil — M5**  
*As a developer, I want structured logging or crash breadcrumbs for Auth/Firestore failures.*  

**Purpose in STARS:** When Firebase is slow or rules reject a write, support can **diagnose** without guessing—and without **leaking passwords or sensitive PII** into logs.  
**Role in the system:** You define **operational policy**: what gets logged, where (console vs remote), and redaction rules for the whole team to follow.  
**Acceptance:** Document what is logged vs PII restrictions.

---

## Ownership rotation (suggested)

Use **job numbers** for accountability; use this table only for **who reviews first** each milestone.

| Milestone | Lead reviewer | Jobs in milestone |
|-----------|---------------|-------------------|
| M0 | Brightman | JOB-001 … JOB-003 |
| M1 | Gugulethu | JOB-004 … JOB-006 |
| M2 | Basil | JOB-007 … JOB-009 |
| M3 | Brightman | JOB-010 … JOB-012 |
| M4 | Gugulethu | JOB-013 … JOB-015 |
| M5 | Basil | JOB-016 … JOB-018 |

Swap lead reviewer each milestone so everyone touches Auth, Firestore, and rules.

---

## File tree (integration-related)

```
src/firebase/
  app.ts                 # Firebase init (env-driven)
  collections.ts         # Collection name constants
  converters/            # Firestore ↔ TypeScript models
  index.ts

src/services/firebase/
  authRepository.ts
  userProfileRepository.ts
  studentRepository.ts
  lecturerRepository.ts
  moduleRepository.ts
  courseRepository.ts
  facultyRepository.ts
  attendanceSessionRepository.ts
  attendanceRecordRepository.ts
  index.ts

src/pipelines/           # YOU create orchestration modules here
src/utils/firebase/      # YOU create helpers here

src/types/
  firebaseUserProfile.ts # Firestore profile shape (extend as needed)

src/models/              # Existing domain models (shared mock + live)
```

---

## Non-goals (for this phase)

- Choosing between Cloud Functions vs client-only writes (team decision in M4).
- Production analytics dashboards.
- Replacing every mock screen in one PR — use M3/M5 incremental cutover.

---

## References

- [Firebase Auth (Expo)](https://docs.expo.dev/guides/using-firebase/)
- [Firestore data modeling](https://firebase.google.com/docs/firestore/data-model)
- In-repo: `FILE_STRUCTURE.md`, `DOCUMENTATION.md`, `README.md`

When a job is **done**, add a one-line note in your sprint log with **job number**, PR link, and milestone id (e.g. `JOB-007 done — PR #12 — M2`).
