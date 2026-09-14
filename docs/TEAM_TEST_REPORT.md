# STARS — Integration QA & Test Report

**Purpose:** Transparent record for all team members of what was tested, which issues were found, how each was overcome, and the resulting status of the affected user stories (JOB / STORY IDs from [`SUPABASE_INTEGRATION.md`](./SUPABASE_INTEGRATION.md)).

| | |
|---|---|
| **Date** | 2026-09-07 |
| **Branch merged to** | `main` (commits `52bf5c7`, `77d1019`, `e1503e4`) |
| **Backend** | Supabase project `bythcdegazfvmmtcgvzq` (af-south-1) |
| **Data source** | `EXPO_PUBLIC_DATA_SOURCE=supabase` (live), verified in the running Expo web app |
| **Verification method** | Real logins for all six roles against live Supabase + `tsc --noEmit` + challenge-library validator + direct DB/RPC probes |

> This report is a **QA status overlay** on the JOB register — it does not rewrite the canonical plan in `SUPABASE_INTEGRATION.md`. Marks reflect what was verified/fixed in this session.

---

## 1. Executive summary

- The app was **stuck in mock mode** (no `.env`), so live role passwords could never authenticate. Fixed.
- **35 TypeScript errors → 0**; several were real runtime crashes (Dean/Tutor screens consuming `async` services synchronously).
- **All six roles verified logging in against live Supabase.**
- Two live-backend defects found via console/DB probing and fixed: a broken **tutor delegated-modules** query and a **missing `get_faculty_overview` RPC** (deployed).
- Small, safe **UI/UX depth pass** (cards + buttons) applied and verified.

---

## 2. Issues found → root cause → how overcome → verification

| # | Issue (found) | Root cause | How it was overcome | Verified |
|---|---------------|-----------|---------------------|----------|
| I-1 | Real role passwords rejected; app behaved as mock | **No `.env`** — Expo defaulted `EXPO_PUBLIC_DATA_SOURCE` to `mock` | Created `.env` from the untracked `env`; added `/env` to `.gitignore` (holds `DB_PASSWORD`) | Env loads; Supabase URL/key logged; logins work |
| I-2 | Dean dashboard & analytics would crash | `institutionAnalytics.facultyOverview()` became `async`; screens read the **Promise synchronously** (`.toFixed()` on a Promise) | Load via `useEffect` + state with safe defaults | Dean dashboard + Charts render live |
| I-3 | Tutor dashboard/sessions/registers broken | `listModuleDelegations()`/`listForTutor()` became `async`; screens called `.find()`/`.length`/`.map()` on the Promise | Mock paths read `mockDB` synchronously; class registers loaded via state | `tsc` clean; tutor screens render |
| I-4 | Tutor "Delegated modules" empty + 400 error | `listModulesForTutor` used a PostgREST FK-embed (`.select("modules (*)")`) with no detectable relationship → `PGRST200` | Rewrote as a **two-step fetch** (delegations → module ids → modules) | Console shows `Tutor Supabase modules: Array(0)` — clean, no 400 |
| I-5 | Type error on `TestMarkModel.mark` | `mark: number` was **required** but presence marks (barcode/manual) carry no score; 3 build sites omit it | Made `mark?` optional | `tsc` clean |
| I-6 | `offlineRepository` type error | Type argument on untyped `db.get<...>` | Cast the result instead | `tsc` clean |
| I-7 | Student dashboard attendance stat wrong/typed error | Used non-existent `record.status` on `IntegratedAttendanceRecord` | Use `record.passed` (server-verified pass) | `tsc` clean |
| I-8 | React require cycle warning on every screen | `ui/index.ts` re-exported `MoreMenuScreen`/`LogoutButton`, which import back from the barrel | Removed the **unused** re-exports (all consumers import from `@/components/navigation/*`) | Warning gone from latest mount; More screen still renders |
| I-9 | Stale docs | `supabase/README.md` said `verify-attendance-record` was a "stub, not wired" | It is **implemented and wired** (verify → `saveRecord`); corrected the doc | Code + README reviewed |
| I-10 | `get_faculty_overview` RPC missing (404) | Function never created in the live DB (only `get_university_overview` + `get_department_overview` existed) | Authored + **deployed** `get_faculty_overview`; `NOTIFY pgrst` reload; recorded in migration history | RPC returns `200` with live data from the app's browser context |
| I-11 | Cards invisible against canvas | `surface.soft` (cards) == `lightBg` (`#E8E8E8`) | Added white `surface.card`; `AppCard`/`ModuleCard` now lift with soft shadow | Verified on login + dashboards |

**Correction logged for transparency:** an early probe reported `get_department_overview` as missing (404). That was a **false negative** — the probe called it with no argument, so PostgREST couldn't match the signature. Direct DB inspection confirmed `get_department_overview(text)` **already exists and works**; only `get_faculty_overview` was genuinely missing. No team function was overwritten.

---

## 3. User story / JOB status — marked & compared

Legend: ✅ verified working · 🔧 defect found & fixed this session · 🆕 created this session · ℹ️ code-verified (not exercised end-to-end) · ⚠️ open follow-up

| Story / JOB | Area | Doc/prior state (before) | Verified state (after) | Mark |
|-------------|------|--------------------------|------------------------|------|
| **STORY-002 / JOB-002 / JOB-027** | `.env` + datasource flag | "keep mock for M0" | `.env` present; `supabase` path active and reaching live DB | ✅ |
| **JOB-006** | Login → Supabase Auth | "mockAuthService default" | Live login verified for **student, tutor, lecturer, dean, HOD, admin** | ✅ |
| **JOB-007** | Auth hydration | "mock session only" | Session persists across page reload (AsyncStorage + `getSession`) | ✅ |
| **JOB-008** | `mapAuthError` | "raw API errors" | Friendly errors mapped in `authStore` | ✅ |
| **JOB-009** | `user_profiles` → role/scope | "hard-coded mock role" | `fetchLiveProfile` resolves role + scope ids from profile | ✅ |
| **JOB-011** | `useRoleGuard` live | "mock-only guard" | Role routing enforced with live profile | ✅ |
| **JOB-012 / JOB-014** | Student dashboard + history | "mockDB.list in services" | Live modules shown; **history stat bug fixed** (`record.passed`) | 🔧 ✅ |
| **JOB-013** | Lecturer modules | "mockDB filter" | Lecturer hub shows live modules + print-ready registers | ✅ |
| **JOB-016** | Leadership analytics (admin/dean/HOD) | "dashboardChartDummy, fake charts" | Admin live via `get_university_overview`; HOD live via `get_department_overview`; **Dean async bug fixed**; **`get_faculty_overview` created** | 🔧 🆕 ✅ |
| **JOB-019 / JOB-020 / JOB-021** | Create session / active pointer / challenge submit | pilot core | Verify→persist path present and wired (code-verified) | ℹ️ |
| **JOB-026** | `module_delegations` / proxy writes | "device-only queue" | **Tutor modules query fixed** (two-step fetch) | 🔧 ✅ |
| **JOB-032 / JOB-033** | Edge verify + wire challenge submit | "stub only (M0)" per README | Edge function **fully implemented and wired**; README corrected | ✅ (doc 🔧) |
| **JOB-004** | Versioned migrations | up to `0040` locally | `+ 20260907090000` (get_faculty_overview) added & recorded | 🆕 |

---

## 4. Stories completed **as part of testing** (new QA records)

Added so the QA effort itself is transparent and traceable.

| Test story | Description | Result |
|------------|-------------|--------|
| **TEST-001** | Boot Expo web against live Supabase | ✅ Boots to onboarding; env loaded |
| **TEST-002** | Log in — **Student** (`12345`) | ✅ "Hello, Amahle" + live modules (ITN220/ITD210/ITM301) |
| **TEST-003** | Log in — **Tutor** (`12345`) | ✅ Tutor hub (Thabo Khumalo) |
| **TEST-004** | Log in — **Lecturer** (`1234554321`) | ✅ Dr Mkhize hub + modules + registers |
| **TEST-005** | Log in — **Dean** (`dean@eng`) | ✅ Faculty overview + Charts (live via `useDeanData`) |
| **TEST-006** | Log in — **HOD** (`hod@it`) | ✅ Department overview (85.0%) |
| **TEST-007** | Log in — **Admin** (`innovation101`) | ✅ University overview via RPC (4 students, 85.5%) |
| **TEST-008** | Static quality gates | ✅ `tsc --noEmit` = 0 errors; challenge-library validator passes |
| **TEST-009** | Deploy + verify `get_faculty_overview` | ✅ `200` from app browser context; recorded in migration history |
| **TEST-010** | UI/UX depth pass (cards + buttons) | ✅ Verified on login + student dashboard |

---

## 5. Open follow-ups for the team ⚠️

1. **Migrations `0042`–`0044` exist only in the live DB, not in git** (nor on `origin/main`). A teammate applied them directly. Recover the SQL and commit them so `supabase db push` works cleanly (this is why `db push` refused here).
2. **`get_faculty_overview`** was applied directly and marked applied via `migration repair`; it is `CREATE OR REPLACE` (idempotent). Fine, but keep an eye on it during the next clean `db push`.
3. **Expo version advisory** — `expo@54.0.35` vs expected `~54.0.37` (+ `expo-constants`). Bump deliberately, not mid-pilot.
4. **Dev-only warning** — `Unexpected text node … child of a <View>` on some screens. Non-fatal (every screen renders); source not yet isolated.
5. **`env` secret** — the bare `env` file holds `DB_PASSWORD`; it is now git-ignored. Rotate the password if it was ever shared insecurely.

---

## 6. Reproduce / reference

```bash
# run the app against live Supabase
npm install
npx expo start --web           # onboarding → sign in with the role passwords

# quality gates
npx tsc --noEmit
node scripts/validate-challenge-library.mjs
```

Commits on `main`: `52bf5c7` (integration fixes + RPC migration), `77d1019` (card/button depth), `e1503e4` (ModuleCard depth). Detailed issue/fix log also in [`ISSUES_AND_FIXES.md`](./ISSUES_AND_FIXES.md).
