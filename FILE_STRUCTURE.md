# STARS — file structure overview

This guide helps **beginners** find the right file when fixing a bug or adding a feature. Paths are from the **project root** (`ATTANDANCE/`).

**Tip:** In VS Code / Cursor, use **Ctrl+P** (Windows) and type part of a path (e.g. `mark-attendance`) to jump to a file quickly.

---

## Quick lookup: “I need to change…”

| You are working on… | Start in these files / folders |
|---------------------|--------------------------------|
| **First screen after app opens**, redirects by role | `app/index.tsx`, `app/splash.tsx` |
| **Login, onboarding, register** | `app/(auth)/login.tsx`, `onboarding.tsx`, `register-student.tsx` |
| **Who can see which screen** | `src/hooks/useRoleGuard.ts`, `app/index.tsx` |
| **Sign-in / sign-out / stored user** | `src/store/authStore.ts`, `src/services/mockAuthService.ts`, `src/utils/authStorage.ts` |
| **Student home, modules list** | `app/student/dashboard.tsx`, `app/student/modules/` |
| **Join class with code** | `app/student/join-class.tsx`, `src/services/moduleEnrollmentService.ts` |
| **Mark attendance (code + GPS)** | `app/student/mark-attendance/[moduleId].tsx`, `src/services/attendanceSimulationService.ts`, `src/utils/rotatingCode.ts`, `src/utils/captureLocationOnce.ts`, `src/utils/haversine.ts` |
| **Attendance history / profile** | `app/student/attendance-history.tsx`, `app/student/profile.tsx` |
| **Lecturer home** | `app/lecturer/dashboard.tsx` |
| **Start a class session** | `app/lecturer/create-session/[moduleId].tsx`, `attendanceSimulationService.ts` |
| **Show rotating code / timer** | `app/lecturer/active-session/[sessionId].tsx`, `src/components/ui/SessionTimer.tsx`, `src/utils/rotatingCode.ts` |
| **Accept students into module** | `app/lecturer/student-management/[moduleId].tsx`, `moduleEnrollmentService.ts` |
| **Lecturer modules / analytics** | `app/lecturer/module-management.tsx`, `app/lecturer/analytics.tsx` |
| **Admin demo / reset data** | `app/admin/seed.tsx`, `src/mockDB/mockDBService.ts`, JSON files in `src/mockDB/` |
| **Toast messages** | `src/store/toastStore.ts`, `src/components/ui/ToastNotification.tsx` |
| **Notifications or settings screens** | `app/notifications.tsx`, `app/settings.tsx` |
| **Colours, fonts, spacing** | `src/theme/` (especially `colors.ts`) |
| **Reusable buttons, inputs, layout chrome** | `src/components/ui/` |
| **Data shapes (TypeScript types)** | `src/models/`, `src/types/roles.ts` |
| **Web tab title, SEO (static Metro)** | `public/index.html` |
| **Web head for static/server export** | `app/+html.tsx` |
| **App name, slug, web favicon** | `app.json` |
| **Styling pipeline (Tailwind / NativeWind)** | `tailwind.config.js`, `babel.config.js`, `metro.config.js`, `src/styles/global.css` |
| **404 screen** | `app/+not-found.tsx` |
| **Global providers (wrap whole app)** | `src/providers/AppProviders.tsx`, `app/_layout.tsx` |

---

## Top-level layout

```
ATTANDANCE/
├── app/                    # Expo Router: screens & URLs (file = route)
├── src/                    # Shared logic: UI, state, services, mock DB, theme
├── public/                 # Web static files (served as-is on web)
├── assets/                 # Images referenced by Expo (icon, splash, favicon)
├── app.json                # Expo app id, web settings, plugins
├── package.json            # Dependencies & npm scripts
├── tsconfig.json           # TypeScript paths (@/ → src/)
├── babel.config.js         # Babel (NativeWind, etc.)
├── metro.config.js         # Metro bundler (web + native)
├── tailwind.config.js      # Tailwind / NativeWind design tokens
├── nativewind-env.d.ts     # TypeScript types for NativeWind classes
├── .env.example            # Example environment variables (copy to .env)
├── README.md               # Quick start & diagrams
├── DOCUMENTATION.md        # Deeper technical write-up
└── FILE_STRUCTURE.md       # This file
```

---

## `app/` — screens and routing (Expo Router)

**Rule of thumb:** If it is something the **user navigates to**, it usually lives here. File path ≈ **URL path** (folders in `(parentheses)` do not appear in the URL).

| File / folder | Purpose |
|---------------|---------|
| `_layout.tsx` | **Root layout:** wraps the whole app with `AppProviders`, global CSS import, default `Stack` (no header). Change when adding a provider for every screen. |
| `index.tsx` | **Entry redirect:** reads auth + role → sends user to splash, onboarding, or the correct dashboard. |
| `splash.tsx` | Shown while auth state is **loading**. |
| `+html.tsx` | **Web document shell** for static/server output: `<head>` meta, favicon. Default Metro web uses `public/index.html` instead; keep both aligned if you edit SEO. |
| `+not-found.tsx` | **404** when no route matches. |
| `(auth)/` | **Group** (URL does not include `(auth)`). Auth stack layout + screens: |
| `(auth)/_layout.tsx` | Stack layout for auth screens (headers off). |
| `(auth)/onboarding.tsx` | Marketing / welcome; paths like **`/onboarding`**. |
| `(auth)/login.tsx` | Role + email + password login → **`/login`**. |
| `(auth)/register-student.tsx` | New student signup → **`/register-student`**. |
| `student/` | **Student** area; `_layout.tsx` stacks student tabs/screens. |
| `student/dashboard.tsx` | Student home. |
| `student/modules/` | Module list + **`[moduleId]`** detail. |
| `student/join-class.tsx` | Enter class code to enroll. |
| `student/mark-attendance/[moduleId].tsx` | Submit rotating code + GPS for that module. |
| `student/attendance-history.tsx` | Past attendance UI. |
| `student/profile.tsx` | Student profile. |
| `lecturer/` | **Lecturer** hub and tools. |
| `lecturer/_layout.tsx` | Lecturer stack layout. |
| `lecturer/dashboard.tsx` | Lecturer home. |
| `lecturer/create-session/[moduleId].tsx` | Start attendance session (GPS + session row). |
| `lecturer/active-session/[sessionId].tsx` | Live session UI (code / timer). |
| `lecturer/module-management.tsx` | Module list / management. |
| `lecturer/student-management/[moduleId].tsx` | Enrollments and pending requests for one module. |
| `lecturer/analytics.tsx` | Analytics views. |
| `admin/` | **Admin** tools (real URL under **`/admin/...`**). |
| `admin/_layout.tsx` | Admin stack layout. |
| `admin/seed.tsx` | **`/admin/seed`** — counts, re-seed mock DB. |
| `notifications.tsx` | **`/notifications`** — shared. |
| `settings.tsx` | **`/settings`** — shared. |

---

## `src/components/ui/` — reusable UI pieces

Small, focused components used by many screens.

| File | Purpose |
|------|---------|
| `ScreenShell.tsx` | Page wrapper: safe area, scroll, optional back, title/subtitle. |
| `AppButton.tsx` | Primary button styles. |
| `AppInput.tsx` | Labelled text input. |
| `AppCard.tsx` | Card container. |
| `Header.tsx` | Top bar patterns. |
| `StarsWordmark.tsx` | STARS logo / wordmark. |
| `InnovationLabFooter.tsx` | “Created by the MUT Innovation Lab” footer. |
| `SessionTimer.tsx` | Countdown for active attendance session. |
| `AttendanceCard.tsx` | Attendance summary card. |
| `ModuleCard.tsx` | Module summary card. |
| `Avatar.tsx`, `Badge.tsx` | Profile chip / status badge. |
| `EmptyState.tsx` | Placeholder when lists are empty. |
| `LoadingSpinner.tsx` | Loading indicator. |
| `FloatingActionButton.tsx` | FAB pattern. |
| `ToastNotification.tsx` | In-app toast UI (driven by store). |

---

## `src/hooks/`

| File | Purpose |
|------|---------|
| `useRoleGuard.ts` | Redirects if the logged-in user’s role does not match the screen (e.g. student-only page). |

---

## `src/store/` — client state (Zustand)

| File | Purpose |
|------|---------|
| `authStore.ts` | Current user, login/logout, hydration from storage. |
| `toastStore.ts` | Queue / show toast messages. |
| `sessionStore.ts` | UI/session selection helpers used by lecturer flows. |
| `mockDbVersionStore.ts` | **Version counter** bumped when mock DB changes so screens `useMemo` refresh. |

---

## `src/services/` — business logic (call from `app/` screens)

| File | Purpose |
|------|---------|
| `mockAuthService.ts` | Login + student registration against mock data. |
| `attendanceSimulationService.ts` | Create session, validate mark (code + distance + rules). |
| `moduleEnrollmentService.ts` | Join by class code, pending requests, accept/reject. |

**Firebase later:** keep the same kinds of functions here; swap internals to call Firestore instead of `mockDB`.

---

## `src/mockDB/` — in-memory “database”

| File | Purpose |
|------|---------|
| `mockDBService.ts` | CRUD, list, query, **seed** — the fake Firestore API. |
| `*.json` | Seed data: `faculties`, `courses`, `modules`, `lecturers`, `students`, `attendanceSessions`, `attendanceRecords`. |

Edit JSON for **demo users and modules**; edit `mockDBService.ts` for **how data is stored or reset**.

---

## `src/models/` — TypeScript data shapes

| File | Purpose |
|------|---------|
| `Student.ts`, `Lecturer.ts`, `Module.ts`, `Course.ts`, `Faculty.ts` | Entity types + helpers. |
| `Attendance.ts` | Sessions + records types. |
| `Analytics.ts` | Analytics-related types. |
| `common.ts` | Shared small types. |

Use these when typing service functions or screen props.

---

## `src/utils/` — small pure helpers

| File | Purpose |
|------|---------|
| `authStorage.ts` | Save/load auth token or user blob: **SecureStore** on device, **localStorage** on web. |
| `rotatingCode.ts` | Derive / verify **time-window 6-digit code** from session seed. |
| `haversine.ts` | **Distance in metres** between two GPS points (student vs class). |
| `captureLocationOnce.ts` | **One-shot** `expo-location` read used before create/mark attendance. |

---

## `src/theme/` — design tokens

| File | Purpose |
|------|---------|
| `colors.ts` | Brand palette (`#E8E8E8`, `#006281`, `#4F1A1D`, ink, borders). |
| `spacing.ts`, `radius.ts`, `typography.ts` | Layout and text tokens. |
| `index.ts` | Re-exports for convenient imports. |

---

## `src/types/`

| File | Purpose |
|------|---------|
| `roles.ts` | `"student" \| "lecturer" \| "admin"` and related types. |
| `expo-router.d.ts` | TypeScript augmentation for Expo Router (if present). |

---

## `src/providers/`

| File | Purpose |
|------|---------|
| `AppProviders.tsx` | React context / wrappers around the whole tree (e.g. gesture handler). Add global providers here. |

---

## `src/styles/`

| File | Purpose |
|------|---------|
| `global.css` | Global CSS for **web**; imported from `app/_layout.tsx`. Tailwind / NativeWind layers. |

---

## `public/` — web-only static assets

| File | Purpose |
|------|---------|
| `index.html` | **Metro web** HTML shell: `<title>`, meta, favicon link; Expo injects the JS bundle. |
| `favicon.svg` | Served at **`/favicon.svg`** for browser tab icon. |

---

## `assets/`

Images referenced from **`app.json`** (icon, splash, web favicon path). Placeholder `.gitkeep` may exist if binary assets are not committed.

---

## Config files (build & tooling)

| File | Purpose |
|------|---------|
| `app.json` | Expo **name**, **slug**, **scheme**, splash, **web** (`bundler`, `lang`, `favicon`), **plugins** (`expo-router`). |
| `package.json` | Scripts (`expo start`, etc.) and **npm dependencies**. |
| `package-lock.json` | Locked dependency versions — commit this for reproducible installs. |
| `tsconfig.json` | TypeScript compiler options and **`@/` → `src/`** path alias. |
| `babel.config.js` | Babel presets/plugins (**NativeWind** preset pattern for SDK 52). |
| `metro.config.js` | Metro bundler config (assets, web). |
| `tailwind.config.js` | Tailwind content paths + **NativeWind preset** + theme extensions. |
| `nativewind-env.d.ts` | Declares `className` props for TypeScript. |

---

## Environment

| File | Purpose |
|------|---------|
| `.env.example` | Documents variables like **`EXPO_PUBLIC_SITE_URL`**. |
| `.env` | **Not committed** — your local secrets / URLs (create from `.env.example`). |

---

## Related docs

- **[README.md](./README.md)** — quick start, diagrams, functional requirements summary.
- **[DOCUMENTATION.md](./DOCUMENTATION.md)** — stack, process, troubleshooting.

If a path is missing from this list, search the repo for a screen name or feature word; new files should be added under **`app/`** (routes) or **`src/`** (shared code) following the patterns above.
