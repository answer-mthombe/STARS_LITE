# STARS — Supabase (Auth + Postgres) integration

**Audience:** Brightman, Gugulethu, Basil — and anyone new to the codebase.

This document ties **milestones**, **user stories**, and **file ownership** together so you know *where* to work without step-by-step implementation (you design the internals and tests).

---

## How to use this guide

1. **Read the tree once** — know the difference between **`src/supabase/`** (SDK wiring + mappers), **`src/services/supabase/`** (one table or concern per file), **`src/pipelines/`** (multi-step flows), and **`src/utils/supabase/`** (helpers).
2. **Pick a milestone** in order (M0 → M1 → …). Do not skip M0: without env and Supabase project setup, nothing else is verifiable.
3. **Claim user stories by job number** (`JOB-xxx`) in stand-up — one **primary owner** per job.
4. **Approach a story** using this loop:
   - **Reproduce** the behaviour today (mock path) vs desired (live path).
   - **Locate** the files in the tables below.
   - **Define “done”** using acceptance criteria; add a minimal test plan (device + web if relevant).
   - **Integrate** behind `EXPO_PUBLIC_DATA_SOURCE` until screens are switched safely.

---

## Already scaffolded in the repo

| Area | Path | What exists |
|------|------|-------------|
| Supabase client | `src/supabase/client.ts` | `tryGetSupabaseClient`, `requireSupabaseClient` |
| Table names | `src/supabase/tables.ts` | `TABLES`, `resolveTableName` |
| Row mappers | `src/supabase/mappers/` | `toRow`, `fromRow` (camelCase ↔ snake_case) |
| Generic read | `src/supabase/queries.ts` | `getRowById` |
| Auth API | `src/services/supabase/authRepository.ts` | Sign-in, sign-out, auth state subscription |
| Read-by-id repos | `src/services/supabase/*Repository.ts` | `get*ById` for main entities + `getUserProfileByUid` |
| Offline push sync | `src/services/offline/offlineSync.ts` | PouchDB outbox → Supabase upsert/update/delete |
| Challenge (mock UI) | `src/services/attendanceChallengeService.ts`, `app/student/challenge/` | Visual game + gates; **not** wired to Supabase yet |

**Your team builds:**

| Area | Path | You add |
|------|------|---------|
| Pipelines | `src/pipelines/` | Auth → profile → store; session writes; challenge submit |
| Helpers | `src/utils/supabase/` | Error mapping, retries, batch utilities |
| SQL + RLS | `supabase/migrations/` | Schema, policies, Edge Functions |

Domain **models** stay in `src/models/`. Profile: `src/types/supabaseUserProfile.ts`. Delegation: `src/services/delegationService.ts`, `src/permissions/delegationPermissions.ts`. Challenge spec: **`full-challenge-mechanism.md`**.

---

## Milestone map

| ID | Name | Goal |
|----|------|------|
| **M0** | Foundation | Supabase project, env, schema agreement, seed strategy |
| **M1** | Authentication | Email/password Auth from the app; session observable |
| **M2** | Profiles & roles | `user_profiles` maps Auth UID → STARS role + institutional links |
| **M3** | Read paths | Dashboards/lists/analytics read from Postgres (scoped by role) |
| **M4** | Write paths | Sessions, challenge attendance, enrolment, registers + RLS |
| **M5** | Cutover & hardening | `mock` \| `supabase` flag, migration, observability, parity |
| **M6** | Challenge backend | Edge verification, uniqueness, zero failed-row writes |

---

## Team roles (who does what)

| Team member | Purpose on this project | System responsibility |
|-------------|-------------------------|------------------------|
| **Brightman** | Platform & write-path owner | Supabase project, session creation, challenge record writes, production cutover |
| **Gugulethu** | Connectivity & data-path owner | Env, auth lifecycle, profiles, student reads, offline sync, data-source flag |
| **Basil** | Trust & governance owner | Schema contract, auth UX errors, RLS, lecturer reads, observability |

Everyone reviews everyone’s PRs; each job still has **one primary owner**.

---

## Job number register (all user stories)

Use **JOB-xxx** in commits, PR titles, and stand-up.

| Job # | Owner | Milestone | Title | Purpose in STARS |
|-------|-------|-----------|--------|------------------|
| **JOB-001** | Brightman | M0 | Supabase project (Auth + Postgres + Expo web app) | Live home for all STARS data and identities |
| **JOB-002** | Gugulethu | M0 | Local `.env` + `tryGetSupabaseClient()` verified | Every developer build reaches the same backend |
| **JOB-003** | Basil | M0 | Schema agreement (`TABLES` ↔ SQL ↔ models) | Contract between screens, TypeScript, and Postgres |
| **JOB-004** | Gugulethu | M0 | Initial migrations in `supabase/migrations/` | Versioned schema; reproducible deploys |
| **JOB-005** | Basil | M0 | Seed / bootstrap strategy (SQL or script) | Demo users + faculties/modules without mock JSON only |
| **JOB-006** | Brightman | M1 | Wire login to Supabase Auth (dev path) | Real identity before any profile logic |
| **JOB-007** | Gugulethu | M1 | Auth state subscription + hydration pattern | Session correct across restarts and navigation |
| **JOB-008** | Basil | M1 | Map Auth errors to user-facing copy | Students/lecturers understand login failures |
| **JOB-009** | Gugulethu | M2 | `user_profiles` CRUD repository (read + upsert) | UID → role + `linkedPersonId` + scope ids |
| **JOB-010** | Brightman | M2 | Registration pipeline (Auth + profile + person row) | New students exist consistently in Auth + Postgres |
| **JOB-011** | Basil | M2 | `useRoleGuard` + store use live profile when Supabase on | No cross-role URL access with live data |
| **JOB-012** | Gugulethu | M3 | Student dashboard modules query | Student home from enrolled modules in cloud |
| **JOB-013** | Basil | M3 | Lecturer modules list query | Lecturer hub from owned/co-taught modules |
| **JOB-014** | Gugulethu | M3 | Student attendance history query | History screen from `attendance_records` |
| **JOB-015** | Brightman | M3 | Active session read (student + lecturer) | `active_session_id` + session row for live UI |
| **JOB-016** | Gugulethu | M3 | Leadership analytics reads (admin / dean / HOD) | Replace mock aggregates with scoped SQL/views |
| **JOB-017** | Brightman | M3 | Attendance trend / time-bucket rollups | Chart series from Postgres, not dummy slopes |
| **JOB-018** | Basil | M3 | Audit log list query (scoped) | Governance screens mirror future RLS filters |
| **JOB-019** | Brightman | M4 | Persist “create attendance session” | Live sessions: GPS anchor, seed, radius, expiry |
| **JOB-020** | Gugulethu | M4 | Module `active_session_id` update on start/end | Single active session truth per module |
| **JOB-021** | Brightman | M4 | Challenge attendance submit → `attendance_records` | Only passed submissions written (see challenge doc) |
| **JOB-022** | Gugulethu | M4 | Offline outbox → Supabase for session/record writes | Offline-first parity with mock mutation pattern |
| **JOB-023** | Basil | M4 | RLS policies v1 (students, lecturers, roles) | Server-side gatekeeper for tamper prevention |
| **JOB-024** | Gugulethu | M4 | Enrolment writes (join code, accept/reject pending) | `modules` + `students` enrolment in Postgres |
| **JOB-025** | Brightman | M4 | Class register finalisation write | `class_registers` + session `ended_at` |
| **JOB-026** | Gugulethu | M4 | `module_delegations` + `proxy_assignments` writes | Tutor/registrar and acting-dean proxies in cloud |
| **JOB-027** | Gugulethu | M5 | `EXPO_PUBLIC_DATA_SOURCE` flag (`mock` \| `supabase`) | Demo with mock; staging/prod with Postgres |
| **JOB-028** | Brightman | M5 | One-time mock → Supabase data migration | Cutover without losing demo structure |
| **JOB-029** | Basil | M5 | Observability policy (Auth + PostgREST + Edge) | Ops signal without leaking passwords/PII |
| **JOB-030** | Basil | M5 | Web + native parity checklist | Same auth and attendance flows on both platforms |
| **JOB-031** | Brightman | M6 | `attendance_records` schema + uniqueness | `UNIQUE (session_id, device_id)` per challenge doc |
| **JOB-032** | Basil | M6 | Edge Function: verify seed + `tapped_index` | Server recomputes answer; client cannot forge pass |
| **JOB-033** | Gugulethu | M6 | Wire `attendanceChallengeService` to live submit | Mock challenge UI calls Supabase path when flag on |
| **JOB-034** | Basil | M6 | RLS + Edge tests for challenge inserts | Failed attempts never persist; duplicate device rejected |

---

## User stories (detail)

### M0 — Foundation

#### JOB-001 — Supabase project
*As a developer, I want a Supabase project with Auth (email/password) and Postgres enabled so the app has a real backend.*

**Acceptance**
- Project created; Auth provider enabled.
- API URL + anon key documented in team wiki (not committed).
- Optional: second “staging” project for non-prod.

**Files:** Supabase Dashboard · `supabase/README.md`

---

#### JOB-002 — Local env + client init
*As a developer, I want `.env` with public Supabase keys so Expo loads config at build time.*

**Acceptance**
- `.env` gitignored; `.env.example` updated.
- `npx expo start` runs; `tryGetSupabaseClient()` returns client when vars set.
- `requireSupabaseClient()` throws a clear message when vars missing.

**Files:** `.env.example` · `src/supabase/client.ts`

---

#### JOB-003 — Schema agreement
*As a developer, I want table names and field shapes aligned between Postgres, RLS docs, and `TABLES`.*

**Acceptance**
- Table in `INSTITUTION_HIERARCHY.md` matches `src/supabase/tables.ts`.
- Each `src/models/*` entity has a mapped table (or documented exception).
- Challenge fields on `attendance_records` documented (see JOB-031).

**Files:** `src/supabase/tables.ts` · `INSTITUTION_HIERARCHY.md` · `src/models/*`

---

#### JOB-004 — Migrations folder
*As a developer, I want versioned SQL migrations so schema changes are reviewable in git.*

**Acceptance**
- `supabase/migrations/` exists with `0001_initial_schema.sql` (or Supabase CLI layout).
- README explains how to apply locally (`supabase db push` or SQL editor).

**Files:** `supabase/migrations/` · `supabase/README.md`

---

#### JOB-005 — Seed strategy
*As a developer, I want seed data in Postgres mirroring mock JSON so live and mock demos match.*

**Acceptance**
- Faculties, courses, modules, demo students/lecturers loadable via script or SQL.
- Demo logins documented (`src/constants/demoLogins.ts` aligned with Auth users).
- Admin re-seed path defined (replace or truncate + re-insert).

**Files:** `supabase/seed.sql` (or script) · `src/constants/demoLogins.ts`

---

### M1 — Authentication

#### JOB-006 — Wire sign-in to Supabase Auth
*As a student/lecturer, I want to sign in with email and password against Supabase Auth.*

**Acceptance**
- Login screen calls `signInWithEmailPassword` when `EXPO_PUBLIC_DATA_SOURCE=supabase`.
- Successful sign-in returns a Supabase `User` (visible in dashboard/session).
- Mock path still works when flag is `mock`.

**Files:** `app/(auth)/login.tsx` · `src/services/supabase/authRepository.ts` · `src/store/authStore.ts`

---

#### JOB-007 — Auth state subscription
*As the app, I want to observe auth state so routing and stores stay in sync after restart.*

**Acceptance**
- `subscribeAuthState` registered in `AppProviders` or `src/pipelines/authHydration.ts`.
- Signed-out users cannot reach role dashboards.
- Token refresh does not blank the UI unexpectedly.

**Files:** `src/providers/AppProviders.tsx` · `src/pipelines/` (new)

---

#### JOB-008 — Auth error mapping
*As a user, I want clear messages when login fails (wrong password, unconfirmed email, network).*

**Acceptance**
- `mapAuthError` in `src/utils/supabase/` covers common Supabase Auth codes.
- Login UI shows mapped copy, not raw API errors.

**Files:** `src/utils/supabase/mapAuthError.ts` · `app/(auth)/login.tsx`

---

### M2 — Profiles & roles

#### JOB-009 — User profile repository (CRUD)
*As the app, I want to load and update `user_profiles` for the signed-in UID.*

**Acceptance**
- `getUserProfileByUid` works against live table.
- `upsertUserProfile` (new) writes role, email, links, capabilities arrays.
- Row shape matches `SupabaseUserProfileDoc`.

**Files:** `src/services/supabase/userProfileRepository.ts` · `src/types/supabaseUserProfile.ts`

---

#### JOB-010 — Student registration pipeline
*As a new student, I want registration to create Auth user + profile + `students` row.*

**Acceptance**
- `register-student` flow creates Auth account, then profile, then student person row.
- Failure mid-pipeline rolls back or surfaces a single actionable error.
- Generated `@live.mut.ac.za` email preserved.

**Files:** `app/(auth)/register-student.tsx` · `src/pipelines/registerStudent.ts` (new) · `src/services/supabase/studentRepository.ts` (extend)

---

#### JOB-011 — Live profile in guards
*As the system, I want route guards to use live `user_profiles.role` when Supabase is on.*

**Acceptance**
- `useRoleGuard` reads profile when data source is `supabase`.
- Dean/HOD/tutor scope ids (`facultyId`, `departmentId`, `moduleIds`) enforced on navigation.

**Files:** `src/hooks/useRoleGuard.ts` · `src/store/authStore.ts`

---

### M3 — Read paths

#### JOB-012 — Student dashboard modules
*As a student, I want my dashboard modules loaded from Postgres.*

**Acceptance**
- Modules list matches `registered_modules` / enrolment join.
- Empty state when not enrolled; links to join flow still work.

**Files:** `app/student/(tabs)/dashboard.tsx` · `src/services/supabase/moduleRepository.ts` (extend with list query)

---

#### JOB-013 — Lecturer modules list
*As a lecturer, I want my teaching modules from Postgres.*

**Acceptance**
- Query returns modules where `lecturer_id` or `co_lecturer_ids` contains user.
- Tutor path deferred to delegations (JOB-026) or documented limitation.

**Files:** `app/lecturer/(tabs)/dashboard.tsx` · `src/services/supabase/moduleRepository.ts`

---

#### JOB-014 — Attendance history
*As a student, I want attendance history from `attendance_records` joined to sessions/modules.*

**Acceptance**
- History screen shows timestamps, module names, verified/passed status.
- Scoped to `student_id` from profile link.

**Files:** `app/student/(tabs)/attendance-history.tsx` · new query helper in `attendanceRecordRepository.ts`

---

#### JOB-015 — Active session reads
*As a student/lecturer, I want the active session for a module from Postgres.*

**Acceptance**
- Student mark-attendance sees session when `modules.active_session_id` set.
- Lecturer active-session screen loads session + rotating code inputs unchanged.

**Files:** `app/student/mark-attendance/[moduleId].tsx` · `app/lecturer/active-session/[sessionId].tsx` · `attendanceSessionRepository.ts`

---

#### JOB-016 — Leadership analytics
*As admin/dean/HOD, I want scoped analytics from SQL aggregates.*

**Acceptance**
- Admin: university overview metrics.
- Dean: faculty-scoped; HOD: department-scoped.
- Performance acceptable for demo dataset (indexes on `faculty_id`, `department_id`, `session_id`).

**Files:** `app/admin/(tabs)/dashboard.tsx` · `app/dean/(tabs)/analytics.tsx` · `app/hod/(tabs)/analytics.tsx` · `src/services/institutionAnalytics.ts`

---

#### JOB-017 — Attendance trend rollups
*As leadership, I want chart time-series from dated rollups, not dummy data.*

**Acceptance**
- `StatsLineChart` / `MockTrendChart` data source switches with flag.
- Rollup table or view documented; shape matches `dashboardChartDummy` series.

**Files:** `src/services/dashboardChartDummy.ts` · chart components · migration for rollup view

---

#### JOB-018 — Audit log reads
*As admin, I want audit logs from Postgres with the same filters as the mock screen.*

**Acceptance**
- List query respects role scope (admin all; dean faculty; etc. when RLS ready).
- Pagination or limit documented.

**Files:** `src/components/navigation/AuditLogScreen.tsx` · `src/services/auditLogService.ts`

---

### M4 — Write paths

#### JOB-019 — Create attendance session
*As a lecturer/tutor/registrar, I want starting a session persisted to `attendance_sessions`.*

**Acceptance**
- Row includes `module_id`, host role/id, GPS anchor, `algorithm_seed`, `radius`, `expires_at`, `active`.
- Mock `attendanceSimulationService.createSession` internals call Supabase when flag on.

**Files:** `src/services/attendanceSimulationService.ts` · `attendanceSessionRepository.ts` (extend) · `app/lecturer/create-session/[moduleId].tsx`

---

#### JOB-020 — Module active session pointer
*As the system, I want `modules.active_session_id` updated on start and cleared on end.*

**Acceptance**
- Start session sets id; end class clears id.
- Only one active session per module at a time.

**Files:** `moduleRepository.ts` · `classRegisterService.ts`

---

#### JOB-021 — Challenge attendance submit (client write)
*As a student, I want a passed challenge to insert one `attendance_records` row.*

**Acceptance**
- Row fields per `full-challenge-mechanism.md`: `session_id`, `student_id`, `device_id`, `time_bucket`, `gps_bucket_hash`, `tapped_index`, `tier_used`, `action_hash`, `passed`.
- Failed gates write **nothing** (no negative rows).
- Updates student stats or triggers view (document choice).

**Files:** `src/services/attendanceChallengeService.ts` · `attendanceRecordRepository.ts` (extend) · `app/student/challenge/[challengeId].tsx`

---

#### JOB-022 — Offline outbox for writes
*As a user offline, I want session/record mutations queued and pushed to Supabase.*

**Acceptance**
- `enqueueMutation` used by write services.
- `processOutboxOnce` marks acked/failed; retries on failure.
- Integration test: enqueue → process → row in Supabase.

**Files:** `src/services/offline/offlineSync.ts` · write services

---

#### JOB-023 — RLS policies v1
*As security, I want Postgres RLS so clients cannot read/write outside their role scope.*

**Acceptance**
- Policies for `students`, `modules`, `attendance_sessions`, `attendance_records`, `user_profiles`.
- Lecturer sees own modules; student sees own records; admin bypass via service role only on server.
- Document policy matrix in `supabase/policies.md`.

**Files:** `supabase/migrations/*_rls.sql` · `supabase/policies.md`

---

#### JOB-024 — Enrolment writes
*As a student, I want join-by-code and pending requests stored in Postgres.*

**Acceptance**
- Join updates module enrolment + student `registered_modules`.
- Lecturer accept/reject updates pending state.

**Files:** `src/services/moduleEnrollmentService.ts` · relevant migrations

---

#### JOB-025 — Class register finalisation
*As a lecturer, I want ending class to create `class_registers` and link session.*

**Acceptance**
- PDF/HTML snapshot fields stored or generated server-side (document approach).
- Session `ended_at`, `class_register_id` set.

**Files:** `src/services/classRegisterService.ts` · `app/lecturer/active-session/[sessionId].tsx`

---

#### JOB-026 — Delegation & proxy writes
*As a lecturer/dean/HOD, I want delegations and proxies persisted.*

**Acceptance**
- `module_delegations` CRUD for tutor/registrar grants.
- `proxy_assignments` for acting roles.
- Profile `delegated_module_ids` / `active_proxy_ids` kept in sync or derived.

**Files:** `src/services/delegationService.ts` · new repositories · migrations

---

### M5 — Cutover & hardening

#### JOB-027 — Data source flag
*As the team, I want `EXPO_PUBLIC_DATA_SOURCE=mock|supabase` to switch backends without duplicate screens.*

**Acceptance**
- Single factory or branch in services (not copy-pasted per screen).
- Default `mock` for local dev; CI documents both modes.

**Files:** `src/services/dataSource.ts` (new) · service layer entry points

---

#### JOB-028 — Mock → Supabase migration
*As ops, I want to import mock JSON structure into Postgres for a pilot.*

**Acceptance**
- Script idempotent or documented wipe-and-reload.
- IDs stable enough for demo URLs/bookmarks where needed.

**Files:** `supabase/seed.sql` · optional Node import script

---

#### JOB-029 — Observability
*As support, I want logs for Auth and API failures without exposing secrets.*

**Acceptance**
- No passwords or full tokens in client logs.
- Error codes + request ids where available.
- Runbook snippet in repo.

**Files:** `src/utils/supabase/` · `DOCUMENTATION.md` (ops section)

---

#### JOB-030 — Web + native parity
*As QA, I want a checklist proving auth, session, and challenge flows on web and device.*

**Acceptance**
- Checklist completed for Expo web + one native target.
- Known gaps documented (e.g. QR scan web-only limitation).

**Files:** `SUPABASE_INTEGRATION.md` (test plan appendix) or `docs/SUPABASE_TEST_PLAN.md`

---

### M6 — Challenge backend (see `full-challenge-mechanism.md`)

#### JOB-031 — Attendance records schema
*As the backend, I want `attendance_records` columns and uniqueness for challenge check-ins.*

**Acceptance**
```sql
-- minimum columns (snake_case in DB)
session_id, student_id, device_id, time_bucket,
gps_bucket_hash, tapped_index, tier_used, action_hash, passed,
distance, verified, timestamp
UNIQUE (session_id, device_id)
```

**Files:** `supabase/migrations/*_attendance_records.sql` · `src/models/Attendance.ts`

---

#### JOB-032 — Edge Function verification
*As the backend, I want server-side recomputation of seed and `tapped_index` on insert.*

**Acceptance**
- Function runs on insert (or RPC called before insert).
- Wrong object / GPS mismatch sets `passed = false` or rejects insert.
- Plausibility check on `action_hash` per tier.

**Files:** `supabase/functions/verify-attendance-record/` (new)

---

#### JOB-033 — Wire challenge UI to Supabase
*As a student, I want the challenge screen to submit through the live path when Supabase is on.*

**Acceptance**
- `attendanceChallengeService.submit` branches on data source.
- Success navigates to history; failure shows gate message, no row.

**Files:** `attendanceChallengeService.ts` · `attendanceRecordRepository.ts`

---

#### JOB-034 — RLS + tests for challenge
*As security, I want duplicate device and cross-student inserts blocked.*

**Acceptance**
- Second insert same `(session_id, device_id)` rejected.
- Student cannot insert for another `student_id`.
- Edge cases covered in SQL or function tests.

**Files:** `supabase/policies.md` · `supabase/tests/` (optional)

---

## File ownership quick reference

| Concern | Primary files |
|---------|----------------|
| Client / env | `src/supabase/client.ts`, `.env.example` |
| Table constants | `src/supabase/tables.ts` |
| Mappers | `src/supabase/mappers/idBasedMapper.ts` |
| Auth | `src/services/supabase/authRepository.ts` |
| Profiles | `userProfileRepository.ts`, `supabaseUserProfile.ts` |
| Reads | `*Repository.ts`, `institutionAnalytics.ts` |
| Session / code | `attendanceSimulationService.ts`, `rotatingCode.ts` |
| Challenge (mock) | `attendanceChallengeService.ts`, `AttendanceChallengeGrid.tsx` |
| Offline | `offlineSync.ts`, `pouchDb.ts` |
| SQL / RLS | `supabase/migrations/`, `supabase/policies.md` |
| Pipelines | `src/pipelines/` |

---

## Environment variables

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | Project API URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (RLS protects data) |
| `EXPO_PUBLIC_DATA_SOURCE` | `mock` \| `supabase` (JOB-027) |

---

## Schema starter (`user_profiles`)

```sql
create table if not exists user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null,
  email text not null,
  linked_person_id text,
  faculty_id text,
  department_id text,
  course_id text,
  linked_student_id text,
  granted_capabilities jsonb default '[]',
  active_proxy_ids jsonb default '[]',
  delegated_module_ids jsonb default '[]',
  updated_at timestamptz default now()
);
```

Repeat for other `TABLES` entries in migrations. Enable **RLS** before production.

---

## Test plan appendix (minimal)

| Flow | mock | supabase | web | native |
|------|------|----------|-----|--------|
| Login (student/lecturer/admin) | ✓ | JOB-006 | ✓ | ✓ |
| Student dashboard modules | ✓ | JOB-012 | ✓ | ✓ |
| Lecturer create session | ✓ | JOB-019 | ✓ | ✓ |
| Student code → challenge → pass | ✓ | JOB-021/033 | ✓ | ✓ |
| Offline enqueue → sync | partial | JOB-022 | ✓ | ✓ |
| Dean/HOD analytics | ✓ | JOB-016 | ✓ | — |

---

## Related docs

- **[DOCUMENTATION.md](./DOCUMENTATION.md)** — stack and process
- **[FILE_STRUCTURE.md](./FILE_STRUCTURE.md)** — where to open files
- **[INSTITUTION_HIERARCHY.md](./INSTITUTION_HIERARCHY.md)** — roles and tables
- **[FLOW_AND_STRUCTURE.md](./FLOW_AND_STRUCTURE.md)** — diagrams
- **[full-challenge-mechanism.md](./full-challenge-mechanism.md)** — attendance challenge gates and record shape
