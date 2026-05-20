# STARS — Supabase (Auth + Postgres) integration

**Audience:** Brightman, Gugulethu, Basil — and anyone new to the codebase.

This document ties **milestones**, **user stories**, and **file ownership** together so you know *where* to work without step-by-step implementation (you design the internals and tests).

---

## How to use this guide (beginner-friendly)

1. **Read the tree once** — know the difference between **`src/supabase/`** (SDK wiring + mappers), **`src/services/supabase/`** (one table or concern per file), **`src/pipelines/`** (your multi-step flows), and **`src/utils/supabase/`** (your helpers).
2. **Pick a milestone** in order (M0 → M1 → …). Do not skip M0: without env and Supabase project setup, nothing else is verifiable.
3. **Claim user stories by job number** (`JOB-xxx`) in stand-up — one **primary owner** per job; you still review each other’s PRs.
4. **Approach a story** using this loop:
   - **Reproduce** the behaviour today (mock path) vs desired (live path).
   - **Locate** the files in the tables below; open **one** repository or pipeline at a time.
   - **Define “done”** using acceptance criteria; add a minimal test plan (device + web if relevant).
   - **Integrate** behind a flag or parallel branch until screens are switched safely.

**Already scaffolded in the repo:**

| Area | Path | What exists |
|------|------|-------------|
| Supabase client | `src/supabase/client.ts` | `tryGetSupabaseClient`, `requireSupabaseClient` |
| Table names | `src/supabase/tables.ts` | `TABLES`, `resolveTableName` — align with SQL + RLS |
| Row mappers (camelCase ↔ snake_case) | `src/supabase/mappers/` | `toRow`, `fromRow` |
| Auth API | `src/services/supabase/authRepository.ts` | Sign-in, sign-out, auth state subscription |
| Read-by-id repositories | `src/services/supabase/*Repository.ts` | `get*ById` patterns for each main entity + `getUserProfileByUid` |
| Offline push sync | `src/services/offline/offlineSync.ts` | PouchDB outbox → Supabase upsert/update/delete |

**Your team builds:**

| Area | Path | You add |
|------|------|---------|
| Pipelines | `src/pipelines/` | Orchestration between Auth, Postgres, and stores |
| Helpers | `src/utils/supabase/` | Error mapping, retries, batch utilities, etc. |
| SQL schema + RLS | `supabase/migrations/` (create in your project) | Tables matching `TABLES`, policies per role |

Domain **models** stay in `src/models/`. Profile row: `src/types/supabaseUserProfile.ts` (role, `linkedStudentId`, `delegatedModuleIds`, `activeProxyIds`). Delegation logic: `src/services/delegationService.ts`, `src/permissions/delegationPermissions.ts`.

---

## Milestone map

| ID | Name | Goal |
|----|------|------|
| **M0** | Foundation | Supabase project, env vars, table sanity check |
| **M1** | Authentication | Email/password Auth works from the app; session observable |
| **M2** | Profiles & roles | `user_profiles` rows map Auth UID → STARS role + links |
| **M3** | Read paths | Replace mock **reads** for dashboards/lists with Supabase queries |
| **M4** | Write paths | Sessions + attendance **writes** + RLS that enforce ownership |
| **M5** | Cutover & hardening | Feature flag removal, migration, observability, web/native parity |

---

## Environment variables

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | Project API URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (RLS protects data) |
| `EXPO_PUBLIC_DATA_SOURCE` | Planned `mock` \| `supabase` toggle (M5) |

Copy `.env.example` → `.env` and fill values from **Project Settings → API** in the Supabase dashboard.

---

## Table naming

Logical keys in code (e.g. `facultySecretaries`) map to Postgres table names via `TABLES` in `src/supabase/tables.ts`. Most multi-word entities use **snake_case** table names (`attendance_sessions`, `user_profiles`). Simple entities keep single-word names (`students`, `modules`).

Column names in Postgres should use **snake_case**; `toRow` / `fromRow` convert to/from camelCase TypeScript models automatically.

---

## Wiring auth (M1)

Today `authStore` still uses `mockAuthService`. To switch:

1. Call `signInWithEmailPassword` from `src/services/supabase/authRepository.ts` in the login screen.
2. Subscribe with `subscribeAuthState` in a pipeline or `AppProviders`.
3. Load `getUserProfileByUid(session.user.id)` and hydrate `authStore`.

See **[INSTITUTION_HIERARCHY.md](./INSTITUTION_HIERARCHY.md)** for profile fields and role links.

---

## Offline sync

`processOutboxOnce()` pushes PouchDB mutations to Supabase when env is configured. Mutations reference logical collection keys; `resolveTableName` maps them to Postgres tables. If Supabase is not configured, sync returns `{ pushed: 0 }` without throwing.

---

## Schema starter (run in Supabase SQL editor)

Create tables with `id text primary key` and columns matching your models (snake_case). Example for profiles:

```sql
create table if not exists user_profiles (
  id text primary key references auth.users(id) on delete cascade,
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

Repeat for other `TABLES` entries. Enable **Row Level Security** before production.

---

## File map (Supabase layer)

```
src/supabase/
  client.ts          # createClient, env guards
  tables.ts          # TABLES, resolveTableName
  queries.ts         # getRowById
  mappers/           # camelCase ↔ snake_case
src/services/supabase/
  authRepository.ts
  *Repository.ts     # get*ById per entity
src/types/
  supabaseUserProfile.ts
```

For full product architecture see **DOCUMENTATION.md** and **FLOW_AND_STRUCTURE.md**.
