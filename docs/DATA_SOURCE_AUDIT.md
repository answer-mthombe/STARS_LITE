---
title: "M5 — STORY-501 Data-Source Flag Audit"
subtitle: "JOB-027 — Gugulethu"
date: "Sprint window: Wed 8 – Thu 9 Jul 2026 (M5, days 15–16)"
---

# STORY-501 — Data-Source Flag Audit (JOB-027)

**Owner:** Gugulethu
**Estimate:** ½ day
**Window:** Wed 8 Jul 2026
**Start after:** M4 gate
**Type:** Verification (no new feature code) — `dataSource.ts` was already built in an earlier milestone; this story confirms it is used correctly across the app.

**Files in scope:** `src/services/dataSource.ts` · service entry points (per story description)

---

## 1. Scope and Acceptance Criteria

| Acceptance criterion | Result |
|---|---|
| Single branch point per service | Partially met — see §3 and §4 |
| Both modes documented | Met by this document (§6) |

Tasks assigned to this story:

1. Confirm no screen reads the flag directly.
2. Confirm every integrated service branches via `getDataSource()`.
3. Confirm the default is `mock` for local dev.
4. Document both modes.

---

## 2. Default Behaviour Check

**File:** `src/services/dataSource.ts`

```ts
export function getDataSource(): DataSource {
  const v = process.env.EXPO_PUBLIC_DATA_SOURCE;
  return v === "supabase" ? "supabase" : "mock";
}
```

**Result: PASS.** Any value other than the exact string `"supabase"` (including unset/undefined) resolves to `"mock"`. Local dev with no `.env` entry is safe by default.

---

## 3. Screens Reading the Flag Directly

**Requirement:** screens must not import or call `getDataSource()` / `isSupabaseDataSource()` — they should receive already-resolved data from a service.

**Result: FAIL.** All 10 screens below import the flag function directly and branch on it inside the component.

| # | File | Flag calls | Pattern |
|---|---|---|---|
| 1 | `app/dean/(tabs)/analytics.tsx` | `isSupabaseDataSource()` — 1x | Sets `useLive`, then screen picks `departments` vs `overview.departmentStats` |
| 2 | `app/dean/(tabs)/dashboard.tsx` | `isSupabaseDataSource()` — 1x | Same pattern as #1 |
| 3 | `app/lecturer/(tabs)/dashboard.tsx` | `getDataSource()` — 1x | Branches inside `loadModules()` effect to call `listModulesForLecturer` |
| 4 | `app/student/modules/[moduleId].tsx` | `getDataSource()` — 1x | Branches inside `loadModuleDetails()` between `mockDB.read()` and a Supabase call |
| 5 | `app/student/(tabs)/attendance-history.tsx` | `getDataSource()` — 1x | Branches inside `loadHistory()` |
| 6 | `app/student/(tabs)/dashboard.tsx` | `getDataSource()` — 1x | Branches inside `loadDashboard()` |
| 7 | `app/tutor/(tabs)/dashboard.tsx` | `getDataSource()` — 2x | Checked once to gate `loadModules()`, again in a `useMemo` to pick `modules` |
| 8 | `app/tutor/(tabs)/sessions.tsx` | `getDataSource()` — 2x | Same double-check pattern as #7; in-code comment confirms it intentionally mirrors the tutor dashboard |
| 9 | `app/hod/(tabs)/analytics.tsx` | `getDataSource()` — 1x | Sets `isLive` state, used later to pick data |
| 10 | `app/hod/(tabs)/dashboard.tsx` | `getDataSource()` — 1x | Same pattern as #9 |

**Common pattern across all 10:** each screen imports the flag function, evaluates it inline (component body or inside a `useEffect`), and manually selects between a mock data path and a Supabase data path — rather than calling one service function that internally resolves the correct data for the active mode.

**Note on #7 and #8:** these two check the flag twice within the same file, which duplicates the branch point even within a single screen.

**Disposition:** per story scope (verification, ½ day, not a refactor), these are logged as findings only. No screen files were modified as part of this story. Recommended as follow-up work for a future job/ticket, to be raised at the STORY-505 team gate.

---

## 4. Services Branching Through `getDataSource()`

**Requirement:** every integrated service should branch through a single call to `getDataSource()` / `isSupabaseDataSource()`.

**Result: PASS**, with one exception noted below.

Services confirmed to import and branch correctly:

- `src/services/attendanceService.ts`
- `src/services/delegationService.ts`
- `src/services/moduleEnrollmentService.ts`
- `src/services/auditLogService.ts`
- `src/services/institutionAnalytics.ts`
- `src/services/studentDashboardService.ts`
- `src/services/attendanceSimulationService.ts`
- `src/services/supabase/proxyAssignmentRepository.ts`
- `src/services/mockAuthService.ts`

### Exception: `src/supabase/client.ts`

```ts
const dataSource = process.env.EXPO_PUBLIC_DATA_SOURCE;
...
function hasMinimumConfig(): boolean {
  return dataSource === 'supabase' && Boolean(supabaseUrl && supabaseAnonKey);
}
```

This file reads `EXPO_PUBLIC_DATA_SOURCE` directly rather than calling `getDataSource()`, creating a second, independent branch point outside the `dataSource.ts` module.

**Disposition:** flagged for a scope decision — `client.ts` is low-level Supabase client setup rather than a business-logic service, so whether it falls under "service entry points" for this story is a judgment call for the sprint owner. Logged here for STORY-505 visibility; not modified.

---

## 5. Summary of Findings

| Check | Status |
|---|---|
| Default is `mock` | ✅ Pass |
| Services branch via `getDataSource()` | ✅ Pass (9/9 confirmed), with 1 exception noted |
| No screen reads the flag directly | ❌ Fail — 10 screens found |
| `client.ts` branch point | ⚠️ Exception — flagged for scope decision |

---

## 6. Both Modes — Documentation

### Mock mode (`EXPO_PUBLIC_DATA_SOURCE=mock` or unset)

- Default mode for local development.
- Data is read from and written to `mockDB` (in-memory/local mock database) rather than Postgres.
- No live Supabase connection is required or established for app data; `isSupabaseEnabled()` in `src/supabase/client.ts` also returns `false` in this mode, so `tryGetSupabaseClient()` returns `undefined`.
- Used for offline development and as the regression baseline — the app must continue to work fully in this mode throughout the cutover.

### Supabase mode (`EXPO_PUBLIC_DATA_SOURCE=supabase`)

- Used for the pilot/demo and staging/production.
- Requires `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` to also be set — `client.ts` only returns a working client when both the flag is `"supabase"` **and** the URL/key are present.
- Data is read from and written to the seeded Postgres database (`supabase/seed.sql`) via Supabase repositories.
- This is the mode used to validate the pilot definition of done: a lecturer starts a session, a student passes the attendance challenge, and a verified row lands in Postgres with a finalised class register.

---

## 7. Conclusion

STORY-501's verification tasks are complete. The data-source flag itself is correctly implemented with a safe default, and the audited services correctly centralise their branching through `getDataSource()`/`isSupabaseDataSource()`. The audit surfaced two items for team visibility at the STORY-505 gate:

1. Ten screens bypass the intended service-layer pattern by reading the flag directly.
2. `src/supabase/client.ts` maintains an independent branch point.

Both are documented above as findings rather than fixed, in line with this story's scope as a ½-day audit.
