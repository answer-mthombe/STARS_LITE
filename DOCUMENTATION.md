# STARS — Documentation

**STARS** (Smart Tracking & Attendance Resource System) is the Mangosuthu University of Technology attendance experience: a production-style mobile app for students and lecturers, with a mock data layer today and a clean path to Firebase tomorrow.

---

## Tech stack

| Layer | Technology |
|--------|--------------|
| **Runtime** | Node.js **20 LTS** recommended (Expo SDK 52 + Metro are not reliable on Node 24+) |
| **Framework** | [Expo](https://expo.dev/) SDK **52** (managed workflow, EAS-ready) |
| **Language** | **TypeScript** (strict) |
| **Routing** | [Expo Router](https://docs.expo.dev/router/introduction/) (file-based, deep links, web + native) |
| **UI** | React Native, **NativeWind v4** + **Tailwind** tokens, custom theme (`#E8E8E8`, `#006281`, `#4F1A1D`) |
| **Motion** | **react-native-reanimated** |
| **Forms** | **react-hook-form** + **Zod** (where used) |
| **State** | **Zustand** (auth, toasts, mock DB version bump, session selection) |
| **Persistence (native)** | **expo-secure-store** |
| **Persistence (web dev)** | `localStorage` via `authStorage` helper |
| **Location** | **expo-location** (one-shot capture for attendance simulation) |
| **Crypto** | **expo-crypto** (session seed for mock sessions) |
| **Data (current)** | In-memory **mock Firestore** (`src/mockDB/`) + JSON seeds |
| **Data (future)** | Firebase v9 modular (**Auth**, **Firestore**, **Storage**) — interfaces and services structured to swap |

---

## Process (how we build & run)

### 1. Local setup

```bash
cd ATTANDANCE
npm install --legacy-peer-deps
npx expo start -c
```

- Use **`npx expo start`** then **Expo Go** (device) or **`w`** for web.
- **Browser tab icon (web):** `public/favicon.svg` is served at **`/favicon.svg`**. `app/+html.tsx` adds `<link rel="icon" href="/favicon.svg" …>` and sets the document **title**. `app.json` → `expo.web.favicon` still points at `assets/favicon.svg` for Expo’s bundler/export pipeline.
- **SEO (web):** There is no separate `public/index.html` (that can break SPA routing). **`app/+html.tsx`** is the root HTML: **meta description**, **keywords**, **Open Graph**, **Twitter Card**, **robots**, **theme-color**, and optional **`EXPO_PUBLIC_SITE_URL`** for `og:url` + **canonical** when you deploy.

### 2. Architecture principles

1. **Repository-style services** — `mockDB` mimics Firestore collections; `attendanceSimulationService` and `moduleEnrollmentService` sit above it so Firebase can replace `mockDB` later without rewriting screens.
2. **Role-based routes** — `/student/*`, `/lecturer/*`, `/admin/*`, plus shared `/notifications`, `/settings`.
3. **Route groups** — `(auth)` only organizes files; URLs are **`/onboarding`**, **`/login`**, **`/register-student`** (parentheses are not in the path).
4. **UI system** — `ScreenShell` + tokens in `src/theme/`; **Innovation Lab** footer is pinned below scroll content for brand consistency.

### 3. Attendance simulation (mock)

1. Lecturer starts a session → one GPS read → session row + `algorithmSeed` + expiry.
2. Rotating **6-digit code** is derived locally from seed + 30s time window (no per-tick Firestore writes).
3. Student submits code → one GPS read → Haversine distance vs session radius → record written to mock DB.

### 4. Design & brand

- **Product name:** **STARS** (see `StarsWordmark`, splash, onboarding, student home).
- **Credit line:** **Created by the MUT Innovation Lab** — `InnovationLabFooter` (mixed typography and palette patterns).
- **Palette:** light surface `#E8E8E8`, accent `#006281`, primary `#4F1A1D`.

### 5. Firebase cutover (planned)

1. Add `.env` / EAS secrets with `EXPO_PUBLIC_FIREBASE_*`.
2. Implement `src/firebase/` client + collection accessors mirroring `mockDB` collection names.
3. Replace service internals to call Firestore while keeping the same method signatures used by screens.

---

## Key paths

| Path | Purpose |
|------|---------|
| `app/onboarding.tsx` (via `(auth)/onboarding`) | STARS marketing home |
| `app/student/dashboard.tsx` | Student **home** (STARS hero + modules) |
| `app/lecturer/dashboard.tsx` | Lecturer hub |
| `app/admin/seed.tsx` | Admin / simulation utilities |
| `src/mockDB/` | JSON seeds + `mockDBService` |
| `src/services/` | Auth, attendance, enrollment |
| `src/components/ui/` | Buttons, shell, **InnovationLabFooter**, **StarsWordmark** |

---

## Troubleshooting

- **Metro `TerminalReporter` / Node issues** — use Node 20 LTS, delete `node_modules`, reinstall.
- **NativeWind preset error** — `tailwind.config.js` must include `presets: [require("nativewind/preset")]`.
- **SecureStore on web** — use `src/utils/authStorage.ts` (already wired in `authStore`).

For questions about this codebase, contact the **MUT Innovation Lab** (see in-app footer).
